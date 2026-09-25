import { prisma } from "@/lib/db";
import { BOM_COLLECTION_ID } from "@/lib/contentCollections";
import { amsterdamNow } from "@/lib/dates";

export interface DailyText {
  /** Pad naar dit vers in de lezer, zie textOfTheDayHref. */
  href: string;
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
      chapter: { select: { id: true, number: true, book: { select: { name: true } } } },
    },
  });
  if (!verse) return null;

  return {
    href: await textOfTheDayHref(verse.chapter.id, verse.number),
    bookName: verse.chapter.book.name,
    chapterNumber: verse.chapter.number,
    verseNumber: verse.number,
    text: verse.text,
  };
}

/**
 * Het vers in de lezer, binnen Vrije keuze: dan wijst de terugbalk naar die
 * cursus en niet naar de algemene cursuslijst. Vrije keuze wordt daarmee
 * niet actief en ook niet toegevoegd aan je cursussen: de lespagina en de
 * cursuspagina maken voor Vrije keuze geen voortgangsrij aan (zie
 * advanceCourseProgress), en het actieve cursus-id blijft ongemoeid. Staat
 * Vrije keuze uit, dan opent het hoofdstuk zonder cursus.
 */
async function textOfTheDayHref(chapterId: string, verseNumber: number): Promise<string> {
  const freeChoice = await prisma.course.findFirst({
    where: {
      type: "FREE_CHOICE",
      enabled: true,
      contentCollectionId: BOM_COLLECTION_ID,
      chapters: { some: { chapterId } },
    },
    select: { id: true },
  });
  const params = new URLSearchParams({ vers: String(verseNumber) });
  if (freeChoice) params.set("cursus", freeChoice.id);
  return `/lesson/${chapterId}?${params.toString()}`;
}
