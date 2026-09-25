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

// Leer en Verbonden in elke taal: de Nederlandse slug, of de slug die
// fetch_scripture.py maakt ("<taal>-dc-testament-dc").
function isSectionBook(bookSlug: string): boolean {
  return bookSlug === "leer-en-verbonden" || bookSlug.endsWith("-dc-testament-dc");
}
// Voor cursussen zonder vast boek (van voor naar achter, leeslessen): de
// collectie ("content_dc", "content_dc_en", ...). Letterlijk en niet uit
// contentCollections.ts, omdat dat bestand de database importeert en dit ook
// in client components gebruikt wordt.
function isSectionCollection(collectionId: string): boolean {
  return collectionId === "content_dc" || collectionId.startsWith("content_dc_");
}

export function chapterTerm(bookSlug: string | null | undefined, collectionId?: string | null): ChapterTerm {
  if (bookSlug && isSectionBook(bookSlug)) return AFDELING;
  if (!bookSlug && collectionId && isSectionCollection(collectionId)) return AFDELING;
  return HOOFDSTUK;
}

export function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
