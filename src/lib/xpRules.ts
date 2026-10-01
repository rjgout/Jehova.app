/**
 * Centrale plek voor "wat levert deze activiteit op". Voorheen stond de
 * 10-per-goed-antwoord-plus-20-bij-100%-formule losstaand gekopieerd in vier
 * verschillende route-bestanden (les, introles, kinderverhaal, podcastles),
 * en had elke andere activiteit zijn eigen ad-hoc bedrag verspreid over de
 * codebase. Voortaan hier op één plek — zowel de submit-routes als
 * src/lib/streak.ts, src/lib/challenges.ts en src/lib/scrabbleGame.ts lezen
 * hiervandaan, en /tools/xp-guide toont deze zelfde waarden aan gebruikers.
 */

// Herhalingskorting: wat een herhaling nog oplevert. Bij een hoofdstuk zodra
// de basis-XP van die inhoud al verdiend is (src/lib/learning/rewards.ts,
// in welke route of taal ook); bij een introles, kinderverhaal of podcastles
// na een eerdere PERFECTE score (100%). Voorkomt dat al-beheerste content een
// oneindige XP-bron wordt, maar laat herhalen (bv. ter opfrissing) nog wel
// iets opleveren i.p.v. niets. Geldt bewust niet voor
// live-quizspellen (zie completeLiveQuiz in streak.ts): dat
// is een sociale, met-een-live-tegenstander-gebonden activiteit, geen
// solo-herhaling van al-beheerste content. Geldt ook niet voor Scrabble,
// Uitdagingen, het woordspel, "snelle ronde" of "raad het hoofdstuk" — die
// hebben geen "dit exacte ding nog een keer doen"-voortgangsrecord.
export const REPEAT_DISCOUNT = 0.1;

export const XP_PER_CORRECT_STANDARD = 10;
export const XP_PERFECT_BONUS_STANDARD = 20;

// Lichtere, chapterloze oefenvormen (snelle ronde, raad het hoofdstuk) —
// bewust lager dan de standaardformule, want geen vast hoofdstuk/voortgang.
export const XP_PER_CORRECT_LIGHT = 5;

export const CHALLENGE_WIN_XP = 30;
export const SCRABBLE_WIN_XP = 30;
export const SCRABBLE_PARTICIPATION_XP = 10;

/**
 * Standaardformule voor een gegradeerde les/verhaal/aflevering: X per goed
 * antwoord + een bonus bij een perfecte score (100%). Retourneert de volle
 * (niet-gekorte) XP — de herhalingskorting wordt apart toegepast door de
 * aanroeper (zie applyRepeatDiscount), omdat alleen die weet of dit exacte
 * hoofdstuk/les/verhaal al eerder perfect was afgerond.
 */
export function standardContentXp(correctCount: number, total: number): number {
  const scorePercent = total === 0 ? 0 : Math.round((correctCount / total) * 100);
  return correctCount * XP_PER_CORRECT_STANDARD + (scorePercent === 100 ? XP_PERFECT_BONUS_STANDARD : 0);
}

/** Past de herhalingskorting toe op een al-berekend XP-bedrag. */
export function applyRepeatDiscount(rawXp: number): number {
  return Math.floor(rawXp * REPEAT_DISCOUNT);
}
