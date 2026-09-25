import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const { code } = await params;
  const game = await prisma.liveGame.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      chapter: { include: { book: true } },
      host: { select: { id: true, handle: true } },
      players: { include: { user: { select: { id: true, handle: true } } } },
    },
  });
  if (!game) return await apiError("apiErrors.gameNotFound", 404);

  return NextResponse.json({
    code: game.code,
    status: game.status,
    mode: game.mode,
    chapterId: game.chapterId,
    chapterLabel: game.chapter ? `${game.chapter.book.name} ${game.chapter.number}` : null,
    level: game.level,
    questionCount: game.questionCount,
    hostId: game.hostId,
    hostName: game.host.handle,
    players: game.players.map((p) => ({ userId: p.userId, displayName: p.user.handle, score: p.score })),
  });
}
