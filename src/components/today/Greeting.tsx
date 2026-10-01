import { Check } from "lucide-react";
import SystemIcon from "@/components/versado/SystemIcon";
import { getT } from "@/lib/i18n";
import { getLanguage } from "@/lib/languages";
import MascotSlot from "@/components/versado/MascotSlot";
import type { TodayData } from "@/lib/today";

// Kop van Vandaag: datum, persoonlijke begroeting en in één zin waar je
// reeks staat. Rechts de plek voor je persoonlijke metgezel (later).
export default function Greeting({ data, language }: { data: TodayData; language: string }) {
  const t = getT(language);
  const locale = getLanguage(language).intlLocale;
  const date = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: data.timeZone }).format(new Date());
  const { current, studiedToday } = data.streak;
  const status = studiedToday
    ? t("today.streakDone")
    : current === 1
      ? t("today.streakKeepOne")
      : current > 1
        ? t("today.streakKeep", { n: current })
        : t("today.streakStart");

  return (
    <header className="vs-rise flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold first-letter:uppercase text-vs-fg-3">{date}</p>
        <h1 className="mt-1 text-[1.75rem] font-extrabold leading-tight tracking-tight text-vs-fg sm:text-3xl">
          {t(`today.greeting.${data.partOfDay}`, { name: data.firstName })}
        </h1>
        <p className={`mt-2 inline-flex items-center gap-2 text-sm font-semibold ${studiedToday ? "text-vs-success" : current > 0 ? "text-vs-streak" : "text-vs-fg-2"}`}>
          {studiedToday ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> : <SystemIcon kind="streak" className="h-4 w-4" fill="none" aria-hidden />}
          {status}
        </p>
      </div>
      {/* NOVI begroet (novi/greeting via het mascotteregister). */}
      <MascotSlot character="novi" state="greeting" size={72} className="shrink-0" />
    </header>
  );
}
