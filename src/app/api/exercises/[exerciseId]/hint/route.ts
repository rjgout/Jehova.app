import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { generateExerciseHint } from "@/lib/exerciseHints";
import { toLanguageCode } from "@/lib/languages";

export async function GET(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const current = await prisma.user.findUnique({ where: { id: user.id }, select: { hintBalance: true } });
  return NextResponse.json({ hintBalance: current?.hintBalance ?? 0 });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ exerciseId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { exerciseId } = await params;
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    include: {
      sourceVerse: { select: { text: true } },
      chapter: { select: { book: { select: { contentCollection: { select: { language: true } } } } } },
    },
  });
  if (!exercise) return NextResponse.json({ error: "Oefening niet gevonden" }, { status: 404 });

  let hint = exercise.hint;
  if (!hint) {
    const answers = JSON.parse(exercise.answers) as string[];
    // In de taal van de uitgave, net als de oefening zelf.
    const language = toLanguageCode(exercise.chapter?.book.contentCollection.language);
    hint = generateExerciseHint(exercise.type, exercise.prompt, answers, exercise.verseRef, exercise.sourceVerse?.text, language);
    await prisma.exercise.update({ where: { id: exercise.id }, data: { hint } });
  }

  const result = await prisma.user.updateMany({
    where: { id: user.id, hintBalance: { gt: 0 } },
    data: { hintBalance: { decrement: 1 } },
  });
  if (result.count === 0) {
    return NextResponse.json(
      { error: "Je hebt geen denkhint beschikbaar — geef eerst een goed antwoord, of koop er een in de winkel." },
      { status: 400 }
    );
  }

  const current = await prisma.user.findUnique({ where: { id: user.id }, select: { hintBalance: true } });
  return NextResponse.json({ hint, hintBalance: current?.hintBalance ?? 0 });
}
