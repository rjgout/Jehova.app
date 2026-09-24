import { prisma } from "@/lib/db";
import { BOM_COLLECTION_ID } from "@/lib/contentCollections";
import { amsterdamNow } from "@/lib/dates";

export interface DailyText {
  bookName: string;
  chapterNumber: number;
  verseNumber: number;
  text: string;
}

/**
 * Kies elke dag deterministisch één vers uit de beschikbare schrifttekst.
 *
 * De Book-tabel bevat de afzonderlijke boeken van het Boek van Mormon
 * (bijvoorbeeld "1 Nephi", "Alma" en "Moroni"), niet één boek met de naam
 * "Boek van Mormon". Daarom selecteren we alle boeken en niet op een
 * specifieke naam.
 */
export async function getTextOfTheDay(date = new Date()): Promise<DailyText | null> {
  // Tellen en daarna met skip precies één vers ophalen, in plaats van elke
  // aanroep (dashboard én elke schedulertick) de volledige schrifttekst in
  // het geheugen te laden.
  // De tekst van de dag komt uit het Boek van Mormon (zo staat hij ook in de
  // meldingen), niet uit de andere collecties in dezelfde tabel.
  const where = { chapter: { book: { contentCollectionId: BOM_COLLECTION_ID } } };
  const total = await prisma.verse.count({ where });
  if (total === 0) return null;

  const amsterdam = amsterdamNow(date);
  const key = `${amsterdam.year}-${String(amsterdam.month).padStart(2, "0")}-${String(amsterdam.day).padStart(2, "0")}`;
  let hash = 2166136261;
  for (const character of key) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const index = (hash >>> 0) % total;

  const verse = await prisma.verse.findFirst({
    where,
    orderBy: [{ chapter: { book: { order: "asc" } } }, { chapter: { order: "asc" } }, { number: "asc" }],
    skip: index,
    select: {
      number: true,
      text: true,
      chapter: { select: { number: true, book: { select: { name: true } } } },
    },
  });
  if (!verse) return null;

  return {
    bookName: verse.chapter.book.name,
    chapterNumber: verse.chapter.number,
    verseNumber: verse.number,
    text: verse.text,
  };
}
