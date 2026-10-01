import { daysBetween } from "@/lib/dates";

// De Algemene Conferentie: de enige plek met conferentiedata en de regels
// voor de countdown op Vandaag (GeneralConferenceCountdown.tsx). Alles werkt
// op kalenderdagen ("yyyy-mm-dd"), nooit op tijdstippen: "vandaag" en
// "morgen" horen bij de kalenderdag van de gebruiker zelf, en de conferentie
// beslaat een zaterdag en zondag, ongeacht hoe laat de sessies in Salt Lake
// City beginnen. Wie "vandaag" is, bepaalt de aanroeper (browser: lokale
// datum; server: Europe/Amsterdam als beste gok vóór de browser het weet).

export interface GeneralConference {
  /** Zaterdag, eerste conferentiedag. */
  start: string;
  /** Zondag, laatste conferentiedag. */
  end: string;
  /**
   * "official": door de Kerk aangekondigd. "expected": nog niet aangekondigd,
   * afgeleid uit het vaste patroon (het weekend van de eerste zondag van
   * april en oktober). Vervang een verwachte datum door de officiële zodra
   * die bekend is; de rest van de code hoeft daarvoor niet te veranderen.
   */
  status: "official" | "expected";
}

/**
 * Conferenties in chronologische volgorde. Nieuwe toevoegen = een regel
 * erbij; tests/generalConference.test.ts bewaakt volgorde en vorm.
 * Officieel aangekondigd (Church News, 25 sept. 2026): t/m oktober 2027.
 */
export const generalConferenceDates: readonly GeneralConference[] = [
  { start: "2026-10-03", end: "2026-10-04", status: "official" },
  { start: "2027-04-03", end: "2027-04-04", status: "official" },
  { start: "2027-10-02", end: "2027-10-03", status: "official" },
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

/** Vanaf hoeveel dagen vóór de start de countdown verschijnt. */
export const COUNTDOWN_WINDOW_DAYS = 60;

/** De eerstvolgende conferentie: de lopende, of anders de eerste die nog moet beginnen. */
export function getNextGeneralConference(today: string, dates: readonly GeneralConference[] = generalConferenceDates): GeneralConference | null {
  // yyyy-mm-dd vergelijkt als tekst gelijk aan als datum.
  return dates.find((conference) => conference.end >= today) ?? null;
}

/** De conferentie ná de eerstvolgende. */
export function getFollowingGeneralConference(today: string, dates: readonly GeneralConference[] = generalConferenceDates): GeneralConference | null {
  const next = getNextGeneralConference(today, dates);
  return next ? (dates[dates.indexOf(next) + 1] ?? null) : null;
}

/** Kalenderdagen tot de eerste conferentiedag; 0 of negatief tijdens het conferentieweekend. */
export function getDaysUntilGeneralConference(today: string, dates: readonly GeneralConference[] = generalConferenceDates): number | null {
  const next = getNextGeneralConference(today, dates);
  return next ? daysBetween(today, next.start) : null;
}

/** Is het vandaag conferentieweekend? */
export function isGeneralConferenceActive(today: string, dates: readonly GeneralConference[] = generalConferenceDates): boolean {
  const next = getNextGeneralConference(today, dates);
  return !!next && next.start <= today && today <= next.end;
}

export function shouldShowGeneralConferenceCountdown(today: string, dates: readonly GeneralConference[] = generalConferenceDates): boolean {
  const days = getDaysUntilGeneralConference(today, dates);
  return days !== null && days <= COUNTDOWN_WINDOW_DAYS;
}

/** Wat de countdown toont, of null als hij niet zichtbaar is. */
export type GeneralConferenceCountdown = { kind: "days"; days: number } | { kind: "tomorrow" } | { kind: "today" };

export function getGeneralConferenceCountdown(today: string, dates: readonly GeneralConference[] = generalConferenceDates): GeneralConferenceCountdown | null {
  if (!shouldShowGeneralConferenceCountdown(today, dates)) return null;
  if (isGeneralConferenceActive(today, dates)) return { kind: "today" };
  const days = getDaysUntilGeneralConference(today, dates)!;
  return days === 1 ? { kind: "tomorrow" } : { kind: "days", days };
}

/** De kalenderdag van een moment in de tijdzone van deze runtime (in de browser: die van de gebruiker). */
export function localDayKey(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
