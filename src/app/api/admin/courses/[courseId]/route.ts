import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";

const schema = z.object({ enabled: z.boolean() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  if (!user.isAdmin) return await apiError("apiErrors.forbidden", 403);

  const { courseId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return await apiError("apiErrors.invalidInput", 400);

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return await apiError("apiErrors.courseNotFound", 404);

  await prisma.course.update({ where: { id: courseId }, data: { enabled: parsed.data.enabled } });
  return NextResponse.json({ ok: true });
}
