import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { publishFsyLesson } from "@/lib/fsyContent";
import { apiError } from "@/lib/apiError";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  if (!user.isAdmin) return await apiError("apiErrors.forbidden", 403);

  const { lessonId } = await params;
  const lesson = await prisma.fsyLesson.findUnique({ where: { id: lessonId }, select: { id: true } });
  if (!lesson) return await apiError("apiErrors.fsyLessonNotFound", 404);

  await publishFsyLesson(prisma, lessonId);
  return NextResponse.json({ ok: true });
}
