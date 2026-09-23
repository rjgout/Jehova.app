import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isExerciseCorrect } from "@/lib/exerciseGen";
import { completeReadingLesson } from "@/lib/readingLessons";

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
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }

  const lesson = await prisma.courseLesson.findUnique({
    where: { id: parsed.data.lessonId },
    include: {
      course: true,
      exercises: { include: { exercise: true } },
    },
  });
  if (!lesson || lesson.course.type !== "READING_LESSONS") {
    return NextResponse.json({ error: "Leesles niet gevonden" }, { status: 404 });
  }

  const allowed = new Map(lesson.exercises.map(({ exercise }) => [exercise.id, exercise]));
  let correctCount = 0;
  const results: { exerciseId: string; correct: boolean; correctAnswer: string[] }[] = [];

  for (const submitted of parsed.data.answers) {
    const exercise = allowed.get(submitted.exerciseId);
    if (!exercise) continue;

    const accepted = JSON.parse(exercise.answers) as string[];
    const correct = isExerciseCorrect(exercise.type, submitted.given, accepted);
    if (correct) correctCount++;

    results.push({
      exerciseId: exercise.id,
      correct,
      correctAnswer: accepted,
    });

    await prisma.exerciseAttempt.create({
      data: {
        userId: user.id,
        exerciseId: exercise.id,
        givenText: submitted.given.join(" "),
        correct,
      },
    });
  }

  const total = results.length;
  const scorePercent = total === 0 ? 0 : Math.round((correctCount / total) * 100);
  const result = await completeReadingLesson(user.id, lesson.id, scorePercent, correctCount);

  return NextResponse.json({
    results,
    correctCount,
    total,
    ...result,
  });
}
