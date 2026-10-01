import type { Prisma, PrismaClient } from "@prisma/client";
import { getChapterStates } from "@/lib/learning/contentProgress";
import { isReadingRoute } from "@/lib/learning/routes";

type Db = PrismaClient | Prisma.TransactionClient;

export interface CourseChapterProgress {
  totalChapters: number;
  /** Hoofdstukken die gelezen én geoefend zijn, in welke route ook. */
  completedCount: number;
  /** Nog te verdienen basis-XP voor het huidige (of eerstvolgende) hoofdstuk. */
  xpAvailable: number;
}

/**
 * Voortgang van een leescursus voor de cursuslijst en Vandaag: voor elke
 * leesroute dezelfde telling, uit de gedeelde voortgang per inhoud. Null
 * voor cursussen zonder hoofdstukken (podcast, kinderen, ...).
 */
export async function getCourseChapterProgress(
  db: Db,
  userId: string,
  course: { id: string; type: string },
  currentChapterId: string | null
): Promise<CourseChapterProgress | null> {
  if (!isReadingRoute(course.type)) return null;
  const chapterSelect = { id: true, number: true, book: { select: { key: true } } } as const;
  const chapters =
    course.type === "READING_LESSONS"
      ? [
          ...new Map(
            (await db.courseLesson.findMany({ where: { courseId: course.id }, orderBy: { order: "asc" }, select: { chapter: { select: chapterSelect } } })).map(
              (lesson) => [lesson.chapter.id, lesson.chapter]
            )
          ).values(),
        ]
      : (await db.courseChapter.findMany({ where: { courseId: course.id }, orderBy: { order: "asc" }, select: { chapter: { select: chapterSelect } } })).map(
          (row) => row.chapter
        );
  const states = await getChapterStates(db, userId, chapters);
  const current = (currentChapterId && states.get(currentChapterId)) || chapters.map((c) => states.get(c.id)!).find((state) => !state.done);
  return {
    totalChapters: chapters.length,
    completedCount: [...states.values()].filter((state) => state.done).length,
    xpAvailable: current?.xpAvailable ?? 0,
  };
}
