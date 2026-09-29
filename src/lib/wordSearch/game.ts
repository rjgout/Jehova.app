import { prisma } from "@/lib/db";
import { getContentContext, BOFM_WORK } from "@/lib/contentCollections";
import { dayKey } from "@/lib/dates";
import { awardCompetitionXp } from "@/lib/competitionXp";
import { awardXp } from "@/lib/xp";
import { generateWordSearch, selectionMatches, type WordSearchDifficulty, type WordSearchPlacedWord, type WordSearchPosition } from "./generator";
import { getWordSearchCandidates } from "./content";

interface StoredGame {
  id: string;
  userId: string;
  difficulty: WordSearchDifficulty;
  size: number;
  grid: string;
  words: string;
  foundWords: string;
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  xpEarned: number;
  finishedAt: Date | null;
}

export interface WordSearchView {
  id: string;
  difficulty: WordSearchDifficulty;
  size: number;
  grid: string[][];
  words: WordSearchPlacedWord[];
  foundWords: string[];
  status: StoredGame["status"];
  xpEarned: number;
  finishedAt: string | null;
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toView(game: StoredGame): WordSearchView {
  return {
    id: game.id,
    difficulty: game.difficulty,
    size: game.size,
    grid: parseJson<string[][]>(game.grid, []),
    words: parseJson<WordSearchPlacedWord[]>(game.words, []),
    foundWords: parseJson<string[]>(game.foundWords, []),
    status: game.status,
    xpEarned: game.xpEarned,
    finishedAt: game.finishedAt?.toISOString() ?? null,
  };
}

function xpForDifficulty(difficulty: WordSearchDifficulty): number {
  return difficulty === "EASY" ? 10 : difficulty === "MEDIUM" ? 15 : 20;
}

export async function assertWordSearchContext(userId: string) {
  const context = await getContentContext(userId);
  if (context.active.work !== BOFM_WORK || !context.gameKeys.includes("word-search")) return null;
  return context;
}

export async function getActiveWordSearch(userId: string): Promise<WordSearchView | null> {
  const game = await prisma.wordSearchGame.findFirst({
    where: { userId, status: "IN_PROGRESS" },
    orderBy: { createdAt: "desc" },
  });
  return game ? toView(game) : null;
}

export async function startWordSearch(userId: string, difficulty: WordSearchDifficulty, theme = "RANDOM") {
  const context = await assertWordSearchContext(userId);
  if (!context) throw new Error("Woordzoeker is niet beschikbaar voor deze content.");
  const active = await getActiveWordSearch(userId);
  if (active) return active;

  const candidates = await getWordSearchCandidates(context.active.id, context.active.language);
  const recent = await prisma.wordSearchGame.findMany({
    where: { userId, difficulty, status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { words: true },
  });
  const avoidSignatures = recent.map((game) =>
    parseJson<WordSearchPlacedWord[]>(game.words, []).map((word) => word.normalized).sort().join("|")
  );
  const seed = (Math.floor(Math.random() * 0x7fffffff) || 1) | 0;
  const puzzle = generateWordSearch(candidates, difficulty, seed, avoidSignatures);
  const game = await prisma.wordSearchGame.create({
    data: {
      userId,
      contentCollectionId: context.active.id,
      difficulty,
      theme,
      size: puzzle.size,
      seed,
      grid: JSON.stringify(puzzle.grid),
      words: JSON.stringify(puzzle.words),
    },
  });
  return toView(game);
}

export async function getWordSearch(userId: string, gameId: string) {
  const game = await prisma.wordSearchGame.findFirst({ where: { id: gameId, userId } });
  return game ? toView(game) : null;
}

export async function abandonWordSearch(userId: string, gameId: string) {
  const game = await prisma.wordSearchGame.findFirst({ where: { id: gameId, userId, status: "IN_PROGRESS" } });
  if (!game) return null;
  return prisma.wordSearchGame.update({
    where: { id: game.id },
    data: { status: "ABANDONED", finishedAt: new Date() },
  });
}

export async function findWordSearchWord(userId: string, gameId: string, start: WordSearchPosition, end: WordSearchPosition) {
  const game = await prisma.wordSearchGame.findFirst({ where: { id: gameId, userId } });
  if (!game || game.status !== "IN_PROGRESS") return null;
  const grid = parseJson<string[][]>(game.grid, []);
  const words = parseJson<WordSearchPlacedWord[]>(game.words, []);
  const foundWords = parseJson<string[]>(game.foundWords, []);
  const match = selectionMatches(grid, words, start, end, game.difficulty === "HARD");
  if (!match || foundWords.includes(match.normalized)) return { correct: false, view: toView(game) };
  const nextFound = [...foundWords, match.normalized];
  const completed = nextFound.length === words.length;
  const updated = await prisma.$transaction(async (tx) => {
    const xpToday = await tx.wordSearchGame.count({
      where: {
        userId,
        status: "COMPLETED",
        xpEarned: { gt: 0 },
        finishedAt: { gte: new Date(`${dayKey()}T00:00:00.000Z`) },
      },
    });
    const xpEarned = completed && xpToday < 3 ? xpForDifficulty(game.difficulty) : 0;
    const saved = await tx.wordSearchGame.update({
      where: { id: game.id },
      data: {
        foundWords: JSON.stringify(nextFound),
        status: completed ? "COMPLETED" : "IN_PROGRESS",
        finishedAt: completed ? new Date() : null,
        xpEarned,
      },
    });
    if (completed && xpEarned > 0) {
      await awardXp(tx, userId, xpEarned, "WORD_SEARCH_COMPLETED", { difficulty: game.difficulty, wordCount: words.length });
      await awardCompetitionXp(tx, userId, "WORD_SEARCH", xpEarned, {
        level: game.difficulty,
        won: true,
        metadata: { difficulty: game.difficulty, wordCount: words.length },
      });
    }
    return saved;
  });
  return { correct: true, word: match.normalized, view: toView(updated) };
}
