import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { completeReadingLesson, completeReadingOnlyStep } from "@/lib/readingLessons";
import { notifyNewAchievements } from "@/lib/notify";
import { apiError } from "@/lib/apiError";
import { exerciseSessionErrorResponse } from "@/lib/learning/apiResponses";

const schema = z.object({
  lessonId: z.string(),
  // Null voor een stap zonder vragen: dan is het alleen lezen.
  sessionId: z.string().min(1).nullable(),
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
  if (!parsed.success) return await apiError("apiErrors.invalidInput", 400);

  try {
    if (parsed.data.sessionId === null) {
      const { nextLessonId } = await completeReadingOnlyStep(user.id, parsed.data.lessonId);
      return NextResponse.json({ readOnly: true, nextLessonId });
    }
    const result = await completeReadingLesson(user.id, parsed.data.lessonId, parsed.data.sessionId, parsed.data.answers);
    notifyNewAchievements(user.id, result.newAchievements).catch(() => {});
    return NextResponse.json(result);
  } catch (error) {
    const response = await exerciseSessionErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
