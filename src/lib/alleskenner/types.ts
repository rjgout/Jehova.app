// Wat de server (src/server/alleskenner.ts) naar elk scherm stuurt. Iedereen
// krijgt een eigen weergave: spelers zien nooit antwoorden vóór de onthulling,
// de quizmaster wel (velden onder `quizmaster`).
//
// Een "deelnemer" (contestant) is een losse speler, of bij teams een heel team.
// Klokken, beurten en seconden horen bij de deelnemer; bij een team handelt
// alleen de teamleider namens het team.

export type AkPhase = "LOBBY" | "R369" | "OPEN_DEUR" | "PUZZLE" | "GALLERY" | "MEMORY" | "FINALE" | "FINISHED";
export type AkRole = "player" | "spectator" | "quizmaster";
// SOLO: alleen spelen (zie src/lib/alleskenner/solo.ts): alle rondes behalve
// de finale, want daar heb je een tegenstander voor nodig.
export type AkLength = "SHORT" | "FULL" | "SOLO";

export const AK_ROUNDS: Record<AkLength, AkPhase[]> = {
  SHORT: ["R369", "PUZZLE", "FINALE"],
  FULL: ["R369", "OPEN_DEUR", "PUZZLE", "GALLERY", "MEMORY", "FINALE"],
  SOLO: ["R369", "OPEN_DEUR", "PUZZLE", "GALLERY", "MEMORY"],
};

export const AK_ROUND_TITLES: Record<AkPhase, string> = {
  LOBBY: "Lobby",
  R369: "3-6-9",
  OPEN_DEUR: "Open Deur",
  PUZZLE: "Puzzel",
  GALLERY: "Galerij",
  MEMORY: "Collectief Geheugen",
  FINALE: "Finale",
  FINISHED: "Einde",
};

export const AK_TEAM_NAMES = ["Team Blauw", "Team Oranje", "Team Groen", "Team Paars", "Team Rood"];

export interface AkParticipantView {
  userId: string;
  name: string;
  role: AkRole;
  online: boolean;
  teamIndex: number | null; // alleen in de lobby met teams
}

export interface AkContestantView {
  id: string;
  name: string;
  seconds: number;
  color: number; // index in AK_TEAM_NAMES / de kleurenlijst van de client
  leaderId: string;
  members: { userId: string; name: string }[];
}

// Tikvakjes (Open Deur, Collectief Geheugen, Finale): goede antwoorden en foute
// opties door elkaar. `mine` = door deze kijker stil gekozen (teams).
export interface AkGridCell {
  text: string;
  state: "open" | "found" | "wrong";
  mine: boolean;
}

export interface Ak369View {
  number: number; // 1..15
  total: number;
  isPointQuestion: boolean;
  prompt: string;
  listenText: string | null;
  options: string[] | null; // zonder quizmaster, of bij teams (stil meekiezen)
  myPick: string | null;
  wrongOptions: string[]; // al fout gegeven door wie het eerder probeerde
  listening: boolean; // luistervraag wordt nog voorgelezen; bedenktijd loopt nog niet
  reveal: { correct: boolean | null; answer: string } | null;
}

export interface AkOpenDeurView {
  number: number;
  total: number;
  choosing: boolean; // de deelnemer met de laagste stand kiest nog een onderwerp
  doors: { index: number; subject: string; taken: boolean }[];
  subject: string | null;
  found: string[];
  answerCount: number;
  grid: AkGridCell[] | null;
  tapOnly: boolean; // ook met quizmaster tikt wie aan de beurt is zelf
  revealed: string[] | null;
}

export interface AkPuzzleView {
  number: number;
  total: number;
  clues: { text: string; group: number | null }[]; // group pas bekend als gevonden/onthuld
  found: { group: number; answer: string }[];
  revealed: boolean;
  myGuesses: string[] | null; // teams: stil ingetypte groepen van deze kijker
}

export interface AkGalleryView {
  number: number;
  total: number;
  variant: "QUOTES" | "IMAGES";
  itemIndex: number; // 0..7, het onderdeel dat nu in beeld is
  itemCount: number;
  item: { text: string | null; image: string | null } | null;
  options: string[] | null;
  myPick: string | null;
  results: { found: boolean; answer: string | null }[]; // answer pas na vinden/onthullen
  revealed: { text: string | null; image: string | null; answer: string; found: boolean }[] | null;
}

export interface AkMemoryView {
  number: number;
  total: number;
  title: string;
  passage: string;
  reading: boolean; // de passage staat nog in beeld
  verses: { number: number; text: string }[] | null; // alleen tijdens het lezen
  nextValue: number;
  found: { text: string; value: number }[];
  answerCount: number;
  grid: AkGridCell[] | null;
  revealed: string[] | null;
}

export interface AkFinaleView {
  number: number;
  total: number;
  subject: string;
  found: string[];
  answerCount: number;
  grid: AkGridCell[] | null;
  tapOnly: boolean;
  revealed: string[] | null; // na afloop van een onderwerp: alle antwoorden
}

export interface AkQuizmasterView {
  answer369: string | null;
  puzzleGroups: { answer: string; accept: string[]; clues: string[]; found: boolean }[] | null;
  // Open Deur, Collectief Geheugen en Finale
  answers: { text: string; accept: string[]; found: boolean }[] | null;
  galleryAnswer: string | null;
}

export interface AkStateView {
  code: string;
  phase: AkPhase;
  // language: de taal waarin deze kijker speelt (voorlezen, zie src/lib/alleskenner/localize.ts).
  me: { userId: string; role: AkRole; isHost: boolean; contestantId: string | null; actsForContestant: boolean; language: string };
  hostId: string;
  quizmasterId: string | null;
  length: AkLength;
  teamMode: boolean;
  lobbyTeams: { name: string; leaderId: string | null }[] | null;
  participants: AkParticipantView[];
  contestants: AkContestantView[];
  finalists: string[] | null;
  activeId: string | null; // deelnemer (speler of team) die aan de beurt is
  clockRunning: boolean;
  turnDeadline: number | null; // epoch ms: bedenktijd, beurttijd of leestijd
  serverNow: number;
  round: { number: number; total: number };
  intermission: { title: string; subtitle: string; standings: boolean } | null;
  r369: Ak369View | null;
  openDeur: AkOpenDeurView | null;
  puzzle: AkPuzzleView | null;
  gallery: AkGalleryView | null;
  memory: AkMemoryView | null;
  finale: AkFinaleView | null;
  quizmaster: AkQuizmasterView | null;
  winnerId: string | null;
  season: {
    seasonId: string;
    isFinale: boolean;
    isLast: boolean;
    lineup: { userId: string; name: string }[];
    safeId: string | null; // Alleskenner van de avond
  } | null;
  personal: { mine: number | null; ranking: { userId: string; name: string; points: number }[] | null } | null;
  // Alleen spelen. xpEarned/rank komen pas na afloop, als het resultaat is vastgelegd.
  solo: { mode: "DAILY" | "PRACTICE"; xpEarned: number | null; rank: number | null } | null;
  feedback: { contestantId: string | null; text: string; kind: "good" | "bad" | "info"; at: number } | null;
}

export const AK_START_SECONDS = 60;
export const AK_369_POINTS = 10;
export const AK_OPEN_DEUR_POINTS = 20;
export const AK_PUZZLE_POINTS = 30;
export const AK_GALLERY_POINTS = 15;
export const AK_MEMORY_STEP = 10; // k-de gevonden antwoord = k × 10
export const AK_FINALE_PENALTY = 20;
export const AK_369_THINK_MS = 20_000;
export const AK_LISTEN_MAX_MS = 90_000; // vangnet als het voorlezen nooit gemeld wordt
export const AK_PUZZLE_TURN_MS = 60_000;
export const AK_MEMORY_READ_MS = 20_000;
export const AK_MIN_PLAYERS = 2;
export const AK_MIN_TEAM_PLAYERS = 6;
export const AK_MAX_TEAMS = 5;
