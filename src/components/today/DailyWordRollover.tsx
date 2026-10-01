"use client";

import { useEffect } from "react";

function currentWordDayKey(): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const date = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
  if (Number(values.hour) < 18) date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/** Vernieuwt een open dashboard precies wanneer het dagelijkse woord wisselt. */
export default function DailyWordRollover({ dayKey }: { dayKey: string }) {
  useEffect(() => {
    const check = () => {
      if (currentWordDayKey() !== dayKey) window.location.reload();
    };
    check();
    const timer = window.setInterval(check, 30_000);
    return () => window.clearInterval(timer);
  }, [dayKey]);

  return null;
}
