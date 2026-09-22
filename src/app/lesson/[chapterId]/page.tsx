import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import LessonFlow from "@/components/LessonFlow";

// Een hoofdstuk kan (met de automatisch gegenereerde invuloefeningen erbij)
// tientallen oefeningen hebben — veel te veel voor één les. Net als bij de
// "Snelle ronde" (zie practice/page.tsx) een willekeurige subset, zodat een
// hoofdstuk overzichtelijk blijft en je bij een volgende poging (of als een
// andere gebruiker hetzelfde hoofdstuk doet) een andere selectie kan krijgen.
const MAX_LESSON_EXERCISES = 7;

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ chapterId: string }>;
  searchParams: Promise<{ challengeId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { chapterId } = await params;
  const { challengeId } = await searchParams;
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      book: true,
      verses: { orderBy: { number: "asc" } },
      exercises: {
        orderBy: { order: "asc" },
        where: { status: "APPROVED" },
        include: { options: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!chapter) redirect("/dashboard");

  const verseIds = chapter.verses.map((v) => v.id);
  const [bookmarks, highlights, notes, allChapters] = await Promise.all([
    prisma.bookmark.findMany({ where: { userId: user.id, verseId: { in: verseIds } } }),
    prisma.highlight.findMany({ where: { userId: user.id, verseId: { in: verseIds } } }),
    prisma.note.findMany({ where: { userId: user.id, verseId: { in: verseIds } } }),
    prisma.chapter.findMany({
      orderBy: [{ book: { order: "asc" } }, { order: "asc" }],
      select: { id: true },
    }),
  ]);

  const bookmarkedVerseIds = new Set(bookmarks.map((b) => b.verseId));
  const highlightedVerseIds = new Set(highlights.map((h) => h.verseId));
  const notesByVerseId = Object.fromEntries(notes.map((n) => [n.verseId, n.text]));

  const currentIndex = allChapters.findIndex((c) => c.id === chapter.id);
  const nextChapterId = currentIndex >= 0 ? allChapters[currentIndex + 1]?.id ?? null : null;

  const selectedExercises = [...chapter.exercises].sort(() => Math.random() - 0.5).slice(0, MAX_LESSON_EXERCISES);
  const exercises = selectedExercises.map((e) => ({
    id: e.id,
    type: e.type as "FILL_BLANK" | "WORD_BANK" | "TRUE_FALSE" | "MULTIPLE_CHOICE" | "SEQUENCE",
    verseRef: e.verseRef,
    prompt: e.prompt,
    hint: e.hint ?? undefined,
    blanks: (JSON.parse(e.answers) as string[]).length,
    wordBank: e.wordBank ? (JSON.parse(e.wordBank) as string[]) : undefined,
    options: e.options.length > 0 ? e.options.map((o) => o.label) : undefined,
  }));

  return (
    <LessonFlow
      chapterId={chapter.id}
      bookName={chapter.book.name}
      chapterNumber={chapter.number}
      nextChapterId={nextChapterId}
      verses={chapter.verses.map((v) => ({
        id: v.id,
        number: v.number,
        text: v.text,
        bookmarked: bookmarkedVerseIds.has(v.id),
        highlighted: highlightedVerseIds.has(v.id),
        note: notesByVerseId[v.id] ?? "",
      }))}
      exercises={exercises}
      challengeId={challengeId}
    />
  );
}
