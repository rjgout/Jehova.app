import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { publishFsyLesson } from "@/lib/fsyContent";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const { lessonId } = await params;
  const lesson = await prisma.fsyLesson.findUnique({ where: { id: lessonId }, select: { id: true } });
  if (!lesson) return NextResponse.json({ error: "FSY-les niet gevonden." }, { status: 404 });

  await publishFsyLesson(prisma, lessonId);
  return NextResponse.json({ ok: true });
}
