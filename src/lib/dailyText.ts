import { prisma } from "@/lib/db";
import { dayKey } from "@/lib/dates";

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

  const key = dayKey(date);
  const dayNumber = Math.floor(new Date(`${key}T00:00:00Z`).getTime() / 86400000);
  return verses[((dayNumber % verses.length) + verses.length) % verses.length];
}
