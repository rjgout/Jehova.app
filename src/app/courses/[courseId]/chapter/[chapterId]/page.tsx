import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { advanceCourseProgress } from "@/lib/courses";
import ReadingChapterView from "@/components/ReadingChapterView";

export default async function ReadingChapterPage({
  params,
}: {
  params: Promise<{ courseId: string; chapterId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { courseId, chapterId } = await params;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, type: true },
  });
  if (!course || course.type !== "READING_LESSONS") redirect("/courses");

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { book: true },
  });
  if (!chapter) redirect(`/courses/${courseId}`);

  const lessons = await prisma.courseLesson.findMany({
    where: { courseId, chapterId },
    orderBy: { order: "asc" },
    include: { progress: { where: { userId: user.id } } },
  });

  let courseProgress = await prisma.userCourseProgress.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
  });
  if (!courseProgress) {
    await advanceCourseProgress(prisma, user.id, courseId);
    courseProgress = await prisma.userCourseProgress.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    });
  }

  const globalCurrentLessonOrder = courseProgress?.currentLessonId
    ? (await prisma.courseLesson.findUnique({
        where: { id: courseProgress.currentLessonId },
        select: { order: true },
      }))?.order ?? null
    : null;

  return (
    <ReadingChapterView
      courseId={courseId}
      bookName={chapter.book.name}
      chapterNumber={chapter.number}
      lessons={lessons.map((lesson) => ({
        id: lesson.id,
        number: lesson.order - (await chapterLessonOffset(prisma, courseId, chapterId)) + 1,
        startVerse: lesson.startVerse,
        endVerse: lesson.endVerse,
        verseCount: lesson.endVerse - lesson.startVerse + 1,
        completed: lesson.progress[0]?.completed ?? false,
        bestScore: lesson.progress[0]?.bestScore ?? null,
        locked: globalCurrentLessonOrder !== null ? lesson.order > globalCurrentLessonOrder : !lesson.progress[0]?.completed,
      }))}
    />
  );
}

async function chapterLessonOffset(
  db: typeof prisma,
  courseId: string,
  chapterId: string
): Promise<number> {
  const first = await db.courseLesson.findFirst({
    where: { courseId, chapterId },
    orderBy: { order: "asc" },
    select: { order: true },
  });
  return first?.order ?? 0;
}
