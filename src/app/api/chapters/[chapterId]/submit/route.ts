import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isExerciseCorrect } from "@/lib/exerciseGen";
import { completeLesson } from "@/lib/streak";
import { advanceCourseProgress } from "@/lib/courses";
import { notifyNewAchievements } from "@/lib/notify";
import { recordChallengeAttempt } from "@/lib/challenges";
import { standardContentXp } from "@/lib/xpRules";
import { apiError } from "@/lib/apiError";

const schema = z.object({
  answers: z.array(
    z.object({
      exerciseId: z.string(),
      given: z.array(z.string()).min(1),
    })
  ),
  // Gezet als dit hoofdstuk gespeeld wordt als iemands beurt in een
  // uitdaging (zie /challenges) — de score telt dan ook mee daarvoor.
  challengeId: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ chapterId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const { chapterId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return await apiError("apiErrors.invalidInput", 400);
  }

  const exercises = await prisma.exercise.findMany({ where: { chapterId, status: "APPROVED" } });
  if (exercises.length === 0) {
    return await apiError("apiErrors.chapterNotFound", 404);
  }
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));

  let correctCount = 0;
  const results: { exerciseId: string; correct: boolean; correctAnswer: string[] }[] = [];

  for (const submitted of parsed.data.answers) {
    const exercise = exerciseById.get(submitted.exerciseId);
    if (!exercise || exercise.chapterId !== chapterId) continue;

    const accepted = JSON.parse(exercise.answers) as string[];
    const correct = isExerciseCorrect(exercise.type, submitted.given, accepted);

    if (correct) correctCount++;
    results.push({ exerciseId: exercise.id, correct, correctAnswer: accepted });

    await prisma.exerciseAttempt.create({
      data: {
        userId: user.id,
        exerciseId: exercise.id,
        givenText: submitted.given.join(" "),
        correct,
      },
    });
  }

  // Bewust het aantal daadwerkelijk beantwoorde oefeningen, niet het totale
  // aantal goedgekeurde oefeningen van dit hoofdstuk: de les toont een
  // willekeurige subset (zie lesson/[chapterId]/page.tsx), dus scorePercent
  // zou anders nooit 100% kunnen worden.
  const total = results.length;
  const scorePercent = total === 0 ? 0 : Math.round((correctCount / total) * 100);
  const xp = standardContentXp(correctCount, total);

  const lessonResult = await completeLesson(user.id, chapterId, scorePercent, xp);
  notifyNewAchievements(user.id, lessonResult.newAchievements).catch(() => {});

  if (parsed.data.challengeId) {
    await recordChallengeAttempt(user.id, parsed.data.challengeId, chapterId, scorePercent).catch(() => {});
  }

  // Zet de actieve cursus (indien van toepassing) een hoofdstuk verder —
  // no-op voor FREE_CHOICE, en ook als dit hoofdstuk niet bij die cursus hoort.
  if (user.activeCourseId) {
    await advanceCourseProgress(prisma, user.id, user.activeCourseId, chapterId);
  }

  return NextResponse.json({ results, correctCount, total, ...lessonResult });
}
