import { prisma } from "@/lib/db";
import { amsterdamNow } from "@/lib/dates";

export interface DailyText {
  bookName: string;
  chapterNumber: number;
  verseNumber: number;
  text: string;
}

export async function getTextOfTheDay(date = new Date()): Promise<DailyText | null> {
  const books = await prisma.book.findMany({
    where: { name: "Boek van Mormon" },
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
