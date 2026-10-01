import { Check, Flame } from "lucide-react";
import { getT } from "@/lib/i18n";
import { getLanguage } from "@/lib/languages";
import MascotSlot from "@/components/versado/MascotSlot";
import type { TodayData } from "@/lib/today";

// Kop van Vandaag: datum, persoonlijke begroeting en in één zin waar je
// reeks staat. Rechts de plek voor je persoonlijke metgezel (later).
export default function Greeting({ data, language }: { data: TodayData; language: string }) {
  const t = getT(language);
  const locale = getLanguage(language).intlLocale;
  const date = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Amsterdam" }).format(new Date());
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
          {studiedToday ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> : <Flame className="h-4 w-4" strokeWidth={2.4} aria-hidden />}
          {status}
        </p>
      </div>
      {/* Persoonlijke metgezel; rendert niets tot de mascottes er zijn. */}
      <MascotSlot character="novi" state="greeting" size={72} className="shrink-0" />
    </header>
  );
}
