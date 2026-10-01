import type { ChapterGuessLevel, XPReason, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addDays, dayKey, daysBetween } from "@/lib/dates";
import { awardXp } from "@/lib/xp";
import { checkAndAwardAchievements } from "@/lib/achievements";
import { awardCompetitionXp } from "@/lib/competitionXp";
import { XP_PER_CORRECT_LIGHT, applyRepeatDiscount } from "@/lib/xpRules";
import { notifyFreezeReceived } from "@/lib/notify";
import { qualifiesForStreak, type LearningActivity } from "@/lib/learning/streakRules";

const PASS_THRESHOLD = 60; // percentage nodig om een les (podcast, kinderen, introductie) als voltooid te tellen
const STREAK_MILESTONE_FOR_FREEZE = 7; // elke 7-daagse streak levert een freeze op

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
 * De kern van "vandaag geldt als gestudeerd". Schrijft de AUTO_SPENT-
 * freezetransactie en de StreakDay-rijen (zie /streak) al weg indien van
 * toepassing, maar laat het definitieve user.update en de eventuele
 * EARNED-freezetransactie aan recordLearningActivity. Niet rechtstreeks
 * aanroepen: alleen via recordLearningActivity, die eerst de reeksregel
 * controleert.
 */
async function applyDailyStreak(tx: Tx, userId: string): Promise<DailyStreakResult> {
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
      // De studiedag van vandaag telt wel meteen mee: de nieuwe reeks begint
      // op 1. Er worden ook geen freezes "voor niets" verbruikt.
      streakBroken = currentStreak > 0;
      currentStreak = 1;
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

export interface StreakSnapshot {
  currentStreak: number;
  longestStreak: number;
  streakBroken: boolean;
  freezeUsed: boolean;
  freezesEarned: number;
  freezeCount: number;
  alreadyStudiedToday: boolean;
  /** Telde deze activiteit mee voor de reeks (zie qualifiesForStreak)? */
  counted: boolean;
}

/**
 * De enige ingang om de dagelijkse reeks bij te werken. Elke afgeronde
 * leeractiviteit meldt zich hier; of hij meetelt, beslist uitsluitend
 * qualifiesForStreak (src/lib/learning/streakRules.ts). Lezen telt nooit,
 * een lege of half afgemaakte inzending ook niet: dan blijft de reeks zoals
 * hij was.
 */
export async function recordLearningActivity(tx: Tx, userId: string, activity: LearningActivity): Promise<StreakSnapshot> {
  if (!qualifiesForStreak(activity)) {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      streakBroken: false,
      freezeUsed: false,
      freezesEarned: 0,
      freezeCount: user.freezeCount,
      alreadyStudiedToday: user.lastStudyDate === dayKey(),
      counted: false,
    };
  }

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
    currentStreak: daily.currentStreak,
    longestStreak: daily.longestStreak,
    streakBroken: daily.streakBroken,
    freezeUsed: daily.freezeUsed,
    freezesEarned: daily.freezesEarned,
    freezeCount,
    alreadyStudiedToday: daily.alreadyStudiedToday,
    counted: true,
  };
}

/** Een extra freeze voor een mijlpaal bovenop de reeks (bv. afgeronde hoofdstukken). */
export async function grantMilestoneFreeze(tx: Tx, userId: string, snapshot: StreakSnapshot): Promise<StreakSnapshot> {
  await tx.user.update({ where: { id: userId }, data: { freezeCount: { increment: 1 } } });
  await tx.freezeTransaction.create({ data: { userId, type: "EARNED", amount: 1, reason: "Mijlpaal bereikt" } });
  return { ...snapshot, freezesEarned: snapshot.freezesEarned + 1, freezeCount: snapshot.freezeCount + 1 };
}

interface ActivityXp {
  amount: number;
  reason: XPReason;
  metadata?: Record<string, unknown>;
  competitionKey: string;
  competition?: { won?: boolean; level?: string; metadata?: Record<string, unknown> };
}

/**
 * Gedeeld slot van elke afrondfunctie hieronder: reeks (volgens de
 * centrale regel), XP met audittrail, divisie-XP en prestaties.
 */
async function finishActivity(
  tx: Tx,
  userId: string,
  activity: LearningActivity,
  xp: ActivityXp | null,
  result: { chapterCompleted: boolean; scorePercent: number }
): Promise<StudyResult> {
  const streak = await recordLearningActivity(tx, userId, activity);
  const amount = xp?.amount ?? 0;
  if (xp && amount > 0) {
    await awardXp(tx, userId, amount, xp.reason, xp.metadata);
    await awardCompetitionXp(tx, userId, xp.competitionKey, amount, xp.competition);
  }
  const newAchievements = await checkAndAwardAchievements(tx, userId);
  return {
    xpEarned: amount,
    chapterCompleted: result.chapterCompleted,
    scorePercent: result.scorePercent,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    streakBroken: streak.streakBroken,
    freezeUsed: streak.freezeUsed,
    freezesEarned: streak.freezesEarned,
    freezeCount: streak.freezeCount,
    newAchievements,
    alreadyStudiedToday: streak.alreadyStudiedToday,
  };
}

function percent(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

/**
 * Een live quiz over een hoofdstuk afgerond (src/server/gameServer.ts). Een
 * spel, geen oefenset: het raakt de leesvoortgang en de basisbeloning van
 * het hoofdstuk niet (zie docs/LEERVOORTGANG.md), maar meespelen telt wel
 * als leeractiviteit voor de reeks.
 */
export async function completeLiveQuiz(
  userId: string,
  chapterId: string,
  scorePercent: number,
  xp: number,
  won: boolean
): Promise<StudyResult> {
  const reason: XPReason = won ? "LIVE_GAME_WON" : "LIVE_GAME_PLAYED";
  return prisma.$transaction((tx) =>
    finishActivity(
      tx,
      userId,
      { kind: "GAME", answered: 1, required: 1 },
      { amount: xp, reason, metadata: { chapterId, scorePercent }, competitionKey: "LESSON", competition: { won, metadata: { chapterId, scorePercent, xpReason: reason } } },
      { chapterCompleted: false, scorePercent }
    )
  );
}

/**
 * Een korte, hoofdstukloze oefenronde ("Snelle ronde"): telt voor de reeks,
 * levert de lichte XP per goed antwoord op en raakt geen voortgang van
 * inhoud.
 */
export async function completeQuickPractice(userId: string, correctCount: number, total: number): Promise<StudyResult> {
  const xp = correctCount * XP_PER_CORRECT_LIGHT;
  return prisma.$transaction((tx) =>
    finishActivity(
      tx,
      userId,
      { kind: "PRACTICE", answered: total, required: 1 },
      { amount: xp, reason: "QUICK_PRACTICE", metadata: { correctCount, total }, competitionKey: "QUICK_PRACTICE", competition: { metadata: { correctCount, total } } },
      { chapterCompleted: false, scorePercent: percent(correctCount, total) }
    )
  );
}

/**
 * Rondt een stap van Samen studeren af voor één deelnemer (zie
 * src/server/study.ts). Telt voor de reeks en geeft een lichte XP per goed
 * antwoord, maar schuift de cursus zelf niet door en raakt de
 * basisbeloning van de inhoud niet: de stap is door de host gekozen. De
 * competitie-XP heeft een eigen dagelijkse limiet.
 */
export async function completeStudyRound(userId: string, correctCount: number, answered: number, total: number, won: boolean): Promise<StudyResult> {
  const xp = correctCount * XP_PER_CORRECT_LIGHT;
  return prisma.$transaction((tx) =>
    finishActivity(
      tx,
      userId,
      { kind: "GAME", answered, required: 1 },
      { amount: xp, reason: "STUDY_TOGETHER", metadata: { correctCount, total, won }, competitionKey: "STUDY_TOGETHER", competition: { won, metadata: { correctCount, total } } },
      { chapterCompleted: false, scorePercent: percent(correctCount, total) }
    )
  );
}

/** Een potje "Raad het hoofdstuk" (alleen of live, zie src/lib/chapterGuess.ts). */
export async function completeChapterGuess(
  userId: string,
  correctCount: number,
  total: number,
  level?: ChapterGuessLevel
): Promise<StudyResult> {
  const xp = correctCount * XP_PER_CORRECT_LIGHT;
  return prisma.$transaction((tx) =>
    finishActivity(
      tx,
      userId,
      { kind: "GAME", answered: total, required: 1 },
      { amount: xp, reason: "CHAPTER_GUESS_COMPLETED", metadata: { correctCount, total }, competitionKey: "CHAPTER_GUESS", competition: { level, metadata: { correctCount, total, level } } },
      { chapterCompleted: false, scorePercent: percent(correctCount, total) }
    )
  );
}

/**
 * Een potje van het dagelijkse woordspel (src/lib/wordGame.ts): winst of
 * verlies telt mee voor de reeks; de XP is vooraf berekend (bij verlies 0).
 */
export async function completeWordGame(userId: string, xpEarned: number): Promise<StudyResult> {
  return prisma.$transaction((tx) =>
    finishActivity(
      tx,
      userId,
      { kind: "GAME", answered: 1, required: 1 },
      { amount: xpEarned, reason: "WORD_GAME_WON", metadata: { xpEarned }, competitionKey: "WORD_GAME" },
      { chapterCompleted: false, scorePercent: xpEarned > 0 ? 100 : 0 }
    )
  );
}

/**
 * De Slimste Heilige alleen gespeeld (src/lib/alleskenner/solo.ts): telt
 * voor de reeks; de XP is al berekend uit de eindstand.
 */
export async function completeAlleskennerSolo(
  userId: string,
  xpEarned: number,
  metadata: Record<string, unknown>
): Promise<StudyResult> {
  return prisma.$transaction((tx) =>
    finishActivity(
      tx,
      userId,
      { kind: "GAME", answered: 1, required: 1 },
      { amount: xpEarned, reason: "ALLESKENNER_SOLO", metadata, competitionKey: "ALLESKENNER_SOLO" },
      { chapterCompleted: false, scorePercent: 100 }
    )
  );
}

interface LessonProgressRow {
  completed: boolean;
  bestScore: number;
}

/**
 * Gedeelde boekhouding voor cursussen met eigen lessen en vragen (podcast,
 * kinderen, introductie): één route per les, dus de herhalingskorting na een
 * perfecte score is hier genoeg om dubbele basis-XP te voorkomen. De les
 * telt pas mee voor de reeks als alle vragen beantwoord zijn.
 */
async function completeCourseLesson(
  tx: Tx,
  userId: string,
  existing: LessonProgressRow | null,
  save: (data: { nowCompleted: boolean; wasAlreadyCompleted: boolean; xpToAward: number }) => Promise<void>,
  attempt: { scorePercent: number; xp: number; answered: number; total: number },
  xp: Omit<ActivityXp, "amount">
): Promise<StudyResult> {
  const wasAlreadyCompleted = existing?.completed ?? false;
  const nowCompleted = wasAlreadyCompleted || attempt.scorePercent >= PASS_THRESHOLD;
  const alreadyPerfect = (existing?.bestScore ?? 0) === 100;
  const xpToAward = alreadyPerfect ? applyRepeatDiscount(attempt.xp) : attempt.xp;
  await save({ nowCompleted, wasAlreadyCompleted, xpToAward });
  return finishActivity(
    tx,
    userId,
    { kind: "COURSE_LESSON", answered: attempt.answered, required: attempt.total },
    { ...xp, amount: xpToAward },
    { chapterCompleted: nowCompleted, scorePercent: attempt.scorePercent }
  );
}

function progressData(userId: string, scorePercent: number, existing: LessonProgressRow | null, d: { nowCompleted: boolean; wasAlreadyCompleted: boolean; xpToAward: number }) {
  return {
    create: { userId, completed: d.nowCompleted, bestScore: scorePercent, xpEarned: d.xpToAward, completedAt: d.nowCompleted ? new Date() : null },
    update: {
      completed: d.nowCompleted,
      bestScore: Math.max(existing?.bestScore ?? 0, scorePercent),
      xpEarned: { increment: d.xpToAward },
      completedAt: !d.wasAlreadyCompleted && d.nowCompleted ? new Date() : undefined,
    },
  };
}

/** Eén van de twee modi (inhoud/verband) van een podcastaflevering afgerond. */
export async function completePodcastLesson(
  userId: string,
  episodeId: string,
  mode: "CONTENT" | "BOM_CONNECTION",
  scorePercent: number,
  xpForThisAttempt: number,
  answered: number,
  total: number
): Promise<StudyResult> {
  return prisma.$transaction(async (tx) => {
    const where = { userId_episodeId_mode: { userId, episodeId, mode } };
    const existing = await tx.podcastEpisodeProgress.findUnique({ where });
    return completeCourseLesson(
      tx,
      userId,
      existing,
      async (d) => {
        const data = progressData(userId, scorePercent, existing, d);
        await tx.podcastEpisodeProgress.upsert({ where, create: { ...data.create, episodeId, mode }, update: data.update });
      },
      { scorePercent, xp: xpForThisAttempt, answered, total },
      { reason: "PODCAST_LESSON_COMPLETED", metadata: { episodeId, mode, scorePercent }, competitionKey: "PODCAST_LESSON", competition: { metadata: { episodeId, mode, scorePercent } } }
    );
  });
}

/** Een verhaal uit de kindercursus afgerond. */
export async function completeKidsStory(
  userId: string,
  storyId: string,
  scorePercent: number,
  xpForThisAttempt: number,
  answered: number,
  total: number
): Promise<StudyResult> {
  return prisma.$transaction(async (tx) => {
    const where = { userId_storyId: { userId, storyId } };
    const existing = await tx.kidsStoryProgress.findUnique({ where });
    return completeCourseLesson(
      tx,
      userId,
      existing,
      async (d) => {
        const data = progressData(userId, scorePercent, existing, d);
        await tx.kidsStoryProgress.upsert({ where, create: { ...data.create, storyId }, update: data.update });
      },
      { scorePercent, xp: xpForThisAttempt, answered, total },
      { reason: "KIDS_STORY_COMPLETED", metadata: { storyId, scorePercent }, competitionKey: "KIDS_STORY", competition: { metadata: { storyId, scorePercent } } }
    );
  });
}

/** Een les uit de introductiecursus afgerond. */
export async function completeIntroLesson(
  userId: string,
  lessonId: string,
  scorePercent: number,
  xpForThisAttempt: number,
  answered: number,
  total: number
): Promise<StudyResult> {
  return prisma.$transaction(async (tx) => {
    const where = { userId_lessonId: { userId, lessonId } };
    const existing = await tx.introLessonProgress.findUnique({ where });
    return completeCourseLesson(
      tx,
      userId,
      existing,
      async (d) => {
        const data = progressData(userId, scorePercent, existing, d);
        await tx.introLessonProgress.upsert({ where, create: { ...data.create, lessonId }, update: data.update });
      },
      { scorePercent, xp: xpForThisAttempt, answered, total },
      { reason: "INTRO_LESSON_COMPLETED", metadata: { lessonId, scorePercent }, competitionKey: "INTRO_LESSON", competition: { metadata: { lessonId, scorePercent } } }
    );
  });
}

/** Geeft een streak freeze weg aan een vriend. */
export async function giftFreeze(fromUserId: string, toUserId: string) {
  if (fromUserId === toUserId) {
    throw new Error("Je kan geen freeze aan jezelf geven.");
  }
  const sender = await prisma.$transaction(async (tx) => {
    const sender = await tx.user.findUniqueOrThrow({ where: { id: fromUserId } });
    // Atomair afboeken: twee gelijktijdige cadeaus mogen samen nooit meer
    // freezes weggeven dan de gever heeft.
    const debited = await tx.user.updateMany({
      where: { id: fromUserId, freezeCount: { gte: 1 } },
      data: { freezeCount: { decrement: 1 } },
    });
    if (debited.count === 0) {
      throw new Error("Je hebt geen streak freeze om weg te geven.");
    }
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
    return sender;
  });

  // Pas na de commit versturen: mail/push binnen de transactie kan de
  // transactie laten verlopen (standaard 5 s), waarna het cadeau wordt
  // teruggedraaid terwijl de ontvanger de melding al heeft.
  await notifyFreezeReceived(toUserId, `${sender.handle}#${sender.discriminator}`).catch(() => {});
}
