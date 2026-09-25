import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";

const schema = z.object({ status: z.enum(["NEW", "IN_PROGRESS", "DONE", "WONT_DO"]) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ feedbackId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  if (!user.isAdmin) return await apiError("apiErrors.forbidden", 403);

  const { feedbackId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return await apiError("apiErrors.invalidInput", 400);

  const feedback = await prisma.feedback.findUnique({ where: { id: feedbackId } });
  if (!feedback) return await apiError("apiErrors.notificationNotFound", 404);

  await prisma.feedback.update({ where: { id: feedbackId }, data: { status: parsed.data.status } });
  return NextResponse.json({ ok: true });
}
