import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { advanceCourseProgress } from "@/lib/courses";
import ReadingLessonFlow from "@/components/ReadingLessonFlow";

export default async function ReadingLessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { lessonId } = await params;
  const lesson = await prisma.courseLesson.findUnique({
    where: { id: lessonId },
    include: {
      course: true,
      chapter: {
        include: { book: true },
      },
      exercises: {
        orderBy: { order: "asc" },
        include: {
          exercise: {
            include: { options: { orderBy: { order: "asc" } } },
          },
        },
      },
    },
  });

  if (!lesson || lesson.course.type !== "READING_LESSONS") redirect("/courses");

  let courseProgress = await prisma.userCourseProgress.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: lesson.courseId } },
  });
  if (!courseProgress) {
    await advanceCourseProgress(prisma, user.id, lesson.courseId);
    courseProgress = await prisma.userCourseProgress.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: lesson.courseId } },
    });
  }

  if (courseProgress?.currentLessonId !== lesson.id) {
    redirect(`/courses/${lesson.courseId}/chapter/${lesson.chapterId}`);
  }

  const verses = await prisma.verse.findMany({
    where: {
      chapterId: lesson.chapterId,
      number: { gte: lesson.startVerse, lte: lesson.endVerse },
    },
    orderBy: { number: "asc" },
  });
  const verseIds = verses.map((verse) => verse.id);
  const [bookmarks, highlights, notes, chapterLessonCount] = await Promise.all([
    prisma.bookmark.findMany({ where: { userId: user.id, verseId: { in: verseIds } } }),
    prisma.highlight.findMany({ where: { userId: user.id, verseId: { in: verseIds } } }),
    prisma.note.findMany({ where: { userId: user.id, verseId: { in: verseIds } } }),
    prisma.courseLesson.count({ where: { courseId: lesson.courseId, chapterId: lesson.chapterId } }),
  ]);

  const bookmarkedVerseIds = new Set(bookmarks.map((bookmark) => bookmark.verseId));
  const highlightedVerseIds = new Set(highlights.map((highlight) => highlight.verseId));
  const notesByVerseId = Object.fromEntries(notes.map((note) => [note.verseId, note.text]));

  const [nextLesson, firstChapterLesson] = await Promise.all([
    prisma.courseLesson.findFirst({
      where: { courseId: lesson.courseId, order: lesson.order + 1 },
      select: { id: true },
    }),
    prisma.courseLesson.findFirst({
      where: { courseId: lesson.courseId, chapterId: lesson.chapterId },
      orderBy: { order: "asc" },
      select: { order: true },
    }),
  ]);

  const exercises = lesson.exercises
    .map(({ exercise }) => ({
      id: exercise.id,
      type: exercise.type as "FILL_BLANK" | "WORD_BANK" | "TRUE_FALSE" | "MULTIPLE_CHOICE" | "SEQUENCE",
      verseRef: exercise.verseRef,
      prompt: exercise.prompt,
      blanks: (JSON.parse(exercise.answers) as string[]).length,
      wordBank: exercise.wordBank ? (JSON.parse(exercise.wordBank) as string[]) : undefined,
      options: exercise.options.length > 0 ? exercise.options.map((option) => option.label) : undefined,
    }))
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  return (
    <ReadingLessonFlow
      lessonId={lesson.id}
      chapterId={lesson.chapterId}
      bookName={lesson.chapter.book.name}
      chapterNumber={lesson.chapter.number}
      lessonNumber={lesson.order - (firstChapterLesson?.order ?? lesson.order) + 1}
      totalLessons={chapterLessonCount}
      startVerse={lesson.startVerse}
      endVerse={lesson.endVerse}
      nextLessonId={nextLesson?.id ?? null}
      verses={verses.map((verse) => ({
        id: verse.id,
        number: verse.number,
        text: verse.text,
        bookmarked: bookmarkedVerseIds.has(verse.id),
        highlighted: highlightedVerseIds.has(verse.id),
        note: notesByVerseId[verse.id] ?? "",
      }))}
      exercises={exercises}
    />
  );
}
