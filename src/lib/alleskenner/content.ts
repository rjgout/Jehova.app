import type { AlleskennerItemKind } from "@prisma/client";

// Vorm van AlleskennerItem.data per soort. Elk feit heeft een bronvers met een
// letterlijk citaat; prisma/checkAlleskenner.ts controleert dat het citaat
// echt in dat vers staat (zie docs/ALLESKENNER.md, "Inhoud").

export interface Evidence {
  ref: string; // bv. "1 Nephi 17:8"
  quote: string;
}

export interface QuestionData {
  prompt: string;
  options: string[]; // precies 4, waaronder het antwoord
  answer: string;
  // Luistervraag: dit vers wordt voorgelezen in plaats van getoond.
  listen?: { ref: string };
  evidence: Evidence[];
}

export interface TopicAnswer {
  text: string;
  accept: string[]; // extra geldige formuleringen, voor de quizmaster en het typen
  evidence: Evidence;
}

export interface TopicData {
  subject: string; // "Wat weet je van <subject>?"
  answers: TopicAnswer[]; // minstens 5; Open Deur gebruikt de eerste 4
  distractors: string[]; // geloofwaardige foute opties voor de tikvariant
}

export interface PuzzleGroup {
  answer: string;
  accept: string[];
  clues: string[]; // precies 4
  evidence: Evidence[];
}

export interface PuzzleData {
  groups: PuzzleGroup[]; // precies 3
}

// Galerij: 8 onderdelen. Bij citaten is het antwoord het boek waar het vers
// uit komt (afgeleid uit de verwijzing, dus altijd juist); bij illustraties
// is het de titel van het kinderverhaal waar het plaatje bij hoort.
export type GalleryData =
  | { variant: "QUOTES"; refs: string[] }
  | { variant: "IMAGES"; stories: { number: number; image: number }[] };

// Collectief Geheugen: een passage die even in beeld staat, daarna 5 antwoorden.
export interface MemoryData {
  title: string;
  passage: string; // bv. "Alma 17:25-27"
  answers: TopicAnswer[];
  distractors: string[];
}

export type AlleskennerSeedItem =
  | { id: string; kind: "QUESTION"; data: QuestionData }
  | { id: string; kind: "TOPIC"; data: TopicData }
  | { id: string; kind: "PUZZLE"; data: PuzzleData }
  | { id: string; kind: "GALLERY"; data: GalleryData }
  | { id: string; kind: "MEMORY"; data: MemoryData };

export type AlleskennerDataFor<K extends AlleskennerItemKind> = K extends "QUESTION"
  ? QuestionData
  : K extends "TOPIC"
    ? TopicData
    : K extends "PUZZLE"
      ? PuzzleData
      : K extends "GALLERY"
        ? GalleryData
        : K extends "MEMORY"
          ? MemoryData
          : never;

/** "Alma 17:25-27" -> { book: "Alma", chapter: 17, from: 25, to: 27 } */
export function parsePassage(passage: string): { book: string; chapter: number; from: number; to: number } | null {
  const match = /^(.+) (\d+):(\d+)(?:-(\d+))?$/.exec(passage);
  if (!match) return null;
  const from = Number(match[3]);
  return { book: match[1], chapter: Number(match[2]), from, to: match[4] ? Number(match[4]) : from };
}

/** Boeknaam uit een versverwijzing als "Mosiah 2:17". */
export function bookOfRef(ref: string): string | null {
  return parsePassage(ref)?.book ?? null;
}

/** Vergelijkbare vorm van een antwoord: kleine letters, zonder accenten en leestekens. */
export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function answerMatches(given: string, candidates: string[]): boolean {
  const normalized = normalizeAnswer(given);
  if (!normalized) return false;
  return candidates.some((candidate) => normalizeAnswer(candidate) === normalized);
}
