import type { LanguageCode } from "@/lib/languages";

type ContentCollectionIdentity = { id: string; work: string | null };

// Alleen afkortingen die in de betreffende taal herkenbaar en gangbaar zijn.
// Ontbrekende waarden zijn bewust: dan valt de header terug op het icoon.
const ABBREVIATIONS: Partial<Record<string, Partial<Record<LanguageCode, string>>>> = {
  bofm: { nl: "BvM", en: "BoM" },
  "dc-testament": { nl: "LV", en: "D&C" },
};

export function contentAbbreviation(collection: ContentCollectionIdentity, language: string): string | null {
  const work = collection.work ?? collection.id;
  return ABBREVIATIONS[work]?.[language as LanguageCode] ?? null;
}
