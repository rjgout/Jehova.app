import { prisma } from "@/lib/db";
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
  const books = await prisma.book.findMany({
    orderBy: { order: "asc" },
    select: {
      name: true,
      chapters: {
        orderBy: { order: "asc" },
        select: {
          number: true,
          verses: { orderBy: { number: "asc" }, select: { number: true, text: true } },
        },
      },
    },
  });

  const verses = books.flatMap((book) =>
    book.chapters.flatMap((chapter) =>
      chapter.verses.map((verse) => ({
        bookName: book.name,
        chapterNumber: chapter.number,
        verseNumber: verse.number,
        text: verse.text,
      }))
    )
  );

  if (verses.length === 0) return null;

  const amsterdam = amsterdamNow(date);
  const key = `${amsterdam.year}-${String(amsterdam.month).padStart(2, "0")}-${String(amsterdam.day).padStart(2, "0")}`;
  let hash = 2166136261;
  for (const character of key) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const index = (hash >>> 0) % verses.length;
  return verses[index];
}
