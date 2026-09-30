import { prisma } from "@/lib/db";
import { chapterTerm, localizeTerm } from "@/lib/chapterTerm";
import { localizedCourse } from "@/lib/courseText";
import type { TFunction } from "@/lib/i18n/core";

// Per cursus in de persoonlijke lijst van een gebruiker: voortgang,
// huidige plek en beschikbare XP. Eén berekening voor /api/courses (de
// cursuslijst) en "Ga verder" op Vandaag, zodat die nooit uiteenlopen.
// Geen next/headers: de aanroeper geeft gebruiker en collectie mee.

export type CourseSummary = Awaited<ReturnType<typeof getSubscribedCourseSummaries>>[number];

export async function getSubscribedCourseSummaries(
  user: { id: string; uiLanguage: string | null; activeCourseId: string | null },
  collectionId: string,
  t: TFunction
) {
  const [courses, userProgress] = await Promise.all([
    prisma.course.findMany({
      where: { enabled: true, contentCollectionId: collectionId },
      orderBy: { order: "asc" },
      include: {
        _count: { select: { chapters: true } },
        book: { select: { slug: true } },
        contentCollection: { select: { work: true } },
      },
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
        ...localizedCourse({ ...course, work: course.contentCollection.work }, user.uiLanguage),
        work: course.contentCollection.work,
        totalChapters,
        unitPlural: localizeTerm(chapterTerm(course.book?.slug, course.contentCollectionId), t).plural,
        completedCount,
        xpAvailable,
        isActive: user.activeCourseId === course.id,
        lastActivityAt: progress?.lastActivityAt.toISOString() ?? null,
        currentChapter: progress?.currentChapter
          ? {
              id: progress.currentChapter.id,
              bookName: progress.currentChapter.book.name,
              bookKey: progress.currentChapter.book.key,
              number: progress.currentChapter.number,
            }
          : null,
      };
    })
  );

  return result;
}
