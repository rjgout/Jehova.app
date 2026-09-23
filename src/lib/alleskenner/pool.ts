import type { AlleskennerItemKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { alleskennerItems } from "../../../prisma/alleskennerContent";
import { importAlleskennerItems } from "../../../prisma/importAlleskenner";
import kidsManifest from "../../../prisma/kidsManifest.json";
import { parsePassage, type AlleskennerDataFor } from "@/lib/alleskenner/content";

/**
 * Zorgt dat nieuwe onderdelen uit alleskennerContent.ts in de database staan,
 * ook als na een update nog niemand "Content opnieuw laden" heeft gedaan. Een
 * telling is goedkoop; alleen bij een verschil wordt er echt geïmporteerd.
 */
export async function ensureAlleskennerContent(): Promise<void> {
  const inDatabase = await prisma.alleskennerItem.count({ where: { id: { in: alleskennerItems.map((i) => i.id) } } });
  if (inDatabase < alleskennerItems.length) {
    await importAlleskennerItems(prisma, alleskennerItems, () => {});
  }
}

export interface PickedItem<K extends AlleskennerItemKind> {
  id: string;
  data: AlleskennerDataFor<K>;
}

/**
 * Kiest `count` ingeschakelde onderdelen van één soort: eerst onderdelen die
 * geen van de deelnemers ooit heeft gezien, daarna de langst geleden geziene.
 * Binnen dezelfde groep willekeurig, zodat een nieuw potje niet steeds met
 * dezelfde volgorde begint.
 */
export async function pickItems<K extends AlleskennerItemKind>(
  kind: K,
  count: number,
  participantIds: string[],
  accept: (data: AlleskennerDataFor<K>) => boolean = () => true
): Promise<PickedItem<K>[]> {
  const rows = await prisma.alleskennerItem.findMany({
    where: { kind, enabled: true },
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

  return candidates.slice(0, count).map(({ id, data }) => ({ id, data }));
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

/** Tekst van een vers op basis van een verwijzing als "Mosiah 2:17". */
export async function verseTextByRef(ref: string): Promise<string | null> {
  const verses = await passageVerses(ref);
  return verses[0]?.text ?? null;
}

/** Verzen van een passage als "Alma 17:25-27", op volgorde. */
export async function passageVerses(passage: string): Promise<{ number: number; text: string }[]> {
  const range = parsePassage(passage);
  if (!range) return [];
  return prisma.verse.findMany({
    where: {
      number: { gte: range.from, lte: range.to },
      chapter: { number: range.chapter, book: { name: range.book } },
    },
    select: { number: true, text: true },
    orderBy: { number: "asc" },
  });
}

/**
 * Namen van alle boeken uit dezelfde collectie als `bookName` — de tikopties
 * bij een citatengalerij (het antwoord is altijd het boek van het vers).
 */
export async function siblingBookNames(bookName: string): Promise<string[]> {
  const book = await prisma.book.findFirst({ where: { name: bookName }, select: { contentCollectionId: true } });
  if (!book) return [];
  const books = await prisma.book.findMany({
    where: { contentCollectionId: book.contentCollectionId },
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
