import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { createChapterGuessGame, QUESTION_COUNT_OPTIONS } from "@/lib/chapterGuess";
import { apiError } from "@/lib/apiError";

const schema = z.object({
  level: z.enum(["BEGINNER", "ADVANCED", "EXPERT"]),
  questionCount: z.number().refine((n) => (QUESTION_COUNT_OPTIONS as readonly number[]).includes(n)),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return await apiError("apiErrors.invalidInput", 400);

  const view = await createChapterGuessGame(user.id, parsed.data.level, parsed.data.questionCount);
  return NextResponse.json(view);
}
