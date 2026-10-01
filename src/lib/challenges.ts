import { prisma } from "@/lib/db";
import { notifyChallengeYourTurn, notifyChallengeFinished } from "@/lib/notify";
import { awardCompetitionXp } from "@/lib/competitionXp";
import { CHALLENGE_WIN_XP } from "@/lib/xpRules";

// Uitdagingen geven (zoals de doc-comment hieronder al zegt) bewust geen
// algemene XP — de onderliggende hoofdstuk-oefeningen leveren die al via de
// gewone lesflow. Dit is puur competitie-XP (zie src/lib/competitionXp.ts):
// winnen van een uitdaging telt nu ook mee voor de wekelijkse competitie.

/**
 * Verwerkt een les-score als beurt in een uitdaging, indien de speler er
 * één opgaf bij het afronden van een hoofdstuk (zie LessonFlow/lesson-
 * pagina en /api/chapters/[chapterId]/submit). Bewust los van de
 * voortgang en beloning van de oefenset — een uitdaging is puur een score-vergelijking, geen eigen
 * voortgang/streak/XP-bron.
 */
export async function recordChallengeAttempt(userId: string, challengeId: string, chapterId: string, scorePercent: number): Promise<void> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { sender: true, receiver: true },
  });
  if (!challenge) return;
  if (challenge.chapterId !== chapterId) return;
  if (challenge.status !== "ACCEPTED") return;

  const isSender = challenge.senderId === userId;
  const isReceiver = challenge.receiverId === userId;
  if (!isSender && !isReceiver) return;

  if (isSender && challenge.senderCompletedAt) return; // al gespeeld, geen herkansing
  if (isReceiver && challenge.receiverCompletedAt) return;

  const opponentAlreadyPlayed = isSender ? challenge.receiverCompletedAt !== null : challenge.senderCompletedAt !== null;

  const updated = await prisma.challenge.update({
    where: { id: challengeId },
    data: isSender
      ? { senderScore: scorePercent, senderCompletedAt: new Date() }
      : { receiverScore: scorePercent, receiverCompletedAt: new Date() },
  });

  if (opponentAlreadyPlayed) {
    const senderScore = updated.senderScore ?? 0;
    const receiverScore = updated.receiverScore ?? scorePercent;
    const tied = senderScore === receiverScore;
    const winnerUserId = tied ? null : senderScore > receiverScore ? challenge.senderId : challenge.receiverId;
    await prisma.challenge.update({ where: { id: challengeId }, data: { status: "FINISHED", winnerUserId } });
    await Promise.allSettled([
      notifyChallengeFinished(challenge.senderId, challenge.receiver.handle, senderScore > receiverScore, tied),
      notifyChallengeFinished(challenge.receiverId, challenge.sender.handle, receiverScore > senderScore, tied),
    ]);
    if (winnerUserId) {
      await prisma.$transaction(async (tx) => {
        await awardCompetitionXp(tx, winnerUserId, "CHALLENGE_WON", CHALLENGE_WIN_XP);
      }).catch(() => {});
    }
  } else {
    const opponentId = isSender ? challenge.receiverId : challenge.senderId;
    const playerName = isSender ? challenge.sender.handle : challenge.receiver.handle;
    await notifyChallengeYourTurn(opponentId, playerName).catch(() => {});
  }
}

/**
 * Opgeven in een lopende uitdaging — mag altijd, ongeacht of je zelf al
 * gespeeld hebt (er is toch geen "beurt"-concept zoals bij het woordspel:
 * beide spelers spelen onafhankelijk van elkaar). De ander wordt direct
 * winnaar, ongeacht scores.
 */
export async function forfeitChallenge(userId: string, challengeId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { sender: true, receiver: true },
  });
  if (!challenge) return { ok: false, error: "Uitdaging niet gevonden." };
  if (challenge.status !== "ACCEPTED") return { ok: false, error: "Deze uitdaging loopt niet meer." };

  const isSender = challenge.senderId === userId;
  const isReceiver = challenge.receiverId === userId;
  if (!isSender && !isReceiver) return { ok: false, error: "Je speelt niet mee in deze uitdaging." };

  const opponentId = isSender ? challenge.receiverId : challenge.senderId;
  const opponentName = isSender ? challenge.receiver.handle : challenge.sender.handle;
  const selfName = isSender ? challenge.sender.handle : challenge.receiver.handle;

  await prisma.challenge.update({ where: { id: challengeId }, data: { status: "FINISHED", winnerUserId: opponentId } });
  await Promise.allSettled([
    notifyChallengeFinished(opponentId, selfName, true, false),
    notifyChallengeFinished(userId, opponentName, false, false),
  ]);
  return { ok: true };
}
