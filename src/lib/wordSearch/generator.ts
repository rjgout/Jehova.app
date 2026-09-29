export type WordSearchDifficulty = "EASY" | "MEDIUM" | "HARD";

export interface WordSearchCandidate {
  display: string;
  normalized: string;
}

export interface WordSearchPosition {
  row: number;
  col: number;
}

export interface WordSearchPlacedWord extends WordSearchCandidate {
  start: WordSearchPosition;
  end: WordSearchPosition;
}

export interface WordSearchPuzzle {
  size: number;
  grid: string[][];
  words: WordSearchPlacedWord[];
}

interface Config {
  size: number;
  wordCount: number;
  minLength: number;
  maxLength: number;
  directions: readonly [number, number][];
}

const FORWARD_ORTHOGONAL: readonly [number, number][] = [
  [0, 1],
  [1, 0],
];
const MEDIUM_DIRECTIONS: readonly [number, number][] = [
  ...FORWARD_ORTHOGONAL,
  [1, 1],
  [1, -1],
];
const HARD_DIRECTIONS: readonly [number, number][] = [
  ...MEDIUM_DIRECTIONS,
  [0, -1],
  [-1, 0],
  [-1, -1],
  [-1, 1],
];

export const WORD_SEARCH_CONFIG: Record<WordSearchDifficulty, Config> = {
  EASY: { size: 10, wordCount: 6, minLength: 4, maxLength: 8, directions: FORWARD_ORTHOGONAL },
  MEDIUM: { size: 12, wordCount: 9, minLength: 4, maxLength: 10, directions: MEDIUM_DIRECTIONS },
  HARD: { size: 12, wordCount: 12, minLength: 5, maxLength: 12, directions: HARD_DIRECTIONS },
};

export function normalizeWord(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();
}

/** Een kleine seeded generator maakt bugreproductie mogelijk zonder een dagseed te gebruiken. */
export function createRandom(seed: number): () => number {
  let state = (seed >>> 0) || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function lineCoordinates(start: WordSearchPosition, end: WordSearchPosition, size: number): WordSearchPosition[] | null {
  const rowDelta = end.row - start.row;
  const colDelta = end.col - start.col;
  const length = Math.max(Math.abs(rowDelta), Math.abs(colDelta));
  if (length === 0 || (rowDelta !== 0 && colDelta !== 0 && Math.abs(rowDelta) !== Math.abs(colDelta))) return null;

  const rowStep = Math.sign(rowDelta);
  const colStep = Math.sign(colDelta);
  const positions: WordSearchPosition[] = [];
  for (let i = 0; i <= length; i += 1) {
    const row = start.row + rowStep * i;
    const col = start.col + colStep * i;
    if (row < 0 || row >= size || col < 0 || col >= size) return null;
    positions.push({ row, col });
  }
  return positions;
}

function canPlace(grid: string[][], word: string, positions: WordSearchPosition[]): boolean {
  return positions.every(({ row, col }, index) => !grid[row][col] || grid[row][col] === word[index]);
}

export function generateWordSearch(
  candidates: WordSearchCandidate[],
  difficulty: WordSearchDifficulty,
  seed: number,
  avoidSignatures: string[] = []
): WordSearchPuzzle {
  const config = WORD_SEARCH_CONFIG[difficulty];
  const random = createRandom(seed);
  const usable = candidates
    .map((candidate) => ({ ...candidate, normalized: normalizeWord(candidate.normalized || candidate.display) }))
    .filter((candidate) => candidate.normalized.length >= config.minLength && candidate.normalized.length <= config.maxLength)
    .filter((candidate, index, all) => all.findIndex((item) => item.normalized === candidate.normalized) === index);
  if (usable.length < config.wordCount) throw new Error("Niet genoeg woorden voor deze woordzoeker.");

  const recent = new Set(avoidSignatures);
  const grid = Array.from({ length: config.size }, () => Array<string>(config.size).fill(""));
  const placed: WordSearchPlacedWord[] = [];
  const selected = shuffle(usable, random).sort((a, b) => b.normalized.length - a.normalized.length);

  for (const candidate of selected) {
    if (placed.length >= config.wordCount) break;
    const directions = shuffle([...config.directions], random);
    let didPlace = false;
    for (let attempt = 0; attempt < 180 && !didPlace; attempt += 1) {
      const [rowStep, colStep] = directions[attempt % directions.length];
      const start = { row: Math.floor(random() * config.size), col: Math.floor(random() * config.size) };
      const end = {
        row: start.row + rowStep * (candidate.normalized.length - 1),
        col: start.col + colStep * (candidate.normalized.length - 1),
      };
      const positions = lineCoordinates(start, end, config.size);
      if (!positions || !canPlace(grid, candidate.normalized, positions)) continue;
      positions.forEach(({ row, col }, index) => {
        grid[row][col] = candidate.normalized[index];
      });
      placed.push({ ...candidate, start, end });
      didPlace = true;
    }
  }

  if (placed.length < Math.min(config.wordCount, 3)) throw new Error("De woorden passen niet in het raster.");
  const signature = placed.map((word) => word.normalized).sort().join("|");
  if (recent.has(signature)) {
    return generateWordSearch(candidates, difficulty, (seed + 0x6d2b79f5) | 0, []);
  }
  for (let row = 0; row < config.size; row += 1) {
    for (let col = 0; col < config.size; col += 1) {
      if (!grid[row][col]) grid[row][col] = String.fromCharCode(65 + Math.floor(random() * 26));
    }
  }
  return { size: config.size, grid, words: placed };
}

export function selectionMatches(
  grid: string[][],
  words: WordSearchPlacedWord[],
  start: WordSearchPosition,
  end: WordSearchPosition,
  allowReverse = false
): WordSearchPlacedWord | null {
  const positions = lineCoordinates(start, end, grid.length);
  if (!positions) return null;
  const selected = positions.map(({ row, col }) => grid[row][col]).join("");
  return words.find((word) => word.normalized === selected || (allowReverse && word.normalized === selected.split("").reverse().join(""))) ?? null;
}
