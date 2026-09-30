"use client";

import { useEffect, useState } from "react";
import type { LeagueTier } from "@prisma/client";
import { TIER_ICONS } from "@/lib/leagues";
import { useT } from "@/components/I18nProvider";
import type { TFunction } from "@/lib/i18n/core";
import UserAvatar from "@/components/UserAvatar";
import DivisionScroller from "@/components/DivisionScroller";

type Zone = "PROMOTION" | "SAFE" | "RELEGATION" | null;

interface LeagueEntry {
  rank: number;
  userId: string;
  handle: string;
  xp: number;
  tier: LeagueTier;
  isMe: boolean;
  zone: Zone;
}

interface XpGap {
  toward: "PROMOTION" | "SAFETY" | "FIRST_PLACE";
  xp: number;
}

interface LeagueData {
  scope: "league" | "friends";
  myTier: LeagueTier;
  highestTier: LeagueTier;
  promoteCount: number;
  demoteCount: number;
  hasActivityThisWeek: boolean;
  xpGap: XpGap | null;
  entries: LeagueEntry[];
}

interface NationalEntry {
  rank: number;
  userId: string;
  handle: string;
  xpTotal: number;
  currentStreak: number;
  tier: LeagueTier | null;
  isMe: boolean;
}

interface NationalData {
  scope: "national";
  entries: NationalEntry[];
  me: NationalEntry | null;
}

const MEDALS = ["🥇", "🥈", "🥉"];

const ZONE_DOT: Record<Exclude<Zone, null>, string> = {
  PROMOTION: "🟢",
  SAFE: "⚪",
  RELEGATION: "🔴",
};

/**
 * Uitleg van promotie/degradatie voor de huidige stand. De aantallen komen
 * van de server en hangen af van hoeveel spelers er deze week meedoen.
 */
function movementText(data: LeagueData, t: TFunction): string {
  if (data.entries.length === 0) {
    return t("leaderboard.movementEmpty");
  }
  const up =
    data.promoteCount === 0
      ? t("leaderboard.upNone")
      : data.promoteCount === 1
        ? t("leaderboard.upOne")
        : t("leaderboard.upMany", { n: data.promoteCount });
  const down =
    data.demoteCount === 0
      ? t("leaderboard.downNone")
      : data.demoteCount === 1
        ? t("leaderboard.downOne")
        : t("leaderboard.downMany", { n: data.demoteCount });
  return t("leaderboard.movement", { up, down });
}

export default function LeaderboardClient() {
  const t = useT();
  const [scope, setScope] = useState<"league" | "friends" | "national">("league");
  const [data, setData] = useState<LeagueData | NationalData | null>(null);
  // Blijft staan bij het wisselen van tabblad, zodat de divisiebalk niet
  // leeg wordt terwijl de nieuwe lijst laadt.
  const [tiers, setTiers] = useState<{ current: LeagueTier; highest: LeagueTier } | null>(null);

  useEffect(() => {
    setData(null);
    fetch(`/api/leaderboard?scope=${scope}`)
      .then((r) => r.json())
      .then((next: LeagueData | NationalData) => {
        setData(next);
        if (next.scope !== "national") setTiers({ current: next.myTier, highest: next.highestTier });
      });
  }, [scope]);

  const leagueData = data && data.scope !== "national" ? (data as LeagueData) : null;
  const nationalData = data && data.scope === "national" ? (data as NationalData) : null;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-4 sm:gap-5">
      {scope === "league" ? (
        <div className="card bg-gradient-to-br from-brand-500 to-brand-700 dark:from-brand-600 dark:to-brand-900 text-white !border-0 !px-0 !py-3 h-32 sm:h-36 flex flex-col items-center justify-center gap-1 overflow-hidden">
          <h1 className="sr-only">
            {t("nav.competition")} — {tiers ? t(`tiers.${tiers.current}`) : t("leaderboard.divisionLower")}
          </h1>
          {tiers && <DivisionScroller current={tiers.current} highest={tiers.highest} />}
        </div>
      ) : (
        <header className="flex flex-col gap-0.5 px-1">
          <h1 className="text-xl font-extrabold text-brand-800 dark:text-brand-300">
            {scope === "friends" ? t("nav.friends") : t("leaderboard.national")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {scope === "friends" ? t("leaderboard.friendsSub") : t("leaderboard.nationalSub")}
          </p>
        </header>
      )}

      <div className="flex w-full rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
        <button
          onClick={() => setScope("league")}
          className={`min-w-0 flex-1 rounded-full px-2 py-1.5 text-xs font-bold transition sm:px-3 sm:text-sm ${
            scope === "league" ? "bg-brand-500 text-white" : "text-slate-500 dark:text-slate-300"
          }`}
        >
          {t("leaderboard.division")}
        </button>
        <button
          onClick={() => setScope("friends")}
          className={`min-w-0 flex-1 rounded-full px-2 py-1.5 text-xs font-bold transition sm:px-3 sm:text-sm ${
            scope === "friends" ? "bg-brand-500 text-white" : "text-slate-500 dark:text-slate-300"
          }`}
        >
          {t("nav.friends")}
        </button>
        <button
          onClick={() => setScope("national")}
          className={`min-w-0 flex-1 rounded-full px-2 py-1.5 text-xs font-bold transition sm:px-3 sm:text-sm ${
            scope === "national" ? "bg-brand-500 text-white" : "text-slate-500 dark:text-slate-300"
          }`}
        >
          {t("leaderboard.national")}
        </button>
      </div>

      {scope === "league" && leagueData && (
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center">{movementText(leagueData, t)}</p>
      )}

      {scope === "league" && leagueData?.xpGap && (
        <div className="card !py-2.5 !bg-gold-50 dark:!bg-slate-700 !border-gold-400/30 dark:!border-slate-600 text-center">
          <p className="font-extrabold text-gold-700 dark:text-gold-400">
            {leagueData.xpGap.toward === "SAFETY" && t("leaderboard.gapSafety", { xp: leagueData.xpGap.xp })}
            {leagueData.xpGap.toward === "PROMOTION" && t("leaderboard.gapPromotion", { xp: leagueData.xpGap.xp })}
            {leagueData.xpGap.toward === "FIRST_PLACE" && t("leaderboard.gapFirst", { xp: leagueData.xpGap.xp })}
          </p>
        </div>
      )}

      {!data && <p className="text-slate-400">{t("common.loading")}</p>}

      {leagueData && leagueData.entries.length === 0 && (
        <p className="text-slate-400">{t("leaderboard.noXp")}</p>
      )}

      {leagueData && leagueData.entries.length > 0 && (
        <div className="card flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
          {leagueData.entries.map((e) => (
            <div
              key={e.userId}
              className={`flex items-center gap-2.5 px-2 py-2.5 rounded-xl min-w-0 ${
                e.isMe ? "bg-brand-50 dark:bg-slate-700 font-extrabold" : ""
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="w-8 shrink-0 text-center text-lg">{MEDALS[e.rank - 1] ?? e.rank}</span>
                {e.zone && (
                  <span
                    className="shrink-0"
                    title={
                      e.zone === "PROMOTION"
                        ? t("leaderboard.zonePromotion")
                        : e.zone === "RELEGATION"
                          ? t("leaderboard.zoneRelegation")
                          : t("leaderboard.zoneSafe")
                    }
                  >
                    {ZONE_DOT[e.zone]}
                  </span>
                )}
                <UserAvatar id={e.userId} handle={e.handle} />
                <span className="min-w-0 truncate dark:text-slate-100" title={e.handle}>
                  {e.handle} {e.isMe && <span className="text-brand-500 dark:text-brand-300">{t("lobby.you")}</span>}
                </span>
              </div>
              <span className="shrink-0 whitespace-nowrap text-gold-600 dark:text-gold-400 font-extrabold">
                {e.xp} XP
              </span>
            </div>
          ))}
        </div>
      )}

      {nationalData && (
        <div className="flex flex-col gap-3">
          <div className="card flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
            {nationalData.entries.map((e) => (
              <NationalRow key={e.userId} e={e} />
            ))}
          </div>
          {nationalData.me && (
            <div className="card !py-3 !bg-gold-50 dark:!bg-slate-700 !border-gold-400/30 dark:!border-slate-600">
              <NationalRow e={nationalData.me} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NationalRow({ e }: { e: NationalEntry }) {
  const t = useT();
  return (
    <div className={`flex items-center gap-2.5 px-2 py-2.5 rounded-xl min-w-0 ${
      e.isMe ? "font-extrabold" : ""
    }`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="w-8 shrink-0 text-center text-lg">{MEDALS[e.rank - 1] ?? `#${e.rank}`}</span>
        <UserAvatar id={e.userId} handle={e.handle} />
        <span className="min-w-0 truncate dark:text-slate-100" title={e.handle}>
          {e.handle} {e.isMe && <span className="text-brand-500 dark:text-brand-300">{t("lobby.you")}</span>}
        </span>
        {e.tier && (
          <span className="shrink-0" title={t(`tiers.${e.tier}`)}>
            {TIER_ICONS[e.tier]}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5 text-xs whitespace-nowrap sm:gap-2 sm:text-sm">
        <span className="text-orange-500 font-bold">🔥 {e.currentStreak}</span>
        <span className="text-gold-600 dark:text-gold-400 font-extrabold">⭐ {e.xpTotal}</span>
      </div>
    </div>
  );
}
