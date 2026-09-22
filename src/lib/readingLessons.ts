import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { applyDailyStreak, type StudyResult } from "@/lib/streak";
import { awardXp } from "@/lib/xp";
import { checkAndAwardAchievements } from "@/lib/achievements";
import { awardCompetitionXp } from "@/lib/competitionXp";

const COMBO_TIMEOUT_MS = 15 * 60 * 1000;
const BASE_LESSON_XP = 10;

export interface ReadingLessonResult extends StudyResult {
  readingLessonCompleted: boolean;
  comboCount: number;
  comboMultiplier: number;
  nextLessonId: string | null;
  alreadyCompleted: boolean;
  nextXpEarned: number;
  nextComboMultiplier: number;
}

function comboMultiplier(comboCount: number): number {
  if (comboCount >= 3) return 2;
  if (comboCount === 2) return 1.5;
  return 1;
}

/**
 * Rondt een kleine leesles af. De server controleert de volgorde opnieuw,
 * zodat een vergrendelde les niet via een aangepaste URL kan worden geopend
 * en beloond.
 */
export async function completeReadingLesson(
  userId: string,
  lessonId: string,
  scorePercent: number,
  xpCorrect: number
): Promise<ReadingLessonResult> {
  return prisma.$transaction(async (tx) => {
    const lesson = await tx.courseLesson.findUnique({
      where: { id: lessonId },
      include: { course: true },
    });
    if (!lesson || lesson.course.type !== "READING_LESSONS") {
      throw new Error("Leesles niet gevonden");
    }

    const progress = await tx.userCourseProgress.findUnique({
      where: { userId_courseId: { userId, courseId: lesson.courseId } },
    });
    if (!progress) throw new Error("Cursusvoortgang niet gevonden");

    const existing = await tx.userCourseLessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });

    const wasAlreadyCompleted = existing?.completed ?? false;
    if (wasAlreadyCompleted) {
      const daily = await applyDailyStreak(tx, userId);
      const freezeCount = daily.freezeCountBeforeMilestone + daily.freezesEarned;
      await tx.user.update({
        where: { id: userId },
        data: {
          currentStreak: daily.currentStreak,
          longestStreak: daily.longestStreak,
          lastStudyDate: daily.today,
          freezeCount,
        },
      });
      if (daily.freezesEarned > 0) {
        await tx.freezeTransaction.create({
          data: { userId, type: "EARNED", amount: daily.freezesEarned, reason: "Mijlpaal bereikt" },
        });
      }
      return {
        xpEarned: 0,
        chapterCompleted: true,
        scorePercent,
        currentStreak: daily.currentStreak,
        longestStreak: daily.longestStreak,
        streakBroken: daily.streakBroken,
        freezeUsed: daily.freezeUsed,
        freezesEarned: daily.freezesEarned,
        freezeCount,
        newAchievements: [],
        alreadyStudiedToday: daily.alreadyStudiedToday,
        readingLessonCompleted: true,
        comboCount: 0,
        comboMultiplier: 1,
        nextLessonId: progress.currentLessonId,
        alreadyCompleted: true,
        nextXpEarned: 0,
        nextComboMultiplier: 1,
      };
    }

    // Alleen de actuele les mag worden afgerond. De eerste les is toegestaan
    // wanneer de cursus nog geen cursor heeft.
    if (progress.currentLessonId !== lessonId) {
      throw new Error("Deze les is nog vergrendeld");
    }

    const previousCompletedAt = progress.comboLastCompletedAt?.getTime() ?? 0;
    const isContinuation = previousCompletedAt > 0 && Date.now() - previousCompletedAt <= COMBO_TIMEOUT_MS;
    const nextComboCount = isContinuation ? Math.min(progress.comboCount + 1, 3) : 1;
    const passed = scorePercent >= 60;

    const daily = await applyDailyStreak(tx, userId);
    const freezeCount = daily.freezeCountBeforeMilestone + daily.freezesEarned;

    let xpEarned = 0;
    let nextLessonId: string | null = progress.currentLessonId;
    if (passed) {
      xpEarned = Math.round(BASE_LESSON_XP * comboMultiplier(nextComboCount));
      const nextLesson = await tx.courseLesson.findFirst({
        where: { courseId: lesson.courseId, order: lesson.order + 1 },
        select: { id: true },
      });
      nextLessonId = nextLesson?.id ?? null;

      await tx.userCourseLessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        create: {
          userId,
          lessonId,
          completed: true,
          bestScore: scorePercent,
          xpEarned,
          completedAt: new Date(),
        },
        update: {
          completed: true,
          bestScore: Math.max(existing?.bestScore ?? 0, scorePercent),
          xpEarned: { increment: xpEarned },
          completedAt: new Date(),
        },
      });

      await tx.userCourseProgress.update({
        where: { userId_courseId: { userId, courseId: lesson.courseId } },
        data: {
          currentLessonId: nextLessonId,
          currentChapterId: lesson.chapterId,
          comboCount: nextComboCount,
          comboLastCompletedAt: new Date(),
          lastActivityAt: new Date(),
        },
      });

      await awardXp(tx, userId, xpEarned, "LESSON_COMPLETED", {
        readingLessonId: lessonId,
        scorePercent,
        comboCount: nextComboCount,
        xpCorrect,
      });
      await awardCompetitionXp(tx, userId, "LESSON", xpEarned, {
        metadata: { readingLessonId: lessonId, scorePercent, comboCount: nextComboCount },
      });
    } else {
      await tx.userCourseLessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        create: { userId, lessonId, completed: false, bestScore: scorePercent },
        update: { bestScore: Math.max(existing?.bestScore ?? 0, scorePercent) },
      });
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        currentStreak: daily.currentStreak,
        longestStreak: daily.longestStreak,
        lastStudyDate: daily.today,
        freezeCount,
      },
    });

    if (daily.freezesEarned > 0) {
      await tx.freezeTransaction.create({
        data: { userId, type: "EARNED", amount: daily.freezesEarned, reason: "Mijlpaal bereikt" },
      });
    }

    const newAchievements = await checkAndAwardAchievements(tx, userId);

    return {
      xpEarned,
      chapterCompleted: passed,
      scorePercent,
      currentStreak: daily.currentStreak,
      longestStreak: daily.longestStreak,
      streakBroken: daily.streakBroken,
      freezeUsed: daily.freezeUsed,
      freezesEarned: daily.freezesEarned,
      freezeCount,
      newAchievements,
      alreadyStudiedToday: daily.alreadyStudiedToday,
      readingLessonCompleted: passed,
      comboCount: passed ? nextComboCount : progress.comboCount,
      comboMultiplier: passed ? comboMultiplier(nextComboCount) : comboMultiplier(progress.comboCount),
      nextLessonId,
      alreadyCompleted: false,
      nextXpEarned: passed && nextLessonId ? Math.round(BASE_LESSON_XP * comboMultiplier(Math.min(nextComboCount + 1, 3))) : 0,
      nextComboMultiplier: passed && nextLessonId ? comboMultiplier(Math.min(nextComboCount + 1, 3)) : 1,
    };
  });
}
