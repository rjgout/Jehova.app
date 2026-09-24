"use client";

import { useEffect, useState } from "react";

/**
 * Persoonlijke uitnodigingslink op de Vrienden-pagina (zie
 * src/lib/friendInvite.ts): wie via die link een account maakt, is meteen je
 * vriend.
 */
export default function FriendInviteCard({ appName }: { appName: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    fetch("/api/friends/invite")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.code && setCode(d.code));
    // Pas na het laden bepalen: op de server bestaat navigator niet, en een
    // verschil tussen server- en clientweergave geeft een hydratatiefout.
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const link = code ? `${window.location.origin}/uitnodiging/${code}` : null;

  async function share() {
    if (!link) return;
    try {
      await navigator.share({
        title: appName,
        text: `Doe je mee met ${appName}? Via deze link zijn we meteen vrienden.`,
        url: link,
      });
    } catch {
      // Deelmenu gesloten zonder te delen: niets aan de hand.
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setMessage("Link gekopieerd! 📋");
    } catch {
      setMessage("Kopiëren lukte niet. Houd de link hieronder ingedrukt om hem zelf te kopiëren.");
    }
  }

  async function regenerate() {
    if (
      !window.confirm(
        "Nieuwe link maken?\n\nDe oude link werkt daarna niet meer. Wie al via de oude link je vriend is, blijft dat wel."
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await fetch("/api/friends/invite", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !body.code) {
      setMessage(body.error ?? "Kon geen nieuwe link maken.");
      return;
    }
    setCode(body.code);
    setMessage("Nieuwe link gemaakt. De oude werkt niet meer.");
  }

  return (
    <div className="card flex flex-col gap-3">
      <p className="font-bold text-sm dark:text-slate-100 flex items-center gap-2">
        <span aria-hidden>💌</span> Nodig vrienden uit
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Stuur je persoonlijke link via een appje of sms. Wie daarmee een account maakt, is meteen je vriend.
      </p>
      {link ? (
        <>
          <p className="text-xs font-mono break-all bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl px-3 py-2 select-all">
            {link}
          </p>
          <div className="flex gap-2 flex-wrap">
            {canShare && (
              <button className="btn-primary !px-4 !py-2" onClick={share}>
                Delen
              </button>
            )}
            <button className={`${canShare ? "btn-secondary" : "btn-primary"} !px-4 !py-2`} onClick={copy}>
              Link kopiëren
            </button>
            <button className="btn-secondary !px-4 !py-2" disabled={busy} onClick={regenerate}>
              {busy ? "Bezig..." : "Nieuwe link maken"}
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-400 dark:text-slate-500">Laden...</p>
      )}
      {message && <p className="text-sm font-semibold text-brand-600 dark:text-brand-300">{message}</p>}
    </div>
  );
}
