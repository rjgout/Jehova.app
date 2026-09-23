"use client";

import { useEffect, useState } from "react";
import qrcode from "qrcode-generator";

export default function TwoFactorSettings({ isAdmin }: { isAdmin: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => setEnabled(!!data.totpEnabled))
      .catch(() => {});
  }, []);

  async function startSetup() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/account/totp/setup", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "Kon 2FA niet instellen.");
      return;
    }
    setSetup(data);
  }

  async function verifySetup() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/account/totp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "Kon de code niet verifiëren.");
      return;
    }
    setEnabled(true);
    setSetup(null);
    setCode("");
    setRecoveryCodes(data.recoveryCodes);
  }

  async function disable() {
    const input = window.prompt("Voer je huidige 2FA-code of een herstelcode in.");
    if (!input) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/account/totp/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: input }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "Kon 2FA niet uitschakelen.");
      return;
    }
    setEnabled(false);
  }

  function qrDataUrl(uri: string) {
    const qr = qrcode(0, "M");
    qr.addData(uri);
    qr.make();
    return qr.createDataURL(5, 2);
  }

  if (recoveryCodes) {
    return (
      <section className="card flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-extrabold">Tweestapsverificatie</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            2FA staat aan. Bewaar deze herstelcodes nu op een veilige plek. Ze worden daarna niet meer getoond.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 font-mono text-sm">
          {recoveryCodes.map((item) => <div key={item} className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2">{item}</div>)}
        </div>
        <button className="btn-primary" onClick={() => setRecoveryCodes(null)}>Ik heb ze veilig bewaard</button>
      </section>
    );
  }

  return (
    <section className="card flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-extrabold">Tweestapsverificatie</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {isAdmin
            ? "Als beheerder is 2FA verplicht. Stel het hieronder in voordat je verdergaat."
            : "Bescherm je account met een extra beveiligingslaag via een authenticator-app."}
        </p>
      </div>

      {enabled ? (
        <>
          <p className="font-semibold text-green-600 dark:text-green-400">✓ 2FA is ingeschakeld.</p>
          {isAdmin ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Als beheerder kun je 2FA niet uitschakelen.</p>
          ) : (
            <button className="btn-secondary self-start" onClick={disable} disabled={busy}>2FA uitschakelen</button>
          )}
        </>
      ) : (
        <>
          {setup ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div className="bg-white rounded-xl p-3 shrink-0">
                  <img src={qrDataUrl(setup.otpauthUri)} alt="QR-code voor tweestapsverificatie" className="w-48 h-48" />
                </div>
                <div className="flex flex-col gap-2 text-sm">
                  <p className="font-semibold">1. Scan de QR-code met je authenticator-app.</p>
                  <p>2. Voer daarna de 6-cijferige code hieronder in.</p>
                  <p className="font-mono break-all text-xs text-slate-500">{setup.secret}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input className="input max-w-xs" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                <button className="btn-primary" onClick={verifySetup} disabled={busy || code.length !== 6}>{busy ? "Bezig..." : "Inschakelen"}</button>
              </div>
            </div>
          ) : (
            <button className="btn-primary self-start" onClick={startSetup} disabled={busy}>{busy ? "Bezig..." : "2FA instellen"}</button>
          )}
        </>
      )}

      {message && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{message}</p>}
    </section>
  );
}
