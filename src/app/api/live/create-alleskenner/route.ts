import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getGameSettings } from "@/lib/gameSettings";

const generateCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 5);

// Maakt een lobby voor De Alleskenner (zie docs/ALLESKENNER.md). De maker is
// host en standaard quizmaster; spelers en toeschouwers melden zich in de
// lobby zelf aan via de socketserver (src/server/alleskenner.ts).
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const settings = await getGameSettings();
  if (!settings.alleskennerEnabled && !user.isAdmin) {
    return NextResponse.json({ error: "De Alleskenner staat (nog) niet aan." }, { status: 403 });
  }

  let code = generateCode();
  for (let attempts = 0; attempts < 5; attempts++) {
    const clash = await prisma.liveGame.findUnique({ where: { code } });
    if (!clash) break;
    code = generateCode();
  }

  const game = await prisma.liveGame.create({
    data: { code, hostId: user.id, mode: "ALLESKENNER", status: "LOBBY" },
  });
  await prisma.liveGamePlayer.create({ data: { gameId: game.id, userId: user.id } });

  return NextResponse.json({ code: game.code });
}
