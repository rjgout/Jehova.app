"use client";

import { useEffect, useState } from "react";
import qrcode from "qrcode-generator";

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
    if (!ok) return setMessage({ kind: "error", text: data.error ?? "Kon 2FA niet instellen." });
    setSetup(data);
    switchMode("setup");
  }

  async function verifySetup() {
    const { ok, data } = await post("/api/account/totp/verify", { code });
    if (!ok) return setMessage({ kind: "error", text: data.error ?? "Kon de code niet verifiëren." });
    setEnabled(true);
    setSetup(null);
    switchMode("idle");
    setRecoveryCodes(data.recoveryCodes);
  }

  async function resetWithRecoveryCode() {
    const { ok, data } = await post("/api/account/totp/reset", { code });
    if (!ok) return setMessage({ kind: "error", text: data.error ?? "Kon de authenticator niet opnieuw instellen." });
    setSetup(data);
    switchMode("setup");
  }

  async function disable() {
    const { ok, data } = await post("/api/account/totp/disable", { code });
    if (!ok) return setMessage({ kind: "error", text: data.error ?? "Kon 2FA niet uitschakelen." });
    setEnabled(false);
    switchMode("idle");
    setMessage({ kind: "success", text: "2FA is uitgeschakeld." });
  }

  async function copyRecoveryCodes() {
    if (!recoveryCodes) return;
    await navigator.clipboard?.writeText(recoveryCodes.join("\n")).catch(() => {});
    setCopied(true);
  }

  if (enabled === null) {
    return <p className="text-sm text-slate-400 dark:text-slate-500">Laden...</p>;
  }

  if (recoveryCodes) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-gold-400/40 bg-gold-50 dark:bg-slate-800 p-4">
        <p className="font-extrabold text-gold-700 dark:text-gold-300">🔑 Bewaar je herstelcodes</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Ben je je telefoon kwijt, dan log je met één van deze codes in. Elke code werkt één keer. Je ziet ze alleen nu.
        </p>
        <div className="grid grid-cols-2 gap-2 font-mono text-sm">
          {recoveryCodes.map((item) => (
            <div key={item} className="rounded-lg bg-white dark:bg-slate-900 px-3 py-2 text-center dark:text-slate-100">
              {item}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary !py-2 !text-sm" onClick={copyRecoveryCodes}>
            {copied ? "Gekopieerd ✓" : "Kopiëren"}
          </button>
          <button className="btn-primary !py-2 !text-sm" onClick={() => setRecoveryCodes(null)}>
            Ik heb ze veilig bewaard
          </button>
        </div>
      </div>
    );
  }

  const statusBadge = enabled ? (
    <span className="rounded-full bg-green-100 dark:bg-green-900/40 px-2.5 py-0.5 text-xs font-bold text-green-700 dark:text-green-300">
      Aan
    </span>
  ) : (
    <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-bold text-slate-500 dark:text-slate-300">
      Uit
    </span>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {enabled
            ? "Bij het inloggen vragen we naast je wachtwoord ook een code uit je authenticator-app."
            : isAdmin
              ? "Als beheerder is 2FA verplicht. Stel het in met een authenticator-app."
              : "Extra beveiliging: bij het inloggen vragen we naast je wachtwoord een code uit een authenticator-app."}
        </p>
        {statusBadge}
      </div>

      {mode === "setup" && setup && (
        <div className="flex flex-col gap-4 rounded-2xl bg-slate-50 dark:bg-slate-800 p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
            <div className="bg-white rounded-xl p-2 shrink-0 shadow-sm">
              <img src={qrDataUrl(setup.otpauthUri)} alt="QR-code voor tweestapsverificatie" className="w-40 h-40" />
            </div>
            <ol className="flex flex-col gap-2 text-sm dark:text-slate-200 list-decimal pl-5">
              <li>Scan de QR-code met je authenticator-app.</li>
              <li>Lukt scannen niet? Voer deze sleutel handmatig in:
                <span className="mt-1 block font-mono text-xs break-all text-slate-500 dark:text-slate-400">{setup.secret}</span>
              </li>
              <li>Vul de 6-cijferige code uit de app hieronder in.</li>
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
              {busy ? "Bezig..." : "Bevestigen"}
            </button>
            {!enabled && (
              <button className="text-sm text-slate-400 hover:underline" onClick={() => switchMode("idle")}>
                Annuleren
              </button>
            )}
          </div>
        </div>
      )}

      {(mode === "reset-code" || mode === "disable-code") && (
        <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800 p-4">
          <p className="text-sm dark:text-slate-200">
            {mode === "reset-code"
              ? "Vul een ongebruikte herstelcode in. Daarna koppel je je authenticator-app opnieuw."
              : "Vul een code uit je authenticator-app of een herstelcode in."}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="input !w-44 text-center tracking-wider"
              placeholder={mode === "reset-code" ? "ABCDE-12345" : "123456 of herstelcode"}
              value={code}
              onChange={(e) => setCode(e.target.value.slice(0, 16))}
              {...CODE_INPUT_PROPS}
            />
            <button
              className={mode === "disable-code" ? "btn-primary !py-2.5 !bg-red-500 !shadow-[0_4px_0_0_theme(colors.red.700)]" : "btn-primary !py-2.5"}
              onClick={mode === "reset-code" ? resetWithRecoveryCode : disable}
              disabled={busy || code.trim().length === 0}
            >
              {busy ? "Bezig..." : mode === "reset-code" ? "Doorgaan" : "Uitschakelen"}
            </button>
            <button className="text-sm text-slate-400 hover:underline" onClick={() => switchMode("idle")}>
              Annuleren
            </button>
          </div>
        </div>
      )}

      {mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          {enabled ? (
            <>
              <button className="btn-secondary !py-2 !text-sm" onClick={() => switchMode("reset-code")} disabled={busy}>
                Nieuwe telefoon koppelen
              </button>
              {!isAdmin && (
                <button className="btn-secondary !py-2 !text-sm !text-red-500" onClick={() => switchMode("disable-code")} disabled={busy}>
                  Uitschakelen
                </button>
              )}
            </>
          ) : (
            <button className="btn-primary !py-2 !text-sm" onClick={startSetup} disabled={busy}>
              {busy ? "Bezig..." : "2FA instellen"}
            </button>
          )}
        </div>
      )}

      {enabled && isAdmin && mode === "idle" && (
        <p className="text-xs text-slate-400 dark:text-slate-500">Als beheerder kun je 2FA niet uitschakelen.</p>
      )}

      {message && (
        <p className={`text-sm font-semibold ${message.kind === "error" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
