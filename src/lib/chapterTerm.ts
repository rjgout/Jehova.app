// Hoe de onderdelen van een boek heten. Leer en Verbonden is ingedeeld in
// afdelingen (zo heet het ook op de Nederlandse kerkwebsite: "Afdeling 1"),
// alle andere boeken in hoofdstukken. Puur data, dus bruikbaar op de server
// en in client components.

export interface ChapterTerm {
  singular: string; // "hoofdstuk"
  plural: string; // "hoofdstukken"
  // Met lidwoord, want het verschilt: "dit hoofdstuk", "deze afdeling".
  thisOne: string;
}

const HOOFDSTUK: ChapterTerm = { singular: "hoofdstuk", plural: "hoofdstukken", thisOne: "dit hoofdstuk" };
const AFDELING: ChapterTerm = { singular: "afdeling", plural: "afdelingen", thisOne: "deze afdeling" };

const SECTION_BOOK_SLUGS = new Set(["leer-en-verbonden"]);
// Voor cursussen zonder vast boek (van voor naar achter, leeslessen): de
// collectie. Letterlijk en niet uit contentCollections.ts, omdat dat bestand
// de database importeert en dit ook in client components gebruikt wordt.
const SECTION_COLLECTION_IDS = new Set(["content_dc"]);

export function chapterTerm(bookSlug: string | null | undefined, collectionId?: string | null): ChapterTerm {
  if (bookSlug && SECTION_BOOK_SLUGS.has(bookSlug)) return AFDELING;
  if (!bookSlug && collectionId && SECTION_COLLECTION_IDS.has(collectionId)) return AFDELING;
  return HOOFDSTUK;
}

export function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
