// Tijdzones in Versado. Het uitgangspunt:
//
//   UTC is de waarheid voor tijdstippen (database, server, conferentiesessies);
//   de IANA-tijdzone van de gebruiker bepaalt welke kalenderdag daarbij hoort.
//
// Persoonlijke "vandaag"-logica (reeks, studeerherinneringen, begroeting)
// rekent met userDayKey/zonedParts; gedeelde, wereldwijde dingen (woord van
// de dag, weekcompetitie, dagelijkse Alleskenner) houden één vaste grens voor
// iedereen en gebruiken dit bestand niet. Zie docs/TIJD.md.
//
// Alleen Intl, geen extra dependency: Node en elke moderne browser kennen de
// IANA-database, inclusief zomer- en wintertijd. Veilig in de eager-keten van
// server.ts en in client components (geen Next-API's).

/** Voor accounts waarvan de browser nog geen tijdzone heeft doorgegeven: het oude gedrag. */
export const DEFAULT_TIME_ZONE = "Europe/Amsterdam";

/**
 * De dag-bucket waarin oudere reeksgegevens (User.lastStudyDate en StreakDay
 * van vóór de tijdzones) zijn vastgelegd: dayKey() in src/lib/dates.ts was
 * altijd een UTC-dag.
 */
export const LEGACY_DAY_TIME_ZONE = "UTC";

const validity = new Map<string, boolean>();

/** Is dit een IANA-tijdzone die Intl kent (bv. "Europe/Amsterdam")? Offsets als "+01:00" tellen niet. */
export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 64) return false;
  // Alleen namen ("Regio/Stad", plus "UTC"), geen losse offsets: die kennen
  // geen zomertijd.
  if (!/^[A-Za-z][A-Za-z0-9_+\-]*(\/[A-Za-z0-9_+\-]+)*$/.test(value)) return false;
  const known = validity.get(value);
  if (known !== undefined) return known;
  let ok = false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    ok = true;
  } catch {
    ok = false;
  }
  validity.set(value, ok);
  return ok;
}

/** De tijdzone om mee te rekenen: de opgeslagen, of anders de veilige standaard. */
export function resolveTimeZone(value: string | null | undefined): string {
  return isValidTimeZone(value) ? value : DEFAULT_TIME_ZONE;
}

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  /** 0 = zondag … 6 = zaterdag */
  weekday: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();
const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Datum en kloktijd van een absoluut moment in een tijdzone. */
export function zonedParts(date: Date, timeZone: string): ZonedParts {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
    });
    formatters.set(timeZone, formatter);
  }
  const parts = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // Sommige ICU-versies geven middernacht als "24".
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    weekday: WEEKDAYS[parts.weekday] ?? 0,
  };
}

/** De kalenderdag (yyyy-mm-dd) van een absoluut moment in een tijdzone. */
export function dayKeyInZone(date: Date, timeZone: string): string {
  const { year, month, day } = zonedParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "HH:MM" in een tijdzone (bv. voor het tijdstip van een herinnering). */
export function hhmmInZone(date: Date, timeZone: string): string {
  const { hour, minute } = zonedParts(date, timeZone);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Hoeveel minuten de tijdzone op dit moment voor loopt op UTC (zomertijd inbegrepen). */
export function zoneOffsetMinutes(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const actual = Math.floor(date.getTime() / 60_000) * 60_000;
  return Math.round((asUtc - actual) / 60_000);
}

/**
 * Het absolute moment waarop een lokale kalenderdag begint. Op een dag met
 * een zomertijdwissel klopt dit ook, omdat de offset van dát moment wordt
 * gebruikt (twee rondes: de offset kan rond de wissel verschillen).
 */
export function startOfLocalDay(dayKey: string, timeZone: string): Date {
  const [y, m, d] = dayKey.split("-").map(Number);
  const midnightAsUtc = Date.UTC(y, m - 1, d);
  let guess = midnightAsUtc - zoneOffsetMinutes(new Date(midnightAsUtc), timeZone) * 60_000;
  guess = midnightAsUtc - zoneOffsetMinutes(new Date(guess), timeZone) * 60_000;
  return new Date(guess);
}

/** Begin (inclusief) en einde (exclusief) van een lokale kalenderdag, als absolute momenten. */
export function localDayRange(dayKey: string, timeZone: string): { start: Date; end: Date } {
  const [y, m, d] = dayKey.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  return { start: startOfLocalDay(dayKey, timeZone), end: startOfLocalDay(next, timeZone) };
}

/** De tijdzone van een gebruiker (met standaard) en zijn kalenderdag van nu. */
export function userTimeZone(user: { timeZone?: string | null }): string {
  return resolveTimeZone(user.timeZone);
}

export function userDayKey(user: { timeZone?: string | null }, now: Date = new Date()): string {
  return dayKeyInZone(now, userTimeZone(user));
}
