"use client";

import { useEffect, useState } from "react";
import qrcode from "qrcode-generator";
import { useT } from "@/components/I18nProvider";

type Mode = "idle" | "setup" | "reset-code" | "disable-code";
type Message = { kind: "error" | "success"; text: string } | null;

// Herstelcodes bevatten letters (A–F) en een streepje; een numeriek
// toetsenbord (inputMode="numeric") maakt ze op een telefoon onbruikbaar.
const CODE_INPUT_PROPS = {
  inputMode: "text" as const,
  autoCapitalize: "characters",
  autoCorrect: "off",
  spellCheck: false,
  autoComplete: "one-time-code",
};

function qrDataUrl(uri: string) {
  const qr = qrcode(0, "M");
  qr.addData(uri);
  qr.make();
  return qr.createDataURL(5, 2);
}

/**
 * Inhoud van het 2FA-blok op de profielpagina. Rendert bewust geen eigen
 * kaart of kop: ProfileClient zet dit binnen de Account-kaart onder een
 * eigen tussenkop.
 */
export default function TwoFactorSettings({ isAdmin }: { isAdmin: boolean }) {
  const t = useT();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => setEnabled(!!data.totpEnabled))
      .catch(() => setEnabled(false));
  }, []);

  function switchMode(next: Mode) {
    setMode(next);
    setCode("");
    setMessage(null);
  }

  async function post(url: string, body?: unknown) {
    setBusy(true);
    setMessage(null);
    const res = await fetch(url, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    return { ok: res.ok, data };
  }

  async function startSetup() {
    const { ok, data } = await post("/api/account/totp/setup");
    if (!ok) return setMessage({ kind: "error", text: data.error ?? t("twoFactor.setupFailed") });
    setSetup(data);
    switchMode("setup");
  }

  async function verifySetup() {
    const { ok, data } = await post("/api/account/totp/verify", { code });
    if (!ok) return setMessage({ kind: "error", text: data.error ?? t("twoFactor.verifyFailed") });
    setEnabled(true);
    setSetup(null);
    switchMode("idle");
    setRecoveryCodes(data.recoveryCodes);
  }

  async function resetWithRecoveryCode() {
    const { ok, data } = await post("/api/account/totp/reset", { code });
    if (!ok) return setMessage({ kind: "error", text: data.error ?? t("twoFactor.resetFailed") });
    setSetup(data);
    switchMode("setup");
  }

  async function disable() {
    const { ok, data } = await post("/api/account/totp/disable", { code });
    if (!ok) return setMessage({ kind: "error", text: data.error ?? t("twoFactor.disableFailed") });
    setEnabled(false);
    switchMode("idle");
    setMessage({ kind: "success", text: t("twoFactor.disabled") });
  }

  async function copyRecoveryCodes() {
    if (!recoveryCodes) return;
    await navigator.clipboard?.writeText(recoveryCodes.join("\n")).catch(() => {});
    setCopied(true);
  }

  if (enabled === null) {
    return <p className="text-sm text-slate-400 dark:text-slate-500">{t("common.loading")}</p>;
  }

  if (recoveryCodes) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-gold-400/40 bg-gold-50 dark:bg-slate-900/50 p-4">
        <p className="font-extrabold text-gold-700 dark:text-gold-300">{t("twoFactor.saveCodes")}</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t("twoFactor.saveCodesText")}
        </p>
        <div className="grid grid-cols-2 gap-2 font-mono text-sm">
          {recoveryCodes.map((item) => (
            <div key={item} className="rounded-lg bg-white dark:bg-slate-800 px-3 py-2 text-center dark:text-slate-100">
              {item}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary !py-2 !text-sm" onClick={copyRecoveryCodes}>
            {copied ? t("twoFactor.copied") : t("twoFactor.copy")}
          </button>
          <button className="btn-primary !py-2 !text-sm" onClick={() => setRecoveryCodes(null)}>
            {t("twoFactor.savedSafely")}
          </button>
        </div>
      </div>
    );
  }

  const statusBadge = enabled ? (
    <span className="rounded-full bg-green-100 dark:bg-green-900/40 px-2.5 py-0.5 text-xs font-bold text-green-700 dark:text-green-300">
      {t("twoFactor.on")}
    </span>
  ) : (
    <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-bold text-slate-500 dark:text-slate-300">
      {t("twoFactor.off")}
    </span>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {enabled
            ? t("twoFactor.enabledText")
            : isAdmin
              ? t("twoFactor.adminRequired")
              : t("twoFactor.disabledText")}
        </p>
        {statusBadge}
      </div>

      {mode === "setup" && setup && (
        <div className="flex flex-col gap-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
            <div className="bg-white rounded-xl p-2 shrink-0 shadow-sm">
              <img src={qrDataUrl(setup.otpauthUri)} alt={t("twoFactor.qrAlt")} className="w-40 h-40" />
            </div>
            <ol className="flex flex-col gap-2 text-sm dark:text-slate-200 list-decimal pl-5">
              <li>{t("twoFactor.step1")}</li>
              <li>{t("twoFactor.step2")}
                <span className="mt-1 block font-mono text-xs break-all text-slate-500 dark:text-slate-400">{setup.secret}</span>
              </li>
              <li>{t("twoFactor.step3")}</li>
            </ol>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="input !w-36 text-center tracking-widest text-lg"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <button className="btn-primary !py-2.5" onClick={verifySetup} disabled={busy || code.length !== 6}>
              {busy ? t("courses.busy") : t("twoFactor.confirm")}
            </button>
            {!enabled && (
              <button className="text-sm text-slate-400 hover:underline" onClick={() => switchMode("idle")}>
                {t("activeGames.cancel")}
              </button>
            )}
          </div>
        </div>
      )}

      {(mode === "reset-code" || mode === "disable-code") && (
        <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-4">
          <p className="text-sm dark:text-slate-200">
            {mode === "reset-code"
              ? t("twoFactor.enterRecovery")
              : t("twoFactor.enterCode")}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="input !w-44 text-center tracking-wider uppercase placeholder:normal-case"
              placeholder={mode === "reset-code" ? "ABCDE-12345" : t("twoFactor.codePlaceholder")}
              value={code}
              onChange={(e) => setCode(e.target.value.slice(0, 16))}
              {...CODE_INPUT_PROPS}
            />
            <button
              className={mode === "disable-code" ? "btn-primary !py-2.5 !bg-red-500 !shadow-[0_4px_0_0_theme(colors.red.700)]" : "btn-primary !py-2.5"}
              onClick={mode === "reset-code" ? resetWithRecoveryCode : disable}
              disabled={busy || code.trim().length === 0}
            >
              {busy ? t("courses.busy") : mode === "reset-code" ? t("twoFactor.continueStep") : t("twoFactor.disable")}
            </button>
            <button className="text-sm text-slate-400 hover:underline" onClick={() => switchMode("idle")}>
              {t("activeGames.cancel")}
            </button>
          </div>
        </div>
      )}

      {mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          {enabled ? (
            <>
              <button className="btn-secondary !py-2 !text-sm" onClick={() => switchMode("reset-code")} disabled={busy}>
                {t("twoFactor.newPhone")}
              </button>
              {!isAdmin && (
                <button className="btn-secondary !py-2 !text-sm !text-red-500" onClick={() => switchMode("disable-code")} disabled={busy}>
                  {t("twoFactor.disable")}
                </button>
              )}
            </>
          ) : (
            <button className="btn-primary !py-2 !text-sm" onClick={startSetup} disabled={busy}>
              {busy ? t("courses.busy") : t("twoFactor.setup")}
            </button>
          )}
        </div>
      )}

      {enabled && isAdmin && mode === "idle" && (
        <p className="text-xs text-slate-400 dark:text-slate-500">{t("twoFactor.adminCantDisable")}</p>
      )}

      {message && (
        <p className={`text-sm font-semibold ${message.kind === "error" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
