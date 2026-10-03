"use client";

import type { LeagueTier } from "@prisma/client";
import { Lock } from "lucide-react";
import DivisionEmblem from "@/components/versado/DivisionEmblem";
import RankMedal from "@/components/versado/RankMedal";
import { useT } from "@/components/I18nProvider";
import { translateOr } from "@/lib/i18n/core";
import { ProfileCard } from "@/components/profile/settings";
import type { ProfileData } from "@/components/profile/profileData";

// Inhoudelijke profielonderdelen: geen instellingen, dus geen rijen met
// schakelaars, maar wel dezelfde kaarten, kopjes en tokens als de rest van
// het profiel (zie docs/PROFIEL.md).

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0">
      <div className="font-extrabold text-vs-fg">{value}</div>
      <div className="text-xs font-bold uppercase text-vs-fg-3">{label}</div>
    </div>
  );
}

export function CompetitionView({ data }: { data: ProfileData }) {
  const t = useT();
  const tier = (value: LeagueTier) => t(`tiers.${value}`);
  const medals = [
    [1, data.medals.gold, "profile.medalGold"],
    [2, data.medals.silver, "profile.medalSilver"],
    [3, data.medals.bronze, "profile.medalBronze"],
  ] as const;
  return (
    <>
      <section className="grid grid-cols-2 gap-3 rounded-2xl border border-vs-xp/30 bg-vs-xp-soft p-4 sm:p-5">
        <div className="flex min-w-0 flex-col items-start gap-1">
          {data.tier && <DivisionEmblem tier={data.tier} className="h-20 w-20" />}
          <p className="text-2xl font-extrabold text-vs-xp">{data.tier ? tier(data.tier) : "—"}</p>
          <p className="text-xs font-bold uppercase text-vs-fg-2">
            {data.groupPosition ? `#${data.groupPosition} · ` : ""}
            {t("profile.thisWeek")}
          </p>
        </div>
        <div className="flex min-w-0 flex-col items-end gap-1 text-right">
          {data.bestTierEver && <DivisionEmblem tier={data.bestTierEver} className="h-16 w-16" />}
          <p className="text-lg font-extrabold text-vs-xp">{data.bestTierEver ? tier(data.bestTierEver) : "—"}</p>
          <p className="text-xs font-bold uppercase text-vs-fg-2">{t("profile.bestTier")}</p>
        </div>
      </section>

      <ProfileCard title={t("profile.medals")} description={t("profile.medalsHint")}>
        <div className="mt-1 grid grid-cols-3 gap-2 text-center">
          {medals.map(([rank, count, label]) => (
            <div key={rank} className="flex flex-col items-center gap-1">
              <RankMedal rank={rank} className="h-10 w-10 text-lg" />
              <span className="text-xl font-extrabold text-vs-fg">{count}</span>
              <span className="text-xs font-bold uppercase text-vs-fg-2">{t(label)}</span>
            </div>
          ))}
        </div>
      </ProfileCard>

      {/* Twee kolommen op een telefoon: met vier liepen de labels in elkaar. */}
      <ProfileCard>
        <div className="grid grid-cols-2 gap-x-2 gap-y-4 text-center sm:grid-cols-4">
          <Stat value={data.lifetimePromotions.toString()} label={t("profile.promotions")} />
          <Stat value={data.lifetimeDemotions.toString()} label={t("profile.demotions")} />
          <Stat value={data.competitionsWon.toString()} label={t("profile.competitions")} />
          <Stat value={data.bestNationalRank ? `#${data.bestNationalRank}` : "—"} label={t("profile.nationalRank")} />
        </div>
      </ProfileCard>

      {data.seasons.length > 0 && (
        <ProfileCard title={t("pages.seasons")}>
          <div className="divide-y divide-vs-line">
            {data.seasons.map((season) => (
              <div key={season.seasonIndex} className="flex min-h-12 items-center justify-between gap-3 py-2 text-sm">
                <span className="font-bold text-vs-fg">{t("profile.seasonN", { n: season.seasonIndex })}</span>
                <span className="inline-flex items-center gap-2 text-right text-vs-fg-2">
                  <DivisionEmblem tier={season.finalTier} className="h-8 w-8" />
                  {tier(season.finalTier)}
                  {season.finalGroupPosition ? ` — #${season.finalGroupPosition}` : ""}
                </span>
              </div>
            ))}
          </div>
        </ProfileCard>
      )}
    </>
  );
}

export function AchievementsView({ data }: { data: ProfileData }) {
  const t = useT();
  const total = data.achievements.length;
  const earned = data.achievements.filter((a) => a.earnedAt).length;
  const percent = total > 0 ? Math.round((earned / total) * 100) : 0;
  return (
    <ProfileCard>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-extrabold text-vs-fg">{t("profile.earnedOf", { earned, total })}</p>
        <p className="text-sm font-bold text-vs-fg-2">{percent}%</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-vs-subtle" aria-hidden>
        <div className="h-full rounded-full bg-vs-xp-fill" style={{ width: `${percent}%` }} />
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {data.achievements.map((achievement) => {
          const done = Boolean(achievement.earnedAt);
          const name = translateOr(t, `achievements.${achievement.slug}.name`, achievement.name);
          const description = translateOr(t, `achievements.${achievement.slug}.description`, achievement.description);
          return (
            <li
              key={achievement.slug}
              title={description}
              className={`relative flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center ${
                done ? "border-vs-xp/30 bg-vs-xp-soft" : "border-vs-line bg-vs-subtle"
              }`}
            >
              {!done && <Lock className="absolute right-2 top-2 h-3.5 w-3.5 text-vs-fg-3" aria-hidden />}
              <span className={`text-3xl leading-none ${done ? "" : "opacity-40 grayscale"}`} aria-hidden>
                {achievement.icon}
              </span>
              <span className={`text-xs font-bold leading-snug ${done ? "text-vs-fg" : "text-vs-fg-3"}`}>{name}</span>
              <span className="sr-only">
                {done ? t("profile.achievementEarned") : t("profile.achievementLocked")}. {description}
              </span>
            </li>
          );
        })}
      </ul>
    </ProfileCard>
  );
}
