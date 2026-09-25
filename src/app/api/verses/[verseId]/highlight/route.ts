import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";

export async function POST(_req: Request, { params }: { params: Promise<{ verseId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const { verseId } = await params;
  const existing = await prisma.highlight.findUnique({ where: { userId_verseId: { userId: user.id, verseId } } });

  if (existing) {
    await prisma.highlight.delete({ where: { id: existing.id } });
    return NextResponse.json({ highlighted: false });
  }

  const verse = await prisma.verse.findUnique({ where: { id: verseId } });
  if (!verse) return await apiError("apiErrors.verseNotFound", 404);

  await prisma.highlight.create({ data: { userId: user.id, verseId } });
  return NextResponse.json({ highlighted: true });
}
