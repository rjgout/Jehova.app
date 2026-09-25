import { prisma } from "@/lib/db";

// Taalonafhankelijke verwijzing naar een hoofdstuk of vers: dezelfde
// Book.key (het pad van de kerk, zie prisma/bookKeys.ts) plus hoofdstuk- en
// versnummer betekent in elke taaluitgave hetzelfde. Hiermee kan een spel één
// vraag stellen en elke speler die in de eigen taal laten zien.
export interface ScriptureRef {
  bookKey: string;
  chapter: number;
  verse?: number;
}

export async function refForChapter(chapterId: string): Promise<ScriptureRef | null> {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { number: true, book: { select: { key: true } } },
  });
  if (!chapter?.book.key) return null;
  return { bookKey: chapter.book.key, chapter: chapter.number };
}

/** Hetzelfde hoofdstuk in een andere uitgave (collectie); null als die het niet heeft. */
export async function chapterIdInEdition(ref: ScriptureRef, editionId: string): Promise<string | null> {
  const chapter = await prisma.chapter.findFirst({
    where: { number: ref.chapter, book: { key: ref.bookKey, contentCollectionId: editionId } },
    select: { id: true },
  });
  return chapter?.id ?? null;
}

/** Hetzelfde vers in een andere uitgave; null als die het niet heeft. */
export async function verseInEdition(ref: ScriptureRef & { verse: number }, editionId: string) {
  return prisma.verse.findFirst({
    where: { number: ref.verse, chapter: { number: ref.chapter, book: { key: ref.bookKey, contentCollectionId: editionId } } },
    select: {
      id: true,
      number: true,
      text: true,
      chapter: { select: { id: true, number: true, book: { select: { name: true } } } },
    },
  });
}
