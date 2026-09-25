import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";

// Toont elk live spel dat nog "open" staat (LOBBY of IN_PROGRESS) — inclusief
// spellen die vastzitten omdat de in-het-geheugen spelstatus verloren ging bij
// een herstart van de container (zie AdminLiveGamesClient.tsx). Zonder deze
// lijst is zo'n vastgelopen spel alleen via directe database-toegang op te
// ruimen, wat niet past bij een self-hosted app die verder alles via
// /adminbackend regelt.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  if (!user.isAdmin) return await apiError("apiErrors.forbidden", 403);

  const games = await prisma.liveGame.findMany({
    where: { status: { in: ["LOBBY", "IN_PROGRESS"] } },
    include: {
      host: { select: { handle: true, discriminator: true } },
      chapter: { include: { book: true } },
      players: { select: { userId: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    games: games.map((g) => ({
      id: g.id,
      code: g.code,
      mode: g.mode,
      status: g.status,
      hostLabel: `${g.host.handle}#${g.host.discriminator}`,
      label:
        g.mode === "FAMILY_GAME"
          ? "Gezinsavond"
          : g.mode === "CHAPTER_GUESS"
            ? "Raad het hoofdstuk"
            : g.chapter
              ? `${g.chapter.book.name} ${g.chapter.number}`
              : "Oefeningen-race",
      playerCount: g.players.length,
      createdAt: g.createdAt,
    })),
  });
}
