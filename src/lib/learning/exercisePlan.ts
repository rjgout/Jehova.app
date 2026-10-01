// Het oefenplan van een hoofdstuk: hoeveel vragen erbij horen en uit welke
// verzen ze komen. Eén berekening voor elke leesroute, zodat dezelfde inhoud
// overal even veel oefening (en dus even veel XP) waard is.
//
// Een hoofdstuk wordt verdeeld in delen van hoogstens 10 verzen (dezelfde
// indeling als de stappen van Stap voor stap). Elk deel krijgt hoogstens
// QUESTIONS_PER_PART vragen uit de vragen bij zijn eigen verzen. Het totaal
// is de oefenset van het hoofdstuk:
// - Stap voor stap: per stap de vragen van dat deel;
// - Hoofdstuk voor hoofdstuk en Vrije keuze: alle delen achter elkaar.
// Welke vragen precies, blijft willekeurig; alleen het aantal per deel ligt
// vast.

export const QUESTIONS_PER_PART = 3;
export const MAX_VERSES_PER_PART = 10;

/** Verdeelt een hoofdstuk in zo gelijk mogelijke stukken van maximaal 10 verzen.
 * Voor hoofdstukken van 5 verzen of meer komt elk stuk daardoor uit op 5-10 verzen.
 * Kleine hoofdstukken blijven één stuk, zodat we nooit kunstmatig een mini-les maken.
 */
export function splitVerseRange(totalVerses: number): { startVerse: number; endVerse: number }[] {
  if (totalVerses <= 0) return [];
  const lessonCount = Math.max(1, Math.ceil(totalVerses / MAX_VERSES_PER_PART));
  const baseSize = Math.floor(totalVerses / lessonCount);
  const remainder = totalVerses % lessonCount;
  const ranges: { startVerse: number; endVerse: number }[] = [];
  let startVerse = 1;
  for (let i = 0; i < lessonCount; i++) {
    const size = baseSize + (i < remainder ? 1 : 0);
    ranges.push({ startVerse, endVerse: startVerse + size - 1 });
    startVerse += size;
  }
  return ranges;
}

export interface PlanExercise {
  id: string;
  /** Het bronvers, of null voor een vraag over het hele hoofdstuk. */
  verseNumber: number | null;
}

export interface ExercisePart {
  index: number;
  startVerse: number;
  endVerse: number;
  pool: string[];
  /** Hoeveel vragen dit deel in de oefenset krijgt. */
  count: number;
}

export interface ExercisePlan {
  parts: ExercisePart[];
  /** Het aantal vragen van de volledige oefenset (N). */
  total: number;
}

export function planChapterExercises(verseCount: number, exercises: PlanExercise[]): ExercisePlan {
  const ranges = splitVerseRange(verseCount);
  // Zonder verzen (zou niet moeten voorkomen) is het hele hoofdstuk één deel.
  const parts: ExercisePart[] = (ranges.length > 0 ? ranges : [{ startVerse: 1, endVerse: Math.max(1, verseCount) }]).map(
    (range, index) => ({ index, ...range, pool: [], count: 0 })
  );
  for (const exercise of exercises) {
    // Vragen zonder bronvers gaan over het hoofdstuk als geheel; ze horen
    // bij het laatste deel, want dan is het hele hoofdstuk gelezen.
    const part =
      exercise.verseNumber === null
        ? parts[parts.length - 1]
        : parts.find((p) => exercise.verseNumber! >= p.startVerse && exercise.verseNumber! <= p.endVerse) ?? parts[parts.length - 1];
    part.pool.push(exercise.id);
  }
  for (const part of parts) part.count = Math.min(QUESTIONS_PER_PART, part.pool.length);
  return { parts, total: parts.reduce((sum, part) => sum + part.count, 0) };
}

/** Het deel waar een stap (versbereik) bij hoort; null als het niet past. */
export function partForRange(plan: ExercisePlan, startVerse: number, endVerse: number): ExercisePart | null {
  return plan.parts.find((part) => part.startVerse === startVerse && part.endVerse === endVerse) ?? null;
}

type Random = () => number;

function shuffled<T>(items: T[], random: Random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Willekeurige vragen voor één deel (een stap). */
export function pickPartExercises(part: ExercisePart, random: Random = Math.random): string[] {
  return shuffled(part.pool, random).slice(0, part.count);
}

/** De volledige oefenset: per deel de vragen, in de volgorde van de tekst. */
export function pickChapterExercises(plan: ExercisePlan, random: Random = Math.random): string[] {
  return plan.parts.flatMap((part) => pickPartExercises(part, random));
}
