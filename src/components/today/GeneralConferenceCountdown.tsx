"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { surfaceCard } from "@/components/versado/styles";
import { getGeneralConferenceCountdown, localDayKey } from "@/lib/generalConference";

// Countdown naar de Algemene Conferentie, bovenaan Vandaag (boven "Wacht op
// jou"). Alleen zichtbaar binnen 60 dagen vóór en tijdens het
// conferentieweekend; de regels staan in src/lib/generalConference.ts.
//
// De server kent de tijdzone van de gebruiker niet en rendert met de
// Nederlandse kalenderdag (serverToday). Na het laden rekent de browser
// opnieuw met de eigen kalenderdag, en om middernacht nog eens, zodat
// "vandaag", "morgen" en het aantal dagen overal ter wereld kloppen.
export default function GeneralConferenceCountdown({ serverToday, className = "" }: { serverToday: string; className?: string }) {
  const t = useT();
  const [today, setToday] = useState(serverToday);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      const now = new Date();
      setToday(localDayKey(now));
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      // Een paar seconden marge: de timer mag nooit nét vóór middernacht afgaan.
      timer = setTimeout(update, nextMidnight.getTime() - now.getTime() + 2000);
    };
    update();
    return () => clearTimeout(timer);
  }, []);

  const countdown = getGeneralConferenceCountdown(today);
  if (!countdown) return null;

  const when =
    countdown.kind === "today"
      ? t("today.conference.today")
      : countdown.kind === "tomorrow"
        ? t("today.conference.tomorrow")
        : t("today.conference.inDays", { n: countdown.days });

  // De buitenste div is het grid-item (className komt van Vandaag); de kaart
  // zelf rekt zo niet mee met de hoogte van de rij naast de zijkolom.
  return (
    <div className={className}>
      <div className={`vs-rise ${surfaceCard} flex items-center gap-3 px-4 py-2.5 sm:px-5`}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-vs-accent-soft text-vs-accent" aria-hidden>
          <CalendarDays className="h-4 w-4" />
        </span>
        {/* Smal: naam en countdown onder elkaar; breder: op één regel met "·". */}
        <p className="flex min-w-0 flex-col text-sm leading-snug sm:flex-row sm:flex-wrap sm:gap-x-1.5">
          <span className="font-bold text-vs-fg">{t("today.conference.title")}</span>
          <span className="hidden text-vs-fg-3 sm:inline" aria-hidden>·</span>
          <span className="sr-only">, </span>
          <span className="font-semibold text-vs-fg-2">{when}</span>
        </p>
      </div>
    </div>
  );
}
