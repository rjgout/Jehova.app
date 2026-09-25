import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";

// Genoeg om "onlangs samen gespeeld" te bepalen, zonder bij veel spellen de
// hele geschiedenis door te lopen.
const LOOKBACK = 200;

/**
 * Per vriend het laatste moment dat je samen speelde (live-spellen, woordspel,
 * uitdagingen), voor de volgorde in het vriendenpaneel (FriendPicker.tsx).
 * Alleen tussen jou en je eigen vrienden: wie geen vriend (meer) is, valt weg.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const friendships = await prisma.friendship.findMany({
    where: { status: "ACCEPTED", OR: [{ senderId: user.id }, { receiverId: user.id }] },
    select: { senderId: true, receiverId: true },
  });
  const friendIds = new Set(friendships.map((f) => (f.senderId === user.id ? f.receiverId : f.senderId)));
  if (friendIds.size === 0) return NextResponse.json({ lastPlayed: {} });

  const [myLiveGames, scrabble, challenges] = await Promise.all([
    prisma.liveGamePlayer.findMany({
      where: { userId: user.id },
      orderBy: { joinedAt: "desc" },
      take: LOOKBACK,
      select: { gameId: true },
    }),
    prisma.scrabbleGame.findMany({
      where: { OR: [{ player1Id: user.id }, { player2Id: user.id }] },
      orderBy: { createdAt: "desc" },
      take: LOOKBACK,
      select: { player1Id: true, player2Id: true, createdAt: true },
    }),
    prisma.challenge.findMany({
      where: { OR: [{ senderId: user.id }, { receiverId: user.id }] },
      orderBy: { createdAt: "desc" },
      take: LOOKBACK,
      select: { senderId: true, receiverId: true, createdAt: true },
    }),
  ]);
  const coPlayers = await prisma.liveGamePlayer.findMany({
    where: { gameId: { in: myLiveGames.map((g) => g.gameId) }, userId: { in: [...friendIds] } },
    select: { userId: true, joinedAt: true },
  });

  const lastPlayed = new Map<string, number>();
  const note = (id: string, at: Date) => {
    if (!friendIds.has(id)) return;
    lastPlayed.set(id, Math.max(lastPlayed.get(id) ?? 0, at.getTime()));
  };
  for (const p of coPlayers) note(p.userId, p.joinedAt);
  for (const g of scrabble) note(g.player1Id === user.id ? g.player2Id : g.player1Id, g.createdAt);
  for (const c of challenges) note(c.senderId === user.id ? c.receiverId : c.senderId, c.createdAt);

  return NextResponse.json(
    { lastPlayed: Object.fromEntries([...lastPlayed].map(([id, at]) => [id, new Date(at).toISOString()])) },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
