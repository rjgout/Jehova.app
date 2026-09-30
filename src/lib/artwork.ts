// Register van beeld bij content (zie docs/VERSADO-DESIGN.md, "Upcoming
// design assets"). Dit is de enige plek die weet welke afbeelding bij welke
// content hoort: pagina's vragen via de helpers onderaan een lijst sleutels
// op, van specifiek naar algemeen, en MediaArtwork toont de eerste die hier
// bestaat. Nieuwe artwork is dus één regel in ARTWORK, zonder dat een pagina
// verandert. Geen server-imports: MediaArtwork gebruikt dit in de browser.
//
// Bestanden staan in public/images/. Next/image maakt er per schermbreedte
// een kleine WebP van, dus de originelen mogen groot zijn. De afbeeldingen
// bevatten bewust geen tekst: titels, labels en knoppen blijven echte UI.
//
// Sleutels: "book:<Book.key>", "work:<ContentCollection.work>",
// "course:<Course.slug>", "podcast:<podcastId>", "podcast:default",
// "game:<GAME_CATALOG-id>", "daily:<soort>". Bewust niet de emoji uit de
// database (Achievement.icon, ContentCollection.icon) als bron.

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

const FIRST_NEPHI: ArtworkAsset = { src: "/images/book-of-mormon/1-nephi.png", position: "25% 40%", tone: "#987e6b" };

const ARTWORK: Record<string, ArtworkAsset> = {
  // 1 Nephi is ook het algemene beeld voor het Boek van Mormon, tot er per
  // boek of per cursus eigen artwork is.
  "book:bofm/1-ne": FIRST_NEPHI,
  "work:bofm": FIRST_NEPHI,
  "book:bofm/alma": { src: "/images/book-of-mormon/alma.png", position: "45% 30%", tone: "#8c705d" },
  // Voor een toekomstige cursus met deze slug; die bestaat nog niet.
  "course:life-of-christ": { src: "/images/courses/life-of-christ.png", position: "50% 40%", tone: "#9e7b62" },
  "podcast:default": { src: "/images/podcast/default.png", position: "62% 60%", tone: "#996b47" },
  "game:alleskenner": { src: "/images/games/de-slimste-heilige.png", position: "38% 75%", tone: "#a4714a" },
  "daily:text": { src: "/images/daily/verse-of-the-day.png", position: "55% 70%", tone: "#9c744e" },
};

export function artworkFor(keys: ArtworkKeys): ArtworkAsset | null {
  const list = typeof keys === "string" ? [keys] : keys ?? [];
  for (const key of list) {
    if (key && ARTWORK[key]) return ARTWORK[key];
  }
  return null;
}

/** Schrifttekst: eerst het boek, dan het werk (in elke taal hetzelfde beeld). */
export function scriptureArtworkKeys(work: string | null | undefined, bookKey?: string | null): string[] {
  return [bookKey ? `book:${bookKey}` : null, work ? `work:${work}` : null].filter((key): key is string => key !== null);
}

/** Een cursus: eigen beeld, anders dat van het boek waar je bent, anders van het werk. */
export function courseArtworkKeys(course: { slug?: string | null; work?: string | null; bookKey?: string | null }): string[] {
  return [...(course.slug ? [`course:${course.slug}`] : []), ...scriptureArtworkKeys(course.work, course.bookKey)];
}

/** Een podcast(aflevering): eigen beeld per podcast, anders het algemene podcastbeeld. */
export function podcastArtworkKeys(podcastId: string | null | undefined): string[] {
  return [...(podcastId ? [`podcast:${podcastId}`] : []), "podcast:default"];
}

export function gameArtworkKeys(gameId: string): string[] {
  return [`game:${gameId}`];
}
