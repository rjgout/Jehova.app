"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { getSocket } from "@/lib/socketClient";
import UserAvatar from "@/components/UserAvatar";

interface ActivityItem {
  kind: "challenge" | "scrabble" | "live" | "chapter-guess-solo";
  id: string;
  opponentName: string | null;
  opponentId: string | null;
  label: string;
  link: string;
  myTurn: boolean | null;
  contentCollectionId?: string;
  code?: string;
}

interface ActivityStatus {
  liveInvitesReceived: ActivityItem[];
  invitesReceived: ActivityItem[];
  invitesSent: ActivityItem[];
  activeGames: ActivityItem[];
  activeContentCollectionId: string;
}

const KIND_ICON: Record<ActivityItem["kind"], string> = {
  challenge: "⚔️",
  scrabble: "🔤",
  live: "🎮",
  "chapter-guess-solo": "🔎",
};

// Blok "Actieve spellen" bovenaan /live ("Spelen"): openstaande
// uitnodigingen en lopende spellen (Uitdagingen, Woordspel, Live spel), zodat
// je die ziet zonder eerst naar de spelpagina's zelf te gaan. Toont bewust
// ook een lege staat en een foutmelding: voorheen verdween het blok stil bij
// een mislukte fetch, waardoor "geen spellen" en "kon niet laden" (zoals in
// de geïnstalleerde webapp) niet van elkaar te onderscheiden waren.
export default function ActiveGamesBanner() {
  const [status, setStatus] = useState<ActivityStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    // no-store: de API stuurt geen cacheheaders mee, en een geïnstalleerde
    // webapp mag hier nooit een oud antwoord uit zijn HTTP-cache gebruiken.
    fetch("/api/activity-status", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`fout ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setStatus(d);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "onbekende fout"));
  }

  useEffect(reload, []);

  useEffect(() => {
    const socket = getSocket();
    socket.on("game_cancelled", reload);
    // Een nieuwe of vervallen live-uitnodiging meteen tonen/weghalen.
    socket.on("game_invite", reload);
    socket.on("game_invite_revoked", reload);
    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      socket.off("game_cancelled", reload);
      socket.off("game_invite", reload);
      socket.off("game_invite_revoked", reload);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  async function openGame(item: ActivityItem, event: MouseEvent<HTMLAnchorElement>) {
    if (!item.contentCollectionId || item.contentCollectionId === status?.activeContentCollectionId) return;

    event.preventDefault();
    const response = await fetch("/api/content-context", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentCollectionId: item.contentCollectionId }),
    });
    if (!response.ok) return;

    // Een volledige navigatie is hier bewust: de contentswitcher bepaalt via
    // serverdata ook welke cursussen, spellen en andere menu's zichtbaar zijn.
    // router.refresh() alleen kan bestaande client-state laten staan.
    window.location.assign(item.link);
  }

  function cancelGame(code: string) {
    if (!window.confirm("Dit spel beëindigen? Dit kan niet ongedaan worden gemaakt.")) return;
    // De banner ververst zichzelf pas via het "game_cancelled"-event
    // hierboven, zodra de server het spel écht heeft verwijderd.
    getSocket().emit("cancel_game", { code });
  }

  const heading = <h2 className="text-sm font-extrabold text-slate-700 dark:text-slate-200">Actieve spellen</h2>;

  if (!status) {
    return (
      <div className="card flex flex-col gap-2 !py-3">
        {heading}
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            Kon je spellen niet ophalen ({error}).{" "}
            <button className="font-bold underline" onClick={reload}>
              Opnieuw proberen
            </button>
          </p>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500">Laden...</p>
        )}
      </div>
    );
  }
  const { invitesReceived, invitesSent, activeGames } = status;
  const liveInvitesReceived = status.liveInvitesReceived ?? [];
  if (
    liveInvitesReceived.length === 0 &&
    invitesReceived.length === 0 &&
    invitesSent.length === 0 &&
    activeGames.length === 0
  ) {
    return (
      <div className="card flex flex-col gap-1 !py-3">
        {heading}
        <p className="text-sm text-slate-500 dark:text-slate-400">Je hebt nu geen lopende spellen of uitnodigingen.</p>
      </div>
    );
  }

  // Live-uitnodigingen krijgen een eigen regel mét een knop om te
  // beëindigen (zie cancelGame) — anders dan Uitdagingen/Woordspel kan een
  // live-lobby anders eindeloos op een reactie blijven wachten.
  const liveInvitesSent = invitesSent.filter((i) => i.kind === "live");
  const otherInvitesSent = invitesSent.filter((i) => i.kind !== "live");

  return (
    <div className="card flex flex-col gap-2 !py-3">
      {heading}
      {liveInvitesReceived.length > 0 && (
        <div className="flex flex-col gap-2">
          {liveInvitesReceived.map((item) => (
            <Link
              key={`live-invite-${item.id}`}
              href={item.link}
              onClick={(event) => openGame(item, event)}
              className="animate-invite-glow flex items-center gap-3 rounded-2xl border-2 border-brand-400 bg-gradient-to-r from-brand-50 to-gold-50 dark:from-slate-800 dark:to-slate-800 dark:border-brand-500 px-3 py-2.5 transition active:scale-[0.98]"
            >
              {item.opponentId ? (
                <UserAvatar id={item.opponentId} handle={item.opponentName ?? ""} />
              ) : (
                <span className="text-2xl" aria-hidden>🎮</span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold text-brand-800 dark:text-brand-200 leading-snug">
                  {item.opponentName} nodigt je uit!
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 leading-snug">Live spel — {item.label}</span>
              </span>
              <span className="btn-primary !px-3 !py-1.5 !text-xs shrink-0">Meedoen</span>
            </Link>
          ))}
        </div>
      )}

      {invitesReceived.length > 0 && (
        <div className="flex flex-col gap-1">
          {invitesReceived.map((item) => (
            <Link
              key={`${item.kind}-${item.id}`}
              href={item.link}
              onClick={(event) => openGame(item, event)}
              className="flex items-center gap-2 text-sm font-semibold text-brand-700 dark:text-brand-300 hover:underline"
            >
              {item.opponentId ? (
                <UserAvatar id={item.opponentId} handle={item.opponentName ?? ""} size="xs" />
              ) : (
                <span>{KIND_ICON[item.kind]}</span>
              )}
              <span>
                {item.opponentName} nodigt je uit — {item.label}
              </span>
            </Link>
          ))}
        </div>
      )}

      {activeGames.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeGames.map((item) => (
            <Link key={`${item.kind}-${item.id}`} href={item.link} className={item.myTurn ? "btn-primary" : "btn-secondary"}>
              {item.opponentId ? (
                <UserAvatar id={item.opponentId} handle={item.opponentName ?? ""} size="xs" className="mr-1.5 -my-1" />
              ) : (
                <span className="mr-1.5">{KIND_ICON[item.kind]}</span>
              )}
              {item.opponentName ? `${item.opponentName} — ` : ""}
              {item.label}
              {item.myTurn ? " · jouw beurt!" : ""}
            </Link>
          ))}
        </div>
      )}

      {liveInvitesSent.length > 0 && (
        <div className="flex flex-col gap-1">
          {liveInvitesSent.map((item) => (
            <div key={`live-${item.id}-${item.opponentName}`} className="flex items-center justify-between gap-2 text-xs text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1.5">
                {item.opponentId && <UserAvatar id={item.opponentId} handle={item.opponentName ?? ""} size="xs" />}
                Wachten op {item.opponentName} — {item.label}
              </span>
              <button className="text-red-500 dark:text-red-400 font-semibold hover:underline" onClick={() => cancelGame(item.code!)}>
                Beëindig
              </button>
            </div>
          ))}
        </div>
      )}

      {otherInvitesSent.length > 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Wachten op reactie: {otherInvitesSent.map((i) => i.opponentName).join(", ")}
        </p>
      )}
    </div>
  );
}
