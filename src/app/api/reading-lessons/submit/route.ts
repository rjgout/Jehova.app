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

  // De score telt altijd over ALLE vragen van deze les: niet-ingestuurde
  // vragen tellen als fout en een dubbel ingestuurde vraag telt maar één
  // keer. Anders levert een lege of gedeeltelijke inzending 100% op.
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

  const total = lesson.exercises.length;
  const scorePercent = total === 0 ? 100 : Math.round((correctCount / total) * 100);

  let result;
  try {
    result = await completeReadingLesson(user.id, lesson.id, scorePercent, correctCount);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Kon de les niet afronden.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  return NextResponse.json({
    results,
    correctCount,
    total,
    ...result,
  });
}
