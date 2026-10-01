"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { useT, useUiLanguage } from "@/components/I18nProvider";
import { surfaceCard } from "@/components/versado/styles";
import { getLanguage } from "@/lib/languages";
import { getGeneralConferenceStatus, splitMinutes } from "@/lib/generalConference";
import { isValidTimeZone } from "@/lib/timeZone";

// Countdown naar de Algemene Conferentie, bovenaan Vandaag (boven "Wacht op
// jou"). Vóór de conferentie in kalenderdagen, tijdens het weekend per
// sessie ("Nu bezig", "Volgende sessie · over 2u 14m"). De regels staan in
// src/lib/generalConference.ts.
//
// Tijd: de server geeft zijn eigen tijd mee (serverNow); het verschil met de
// toestelklok wordt één keer bepaald, zodat een verkeerd ingestelde klok de
// countdown niet verschuift. Tijdzone: eerst die van het account (zodat
// server en eerste weergave gelijk zijn), daarna die van dit toestel.
// Bijwerken: één keer per minuut, precies op de minuutgrens, en direct als
// de app weer in beeld komt.
export default function GeneralConferenceCountdown({ serverNow, timeZone, className = "" }: { serverNow: number; timeZone: string; className?: string }) {
  const t = useT();
  const locale = getLanguage(useUiLanguage()).intlLocale;
  const [offset] = useState(() => serverNow - Date.now());
  const [now, setNow] = useState(serverNow);
  const [zone, setZone] = useState(timeZone);

  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (isValidTimeZone(detected)) setZone(detected);
    } catch {
      // geen Intl-tijdzone: die van het account blijft gelden
    }

    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      clearTimeout(timer);
      const current = Date.now() + offset;
      setNow(current);
      timer = setTimeout(tick, 60_000 - (current % 60_000) + 50);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [offset]);

  const status = getGeneralConferenceStatus(new Date(now), zone);
  if (!status) return null;

  const clock = (iso: string) => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: zone }).format(new Date(iso));
  const duration = (total: number) => {
    const { hours, minutes } = splitMinutes(total);
    if (hours === 0) return t("today.conference.durationM", { m: minutes });
    if (minutes === 0) return t("today.conference.durationH", { h: hours });
    return t("today.conference.durationHM", { h: hours, m: minutes });
  };

  let label = t("today.conference.title");
  let detail: string;
  switch (status.kind) {
    case "days":
      detail = t("today.conference.inDays", { n: status.days });
      break;
    case "tomorrow":
      detail = status.at ? t("today.conference.tomorrowAt", { time: clock(status.at) }) : t("today.conference.tomorrow");
      break;
    case "today":
      detail = status.at ? t("today.conference.todayAt", { time: clock(status.at) }) : t("today.conference.today");
      break;
    case "live":
      detail = t("today.conference.live");
      break;
    case "next":
      label = t("today.conference.nextSession");
      detail = t("today.conference.inDuration", { duration: duration(status.minutes) });
      break;
  }

  // De buitenste div is het grid-item (className komt van Vandaag); de kaart
  // zelf rekt zo niet mee met de hoogte van de rij naast de zijkolom.
  return (
    <div className={className}>
      <div className={`vs-rise ${surfaceCard} flex items-center gap-3 px-4 py-2.5 sm:px-5`}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-vs-accent-soft text-vs-accent" aria-hidden>
          <CalendarDays className="h-4 w-4" />
        </span>
        {/* Smal: titel en status onder elkaar; breder: op één regel met "·". */}
        <p className="flex min-w-0 flex-col text-sm leading-snug sm:flex-row sm:flex-wrap sm:gap-x-1.5">
          <span className="font-bold text-vs-fg">{label}</span>
          <span className="hidden text-vs-fg-3 sm:inline" aria-hidden>·</span>
          <span className="sr-only">, </span>
          <span className={`font-semibold ${status.kind === "live" ? "text-vs-accent" : "text-vs-fg-2"}`}>{detail}</span>
        </p>
      </div>
    </div>
  );
}
