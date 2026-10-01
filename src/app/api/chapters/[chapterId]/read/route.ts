import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";
import { markChapterRead } from "@/lib/learning/contentProgress";

// "Markeer als gelezen": het hoofdstuk staat daarna als gelezen in elke
// leesroute. Bewust zonder XP en zonder reeks (zie docs/LEERVOORTGANG.md):
// lezen is voortgang, geen beloonde activiteit.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ chapterId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const { chapterId } = await params;
  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId }, select: { id: true } });
  if (!chapter) return await apiError("apiErrors.chapterNotFound", 404);

  const content = await markChapterRead(user.id, chapter.id);
  return NextResponse.json({ content });
}
