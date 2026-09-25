// Hoe de onderdelen van een boek heten. Leer en Verbonden is ingedeeld in
// afdelingen (zo heet het ook op de Nederlandse kerkwebsite: "Afdeling 1"),
// alle andere boeken in hoofdstukken. Puur data, dus bruikbaar op de server
// en in client components.

import type { TFunction } from "@/lib/i18n/core";

export interface ChapterTerm {
  /** Welk soort onderdeel, voor de vertaling (zie localizeTerm). */
  kind: "chapter" | "section";
  singular: string; // "hoofdstuk"
  plural: string; // "hoofdstukken"
  // Met lidwoord, want het verschilt: "dit hoofdstuk", "deze afdeling".
  thisOne: string;
}

const HOOFDSTUK: ChapterTerm = { kind: "chapter", singular: "hoofdstuk", plural: "hoofdstukken", thisOne: "dit hoofdstuk" };
const AFDELING: ChapterTerm = { kind: "section", singular: "afdeling", plural: "afdelingen", thisOne: "deze afdeling" };

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

/**
 * Dezelfde term in de taal van de app ("chapter", "Abschnitt", ...). Voor het
 * Nederlands geeft de vertaling exact de woorden hierboven terug.
 */
export function localizeTerm(term: ChapterTerm, t: TFunction): ChapterTerm {
  return {
    kind: term.kind,
    singular: t(`terms.${term.kind}.singular`),
    plural: t(`terms.${term.kind}.plural`),
    thisOne: t(`terms.${term.kind}.thisOne`),
  };
}
