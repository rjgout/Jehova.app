import bomWords from "../../prisma/bomWords.json";
import { amsterdamNow } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { completeWordGame } from "@/lib/streak";
import { findVersesContainingWord, type VerseMatch } from "@/lib/dictionary";

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

// Alleen woorden uit het Boek van Mormon (zelfde bron als het Woordspel,
// zie src/lib/scrabble/dictionary.ts) van precies 5 letters — zowel de
// antwoorden als de toegestane gok-woorden komen uit deze lijst.
const WORDS: readonly string[] = (bomWords as string[]).filter((w) => w.length === WORD_LENGTH);

export function isValidGuess(word: string): boolean {
  return WORDS.includes(word.toLowerCase());
}

// Het woord wisselt om 18:00 Nederlandse tijd, niet om middernacht UTC —
// vóór 18:00 hoort een moment dus nog bij de dag ervoor.
const RELEASE_HOUR = 18;

export function wordGameDayKey(date: Date = new Date()): string {
  const { year, month, day, hour } = amsterdamNow(date);
  const noonUtc = Date.UTC(year, month - 1, day, 12);
  const shifted = hour < RELEASE_HOUR ? noonUtc - 24 * 60 * 60 * 1000 : noonUtc;
  const d = new Date(shifted);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

const EPOCH_MS = Date.UTC(2024, 0, 1, 12); // willekeurig, vast referentiepunt

function daysSinceEpoch(gameDayKey: string): number {
  const ms = new Date(`${gameDayKey}T12:00:00Z`).getTime();
  return Math.round((ms - EPOCH_MS) / (24 * 60 * 60 * 1000));
}

// Kleine, deterministische PRNG (mulberry32) — géén Math.random, want het
// woord van vandaag moet voor iedereen (en bij elke aanroep) hetzelfde zijn.
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
  const a = [...arr];
  const rand = mulberry32(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Doorloopt alle woorden in een (per cyclus opnieuw geschudde) willekeurige
// volgorde vóór er ooit een woord herhaald wordt — puur een functie van de
// datum, dus geen aparte databasetabel met "het woord van vandaag" nodig
// (en dus ook geen achtergrondtaak die dat elke dag zou moeten bijwerken).
export function getWordForDay(gameDayKey: string): string {
  const n = WORDS.length;
  const index = daysSinceEpoch(gameDayKey);
  const cycle = Math.floor(index / n);
  const position = ((index % n) + n) % n;
  const order = seededShuffle(WORDS, cycle);
  return order[position];
}

export type LetterState = "correct" | "present" | "absent";

/** Klassieke woordraad-feedback: eerst exacte plekken, dan (uit wat overblijft) verkeerd-geplaatste letters. */
export function evaluateGuess(guess: string, target: string): LetterState[] {
  const g = guess.toLowerCase().split("");
  const t = target.toLowerCase().split("");
  const result: LetterState[] = new Array(WORD_LENGTH).fill("absent");
  const consumed = new Array(WORD_LENGTH).fill(false);

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (g[i] === t[i]) {
      result[i] = "correct";
      consumed[i] = true;
    }
  }
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === "correct") continue;
    const j = t.findIndex((ch, idx) => ch === g[i] && !consumed[idx]);
    if (j !== -1) {
      result[i] = "present";
      consumed[j] = true;
    }
  }
  return result;
}

// Zie de spelregel: goed bij de laatste (6e) poging = 25 XP, en elke poging
// eerder levert 5 XP extra op (dus 1e poging = 50 XP).
export function xpForWin(guessesUsed: number): number {
  return 25 + 5 * (MAX_GUESSES - guessesUsed);
}

export interface WordGameLeaderboardEntry {
  rank: number;
  handle: string;
  discriminator: string;
  finishedAt: string;
}

export interface WordGameView {
  dayKey: string;
  wordLength: number;
  maxGuesses: number;
  guesses: { word: string; result: LetterState[] }[];
  status: "IN_PROGRESS" | "WON" | "LOST";
  xpEarned: number;
  // Alleen gezet zodra het potje van vandaag is afgerond — geheim tot dan.
  word: string | null;
  // Idem: pas gevuld na afloop (winst of verlies maakt niet uit), zodat je
  // de verzen met het woord van vandaag kan naslaan.
  verses: VerseMatch[];
  leaderboard: WordGameLeaderboardEntry[];
}

async function getTodayLeaderboard(dayKey: string): Promise<WordGameLeaderboardEntry[]> {
  const games = await prisma.wordGame.findMany({
    where: {
      dayKey,
      status: "WON",
      finishedAt: { not: null },
    },
    orderBy: { finishedAt: "asc" },
    take: 10,
    select: {
      finishedAt: true,
      user: {
        select: {
          handle: true,
          discriminator: true,
        },
      },
    },
  });

  return games.map((game, index) => ({
    rank: index + 1,
    handle: game.user.handle,
    discriminator: game.user.discriminator,
    finishedAt: game.finishedAt!.toISOString(),
  }));
}

async function buildView(game: {
  dayKey: string;
  word: string;
  guesses: string;
  status: string;
  xpEarned: number;
  leaderboardRank: number | null;
  leaderboardXpBonus: number;
}): Promise<WordGameView> {
  const guesses = (JSON.parse(game.guesses) as string[]).map((word) => ({
    word,
    result: evaluateGuess(word, game.word),
  }));
  const finished = game.status !== "IN_PROGRESS";
  const leaderboard = await getTodayLeaderboard(game.dayKey);
  return {
    dayKey: game.dayKey,
    wordLength: WORD_LENGTH,
    maxGuesses: MAX_GUESSES,
    guesses,
    status: game.status as WordGameView["status"],
    xpEarned: game.xpEarned,
    word: finished ? game.word : null,
    verses: finished ? await findVersesContainingWord(game.word) : [],
    leaderboard,
  };
}

/**
 * Legt het woord voor een dayKey definitief vast — atomisch, dus de eerste
 * speler van die dag "wint" en iedereen daarna (ongeacht eventuele
 * codewijzigingen tussendoor) krijgt exact datzelfde woord terug. Zie de
 * toelichting bij het DailyWord-model in schema.prisma.
 */
async function getOrLockWordForDay(dayKey: string): Promise<string> {
  const daily = await prisma.dailyWord.upsert({
    where: { dayKey },
    update: {},
    create: { dayKey, word: getWordForDay(dayKey) },
  });
  return daily.word;
}

/** Haalt het potje van vandaag op, en maakt het aan als het nog niet bestaat — dit dwingt meteen "één keer per dag" af via @@unique([userId, dayKey]). */
export async function getOrCreateTodayGame(userId: string): Promise<WordGameView> {
  const dayKey = wordGameDayKey();
  const existing = await prisma.wordGame.findUnique({ where: { userId_dayKey: { userId, dayKey } } });
  if (existing) return await buildView(existing);

  const word = await getOrLockWordForDay(dayKey);
  const created = await prisma.wordGame.upsert({
    where: { userId_dayKey: { userId, dayKey } },
    update: {},
    create: { userId, dayKey, word },
  });
  return await buildView(created);
}

export async function submitGuess(
  userId: string,
  rawGuess: string
): Promise<(WordGameView & { newAchievements: string[] }) | { error: string }> {
  const guess = rawGuess.trim().toLowerCase();
  if (guess.length !== WORD_LENGTH) return { error: `Het woord moet ${WORD_LENGTH} letters hebben.` };
  if (!isValidGuess(guess)) return { error: "Dat woord ken ik niet uit het Boek van Mormon." };

  const dayKey = wordGameDayKey();
  const game = await prisma.wordGame.findUnique({ where: { userId_dayKey: { userId, dayKey } } });
  if (!game) return { error: "Er is nog geen potje voor vandaag — begin eerst een nieuw spel." };
  if (game.status !== "IN_PROGRESS") return { error: "Je hebt het woord van vandaag al gespeeld." };

  const priorGuesses = JSON.parse(game.guesses) as string[];
  if (priorGuesses.length >= MAX_GUESSES) return { error: "Je hebt geen pogingen meer over." };

  const guesses = [...priorGuesses, guess];
  const won = guess === game.word;
  const outOfGuesses = guesses.length >= MAX_GUESSES;
  const finished = won || outOfGuesses;
  const xpEarned = won ? xpForWin(guesses.length) : 0;

  const finishedAt = finished ? new Date() : undefined;
  let leaderboardRank: number | null = null;
  let leaderboardXpBonus = 0;
  let totalXpEarned = xpEarned;

  if (finished && won) {
    const fasterWinners = await prisma.wordGame.count({
      where: {
        dayKey,
        status: "WON",
        finishedAt: { not: null, lt: finishedAt },
      },
    });
    leaderboardRank = fasterWinners + 1;
    leaderboardXpBonus = leaderboardXpBonusForRank(leaderboardRank);
    totalXpEarned += leaderboardXpBonus;
  }

  const updated = await prisma.wordGame.update({
    where: { id: game.id },
    data: {
      guesses: JSON.stringify(guesses),
      status: finished ? (won ? "WON" : "LOST") : "IN_PROGRESS",
      xpEarned: totalXpEarned,
      leaderboardRank,
      leaderboardXpBonus,
      finishedAt,
    },
  });

  const newAchievements = finished ? (await completeWordGame(userId, totalXpEarned)).newAchievements : [];

  return { ...(await buildView(updated)), newAchievements };
}
