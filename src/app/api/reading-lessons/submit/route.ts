import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isExerciseCorrect } from "@/lib/exerciseGen";
import { completeReadingLesson } from "@/lib/readingLessons";
import { apiError, apiErrorText } from "@/lib/apiError";

const schema = z.object({
  lessonId: z.string(),
  answers: z.array(
    z.object({
      exerciseId: z.string(),
      given: z.array(z.string()).min(1),
    })
  ),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return await apiError("apiErrors.invalidInput", 400);
  }

  const lesson = await prisma.courseLesson.findUnique({
    where: { id: parsed.data.lessonId },
    include: {
      course: true,
      exercises: { include: { exercise: true } },
    },
  });
  if (!lesson || lesson.course.type !== "READING_LESSONS") {
    return await apiError("apiErrors.stepNotFound", 404);
  }

  // De les toont bewust een willekeurige subset van de vragen. Alleen de
  // daadwerkelijk beantwoorde vragen tellen daarom mee voor deze ronde.
  // Een dubbel ingestuurde vraag telt maar één keer.
  const submittedById = new Map<string, string[]>();
  for (const submitted of parsed.data.answers) {
    if (!submittedById.has(submitted.exerciseId)) submittedById.set(submitted.exerciseId, submitted.given);
  }

  let correctCount = 0;
  const results: { exerciseId: string; correct: boolean; correctAnswer: string[] }[] = [];

  for (const { exercise } of lesson.exercises) {
    const accepted = JSON.parse(exercise.answers) as string[];
    const given = submittedById.get(exercise.id);
    const correct = given ? isExerciseCorrect(exercise.type, given, accepted) : false;
    if (correct) correctCount++;

    results.push({
      exerciseId: exercise.id,
      correct,
      correctAnswer: accepted,
    });

    if (given) {
      await prisma.exerciseAttempt.create({
        data: {
          userId: user.id,
          exerciseId: exercise.id,
          givenText: given.join(" "),
          correct,
        },
      });
    }
  }

  const total = results.length;
  const scorePercent = total === 0 ? 0 : Math.round((correctCount / total) * 100);

  let result;
  try {
    result = await completeReadingLesson(user.id, lesson.id, scorePercent, correctCount);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Kon de stap niet afronden.";
    return await apiErrorText(message, 409);
  }

  return NextResponse.json({
    results,
    correctCount,
    total,
    ...result,
  });
}
