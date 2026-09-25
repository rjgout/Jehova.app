"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { getSocket } from "@/lib/socketClient";
import UserAvatar from "@/components/UserAvatar";
import { useT } from "@/components/I18nProvider";

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
  const t = useT();
  const [status, setStatus] = useState<ActivityStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Voorkomt dubbel annuleren terwijl het verzoek nog loopt.
  const [cancelling, setCancelling] = useState<string | null>(null);

  function reload() {
    void load();
  }

  function load() {
    // no-store: de API stuurt geen cacheheaders mee, en een geïnstalleerde
    // webapp mag hier nooit een oud antwoord uit zijn HTTP-cache gebruiken.
    return fetch("/api/activity-status", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(t("activeGames.errorStatus", { status: r.status }));
        return r.json();
      })
      .then((d) => {
        setStatus(d);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("activeGames.unknownError")));
  }

  useEffect(reload, []);

  useEffect(() => {
    const socket = getSocket();
    socket.on("game_cancelled", reload);
    socket.on("game_left", reload);
    // Een nieuwe of vervallen live-uitnodiging meteen tonen/weghalen.
    socket.on("game_invite", reload);
    socket.on("game_invite_revoked", reload);
    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      socket.off("game_cancelled", reload);
      socket.off("game_left", reload);
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

  async function cancelInvite(item: ActivityItem) {
    if (item.kind === "live") {
      if (!window.confirm(t("activeGames.confirmEnd"))) return;
      // De banner ververst zichzelf pas via het "game_cancelled"-event
      // hierboven, zodra de server het spel écht heeft verwijderd.
      getSocket().emit("cancel_game", { code: item.code });
      return;
    }
    if (!window.confirm(t("activeGames.confirmCancel", { name: item.opponentName ?? "" }))) return;
    setCancelling(item.id);
    const url = item.kind === "scrabble" ? `/api/scrabble/${item.id}/cancel` : `/api/challenges/${item.id}/cancel`;
    const response = await fetch(url, { method: "POST" }).catch(() => null);
    if (!response?.ok) {
      // Meestal: de ander heeft net geaccepteerd. Toon dan de actuele stand.
      const data = await response?.json().catch(() => null);
      window.alert(data?.error ?? t("activeGames.cancelFailed"));
    }
    await load();
    setCancelling(null);
  }

  const heading = <h2 className="text-sm font-extrabold text-slate-700 dark:text-slate-200">{t("activeGames.title")}</h2>;

  if (!status) {
    return (
      <div className="card flex flex-col gap-2 !py-3">
        {heading}
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {t("activeGames.loadFailed", { error })}{" "}
            <button className="font-bold underline" onClick={reload}>
              {t("activeGames.retry")}
            </button>
          </p>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500">{t("common.loading")}</p>
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
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("activeGames.empty")}</p>
      </div>
    );
  }

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
                  {t("activeGames.invitesYou", { name: item.opponentName ?? "" })}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 leading-snug">{t("activeGames.liveGame", { name: item.label })}</span>
              </span>
              <span className="btn-primary !px-3 !py-1.5 !text-xs shrink-0">{t("activeGames.join")}</span>
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
                {t("activeGames.invitesYouTo", { name: item.opponentName ?? "", label: item.label })}
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
              {item.myTurn ? t("activeGames.yourTurn") : ""}
            </Link>
          ))}
        </div>
      )}

      {invitesSent.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {invitesSent.map((item) => (
            // Een verstuurde uitnodiging blijft anders eindeloos wachten; daarom
            // naast de knop naar het spel altijd een knop om in te trekken.
            <div key={`sent-${item.kind}-${item.id}-${item.opponentId}`} className="flex items-stretch">
              <Link
                href={item.link}
                onClick={(event) => openGame(item, event)}
                className="btn-secondary !rounded-r-none !pr-3"
              >
                {item.opponentId ? (
                  <UserAvatar id={item.opponentId} handle={item.opponentName ?? ""} size="xs" className="mr-1.5 -my-1" />
                ) : (
                  <span className="mr-1.5">{KIND_ICON[item.kind]}</span>
                )}
                {t("activeGames.waitingFor", { name: item.opponentName ?? "", label: item.label })}
              </Link>
              <button
                onClick={() => cancelInvite(item)}
                disabled={cancelling === item.id}
                aria-label={
                  item.kind === "live"
                    ? t("activeGames.endAria", { name: item.opponentName ?? "" })
                    : t("activeGames.cancelAria", { name: item.opponentName ?? "" })
                }
                title={item.kind === "live" ? t("activeGames.end") : t("activeGames.cancel")}
                className="btn-secondary !rounded-l-none !border-l-0 !px-3 !text-red-500 dark:!text-red-400"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
