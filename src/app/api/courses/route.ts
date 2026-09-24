import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getContentContext } from "@/lib/contentCollections";
import { chapterTerm } from "@/lib/chapterTerm";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const contentContext = await getContentContext(user.id);

  const [courses, userProgress] = await Promise.all([
    prisma.course.findMany({
      where: { enabled: true, contentCollectionId: contentContext.active.id },
      orderBy: { order: "asc" },
      include: { _count: { select: { chapters: true } }, book: { select: { slug: true } } },
    }),
    prisma.userCourseProgress.findMany({
      where: { userId: user.id, subscribed: true },
      include: { currentChapter: { include: { book: true } } },
    }),
  ]);

  const progressByCourseId = new Map(userProgress.map((p) => [p.courseId, p]));
  // Alleen de cursussen die deze gebruiker aan zijn persoonlijke lijst
  // toevoegde (zie subscribeUserToCourse) — de rest staat in de catalogus
  // (/api/courses/catalog, "Voeg nieuwe cursus toe").
  const subscribedCourses = courses.filter((c) => progressByCourseId.has(c.id));

  const result = await Promise.all(
    subscribedCourses.map(async (course) => {
      const progress = progressByCourseId.get(course.id);
      let totalChapters = course._count.chapters;
      let completedCount = 0;
      let xpAvailable = 0;

      if (course.type === "READING_LESSONS") {
        const lessons = await prisma.courseLesson.findMany({
          where: { courseId: course.id },
          select: { chapterId: true, id: true },
        });
        totalChapters = new Set(lessons.map((lesson) => lesson.chapterId)).size;
        if (lessons.length > 0) {
          const completedLessons = await prisma.userCourseLessonProgress.findMany({
            where: { userId: user.id, lessonId: { in: lessons.map((lesson) => lesson.id) }, completed: true },
            select: { lessonId: true },
          });
          const completedIds = new Set(completedLessons.map((lesson) => lesson.lessonId));
          const completedByChapter = new Map<string, number>();
          const totalByChapter = new Map<string, number>();
          for (const lesson of lessons) {
            totalByChapter.set(lesson.chapterId, (totalByChapter.get(lesson.chapterId) ?? 0) + 1);
            if (completedIds.has(lesson.id)) {
              completedByChapter.set(lesson.chapterId, (completedByChapter.get(lesson.chapterId) ?? 0) + 1);
            }
          }
          completedCount = [...totalByChapter.keys()].filter(
            (chapterId) => completedByChapter.get(chapterId) === totalByChapter.get(chapterId)
          ).length;
        }
      } else if (course._count.chapters > 0) {
        const chapterIds = (
          await prisma.courseChapter.findMany({ where: { courseId: course.id }, select: { chapterId: true } })
        ).map((c) => c.chapterId);
        completedCount = await prisma.chapterProgress.count({
          where: { userId: user.id, chapterId: { in: chapterIds }, completed: true },
        });
      }

      if (progress?.currentChapterId) {
        const currentChapter = await prisma.chapter.findUnique({
          where: { id: progress.currentChapterId },
          include: { _count: { select: { exercises: true } } },
        });
        if (currentChapter) {
          xpAvailable = Math.min(currentChapter._count.exercises, 7) * 10 + (currentChapter._count.exercises ? 20 : 0);
        }
      }

      return {
        id: course.id,
        slug: course.slug,
        type: course.type,
        name: course.name,
        description: course.description,
        totalChapters,
        unitPlural: chapterTerm(course.book?.slug).plural,
        completedCount,
        xpAvailable,
        isActive: user.activeCourseId === course.id,
        currentChapter: progress?.currentChapter
          ? {
              id: progress.currentChapter.id,
              bookName: progress.currentChapter.book.name,
              number: progress.currentChapter.number,
            }
          : null,
      };
    })
  );

  return NextResponse.json({ courses: result });
}
