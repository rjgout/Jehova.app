import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { advanceCourseProgress } from "@/lib/courses";
import ReadingLessonFlow from "@/components/ReadingLessonFlow";
import { chapterTerm, localizeTerm } from "@/lib/chapterTerm";
import { getT } from "@/lib/i18n";
import CourseBackTarget from "@/components/CourseBackTarget";

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
        include: { book: { include: { contentCollection: { select: { language: true } } } } },
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

  const lessonProgress = await prisma.userCourseLessonProgress.findUnique({
    where: {
      userId_lessonId: {
        userId: user.id,
        lessonId: lesson.id,
      },
    },
    select: { completed: true },
  });

  const isCompleted = lessonProgress?.completed ?? false;
  const isCurrent = courseProgress?.currentLessonId === lesson.id;

  if (!isCurrent && !isCompleted) {
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

  // Voorlezen stopt aan het eind van deze les: bij het begin van het vers
  // ná de laatste, of pas aan het eind van het bestand als dat er niet is.
  const verseAfter = lesson.chapter.audioUrl
    ? await prisma.verse.findFirst({
        where: { chapterId: lesson.chapterId, number: lesson.endVerse + 1 },
        select: { audioStart: true },
      })
    : null;
  const audio = lesson.chapter.audioUrl ? { url: lesson.chapter.audioUrl, end: verseAfter?.audioStart ?? null } : null;

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
      hint: exercise.hint ?? undefined,
      blanks: (JSON.parse(exercise.answers) as string[]).length,
      wordBank: exercise.wordBank ? (JSON.parse(exercise.wordBank) as string[]) : undefined,
      options: exercise.options.length > 0 ? exercise.options.map((option) => option.label) : undefined,
    }))
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  return (
    <>
    <CourseBackTarget href={`/courses/${lesson.courseId}`} parent={lesson.course.name} />
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
        audioStart: verse.audioStart,
      }))}
      audio={audio}
      term={localizeTerm(chapterTerm(lesson.chapter.book.slug), getT(user.uiLanguage))}
      exercises={exercises}
      language={lesson.chapter.book.contentCollection.language}
    />
    </>
  );
}
