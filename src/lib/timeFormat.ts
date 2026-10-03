// Tijden voor weergave, in de taal van de app. Geen server-imports.

/** "2 uur geleden", "gisteren": afgerond op de grootste passende eenheid. */
export function relativeTime(iso: string | null | undefined, locale: string, now = Date.now()): string | null {
  if (!iso) return null;
  // Nooit in de toekomst: een klein klokverschil tussen database en server
  // zou anders "over een minuut" opleveren.
  const seconds = Math.min(0, Math.round((new Date(iso).getTime() - now) / 1000));
  if (!Number.isFinite(seconds)) return null;
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return format.format(0, "minute");
}

/** "over 7 uur": resterende tijd zonder de misleidende kalenderterm "morgen". */
export function futureTime(iso: string | null | undefined, locale: string, now = Date.now()): string | null {
  if (!iso) return null;
  const seconds = Math.ceil((new Date(iso).getTime() - now) / 1000);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "always" });
  if (seconds >= 3600) return format.format(Math.ceil(seconds / 3600), "hour");
  return format.format(Math.max(1, Math.ceil(seconds / 60)), "minute");
}

/** "12:34" of "1:02:05". */
export function clockDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${rest}` : `${m}:${rest}`;
}
