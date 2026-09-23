"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { getSocket } from "@/lib/socketClient";

interface ActivityItem {
  kind: "challenge" | "scrabble" | "live" | "chapter-guess-solo";
  id: string;
  opponentName: string | null;
  label: string;
  link: string;
  myTurn: boolean | null;
  contentCollectionId?: string;
  code?: string;
}

interface ActivityStatus {
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

// Compacte melding bovenaan /live ("Spelen") zodat je openstaande
// uitnodigingen en lopende spellen (Uitdagingen, Woordspel, Live spel) ook
// ziet zonder eerst naar die spelpagina's zelf te gaan. Toont niets zodra
// er niets openstaat.
export default function ActiveGamesBanner() {
  const [status, setStatus] = useState<ActivityStatus | null>(null);

  function reload() {
    fetch("/api/activity-status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setStatus(d))
      .catch(() => {});
  }

  useEffect(reload, []);

  useEffect(() => {
    const socket = getSocket();
    socket.on("game_cancelled", reload);
    return () => {
      socket.off("game_cancelled", reload);
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

  if (!status) return null;
  const { invitesReceived, invitesSent, activeGames } = status;
  if (invitesReceived.length === 0 && invitesSent.length === 0 && activeGames.length === 0) return null;

  // Live-uitnodigingen krijgen een eigen regel mét een knop om te
  // beëindigen (zie cancelGame) — anders dan Uitdagingen/Woordspel kan een
  // live-lobby anders eindeloos op een reactie blijven wachten.
  const liveInvitesSent = invitesSent.filter((i) => i.kind === "live");
  const otherInvitesSent = invitesSent.filter((i) => i.kind !== "live");

  return (
    <div className="card flex flex-col gap-2 !py-3">
      {invitesReceived.length > 0 && (
        <div className="flex flex-col gap-1">
          {invitesReceived.map((item) => (
            <Link
              key={`${item.kind}-${item.id}`}
              href={item.link}
              onClick={(event) => openGame(item, event)}
              className="flex items-center gap-2 text-sm font-semibold text-brand-700 dark:text-brand-300 hover:underline"
            >
              <span>{KIND_ICON[item.kind]}</span>
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
              <span className="mr-1.5">{KIND_ICON[item.kind]}</span>
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
              <span>
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
