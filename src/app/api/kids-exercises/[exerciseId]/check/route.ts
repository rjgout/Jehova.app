import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isExerciseCorrect } from "@/lib/exerciseGen";
import { apiError } from "@/lib/apiError";

const schema = z.object({ given: z.array(z.string()).min(1) });

// Zelfde soort directe correctheidscheck als /api/exercises/[exerciseId]/check
// en /api/podcast-exercises/[exerciseId]/check, maar dan tegen de
// kindercursus-oefeningtabel.
export async function POST(req: NextRequest, { params }: { params: Promise<{ exerciseId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const { exerciseId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return await apiError("apiErrors.invalidInput", 400);
  }

  const exercise = await prisma.kidsExercise.findUnique({ where: { id: exerciseId } });
  if (!exercise) {
    return await apiError("apiErrors.exerciseNotFound", 404);
  }

  const accepted = JSON.parse(exercise.answers) as string[];
  const correct = isExerciseCorrect(exercise.type, parsed.data.given, accepted);

  return NextResponse.json({ correct, correctAnswer: accepted });
}
