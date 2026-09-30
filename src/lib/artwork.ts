// Register van beeld bij content (zie docs/VERSADO-DESIGN.md, "Upcoming
// design assets"). Dit is de enige plek die weet welke afbeelding bij welke
// content hoort: pagina's vragen via de helpers onderaan een lijst sleutels
// op, van specifiek naar algemeen, en MediaArtwork toont de eerste die hier
// bestaat. Nieuwe artwork is dus één regel hieronder, zonder dat een pagina
// verandert. Geen server-imports: MediaArtwork gebruikt dit in de browser.
//
// Bestanden staan in public/images/. Next/image maakt er per schermbreedte
// een kleine WebP van, dus de originelen mogen groot zijn. De afbeeldingen
// bevatten bewust geen tekst: titels, labels en knoppen blijven echte UI.
// Eén versie per afbeelding, voor licht en donker.
//
// Uitgangspunt: beeld hoort inhoudelijk bij de content. Liever de neutrale
// placeholder dan een afbeelding die over iets anders gaat; daarom is er
// geen algemeen beeld per werk dat elke cursus zou krijgen.
//
// Sleutels: "book:<Book.key>", "course:<Course.slug>",
// "course-type:<CourseType>", "podcast:<podcastId>", "podcast:default",
// "game:<GameId>", "daily:<soort>". Bewust niet de emoji uit de database
// (Achievement.icon, ContentCollection.icon) als bron.

import type { GameId } from "@/lib/gameCatalog";

export type ArtworkKind = "course" | "podcast" | "game" | "daily" | "reading" | "quiz" | "social";

export interface ArtworkAsset {
  src: string;
  /** Leeg voor puur decoratief beeld; de titel staat er altijd als tekst naast. */
  alt?: string;
  /** Hoe het beeld in een kader met een andere verhouding valt. */
  fit?: "cover" | "contain";
  /** Brandpunt bij bijsnijden, bv. "50% 30%": de kaders zijn smaller of vierkanter dan het beeld. */
  position?: string;
  /** Gemiddelde kleur, als rustig vlak zolang het beeld laadt. */
  tone?: string;
}

/** Een of meer sleutels; de eerste die bestaat wint. */
export type ArtworkKeys = string | readonly (string | null | undefined)[] | null | undefined;

// Per boek van de Schriften (Book.key, in elke taal hetzelfde).
const BOOKS: Record<string, ArtworkAsset> = {
  "bofm/1-ne": { src: "/images/book-of-mormon/1-nephi.png", position: "25% 40%", tone: "#987e6b" },
  "bofm/alma": { src: "/images/book-of-mormon/alma.png", position: "45% 30%", tone: "#8c705d" },
};

// Per cursus (Course.slug) of per soort cursus (CourseType).
const COURSES: Record<string, ArtworkAsset> = {
  // Voor een toekomstige cursus met deze slug; die bestaat nog niet.
  "life-of-christ": { src: "/images/courses/life-of-christ.png", position: "50% 40%", tone: "#9e7b62" },
};
const COURSE_TYPES: Record<string, ArtworkAsset> = {};

// Spelcovers, per id uit src/lib/gameCatalog.ts. Een spel zonder cover houdt
// de neutrale placeholder; een nieuwe cover is hier één regel, bv.
// jigsaw: { src: "/images/games/jigsaw.png", tone: "#..." }.
const GAME_COVERS: Partial<Record<GameId, ArtworkAsset>> = {
  alleskenner: { src: "/images/games/de-slimste-heilige.png", position: "38% 75%", tone: "#a4714a" },
};

const PODCASTS: Record<string, ArtworkAsset> = {
  // Voor podcasts (en afleveringen) zonder eigen beeld.
  default: { src: "/images/podcast/default.png", position: "62% 60%", tone: "#996b47" },
};

const DAILY: Record<string, ArtworkAsset> = {
  text: { src: "/images/daily/verse-of-the-day.png", position: "55% 70%", tone: "#9c744e" },
};

const ARTWORK: Record<string, ArtworkAsset> = Object.fromEntries([
  ...Object.entries(BOOKS).map(([key, asset]) => [`book:${key}`, asset]),
  ...Object.entries(COURSES).map(([key, asset]) => [`course:${key}`, asset]),
  ...Object.entries(COURSE_TYPES).map(([key, asset]) => [`course-type:${key}`, asset]),
  ...Object.entries(GAME_COVERS).map(([key, asset]) => [`game:${key}`, asset]),
  ...Object.entries(PODCASTS).map(([key, asset]) => [`podcast:${key}`, asset]),
  ...Object.entries(DAILY).map(([key, asset]) => [`daily:${key}`, asset]),
]);

export function artworkFor(keys: ArtworkKeys): ArtworkAsset | null {
  const list = typeof keys === "string" ? [keys] : keys ?? [];
  for (const key of list) {
    if (key && ARTWORK[key]) return ARTWORK[key];
  }
  return null;
}

// Cursussen die het boek van voor naar achter volgen, beginnen in dit boek.
// Zolang je nog niet begonnen bent, is dat dus waar de cursus over gaat.
const START_BOOK_BY_WORK: Record<string, string> = { bofm: "bofm/1-ne" };
const IN_BOOK_ORDER = new Set(["FRONT_TO_BACK", "READING_LESSONS"]);

/**
 * Een cursus: eigen beeld; anders het boek waar je nu bent (bv. Alma), of bij
 * een cursus die bij het begin start en nog geen plek heeft het beginboek;
 * anders beeld voor dit soort cursus. Een plek in een boek zonder beeld valt
 * bewust niet terug op het beginboek: dat zou over iets anders gaan.
 */
export function courseArtworkKeys(course: {
  slug?: string | null;
  type?: string | null;
  work?: string | null;
  bookKey?: string | null;
}): string[] {
  const startBook = !course.bookKey && course.type && IN_BOOK_ORDER.has(course.type) && course.work ? START_BOOK_BY_WORK[course.work] : null;
  const bookKey = course.bookKey ?? startBook;
  return [
    course.slug ? `course:${course.slug}` : null,
    bookKey ? `book:${bookKey}` : null,
    course.type ? `course-type:${course.type}` : null,
  ].filter((key): key is string => key !== null);
}

/** Een podcast(aflevering): eigen beeld per podcast, anders het algemene podcastbeeld. */
export function podcastArtworkKeys(podcastId: string | null | undefined): string[] {
  return [...(podcastId ? [`podcast:${podcastId}`] : []), "podcast:default"];
}

export function gameArtworkKeys(gameId: GameId): string[] {
  return [`game:${gameId}`];
}
