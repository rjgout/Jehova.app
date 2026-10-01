import { daysBetween } from "@/lib/dates";
import { dayKeyInZone } from "@/lib/timeZone";

// De Algemene Conferentie: de enige plek met conferentiedata en de regels
// voor de countdown op Vandaag (GeneralConferenceCountdown.tsx).
//
// Sessietijden zijn absolute momenten (UTC). Ze worden alleen voor de
// weergave omgezet naar de tijdzone van de gebruiker: iemand in Nederland en
// iemand in Los Angeles zien een andere kloktijd voor dezelfde sessie. Ook
// "over N dagen", "morgen" en "vandaag" gaan over de kalenderdag van de
// gebruiker. Zie docs/TIJD.md.

export interface ConferenceSession {
  /** Absoluut begintijdstip, ISO 8601 in UTC. */
  start: string;
  /** Absoluut eindtijdstip, ISO 8601 in UTC. */
  end: string;
}

export interface GeneralConference {
  /** Zaterdag, eerste conferentiedag (kalenderdatum in Salt Lake City). */
  start: string;
  /** Zondag, laatste conferentiedag. */
  end: string;
  /**
   * "official": datum door de Kerk aangekondigd. "expected": nog niet
   * aangekondigd, afgeleid uit het vaste patroon (het weekend van de eerste
   * zondag van april en oktober).
   */
  status: "official" | "expected";
  /**
   * Alleen als de sessietijden officieel bekend zijn; anders weglaten (geen
   * verzonnen tijden). Zonder sessies werkt de countdown op datum.
   */
  sessions?: readonly ConferenceSession[];
}

// Sessies van 10:00 en 14:00 Mountain Daylight Time (UTC-6), elk 2 uur.
function mdtSessions(saturday: string, sunday: string): ConferenceSession[] {
  return [saturday, sunday].flatMap((day) => [
    { start: `${day}T16:00:00Z`, end: `${day}T18:00:00Z` },
    { start: `${day}T20:00:00Z`, end: `${day}T22:00:00Z` },
  ]);
}

/**
 * Conferenties in chronologische volgorde. Bijwerken: een regel toevoegen of
 * "expected" vervangen door de officiële datum en sessies zodra de Kerk ze
 * aankondigt; tests/generalConference.test.ts bewaakt vorm en volgorde.
 *
 * Bronnen: oktober 2026 (newsroom: vier sessies van 2 uur, 10:00 en 14:00
 * MDT); april en oktober 2027 (Church News, 25 sept. 2026: sessies om 10:00
 * en 14:00 MDT; de duur wordt daar niet genoemd, 2 uur is de vaste opzet).
 */
export const generalConferenceDates: readonly GeneralConference[] = [
  { start: "2026-10-03", end: "2026-10-04", status: "official", sessions: mdtSessions("2026-10-03", "2026-10-04") },
  { start: "2027-04-03", end: "2027-04-04", status: "official", sessions: mdtSessions("2027-04-03", "2027-04-04") },
  { start: "2027-10-02", end: "2027-10-03", status: "official", sessions: mdtSessions("2027-10-02", "2027-10-03") },
  { start: "2028-04-01", end: "2028-04-02", status: "expected" },
  { start: "2028-09-30", end: "2028-10-01", status: "expected" },
  { start: "2029-03-31", end: "2029-04-01", status: "expected" },
  { start: "2029-10-06", end: "2029-10-07", status: "expected" },
  { start: "2030-04-06", end: "2030-04-07", status: "expected" },
  { start: "2030-10-05", end: "2030-10-06", status: "expected" },
  { start: "2031-04-05", end: "2031-04-06", status: "expected" },
  { start: "2031-10-04", end: "2031-10-05", status: "expected" },
  { start: "2032-04-03", end: "2032-04-04", status: "expected" },
  { start: "2032-10-02", end: "2032-10-03", status: "expected" },
  { start: "2033-04-02", end: "2033-04-03", status: "expected" },
  { start: "2033-10-01", end: "2033-10-02", status: "expected" },
  { start: "2034-04-01", end: "2034-04-02", status: "expected" },
  { start: "2034-09-30", end: "2034-10-01", status: "expected" },
  { start: "2035-03-31", end: "2035-04-01", status: "expected" },
  { start: "2035-10-06", end: "2035-10-07", status: "expected" },
  { start: "2036-04-05", end: "2036-04-06", status: "expected" },
  { start: "2036-10-04", end: "2036-10-05", status: "expected" },
];

/** Vanaf hoeveel kalenderdagen vóór de eerste sessie de countdown verschijnt. */
export const COUNTDOWN_WINDOW_DAYS = 60;

type Dates = readonly GeneralConference[];

function isFinished(conference: GeneralConference, now: Date, timeZone: string): boolean {
  const last = conference.sessions?.at(-1);
  if (last) return now.getTime() >= Date.parse(last.end);
  return dayKeyInZone(now, timeZone) > conference.end;
}

/** De lopende conferentie, of anders de eerste die nog moet komen. */
export function getNextGeneralConference(now: Date, timeZone: string, dates: Dates = generalConferenceDates): GeneralConference | null {
  return dates.find((conference) => !isFinished(conference, now, timeZone)) ?? null;
}

/** De conferentie ná de eerstvolgende. */
export function getFollowingGeneralConference(now: Date, timeZone: string, dates: Dates = generalConferenceDates): GeneralConference | null {
  const next = getNextGeneralConference(now, timeZone, dates);
  return next ? (dates[dates.indexOf(next) + 1] ?? null) : null;
}

/** De lokale kalenderdag waarop de conferentie voor deze gebruiker begint (eerste sessie in zijn tijdzone). */
export function conferenceFirstLocalDay(conference: GeneralConference, timeZone: string): string {
  const first = conference.sessions?.[0];
  return first ? dayKeyInZone(new Date(first.start), timeZone) : conference.start;
}

/** Kalenderdagen tot de eerste conferentiedag (lokaal); 0 of negatief als die vandaag is of al voorbij. */
export function getDaysUntilGeneralConference(now: Date, timeZone: string, dates: Dates = generalConferenceDates): number | null {
  const next = getNextGeneralConference(now, timeZone, dates);
  return next ? daysBetween(dayKeyInZone(now, timeZone), conferenceFirstLocalDay(next, timeZone)) : null;
}

/** Is de conferentie begonnen (eerste sessie gestart, of zonder sessietijden: het weekend is bezig)? */
export function isGeneralConferenceActive(now: Date, timeZone: string, dates: Dates = generalConferenceDates): boolean {
  const next = getNextGeneralConference(now, timeZone, dates);
  if (!next) return false;
  const first = next.sessions?.[0];
  if (first) return now.getTime() >= Date.parse(first.start);
  return dayKeyInZone(now, timeZone) >= next.start;
}

/** De sessie die nu bezig is, of anders de eerstvolgende (null als er geen sessietijden zijn). */
export function getCurrentOrNextSession(now: Date, timeZone: string, dates: Dates = generalConferenceDates): { session: ConferenceSession; live: boolean } | null {
  const next = getNextGeneralConference(now, timeZone, dates);
  const t = now.getTime();
  for (const session of next?.sessions ?? []) {
    if (t < Date.parse(session.start)) return { session, live: false };
    if (t < Date.parse(session.end)) return { session, live: true };
  }
  return null;
}

/** Wat de countdown nu toont, of null als hij niet zichtbaar is. */
export type GeneralConferenceStatus =
  /** Nog 2 of meer kalenderdagen. */
  | { kind: "days"; days: number }
  /** Morgen / vandaag (vóór de eerste sessie); `at` is het begin van de eerste sessie als dat bekend is. */
  | { kind: "tomorrow"; at: string | null }
  | { kind: "today"; at: string | null }
  /** Er is nu een sessie bezig. */
  | { kind: "live" }
  /** Tussen twee sessies: de volgende begint over `minutes` minuten (naar boven afgerond). */
  | { kind: "next"; minutes: number; at: string };

export function getGeneralConferenceStatus(now: Date, timeZone: string, dates: Dates = generalConferenceDates): GeneralConferenceStatus | null {
  const conference = getNextGeneralConference(now, timeZone, dates);
  if (!conference) return null;
  const firstSession = conference.sessions?.[0] ?? null;

  if (!isGeneralConferenceActive(now, timeZone, dates)) {
    const days = daysBetween(dayKeyInZone(now, timeZone), conferenceFirstLocalDay(conference, timeZone));
    if (days > COUNTDOWN_WINDOW_DAYS) return null;
    if (days >= 2) return { kind: "days", days };
    if (days === 1) return { kind: "tomorrow", at: firstSession?.start ?? null };
    return { kind: "today", at: firstSession?.start ?? null };
  }

  // Begonnen. Zonder sessietijden blijft het "vandaag" tot en met zondag.
  const current = getCurrentOrNextSession(now, timeZone, dates);
  if (!current) return { kind: "today", at: null };
  if (current.live) return { kind: "live" };
  const minutes = Math.max(1, Math.ceil((Date.parse(current.session.start) - now.getTime()) / 60_000));
  return { kind: "next", minutes, at: current.session.start };
}

export function shouldShowGeneralConferenceCountdown(now: Date, timeZone: string, dates: Dates = generalConferenceDates): boolean {
  return getGeneralConferenceStatus(now, timeZone, dates) !== null;
}

/** Splitst een aantal minuten in uren en minuten voor de compacte notatie ("2u 14m"). */
export function splitMinutes(total: number): { hours: number; minutes: number } {
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}
