import type { AlleskennerItemKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { alleskennerItems } from "../../../prisma/alleskennerContent";
import { generatedAlleskennerItems } from "../../../prisma/alleskennerGenerated";
import { importAlleskennerItems, importAlleskennerTranslations } from "../../../prisma/importAlleskenner";
import { alleskennerTranslations } from "../../../prisma/alleskennerTranslate";
import kidsManifest from "../../../prisma/kidsManifest.json";
import { parsePassage, type AlleskennerDataFor } from "@/lib/alleskenner/content";
import { BOFM_WORK, BOM_COLLECTION_ID } from "@/lib/contentCollections";
import { DEFAULT_LANGUAGE, fallbackChain } from "@/lib/languages";

/**
 * Zorgt dat nieuwe onderdelen uit alleskennerContent.ts in de database staan,
 * ook als na een update nog niemand "Content opnieuw laden" heeft gedaan. Een
 * telling is goedkoop; alleen bij een verschil wordt er echt geïmporteerd.
 */
export async function ensureAlleskennerContent(): Promise<void> {
  const all = [...alleskennerItems, ...generatedAlleskennerItems()];
  const inDatabase = await prisma.alleskennerItem.count({ where: { id: { in: all.map((i) => i.id) } } });
  if (inDatabase < all.length) {
    await importAlleskennerItems(prisma, all, () => {});
  }
  const translations = alleskennerTranslations(all);
  const translated = await prisma.alleskennerItemTranslation.count();
  if (translated < translations.length) {
    await importAlleskennerTranslations(prisma, translations, () => {});
  }
}

export interface PickedItem<K extends AlleskennerItemKind> {
  id: string;
  data: AlleskennerDataFor<K>;
}

/** Soort generator ("gen-persoon", "gen-galerij-citaat"), of "hand" voor handgeschreven. */
function family(id: string): string {
  if (!id.startsWith("gen-")) return "hand";
  return id.split("-").slice(0, id.startsWith("gen-galerij-") ? 3 : 2).join("-");
}

/**
 * Nog niet geziene onderdelen in speelvolgorde: eerst alle handgeschreven
 * (willekeurig), daarna om en om per generator, zodat een spel niet uit
 * vijftien vragen van hetzelfde soort bestaat.
 */
export function interleave<T extends { id: string }>(items: T[]): T[] {
  const hand = items.filter((i) => family(i.id) === "hand");
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = family(item.id);
    if (key !== "hand") groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const lists = [...groups.values()];
  const mixed: T[] = [];
  for (let round = 0; mixed.length < items.length - hand.length; round++) {
    for (const list of lists) if (list[round]) mixed.push(list[round]);
  }
  return [...hand, ...mixed];
}

/**
 * Kiest `count` ingeschakelde onderdelen van één soort: eerst onderdelen die
 * geen van de deelnemers ooit heeft gezien (handgeschreven voorop, zie
 * interleave), daarna de langst geleden geziene. Binnen dezelfde groep
 * willekeurig, zodat een nieuw potje niet steeds met dezelfde volgorde begint.
 */
export async function pickItems<K extends AlleskennerItemKind>(
  kind: K,
  count: number,
  participantIds: string[],
  accept: (data: AlleskennerDataFor<K>) => boolean = () => true,
  // Talen (behalve Nederlands) waarin elk gekozen onderdeel moet bestaan:
  // spelers in die talen spelen dan op precies dezelfde vragen.
  languages: string[] = []
): Promise<PickedItem<K>[]> {
  const rows = await prisma.alleskennerItem.findMany({
    where: {
      kind,
      enabled: true,
      ...(languages.length > 0
        ? { editedByAdmin: false, AND: languages.map((language) => ({ translations: { some: { language } } })) }
        : {}),
    },
    select: {
      id: true,
      data: true,
      seenBy: { where: { userId: { in: participantIds } }, select: { seenAt: true } },
    },
  });

  const candidates = rows
    .map((row) => ({
      id: row.id,
      data: JSON.parse(row.data) as AlleskennerDataFor<K>,
      lastSeen: row.seenBy.reduce((max, s) => Math.max(max, s.seenAt.getTime()), 0),
      random: Math.random(),
    }))
    .filter((c) => accept(c.data))
    .sort((a, b) => a.lastSeen - b.lastSeen || a.random - b.random);

  const unseen = candidates.filter((c) => c.lastSeen === 0);
  const seen = candidates.filter((c) => c.lastSeen !== 0);
  return [...interleave(unseen), ...seen].slice(0, count).map(({ id, data }) => ({ id, data }));
}

/**
 * Onderdelen op volgorde van `ids` (bv. de vastgelegde Alleskenner van de
 * dag). Wat inmiddels is uitgeschakeld of verwijderd, valt weg.
 */
export async function itemsByIds<K extends AlleskennerItemKind>(kind: K, ids: string[]): Promise<PickedItem<K>[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.alleskennerItem.findMany({
    where: { kind, enabled: true, id: { in: ids } },
    select: { id: true, data: true },
  });
  const byId = new Map(rows.map((row) => [row.id, JSON.parse(row.data) as AlleskennerDataFor<K>]));
  return ids.flatMap((id) => {
    const data = byId.get(id);
    return data ? [{ id, data }] : [];
  });
}

/** Registreert dat deze gebruikers deze onderdelen nu gezien hebben. */
export async function markSeen(itemIds: string[], userIds: string[]): Promise<void> {
  if (itemIds.length === 0 || userIds.length === 0) return;
  const now = new Date();
  await prisma.alleskennerSeen.updateMany({
    where: { itemId: { in: itemIds }, userId: { in: userIds } },
    data: { seenAt: now },
  });
  await prisma.alleskennerSeen.createMany({
    data: userIds.flatMap((userId) => itemIds.map((itemId) => ({ userId, itemId, seenAt: now }))),
    skipDuplicates: true,
  });
}

// Boeknamen als "Alma" bestaan in meerdere uitgaven: zoek daarom altijd
// binnen één uitgave (standaard de Nederlandse).

/** Tekst van een vers op basis van een verwijzing als "Mosiah 2:17". */
export async function verseTextByRef(ref: string, collectionId: string = BOM_COLLECTION_ID): Promise<string | null> {
  const verses = await passageVerses(ref, collectionId);
  return verses[0]?.text ?? null;
}

/** Verzen van een passage als "Alma 17:25-27", op volgorde. */
export async function passageVerses(
  passage: string,
  collectionId: string = BOM_COLLECTION_ID
): Promise<{ number: number; text: string }[]> {
  const range = parsePassage(passage);
  if (!range) return [];
  return prisma.verse.findMany({
    where: {
      number: { gte: range.from, lte: range.to },
      chapter: { number: range.chapter, book: { name: range.book, contentCollectionId: collectionId } },
    },
    select: { number: true, text: true },
    orderBy: { number: "asc" },
  });
}

/**
 * Namen van alle boeken uit dezelfde collectie als `bookName` — de tikopties
 * bij een citatengalerij (het antwoord is altijd het boek van het vers).
 */
export async function siblingBookNames(bookName: string, collectionId: string = BOM_COLLECTION_ID): Promise<string[]> {
  const book = await prisma.book.findFirst({ where: { name: bookName, contentCollectionId: collectionId }, select: { id: true } });
  if (!book) return [];
  const books = await prisma.book.findMany({
    where: { contentCollectionId: collectionId },
    select: { name: true },
    orderBy: { order: "asc" },
  });
  return books.map((b) => b.name);
}

// Titels en illustraties van de kinderverhalen komen uit het manifest (altijd
// aanwezig), niet uit de database: een installatie zonder geïmporteerde
// kindercursus heeft de afbeeldingen in public/ toch al.
const kidsStories = kidsManifest as { number: number; title: string; images: string[] }[];

export function kidsStory(number: number): { title: string; images: string[] } | null {
  return kidsStories.find((s) => s.number === number) ?? null;
}

export function kidsStoryTitles(): string[] {
  return kidsStories.map((s) => s.title);
}

// --- Talen ----------------------------------------------------------------------

let languagesCache: { at: number; languages: string[] } | null = null;

/** Talen (behalve Nederlands) waarin onderdelen vertaald zijn; een minuut onthouden. */
export async function alleskennerLanguages(): Promise<string[]> {
  if (languagesCache && Date.now() - languagesCache.at < 60_000) return languagesCache.languages;
  const rows = await prisma.alleskennerItemTranslation.findMany({ distinct: ["language"], select: { language: true } });
  languagesCache = { at: Date.now(), languages: rows.map((r) => r.language) };
  return languagesCache.languages;
}

/** De taal waarin iemand De Alleskenner speelt: de eigen contenttaal, anders langs de terugvalvolgorde. */
export function alleskennerLanguageFor(contentLanguage: string | null | undefined, available: string[]): string {
  return fallbackChain(contentLanguage).find((code) => code === DEFAULT_LANGUAGE || available.includes(code)) ?? DEFAULT_LANGUAGE;
}

/** De uitgave van het Boek van Mormon in die taal (ook als die voor gebruikers verborgen is). */
export async function editionCollectionId(language: string): Promise<string> {
  if (language === DEFAULT_LANGUAGE) return BOM_COLLECTION_ID;
  const edition = await prisma.contentCollection.findFirst({ where: { work: BOFM_WORK, language }, select: { id: true } });
  return edition?.id ?? BOM_COLLECTION_ID;
}

/** Vertalingen van deze onderdelen in deze talen, per taal per onderdeel. */
export async function itemTranslations(itemIds: string[], languages: string[]): Promise<Map<string, Map<string, unknown>>> {
  const result = new Map<string, Map<string, unknown>>(languages.map((l) => [l, new Map()]));
  if (itemIds.length === 0 || languages.length === 0) return result;
  const rows = await prisma.alleskennerItemTranslation.findMany({
    where: { itemId: { in: itemIds }, language: { in: languages }, item: { editedByAdmin: false } },
    select: { itemId: true, language: true, data: true },
  });
  for (const row of rows) result.get(row.language)?.set(row.itemId, JSON.parse(row.data));
  return result;
}

/** Boeknamen van het Boek van Mormon: Nederlandse naam -> naam in de uitgave van die taal. */
export async function bookNamePairs(collectionId: string): Promise<[string, string][]> {
  const [nl, own] = await Promise.all([
    prisma.book.findMany({ where: { contentCollectionId: BOM_COLLECTION_ID }, select: { key: true, name: true } }),
    prisma.book.findMany({ where: { contentCollectionId: collectionId }, select: { key: true, name: true } }),
  ]);
  const byKey = new Map(own.map((b) => [b.key, b.name]));
  return nl.flatMap((b) => (b.key && byKey.has(b.key) ? [[b.name, byKey.get(b.key)!] as [string, string]] : []));
}
