import { prisma } from "@/lib/db";
import { isExerciseCorrect } from "@/lib/exerciseGen";
import { pickRandomChapterIds, getChapterIntro, getChapterIntroAudio, labelsFor, type ChapterLabel, type IntroAudio } from "@/lib/chapterGuess";

// --- Het bord -----------------------------------------------------------
//
// Bewust één vaste, in code gedefinieerde route (geen database-tabel, geen
// editor) — simpelste oplossing die aan de eis "avontuurlijk bord,
// geïnspireerd op de verhaallijn" voldoet zonder een heel content-beheer-
// systeem te bouwen. Vijf gebieden volgen de reis Jeruzalem → wildernis →
// schip/zee → beloofde land → Zarahemla. Tegel 0 is start, de laatste tegel
// van het bord is de eindstreep; de gekozen speelduur bepaalt alleen tot
// welke tegel-index dit potje loopt (zie DURATION_FINISH_INDEX), niet een
// apart bord — dat is de eenvoudigste manier om drie speelduren te
// ondersteunen zonder drie keer content te onderhouden.

export type TileKind = "START" | "KNOWLEDGE" | "FILL_IN" | "WHERE_IN_BOOK" | "EVENT" | "FINISH";
export type BoardRegion = "JERUZALEM" | "WILDERNIS" | "ZEE" | "BELOOFDE_LAND" | "ZARAHEMLA";

export interface BoardTile {
  index: number;
  region: BoardRegion;
  kind: TileKind;
}

export const REGION_LABELS: Record<BoardRegion, string> = {
  JERUZALEM: "Jeruzalem",
  WILDERNIS: "Wildernis",
  ZEE: "Zee",
  BELOOFDE_LAND: "Beloofde land",
  ZARAHEMLA: "Zarahemla",
};

const BOARD_LENGTH = 30; // 5 gebieden van 6 tegels
const REGION_SIZE = 6;

// Vast, herhalend patroon per gebied — geen twee gebeurtenis-tegels na
// elkaar (sectie 8 van het ontwerp). Tegel 0 (start) en de laatste tegel
// (finish) worden hieronder overschreven.
const TILE_PATTERN: TileKind[] = ["KNOWLEDGE", "FILL_IN", "WHERE_IN_BOOK", "EVENT", "KNOWLEDGE", "FILL_IN"];

function buildBoard(): BoardTile[] {
  const regions: BoardRegion[] = ["JERUZALEM", "WILDERNIS", "ZEE", "BELOOFDE_LAND", "ZARAHEMLA"];
  const tiles: BoardTile[] = [];
  for (let i = 0; i < BOARD_LENGTH; i++) {
    const region = regions[Math.floor(i / REGION_SIZE)];
    const kind = TILE_PATTERN[i % TILE_PATTERN.length];
    tiles.push({ index: i, region, kind });
  }
  tiles[0] = { ...tiles[0], kind: "START" };
  tiles[BOARD_LENGTH - 1] = { ...tiles[BOARD_LENGTH - 1], kind: "FINISH" };
  return tiles;
}

export const BOARD: BoardTile[] = buildBoard();

// De gekozen speelduur stuurt alleen tot welke tegel dit potje loopt (zie
// bovenstaande uitleg) — geen aparte instellingen, geen ander bord.
export const DURATION_OPTIONS = [15, 30, 60] as const;
export type FamilyGameMinutes = (typeof DURATION_OPTIONS)[number];

export function finishIndexFor(minutes: number): number {
  if (minutes <= 15) return 10;
  if (minutes <= 30) return 20;
  return BOARD_LENGTH - 1;
}

// --- Tegel-inhoud ---------------------------------------------------------
//
// Hergebruikt bewust de bestaande content: Exercise (FILL_BLANK/WORD_BANK/
// TRUE_FALSE, volledige dekking van alle hoofdstukken) voor Kennisvraag/Vul
// aan, en chapterGuess.ts (al drie niveaus) voor Waar-in-het-boek — geen
// nieuwe content-bron, geen zelfgeschreven vragen. Het antwoord zelf komt
// nooit in de sanitized view terecht (zie sanitize* hieronder), exact zoals
// bij de bestaande live-oefeningen-race.

export type FamilyDifficulty = "EASY" | "MEDIUM" | "HARD";

// Het tegeltype bepaalt de categorie (Kennisvraag = keuzevraag, Vul aan =
// woorden op volgorde slepen); moeilijkheid nuanceert daarbinnen alleen het
// Kennisvraag-tegeltype (TRUE_FALSE = eenvoudige ja/nee-vraag, FILL_BLANK =
// één woord kiezen uit opties — geen typen, net als de rest van de app).
// Er is geen apart moeilijkheidsveld op Exercise (zie de sessie-
// onderzoeksnotitie); dit is dus een selectiemechanisme, geen inhoudelijke
// claim over de content zelf.
const KNOWLEDGE_TYPES_BY_DIFFICULTY: Record<FamilyDifficulty, ("FILL_BLANK" | "TRUE_FALSE")[]> = {
  EASY: ["TRUE_FALSE"],
  MEDIUM: ["FILL_BLANK", "TRUE_FALSE"],
  HARD: ["FILL_BLANK"],
};

interface RawExerciseRow {
  id: string;
  type: string;
  verseRef: string;
  prompt: string;
  answers: string;
  wordBank: string | null;
  sourceVerseId: string | null;
  options: { label: string }[];
}

export interface FamilyExerciseCard {
  tileKind: "KNOWLEDGE" | "FILL_IN";
  exerciseId: string;
  type: "FILL_BLANK" | "WORD_BANK" | "TRUE_FALSE";
  verseRef: string;
  prompt: string;
  wordBank?: string[];
  options?: string[];
}

export interface FamilyWhereInBookCard {
  tileKind: "WHERE_IN_BOOK";
  introText: string;
  introAudio: IntroAudio | null;
  options: { chapterId: string; label: string }[];
}

export interface FamilyEventCardView {
  tileKind: "EVENT";
  slug: string;
  title: string;
  choices: string[]; // alleen de labels — de score-uitkomst per keuze blijft server-only tot na de keuze
}

export type FamilyCard = FamilyExerciseCard | FamilyWhereInBookCard | FamilyEventCardView;

// Puur speltechnisch — geen inhoudelijke/historische bewering over het
// Boek van Mormon, dus valt buiten het verzin-verbod op contentvragen: dit
// zijn generieke bordspel-keuzekaarten, losjes genoemd naar de reis.
export const EVENT_CARDS = [
  {
    slug: "gadianton",
    title: "De rovers van Gadianton blokkeren je route.",
    choices: [
      { label: "⚔️ Vecht", delta: -1 },
      { label: "🗺️ Omzeil", delta: 0 },
      { label: "🤝 Werk samen", delta: 1 },
    ],
  },
  {
    slug: "storm",
    title: "Een hevige storm steekt op tijdens de overtocht.",
    choices: [
      { label: "⛵ Vaar door", delta: -1 },
      { label: "⚓ Zoek beschutting", delta: 0 },
      { label: "🙏 Bid om rust", delta: 1 },
    ],
  },
  {
    slug: "honger",
    title: "Het voedsel in de wildernis raakt op.",
    choices: [
      { label: "🏹 Ga jagen", delta: 0 },
      { label: "🌾 Zoek eetbare planten", delta: -1 },
      { label: "🤝 Deel wat je hebt", delta: 1 },
    ],
  },
  {
    slug: "gebroken-boog",
    title: "Je boog breekt — zonder wapen is jagen lastig.",
    choices: [
      { label: "🔨 Probeer te repareren", delta: 0 },
      { label: "😤 Mopper erover", delta: -1 },
      { label: "🙏 Blijf geduldig", delta: 1 },
    ],
  },
  {
    slug: "onbekend-pad",
    title: "Het pad splitst zich en niemand weet de weg.",
    choices: [
      { label: "🧭 Vertrouw op de Liahona", delta: 1 },
      { label: "🎲 Kies zelf een richting", delta: 0 },
      { label: "😠 Twijfel aan de tocht", delta: -1 },
    ],
  },
] as const;

function sanitizeRow(row: RawExerciseRow): FamilyExerciseCard {
  return {
    tileKind: "KNOWLEDGE",
    exerciseId: row.id,
    type: row.type as "FILL_BLANK" | "WORD_BANK" | "TRUE_FALSE",
    verseRef: row.verseRef,
    prompt: row.prompt,
    wordBank: row.wordBank ? (JSON.parse(row.wordBank) as string[]) : undefined,
    options: row.options.length > 0 ? row.options.map((o) => o.label) : undefined,
  };
}

/** Kiest willekeurig een goedgekeurde oefening uit ALLE hoofdstukken (niet beperkt tot voortgang — dit is een gezinsspel, geen cursus). */
export async function pickExerciseCard(
  tileKind: "KNOWLEDGE" | "FILL_IN",
  difficulty: FamilyDifficulty
): Promise<FamilyExerciseCard | null> {
  const types = tileKind === "FILL_IN" ? ["WORD_BANK" as const] : KNOWLEDGE_TYPES_BY_DIFFICULTY[difficulty];
  const count = await prisma.exercise.count({ where: { status: "APPROVED", type: { in: types } } });
  if (count === 0) return null;
  const skip = Math.floor(Math.random() * count);
  const row = await prisma.exercise.findFirst({
    where: { status: "APPROVED", type: { in: types } },
    skip,
    include: { options: { orderBy: { order: "asc" } } },
  });
  return row ? { ...sanitizeRow(row), tileKind } : null;
}

export interface WhereInBookAnswer {
  chapterId: string;
  label: string;
}

/** "Waar in het boek?" — 1-op-1 hergebruik van de chapterGuess-mechaniek (beginner-stijl: 4 opties). */
export async function pickWhereInBookCard(): Promise<{ card: FamilyWhereInBookCard; correctChapterId: string } | null> {
  const [correctChapterId, ...wrongIds] = await pickRandomChapterIds(4);
  if (!correctChapterId) return null;
  const introText = await getChapterIntro(correctChapterId);
  const introAudio = await getChapterIntroAudio(correctChapterId);
  const labels = await labelsFor([correctChapterId, ...wrongIds]);
  const order = [correctChapterId, ...wrongIds].sort(() => Math.random() - 0.5);
  const options = order.map((id) => ({ chapterId: id, label: labels.get(id)?.label ?? "?" }));
  return { card: { tileKind: "WHERE_IN_BOOK", introText, introAudio, options }, correctChapterId };
}

/** Het "leermoment": het echte vers erbij, nooit een zelfgeschreven verklaring (zie sessieafspraak). */
export async function explanationForExercise(exerciseId: string): Promise<{ verseRef: string; verseText: string | null } | null> {
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    include: { sourceVerse: true },
  });
  if (!exercise) return null;
  return { verseRef: exercise.verseRef, verseText: exercise.sourceVerse?.text ?? null };
}

export async function checkExerciseAnswer(exerciseId: string, given: string[]): Promise<{ correct: boolean } | null> {
  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise) return null;
  const accepted = JSON.parse(exercise.answers) as string[];
  return { correct: isExerciseCorrect(exercise.type, given, accepted) };
}

export function correctChapterLabel(map: Map<string, ChapterLabel>, chapterId: string): string {
  return map.get(chapterId)?.label ?? "?";
}

// --- Adaptieve moeilijkheid ------------------------------------------------
//
// Puur in-memory, per speler, alleen binnen dit ene potje (zie RoomState in
// gameServer.ts) — geen instelling, geen opgeslagen profiel. Twee goed op
// rij -> een stapje moeilijker; een fout antwoord -> terug naar makkelijk.
export function nextDifficulty(current: FamilyDifficulty, streak: number): FamilyDifficulty {
  if (streak <= 0) return "EASY";
  if (streak >= 2) return "HARD";
  return "MEDIUM";
}
