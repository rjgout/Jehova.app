"use client";

import { Check, Pause, Snowflake } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { ProgressBar, type Person } from "@/components/social/shared";

export interface GroupTodayData {
  dayKey: string;
  eligible: number;
  contributors: number;
  required: number | null;
  missing: number;
  achieved: boolean;
  paused: "few-members" | "starts-tomorrow" | null;
  protectedBy: Person | null;
  meContributed: boolean;
}

/**
 * De stand van vandaag in aantallen mensen ("23 van 27 nodig"), nooit als
 * percentage: dat is een implementatiedetail. De balk is puur visueel.
 */
export default function GroupTodayLine({ today, size = "sm", showProtection = true }: { today: GroupTodayData; size?: "sm" | "lg"; showProtection?: boolean }) {
  const t = useT();
  const big = size === "lg";

  if (today.achieved) {
    return (
      <div className="flex flex-col gap-1.5">
        <ProgressBar value={1} max={1} done />
        <p className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 font-semibold ${big ? "text-base" : "text-xs"}`}>
          <span className="inline-flex items-center gap-1 text-vs-success">
            <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
            {t("together.group.achieved")}
          </span>
          <span className="text-vs-fg-2">{today.contributors === 1 ? t("together.group.contributedOne") : t("together.group.contributedMany", { n: today.contributors })}</span>
        </p>
      </div>
    );
  }

  if (today.required === null) {
    return (
      <p className={`flex items-start gap-1.5 font-semibold text-vs-fg-2 ${big ? "text-sm" : "text-xs"}`}>
        <Pause className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          {t("together.group.pausedTitle")}
          {big && <span className="block font-normal">{today.paused === "starts-tomorrow" ? t("together.group.pausedTomorrow") : t("together.group.pausedFew")}</span>}
        </span>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <ProgressBar value={today.contributors} max={today.required} done={false} />
      <p className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 font-semibold ${big ? "text-base" : "text-xs"}`}>
        <span className="tabular-nums text-vs-fg">{t("together.group.progress", { c: today.contributors, r: today.required })}</span>
        <span className="text-vs-fg-2">{today.missing === 1 ? t("together.group.missingOne") : t("together.group.missingMany", { n: today.missing })}</span>
        {showProtection && today.protectedBy && (
          <span className="inline-flex items-center gap-1 text-vs-accent">
            <Snowflake className="h-3.5 w-3.5" aria-hidden />
            {t("together.group.protectedBy", { name: today.protectedBy.handle })}
          </span>
        )}
      </p>
    </div>
  );
}
