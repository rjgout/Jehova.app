"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield } from "lucide-react";
import SystemIcon from "@/components/versado/SystemIcon";
import { onXpChanged } from "@/lib/xpBroadcast";
import { useT, useUiLanguage } from "@/components/I18nProvider";
import { getLanguage } from "@/lib/languages";
import type { MessageKey } from "@/lib/i18n/core";

// Beloningsstatus in de header: reeks, XP en divisie. Bewust prominent (dit
// zijn de belangrijkste motivatoren) en elk een directe ingang naar de
// eigen pagina. Kleuren komen uit de Versado-tokens (streak, xp, league),
// zodat ze in licht en donker dezelfde nadruk houden.
export default function NavUserBadges({
  streak,
  xp,
  studiedToday,
  tier,
}: {
  streak: number;
  xp: number;
  studiedToday: boolean;
  tier: string | null;
}) {
  // De props zijn de server-gerenderde waarde bij laden van de pagina —
  // vanaf dan houdt deze component ze zelf bij, zodat een XP-wijziging
  // ergens anders op dezelfde pagina (zie src/lib/xpBroadcast.ts) meteen
  // zichtbaar is zonder op de volgende paginanavigatie te hoeven wachten.
  const [values, setValues] = useState({ streak, xp, studiedToday });
  const t = useT();
  const locale = getLanguage(useUiLanguage()).intlLocale;

  useEffect(() => {
    return onXpChanged(() => {
      fetch("/api/user-badges")
        .then((r) => r.json())
        // Een XP-wijziging komt van studeren of spelen: de reeks is dan voor
        // vandaag binnen.
        .then((data) => setValues({ streak: data.currentStreak, xp: data.xpTotal, studiedToday: true }))
        .catch(() => {});
    });
  }, []);

  const number = (n: number) => new Intl.NumberFormat(locale, n >= 10000 ? { notation: "compact", maximumFractionDigits: 1 } : {}).format(n);
  const chip = "vs-motion flex h-10 items-center gap-1.5 rounded-full px-2.5 text-sm font-extrabold tabular-nums transition-colors";

  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      <Link
        href="/streak"
        title={t("header.streak")}
        aria-label={t("header.streakAria", { n: values.streak })}
        className={`${chip} ${values.studiedToday ? "text-vs-streak hover:bg-vs-streak-soft" : "text-vs-fg-3 hover:bg-vs-subtle"}`}
      >
        <SystemIcon kind="streak" className="h-[18px] w-[18px]" fill={values.studiedToday ? "currentColor" : "none"} aria-hidden />
        {number(values.streak)}
      </Link>
      <Link href="/xp" title={t("header.xp")} aria-label={t("header.xpAria", { n: values.xp })} className={`${chip} text-vs-xp hover:bg-vs-xp-soft`}>
        <SystemIcon kind="xp" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden />
        {number(values.xp)}
      </Link>
      {tier && (
        <Link
          href="/competition"
          title={t(`tiers.${tier}` as MessageKey)}
          aria-label={t("header.divisionAria", { name: t(`tiers.${tier}` as MessageKey) })}
          // Op de kleinste schermen alleen het schild: de naam past er niet naast.
          className={`${chip} hidden min-[380px]:flex text-vs-league hover:bg-vs-league-soft`}
        >
          <Shield className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden />
          <span className="hidden sm:inline">{t(`tiers.${tier}` as MessageKey)}</span>
        </Link>
      )}
    </div>
  );
}
