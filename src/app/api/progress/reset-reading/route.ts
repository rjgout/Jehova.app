import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";

const READING_COURSE_TYPES = ["FRONT_TO_BACK", "FREE_CHOICE", "BY_BOOK", "READING_LESSONS"] as const;

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  await prisma.$transaction(async (tx) => {
    const readingCourses = await tx.course.findMany({
      where: { type: { in: [...READING_COURSE_TYPES] } },
      select: { id: true, type: true },
    });
    const readingCourseIds = readingCourses.map((course) => course.id);
    const bomChapterIds = (
      await tx.chapter.findMany({
        where: { book: { name: "Boek van Mormon" } },
        select: { id: true },
      })
    ).map((chapter) => chapter.id);

    if (bomChapterIds.length > 0) {
      await tx.chapterProgress.deleteMany({
        where: { userId: user.id, chapterId: { in: bomChapterIds } },
      });
    }

    const readingLessonsCourseIds = readingCourses
      .filter((course) => course.type === "READING_LESSONS")
      .map((course) => course.id);

    if (readingLessonsCourseIds.length > 0) {
      await tx.userCourseLessonProgress.deleteMany({
        where: {
          userId: user.id,
          lesson: { courseId: { in: readingLessonsCourseIds } },
        },
      });
    }

    if (readingCourseIds.length > 0) {
      await tx.userCourseProgress.updateMany({
        where: { userId: user.id, courseId: { in: readingCourseIds } },
        data: {
          currentChapterId: null,
          currentLessonId: null,
          comboCount: 0,
          comboLastCompletedAt: null,
          lastActivityAt: new Date(),
        },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
