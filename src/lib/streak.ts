import type { ChapterGuessLevel, XPReason, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addDays, dayKey, daysBetween } from "@/lib/dates";
import { awardXp } from "@/lib/xp";
import { checkAndAwardAchievements } from "@/lib/achievements";
import { awardCompetitionXp } from "@/lib/competitionXp";
import { XP_PER_CORRECT_LIGHT, applyRepeatDiscount } from "@/lib/xpRules";

const PASS_THRESHOLD = 60; // percentage nodig om een hoofdstuk als voltooid te tellen
const STREAK_MILESTONE_FOR_FREEZE = 7; // elke 7-daagse streak levert een freeze op
const LESSONS_MILESTONE_FOR_FREEZE = 10; // elke 10 voltooide hoofdstukken levert een freeze op

export interface StudyResult {
  xpEarned: number;
  chapterCompleted: boolean;
  scorePercent: number;
  currentStreak: number;
  longestStreak: number;
  streakBroken: boolean;
  freezeUsed: boolean;
  freezesEarned: number;
  freezeCount: number;
  newAchievements: string[];
  // Had je vandaag al eerder iets afgerond? Dan is de reeks nu niet verder
  // opgelopen (die stond al goed) — de client gebruikt dit om de
  // vlammetje-viering alleen bij de EERSTE afronding per dag te tonen, niet
  // bij elke volgende les diezelfde dag.
  alreadyStudiedToday: boolean;
}

type Tx = Prisma.TransactionClient;

interface DailyStreakResult {
  today: string;
  alreadyStudiedToday: boolean;
  currentStreak: number;
  longestStreak: number;
  streakBroken: boolean;
  freezeUsed: boolean;
  freezeCountBeforeMilestone: number;
  freezesEarned: number;
}

/**
 * De kern van "vandaag geldt als gestudeerd" — gedeeld tussen een volledig
 * afgeronde les (completeLesson) en een korte, hoofdstukloze oefenronde
 * (completeQuickPractice), zodat beide op dezelfde manier de streak
 * bijhouden. Schrijft de AUTO_SPENT-freezetransactie en de StreakDay-rijen
 * (zie /streak) al weg indien van toepassing, maar laat het definitieve
 * user.update en de eventuele EARNED-freezetransactie aan de aanroeper (die
 * kan er zelf nog een hoofdstuk-mijlpaal freeze bovenop doen).
 */
export async function applyDailyStreak(tx: Tx, userId: string): Promise<DailyStreakResult> {
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  const today = dayKey();
  const alreadyStudiedToday = user.lastStudyDate === today;

  let currentStreak = user.currentStreak;
  let freezeUsed = false;
  let streakBroken = false;
  let freezeCount = user.freezeCount;
  const frozenDayKeys: string[] = [];

  if (alreadyStudiedToday) {
    // al gestudeerd vandaag: streak blijft gelijk
  } else if (!user.lastStudyDate) {
    currentStreak = 1;
  } else {
    const gap = daysBetween(user.lastStudyDate, today);
    const missedDays = gap - 1;
    if (missedDays <= 0) {
      // gap === 1: aansluitende dag, niets gemist
      currentStreak += 1;
    } else if (freezeCount >= missedDays) {
      // Genoeg freezes om elke gemiste dag te overbruggen — de reeks loopt
      // door, maar het getal telt (net als bij een gewone aansluitende dag)
      // maar met 1 op, niet met het aantal gemiste dagen: freezes tellen
      // bewust niet mee in het reeksgetal (zie ook de kalender op /streak,
      // waar die dagen apart als FROZEN staan, niet als STUDIED).
      for (let i = 1; i <= missedDays; i++) {
        frozenDayKeys.push(addDays(user.lastStudyDate, i));
      }
      freezeCount -= missedDays;
      freezeUsed = true;
      currentStreak += 1;
      await tx.freezeTransaction.create({
        data: {
          userId,
          type: "AUTO_SPENT",
          amount: -missedDays,
          reason: `Streak beschermd op ${today} (${missedDays} dag${missedDays > 1 ? "en" : ""} gemist)`,
        },
      });
    } else {
      // Niet genoeg freezes om ALLE gemiste dagen te overbruggen: er blijft
      // dan sowieso minstens één echte gemiste dag over, dus breekt de reeks.
      // De nieuwe studieactiviteit van vandaag begint bewust nog geen nieuwe
      // reeks: de teller blijft 0. De volgende aaneengesloten studiedag maakt
      // daar weer 1 van. Er worden ook geen freezes "voor niets" verbruikt.
      streakBroken = currentStreak > 0;
      currentStreak = 0;
    }
  }
  const longestStreak = Math.max(user.longestStreak, currentStreak);

  if (!alreadyStudiedToday) {
    for (const fk of frozenDayKeys) {
      await tx.streakDay.upsert({
        where: { userId_dayKey: { userId, dayKey: fk } },
        create: { userId, dayKey: fk, status: "FROZEN" },
        update: { status: "FROZEN" },
      });
    }
    await tx.streakDay.upsert({
      where: { userId_dayKey: { userId, dayKey: today } },
      create: { userId, dayKey: today, status: "STUDIED" },
      update: { status: "STUDIED" },
    });
  }

  let freezesEarned = 0;
  const streakMilestoneHit =
    currentStreak > 0 &&
    currentStreak % STREAK_MILESTONE_FOR_FREEZE === 0 &&
    user.currentStreak % STREAK_MILESTONE_FOR_FREEZE !== 0;
  if (streakMilestoneHit && !alreadyStudiedToday) {
    freezesEarned += 1;
  }

  return {
    today,
    alreadyStudiedToday,
    currentStreak,
    longestStreak,
    streakBroken,
    freezeUsed,
    freezeCountBeforeMilestone: freezeCount,
    freezesEarned,
  };
}

/**
 * Verwerkt het resultaat van een les (of een live-spel, via `xpReason`): update
 * XP (met audittrail), hoofdstukvoortgang, streak, verdiende/verbruikte
 * streak freezes, divisie-XP en achievements.
 */
export async function completeLesson(
  userId: string,
  chapterId: string,
  scorePercent: number,
  xpForThisAttempt: number,
  xpReason: XPReason = "LESSON_COMPLETED"
): Promise<StudyResult> {
  return prisma.$transaction(async (tx) => {
    // --- Hoofdstukvoortgang ---
    const existing = await tx.chapterProgress.findUnique({
      where: { userId_chapterId: { userId, chapterId } },
    });
    const wasAlreadyCompleted = existing?.completed ?? false;
    const nowCompleted = wasAlreadyCompleted || scorePercent >= PASS_THRESHOLD;

    // Herhalingskorting: had je dit hoofdstuk al eerder perfect (100%)
    // afgerond, dan is dit geen nieuwe prestatie meer — telt nog maar voor
    // een tiende, zodat een al-beheerst hoofdstuk geen oneindige XP-bron
    // wordt. Bewust niet voor live-quizspellen (xpReason !== default): dat
    // is een sociale activiteit met een live tegenstander, geen solo-
    // herhaling van al-beheerste content.
    const alreadyPerfect = xpReason === "LESSON_COMPLETED" && (existing?.bestScore ?? 0) === 100;
    const xpToAward = alreadyPerfect ? applyRepeatDiscount(xpForThisAttempt) : xpForThisAttempt;

    await tx.chapterProgress.upsert({
      where: { userId_chapterId: { userId, chapterId } },
      create: {
        userId,
        chapterId,
        completed: nowCompleted,
        bestScore: scorePercent,
        xpEarned: xpToAward,
        completedAt: nowCompleted ? new Date() : null,
      },
      update: {
        completed: nowCompleted,
        bestScore: Math.max(existing?.bestScore ?? 0, scorePercent),
        xpEarned: { increment: xpToAward },
        completedAt: !wasAlreadyCompleted && nowCompleted ? new Date() : undefined,
      },
    });

    const daily = await applyDailyStreak(tx, userId);
    let freezesEarned = daily.freezesEarned;
    let freezeCount = daily.freezeCountBeforeMilestone;

    // --- Freeze verdienen op hoofdstuk-mijlpaal (bovenop een eventuele streak-mijlpaal) ---
    if (!wasAlreadyCompleted && nowCompleted) {
      const completedCount = await tx.chapterProgress.count({ where: { userId, completed: true } });
      if (completedCount % LESSONS_MILESTONE_FOR_FREEZE === 0) {
        freezesEarned += 1;
      }
    }
    if (freezesEarned > 0) {
      freezeCount += freezesEarned;
      await tx.freezeTransaction.create({
        data: { userId, type: "EARNED", amount: freezesEarned, reason: "Mijlpaal bereikt" },
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

    await awardXp(tx, userId, xpToAward, xpReason, {
      chapterId,
      scorePercent,
      perfect: scorePercent === 100,
    });

    await awardCompetitionXp(tx, userId, "LESSON", xpToAward, {
      won: xpReason === "LIVE_GAME_WON",
      metadata: { chapterId, scorePercent, xpReason },
    });

    const newAchievements = await checkAndAwardAchievements(tx, userId);

    return {
      xpEarned: xpToAward,
      chapterCompleted: nowCompleted,
      scorePercent,
      currentStreak: daily.currentStreak,
      longestStreak: daily.longestStreak,
      streakBroken: daily.streakBroken,
      freezeUsed: daily.freezeUsed,
      freezesEarned,
      freezeCount,
      newAchievements,
      alreadyStudiedToday: daily.alreadyStudiedToday,
    };
  });
}

/**
 * Een korte, hoofdstukloze oefenronde ("Snelle ronde") — redt de dagstreak
 * net als een volledige les, maar hangt aan geen enkele cursus/hoofdstuk en
 * levert dus minder XP op en raakt geen ChapterProgress.
 */
export async function completeQuickPractice(userId: string, correctCount: number, total: number): Promise<StudyResult> {
  return prisma.$transaction(async (tx) => {
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

    const xp = correctCount * XP_PER_CORRECT_LIGHT;
    if (xp > 0) {
      await awardXp(tx, userId, xp, "QUICK_PRACTICE", { correctCount, total });
      await awardCompetitionXp(tx, userId, "QUICK_PRACTICE", xp, { metadata: { correctCount, total } });
    }

    const newAchievements = await checkAndAwardAchievements(tx, userId);

    return {
      xpEarned: xp,
      chapterCompleted: false,
      scorePercent: total === 0 ? 0 : Math.round((correctCount / total) * 100),
      currentStreak: daily.currentStreak,
      longestStreak: daily.longestStreak,
      streakBroken: daily.streakBroken,
      freezeUsed: daily.freezeUsed,
      freezesEarned: daily.freezesEarned,
      freezeCount,
      newAchievements,
      alreadyStudiedToday: daily.alreadyStudiedToday,
    };
  });
}

/**
 * Rondt een potje "Raad het hoofdstuk" af (alleen of live, zie
 * src/lib/chapterGuess.ts en src/server/gameServer.ts) — zelfde opzet als
 * completeQuickPractice: geen vaste cursus/hoofdstuk om aan te haken, dus
 * alleen de dagstreak en XP.
 */
export async function completeChapterGuess(
  userId: string,
  correctCount: number,
  total: number,
  level?: ChapterGuessLevel
): Promise<StudyResult> {
  return prisma.$transaction(async (tx) => {
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

    const xp = correctCount * XP_PER_CORRECT_LIGHT;
    if (xp > 0) {
      await awardXp(tx, userId, xp, "CHAPTER_GUESS_COMPLETED", { correctCount, total });
      await awardCompetitionXp(tx, userId, "CHAPTER_GUESS", xp, { level, metadata: { correctCount, total, level } });
    }

    const newAchievements = await checkAndAwardAchievements(tx, userId);

    return {
      xpEarned: xp,
      chapterCompleted: false,
      scorePercent: total === 0 ? 0 : Math.round((correctCount / total) * 100),
      currentStreak: daily.currentStreak,
      longestStreak: daily.longestStreak,
      streakBroken: daily.streakBroken,
      freezeUsed: daily.freezeUsed,
      freezesEarned: daily.freezesEarned,
      freezeCount,
      newAchievements,
      alreadyStudiedToday: daily.alreadyStudiedToday,
    };
  });
}

/**
 * Rondt een potje van het dagelijkse woordspel af (zie src/lib/wordGame.ts)
 * — zowel bij winst als verlies telt meespelen als "vandaag gestudeerd"
 * (net als completeQuickPractice/completeChapterGuess), maar XP is hier al
 * vooraf berekend (xpForWin, afhankelijk van het aantal pogingen) i.p.v.
 * een vast bedrag per correct antwoord — bij verlies dus 0.
 */
export async function completeWordGame(userId: string, xpEarned: number): Promise<StudyResult> {
  return prisma.$transaction(async (tx) => {
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

    if (xpEarned > 0) {
      await awardXp(tx, userId, xpEarned, "WORD_GAME_WON", { xpEarned });
      await awardCompetitionXp(tx, userId, "WORD_GAME", xpEarned);
    }

    const newAchievements = await checkAndAwardAchievements(tx, userId);

    return {
      xpEarned,
      chapterCompleted: false,
      scorePercent: xpEarned > 0 ? 100 : 0,
      currentStreak: daily.currentStreak,
      longestStreak: daily.longestStreak,
      streakBroken: daily.streakBroken,
      freezeUsed: daily.freezeUsed,
      freezesEarned: daily.freezesEarned,
      freezeCount,
      newAchievements,
      alreadyStudiedToday: daily.alreadyStudiedToday,
    };
  });
}

/**
 * Rondt één van de twee modi (CONTENT/BOM_CONNECTION) van een
 * podcastaflevering af — zelfde soort boekhouding als completeLesson, maar
 * tegen PodcastEpisodeProgress i.p.v. ChapterProgress. Raakt bewust geen
 * UserCourseProgress: bij één aflevering is er nog geen "volgende" om naar
 * door te schuiven.
 */
export async function completePodcastLesson(
  userId: string,
  episodeId: string,
  mode: "CONTENT" | "BOM_CONNECTION",
  scorePercent: number,
  xpForThisAttempt: number
): Promise<StudyResult> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.podcastEpisodeProgress.findUnique({
      where: { userId_episodeId_mode: { userId, episodeId, mode } },
    });
    const wasAlreadyCompleted = existing?.completed ?? false;
    const nowCompleted = wasAlreadyCompleted || scorePercent >= PASS_THRESHOLD;

    // Herhalingskorting, zie completeLesson hierboven.
    const alreadyPerfect = (existing?.bestScore ?? 0) === 100;
    const xpToAward = alreadyPerfect ? applyRepeatDiscount(xpForThisAttempt) : xpForThisAttempt;

    await tx.podcastEpisodeProgress.upsert({
      where: { userId_episodeId_mode: { userId, episodeId, mode } },
      create: {
        userId,
        episodeId,
        mode,
        completed: nowCompleted,
        bestScore: scorePercent,
        xpEarned: xpToAward,
        completedAt: nowCompleted ? new Date() : null,
      },
      update: {
        completed: nowCompleted,
        bestScore: Math.max(existing?.bestScore ?? 0, scorePercent),
        xpEarned: { increment: xpToAward },
        completedAt: !wasAlreadyCompleted && nowCompleted ? new Date() : undefined,
      },
    });

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

    await awardXp(tx, userId, xpToAward, "PODCAST_LESSON_COMPLETED", { episodeId, mode, scorePercent });
    await awardCompetitionXp(tx, userId, "PODCAST_LESSON", xpToAward, { metadata: { episodeId, mode, scorePercent } });

    const newAchievements = await checkAndAwardAchievements(tx, userId);

    return {
      xpEarned: xpToAward,
      chapterCompleted: nowCompleted,
      scorePercent,
      currentStreak: daily.currentStreak,
      longestStreak: daily.longestStreak,
      streakBroken: daily.streakBroken,
      freezeUsed: daily.freezeUsed,
      freezesEarned: daily.freezesEarned,
      freezeCount,
      newAchievements,
      alreadyStudiedToday: daily.alreadyStudiedToday,
    };
  });
}

export async function completeKidsStory(
  userId: string,
  storyId: string,
  scorePercent: number,
  xpForThisAttempt: number
): Promise<StudyResult> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.kidsStoryProgress.findUnique({
      where: { userId_storyId: { userId, storyId } },
    });
    const wasAlreadyCompleted = existing?.completed ?? false;
    const nowCompleted = wasAlreadyCompleted || scorePercent >= PASS_THRESHOLD;

    // Herhalingskorting, zie completeLesson hierboven.
    const alreadyPerfect = (existing?.bestScore ?? 0) === 100;
    const xpToAward = alreadyPerfect ? applyRepeatDiscount(xpForThisAttempt) : xpForThisAttempt;

    await tx.kidsStoryProgress.upsert({
      where: { userId_storyId: { userId, storyId } },
      create: {
        userId,
        storyId,
        completed: nowCompleted,
        bestScore: scorePercent,
        xpEarned: xpToAward,
        completedAt: nowCompleted ? new Date() : null,
      },
      update: {
        completed: nowCompleted,
        bestScore: Math.max(existing?.bestScore ?? 0, scorePercent),
        xpEarned: { increment: xpToAward },
        completedAt: !wasAlreadyCompleted && nowCompleted ? new Date() : undefined,
      },
    });

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

    await awardXp(tx, userId, xpToAward, "KIDS_STORY_COMPLETED", { storyId, scorePercent });
    await awardCompetitionXp(tx, userId, "KIDS_STORY", xpToAward, { metadata: { storyId, scorePercent } });

    const newAchievements = await checkAndAwardAchievements(tx, userId);

    return {
      xpEarned: xpToAward,
      chapterCompleted: nowCompleted,
      scorePercent,
      currentStreak: daily.currentStreak,
      longestStreak: daily.longestStreak,
      streakBroken: daily.streakBroken,
      freezeUsed: daily.freezeUsed,
      freezesEarned: daily.freezesEarned,
      freezeCount,
      newAchievements,
      alreadyStudiedToday: daily.alreadyStudiedToday,
    };
  });
}

export async function completeIntroLesson(
  userId: string,
  lessonId: string,
  scorePercent: number,
  xpForThisAttempt: number
): Promise<StudyResult> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.introLessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    const wasAlreadyCompleted = existing?.completed ?? false;
    const nowCompleted = wasAlreadyCompleted || scorePercent >= PASS_THRESHOLD;

    // Herhalingskorting, zie completeLesson hierboven.
    const alreadyPerfect = (existing?.bestScore ?? 0) === 100;
    const xpToAward = alreadyPerfect ? applyRepeatDiscount(xpForThisAttempt) : xpForThisAttempt;

    await tx.introLessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        userId,
        lessonId,
        completed: nowCompleted,
        bestScore: scorePercent,
        xpEarned: xpToAward,
        completedAt: nowCompleted ? new Date() : null,
      },
      update: {
        completed: nowCompleted,
        bestScore: Math.max(existing?.bestScore ?? 0, scorePercent),
        xpEarned: { increment: xpToAward },
        completedAt: !wasAlreadyCompleted && nowCompleted ? new Date() : undefined,
      },
    });

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

    await awardXp(tx, userId, xpToAward, "INTRO_LESSON_COMPLETED", { lessonId, scorePercent });
    await awardCompetitionXp(tx, userId, "INTRO_LESSON", xpToAward, { metadata: { lessonId, scorePercent } });

    const newAchievements = await checkAndAwardAchievements(tx, userId);

    return {
      xpEarned: xpToAward,
      chapterCompleted: nowCompleted,
      scorePercent,
      currentStreak: daily.currentStreak,
      longestStreak: daily.longestStreak,
      streakBroken: daily.streakBroken,
      freezeUsed: daily.freezeUsed,
      freezesEarned: daily.freezesEarned,
      freezeCount,
      newAchievements,
      alreadyStudiedToday: daily.alreadyStudiedToday,
    };
  });
}

/** Geeft een streak freeze weg aan een vriend. */
export async function giftFreeze(fromUserId: string, toUserId: string) {
  if (fromUserId === toUserId) {
    throw new Error("Je kan geen freeze aan jezelf geven.");
  }
  return prisma.$transaction(async (tx) => {
    const sender = await tx.user.findUniqueOrThrow({ where: { id: fromUserId } });
    if (sender.freezeCount < 1) {
      throw new Error("Je hebt geen streak freeze om weg te geven.");
    }
    await tx.user.update({
      where: { id: fromUserId },
      data: { freezeCount: { decrement: 1 } },
    });
    await tx.user.update({
      where: { id: toUserId },
      data: { freezeCount: { increment: 1 } },
    });
    await tx.freezeTransaction.create({
      data: { userId: fromUserId, type: "GIFT_SENT", amount: -1, relatedId: toUserId },
    });
    await tx.freezeTransaction.create({
      data: { userId: toUserId, type: "GIFT_RECEIVED", amount: 1, relatedId: fromUserId },
    });
    await checkAndAwardAchievements(tx, fromUserId);
  });
}
