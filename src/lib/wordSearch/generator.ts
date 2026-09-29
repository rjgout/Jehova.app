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
  diagonalCount: number;
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
  EASY: { size: 8, wordCount: 5, minLength: 4, maxLength: 8, directions: FORWARD_ORTHOGONAL, diagonalCount: 0 },
  MEDIUM: { size: 11, wordCount: 9, minLength: 4, maxLength: 10, directions: MEDIUM_DIRECTIONS, diagonalCount: 2 },
  HARD: { size: 14, wordCount: 12, minLength: 5, maxLength: 12, directions: HARD_DIRECTIONS, diagonalCount: 4 },
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

function overlapCount(grid: string[][], positions: WordSearchPosition[]): number {
  return positions.reduce((count, { row, col }) => count + (grid[row][col] ? 1 : 0), 0);
}

function candidatesForLength(candidates: WordSearchCandidate[], target: number): WordSearchCandidate[] {
  return candidates
    .map((candidate) => ({ candidate, distance: Math.abs(candidate.normalized.length - target) }))
    .sort((a, b) => a.distance - b.distance)
    .map(({ candidate }) => candidate);
}

function chooseWords(candidates: WordSearchCandidate[], config: Config, random: () => number): WordSearchCandidate[] {
  const remaining = [...candidates];
  const selected: WordSearchCandidate[] = [];
  const targets = Array.from({ length: config.wordCount }, (_, index) => {
    const span = config.maxLength - config.minLength;
    const wave = index % 4;
    return wave === 0 ? config.maxLength : wave === 1 ? config.minLength : config.minLength + Math.floor(span * (0.35 + random() * 0.4));
  });
  for (const target of targets) {
    if (remaining.length === 0) break;
    const near = candidatesForLength(remaining, target);
    const distance = Math.abs(near[0].normalized.length - target);
    const choices = near.filter((candidate) => Math.abs(candidate.normalized.length - target) === distance).slice(0, 8);
    const choice = choices[Math.floor(random() * choices.length)] ?? near[0];
    selected.push(choice);
    remaining.splice(remaining.indexOf(choice), 1);
  }
  return selected;
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
  // Eerst wordt bewust een gevarieerde woordset gekozen; daarna plaatsen we
  // lange woorden eerst, zodat kleinere woorden nog voldoende ruimte houden.
  const selected = chooseWords(shuffle(usable, random), config, random).sort((a, b) => b.normalized.length - a.normalized.length);

  for (const candidate of selected) {
    if (placed.length >= config.wordCount) break;
    const diagonalDirections = config.directions.filter(([row, col]) => row !== 0 && col !== 0);
    const directions = shuffle(
      placed.length < config.diagonalCount && diagonalDirections.length > 0 ? diagonalDirections : [...config.directions],
      random
    );
    const placementOptions: { positions: WordSearchPosition[]; overlap: number; start: WordSearchPosition; end: WordSearchPosition }[] = [];
    // Probeer eerst expliciet bestaande letters te kruisen. Alleen willekeurige
    // starts kiezen maakt overlap bij langere of zeldzame namen vrijwel toeval.
    for (const [rowStep, colStep] of directions) {
      for (let wordIndex = 0; wordIndex < candidate.normalized.length; wordIndex += 1) {
        for (let row = 0; row < config.size; row += 1) {
          for (let col = 0; col < config.size; col += 1) {
            if (grid[row][col] !== candidate.normalized[wordIndex]) continue;
            const start = { row: row - rowStep * wordIndex, col: col - colStep * wordIndex };
            const end = {
              row: start.row + rowStep * (candidate.normalized.length - 1),
              col: start.col + colStep * (candidate.normalized.length - 1),
            };
            const positions = lineCoordinates(start, end, config.size);
            if (positions && canPlace(grid, candidate.normalized, positions)) {
              placementOptions.push({ positions, overlap: overlapCount(grid, positions), start, end });
            }
          }
        }
      }
    }
    for (let attempt = 0; attempt < 220; attempt += 1) {
      const [rowStep, colStep] = directions[attempt % directions.length];
      const start = { row: Math.floor(random() * config.size), col: Math.floor(random() * config.size) };
      const end = {
        row: start.row + rowStep * (candidate.normalized.length - 1),
        col: start.col + colStep * (candidate.normalized.length - 1),
      };
      const positions = lineCoordinates(start, end, config.size);
      if (!positions || !canPlace(grid, candidate.normalized, positions)) continue;
      placementOptions.push({ positions, overlap: overlapCount(grid, positions), start, end });
    }
    if (placementOptions.length > 0) {
      const bestOverlap = Math.max(...placementOptions.map((option) => option.overlap));
      const best = placementOptions.filter((option) => option.overlap >= Math.max(0, bestOverlap - 1));
      const option = best[Math.floor(random() * best.length)] ?? best[0];
      option.positions.forEach(({ row, col }, index) => {
        grid[row][col] = candidate.normalized[index];
      });
      placed.push({ ...candidate, start: option.start, end: option.end });
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
