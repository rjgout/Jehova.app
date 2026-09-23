// Wat de server (src/server/alleskenner.ts) naar elk scherm stuurt. Iedereen
// krijgt een eigen weergave: spelers zien nooit antwoorden vóór de onthulling,
// de quizmaster wel (velden onder `quizmaster`).

export type AkPhase = "LOBBY" | "R369" | "PUZZLE" | "FINALE" | "FINISHED";
export type AkRole = "player" | "spectator" | "quizmaster";

export interface AkParticipantView {
  userId: string;
  name: string;
  role: AkRole;
  online: boolean;
}

export interface AkPlayerView {
  userId: string;
  name: string;
  seconds: number;
}

export interface Ak369View {
  number: number; // 1..15
  total: number;
  isPointQuestion: boolean;
  prompt: string;
  listenText: string | null;
  options: string[] | null; // alleen zonder quizmaster
  reveal: { correct: boolean | null; answer: string } | null;
}

export interface AkPuzzleView {
  number: number;
  total: number;
  clues: { text: string; group: number | null }[]; // group pas bekend als gevonden/onthuld
  found: { group: number; answer: string }[];
  revealed: boolean;
}

export interface AkFinaleView {
  number: number;
  total: number;
  subject: string;
  found: string[];
  answerCount: number;
  // Alleen zonder quizmaster: tikvakjes (antwoorden en foute opties door elkaar).
  grid: { text: string; state: "open" | "found" | "wrong" }[] | null;
  revealed: string[] | null; // na afloop van een onderwerp: alle antwoorden
}

export interface AkQuizmasterView {
  answer369: string | null;
  puzzleGroups: { answer: string; accept: string[]; clues: string[]; found: boolean }[] | null;
  finaleAnswers: { text: string; accept: string[]; found: boolean }[] | null;
}

export interface AkStateView {
  code: string;
  phase: AkPhase;
  me: { userId: string; role: AkRole; isHost: boolean };
  hostId: string;
  quizmasterId: string | null;
  participants: AkParticipantView[];
  players: AkPlayerView[];
  finalists: string[] | null;
  activeId: string | null;
  clockRunning: boolean;
  turnDeadline: number | null; // epoch ms: maximale bedenktijd (3-6-9) of beurttijd (puzzel)
  serverNow: number;
  intermission: { title: string; subtitle: string } | null;
  r369: Ak369View | null;
  puzzle: AkPuzzleView | null;
  finale: AkFinaleView | null;
  quizmaster: AkQuizmasterView | null;
  winnerId: string | null;
  feedback: { userId: string; text: string; kind: "good" | "bad" | "info"; at: number } | null;
}

export const AK_START_SECONDS = 60;
export const AK_369_POINTS = 10;
export const AK_PUZZLE_POINTS = 30;
export const AK_FINALE_PENALTY = 20;
export const AK_369_THINK_MS = 20_000;
export const AK_PUZZLE_TURN_MS = 60_000;
export const AK_MIN_PLAYERS = 2;
