import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";

// Beëindigt een live spel definitief vanuit /adminbackend — bedoeld voor
// spellen die vastzitten (zie GET hierboven) en dus geen bruikbare uitslag
// meer kunnen krijgen. Verwijdert de rij hard (net als de bestaande
// host-only cancel_game-socketactie voor een LOBBY-spel), i.p.v. 'm op
// FINISHED te zetten — LiveGamePlayer/LiveGameInvite ruimen automatisch mee
// (onDelete: Cascade). Alleen de database-kant: een eventueel nog in het
// geheugen levende speelronde van dit spel zit in een ander, door server.ts
// apart geladen exemplaar van gameServer.ts (zie de harde regel daarover in
// CLAUDE.md) en is vanuit een API-route toch niet aan te spreken — in de
// praktijk is dat hier niet relevant, want een spel raakt alleen op deze
// manier "vast" als die in-memory kant er al niet meer is (bv. na een
// herstart van de container).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  if (!user.isAdmin) return await apiError("apiErrors.forbidden", 403);

  const { gameId } = await params;
  await prisma.liveGame.delete({ where: { id: gameId } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
