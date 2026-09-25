import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { subscribeUserToCourse, INTRO_SLUG } from "@/lib/courses";
import { apiError } from "@/lib/apiError";

const schema = z.object({ level: z.enum(["NEVER", "SOME", "READ_BEFORE", "UNSURE"]) });

// Bij weinig of geen voorkennis wordt de introductiecursus meteen de eerste
// actieve cursus. Bij meer voorkennis blijft de bestaande actieve cursus staan.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return await apiError("apiErrors.invalidInput", 400);

  await prisma.user.update({ where: { id: user.id }, data: { bomKnowledgeLevel: parsed.data.level } });

  if (parsed.data.level === "NEVER" || parsed.data.level === "UNSURE") {
    const introCourse = await prisma.course.findUnique({ where: { slug: INTRO_SLUG } });
    if (introCourse) {
      await subscribeUserToCourse(prisma, user.id, introCourse.id);
      await prisma.user.update({ where: { id: user.id }, data: { activeCourseId: introCourse.id } });
    }
  }

  return NextResponse.json({ ok: true });
}
