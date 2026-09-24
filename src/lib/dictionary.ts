import bomWordCounts from "../../prisma/bomWordCounts.json";
import dcWordCounts from "../../prisma/dcWordCounts.json";
import pgpWordCounts from "../../prisma/pgpWordCounts.json";
import { prisma } from "@/lib/db";
import { BOM_COLLECTION_ID, DC_COLLECTION_ID, PGP_COLLECTION_ID } from "@/lib/contentCollections";

export interface DictionaryEntry {
  word: string;
  count: number;
}

// Zelfde brontekst en exact dezelfde extractie (regex + kleine letters +
// diakritische tekens strippen) als prisma/bomWords.json, zodat deze lijst
// altijd één-op-één overeenkomt met wat geldig is in het woordlegspel (zie
// src/lib/scrabble/dictionary.ts) — dit woordenboek is dus ook bruikbaar
// als hulpmiddel bij woordspelletjes. Statisch gegenereerd i.p.v. live
// opgeteld uit de database, om dezelfde reden dat bomWords.json dat ook is.
// Leer en Verbonden en de Parel van Grote Waarde hebben elk een eigen lijst
// met dezelfde extractie (zie scripts/church-text/fetch_dc_pgp.py).
function toEntries(counts: Record<string, number>): DictionaryEntry[] {
  return Object.entries(counts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => a.word.localeCompare(b.word, "nl"));
}

const ENTRIES_BY_COLLECTION: Record<string, DictionaryEntry[]> = {
  [BOM_COLLECTION_ID]: toEntries(bomWordCounts as Record<string, number>),
  [DC_COLLECTION_ID]: toEntries(dcWordCounts as Record<string, number>),
  [PGP_COLLECTION_ID]: toEntries(pgpWordCounts as Record<string, number>),
};

/** Collecties met een woordenboek (zie src/app/tools/page.tsx). */
export const DICTIONARY_COLLECTION_IDS = Object.keys(ENTRIES_BY_COLLECTION);

export function getDictionaryEntries(collectionId: string = BOM_COLLECTION_ID): DictionaryEntry[] {
  return ENTRIES_BY_COLLECTION[collectionId] ?? [];
}

export interface VerseMatch {
  bookName: string;
  chapterNumber: number;
  verseNumber: number;
  text: string;
}

// Haalt het diakriet-vrije woord terug in de brontekst: dezelfde extractie
// (regex + NFD-normaliseren + diakritische tekens strippen + kleine
// letters) als waarmee prisma/bomWords.json zelf is opgebouwd, zodat een
// woord uit die lijst hier gegarandeerd ook weer teruggevonden wordt —
// ongeacht hoofdletters aan het begin van een zin of eventuele accenten in
// de brontekst.
const COMBINING_DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

function normalizeToken(s: string): string {
  return s.normalize("NFD").replace(COMBINING_DIACRITICS, "").toLowerCase();
}

/**
 * Alle verzen waar een bepaald woord (heel woord, geen deel van een langer
 * woord) in voorkomt — gebruikt door het Woordenboek (klik op een woord) en
 * door het dagelijkse woordspel (na afloop, om te laten zien waar het woord
 * van vandaag vandaan komt). Scant de volledige verzentabel (~6600 rijen,
 * dus prima snel genoeg voor deze niet-veelgevraagde actie) in plaats van
 * een aparte woord-naar-verzen-index bij te houden.
 */
export async function findVersesContainingWord(word: string, collectionId: string = BOM_COLLECTION_ID): Promise<VerseMatch[]> {
  const target = normalizeToken(word);
  const verses = await prisma.verse.findMany({
    where: { chapter: { book: { contentCollectionId: collectionId } } },
    select: {
      number: true,
      text: true,
      chapter: { select: { number: true, book: { select: { name: true, order: true } } } },
    },
  });

  return verses
    .filter((v) => (v.text.match(/[A-Za-zÀ-ÿ]+/g) ?? []).some((token) => normalizeToken(token) === target))
    .sort((a, b) => a.chapter.book.order - b.chapter.book.order || a.chapter.number - b.chapter.number || a.number - b.number)
    .map((v) => ({
      bookName: v.chapter.book.name,
      chapterNumber: v.chapter.number,
      verseNumber: v.number,
      text: v.text,
    }));
}
