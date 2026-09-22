"use client";

import { useEffect, useState } from "react";
import type { LeagueTier } from "@prisma/client";
import { TIER_LABELS, TIER_ICONS } from "@/lib/leagues";

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

export default function LeaderboardClient() {
  const [scope, setScope] = useState<"league" | "friends" | "national">("league");
  const [data, setData] = useState<LeagueData | NationalData | null>(null);

  useEffect(() => {
    setData(null);
    fetch(`/api/leaderboard?scope=${scope}`)
      .then((r) => r.json())
      .then(setData);
  }, [scope]);

  const leagueData = data && data.scope !== "national" ? (data as LeagueData) : null;
  const nationalData = data && data.scope === "national" ? (data as NationalData) : null;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {scope === "league" && leagueData ? (
        <div className="card bg-gradient-to-br from-brand-500 to-brand-700 dark:from-brand-600 dark:to-brand-900 text-white flex flex-col items-center gap-1 !py-8">
          <span className="text-5xl" aria-hidden>
            {TIER_ICONS[leagueData.myTier]}
          </span>
          <h1 className="text-2xl font-extrabold">\{TIER_LABELS[leagueData.myTier]}</h1>
          <p className="text-brand-100 text-sm">Deze week</p>
        </div>
      ) : (
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">
          {scope === "national" ? "🇳🇱 Nederlandse ranglijst" : "Competitie"}
        </h1>
      )}

      <div className="flex bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-1 flex-wrap justify-center">
        <button
          onClick={() => setScope("league")}
          className={`px-4 py-1.5 rounded-xl text-sm font-bold ${
            scope === "league" ? "bg-brand-500 text-white" : "text-slate-500 dark:text-slate-300"
          }`}
        >
          Divisie
        </button>
        <button
          onClick={() => setScope("friends")}
          className={`px-4 py-1.5 rounded-xl text-sm font-bold ${
            scope === "friends" ? "bg-brand-500 text-white" : "text-slate-500 dark:text-slate-300"
          }`}
        >
          Vrienden
        </button>
        <button
          onClick={() => setScope("national")}
          className={`px-4 py-1.5 rounded-xl text-sm font-bold ${
            scope === "national" ? "bg-brand-500 text-white" : "text-slate-500 dark:text-slate-300"
          }`}
        >
          Nederlandse ranglijst
        </button>
      </div>

      {scope === "league" && leagueData && (
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center">
          De bovenste {leagueData.promoteCount} promoveren aan het einde van de week, de onderste {leagueData.demoteCount}{" "}
          degraderen.
        </p>
      )}

      {scope === "league" && leagueData?.xpGap && (
        <div className="card !py-3 !bg-gold-50 dark:!bg-slate-700 !border-gold-400/30 dark:!border-slate-600 text-center">
          <p className="font-extrabold text-gold-700 dark:text-gold-400">
            {leagueData.xpGap.toward === "SAFETY" && `Nog ${leagueData.xpGap.xp} XP tot veiligheid.`}
            {leagueData.xpGap.toward === "PROMOTION" && `Nog ${leagueData.xpGap.xp} XP tot promotie.`}
            {leagueData.xpGap.toward === "FIRST_PLACE" && `Nog ${leagueData.xpGap.xp} XP tot de eerste plek!`}
          </p>
        </div>
      )}

      {!data && <p className="text-slate-400">Laden...</p>}

      {leagueData && leagueData.entries.length === 0 && (
        <p className="text-slate-400">Nog geen XP verdiend deze week. Doe een les om op de ranglijst te komen!</p>
      )}

      {leagueData && leagueData.entries.length > 0 && (
        <div className="card flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
          {leagueData.entries.map((e) => (
            <div
              key={e.userId}
              className={`flex items-center gap-3 py-3 px-2 rounded-xl min-w-0 ${
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
                        ? "Promotiezone"
                        : e.zone === "RELEGATION"
                          ? "Degradatiezone"
                          : "Veilige zone"
                    }
                  >
                    {ZONE_DOT[e.zone]}
                  </span>
                )}
                <span className="min-w-0 truncate dark:text-slate-100" title={e.handle}>
                  {e.handle} {e.isMe && <span className="text-brand-500 dark:text-brand-300">(jij)</span>}
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
  return (
    <div className={`flex items-center gap-3 py-3 px-2 rounded-xl min-w-0 ${
      e.isMe ? "font-extrabold" : ""
    }`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="w-8 shrink-0 text-center text-lg">{MEDALS[e.rank - 1] ?? `#${e.rank}`}</span>
        <span className="min-w-0 truncate dark:text-slate-100" title={e.handle}>
          {e.handle} {e.isMe && <span className="text-brand-500 dark:text-brand-300">(jij)</span>}
        </span>
        {e.tier && (
          <span className="shrink-0" title={TIER_LABELS[e.tier]}>
            {TIER_ICONS[e.tier]}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 text-sm whitespace-nowrap">
        <span className="text-orange-500 font-bold">🔥 {e.currentStreak}</span>
        <span className="text-gold-600 dark:text-gold-400 font-extrabold">⭐ {e.xpTotal}</span>
      </div>
    </div>
  );
}
