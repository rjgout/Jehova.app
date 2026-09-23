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

export type AlleskennerSeedItem =
  | { id: string; kind: "QUESTION"; data: QuestionData }
  | { id: string; kind: "TOPIC"; data: TopicData }
  | { id: string; kind: "PUZZLE"; data: PuzzleData };

export type AlleskennerDataFor<K extends AlleskennerItemKind> = K extends "QUESTION"
  ? QuestionData
  : K extends "TOPIC"
    ? TopicData
    : K extends "PUZZLE"
      ? PuzzleData
      : never;

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
