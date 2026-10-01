"use client";

import { useEffect } from "react";
import { isValidTimeZone } from "@/lib/timeZone";

// Geeft de tijdzone van dit toestel door zodra die afwijkt van wat de server
// kent: bij de eerste keer, en na een reis waarbij de telefoon automatisch
// van tijdzone wisselt. De gebruiker merkt er niets van. Wat "vandaag" is
// voor de reeks, bepaalt de server (servertijd + deze tijdzone, zie
// src/lib/learning/streakRules.ts), dus een verzette toestelklok verandert
// daar niets aan.
export default function TimeZoneSync({ known }: { known: string | null }) {
  useEffect(() => {
    let lastSent = known;
    const sync = () => {
      let zone: string | undefined;
      try {
        zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch {
        return;
      }
      if (!isValidTimeZone(zone) || zone === lastSent) return;
      lastSent = zone;
      fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeZone: zone }),
      }).catch(() => {
        lastSent = known;
      });
    };
    sync();
    // Terug in de app na een vlucht: opnieuw kijken, zonder herladen.
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [known]);

  return null;
}
