"use client";

import { useEffect, useState } from "react";

function currentWordDayKey(now: number): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(now));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const date = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
  if (Number(values.hour) < 18) date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/**
 * Vernieuwt een open dashboard precies wanneer het dagelijkse woord wisselt.
 * Rekent met de servertijd (serverNow + verstreken tijd), niet met de klok
 * van het toestel: met een verkeerd ingestelde klok zou de pagina anders
 * eindeloos blijven herladen.
 */
export default function DailyWordRollover({ dayKey, serverNow }: { dayKey: string; serverNow: number }) {
  const [offset] = useState(() => serverNow - Date.now());
  useEffect(() => {
    const check = () => {
      if (currentWordDayKey(Date.now() + offset) !== dayKey) window.location.reload();
    };
    check();
    const timer = window.setInterval(check, 30_000);
    return () => window.clearInterval(timer);
  }, [dayKey, offset]);

  return null;
}
