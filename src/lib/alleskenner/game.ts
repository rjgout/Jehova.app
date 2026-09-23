import { customAlphabet } from "nanoid";
import { prisma } from "@/lib/db";

const generateCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 5);

/** Nieuwe lobby voor De Alleskenner; de host staat er meteen als deelnemer in. */
export async function createAlleskennerGame(hostId: string) {
  let code = generateCode();
  for (let attempts = 0; attempts < 5; attempts++) {
    const clash = await prisma.liveGame.findUnique({ where: { code } });
    if (!clash) break;
    code = generateCode();
  }
  const game = await prisma.liveGame.create({ data: { code, hostId, mode: "ALLESKENNER", status: "LOBBY" } });
  await prisma.liveGamePlayer.create({ data: { gameId: game.id, userId: hostId } });
  return game;
}
