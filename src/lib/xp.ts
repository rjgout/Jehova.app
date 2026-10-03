import type { Prisma, XPReason } from "@/generated/prisma/client";
import { recordXpActivity } from "@/lib/activityFeed";

/**
 * Bron van waarheid voor XP: elke mutatie wordt gelogd als XPTransaction
 * (auditbaar — "waarom heb ik dit XP gekregen?"), en user.xpTotal wordt
 * als cache bijgewerkt zodat we niet overal moeten sommeren om het totaal
 * te tonen.
 */
export async function awardXp(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  reason: XPReason,
  metadata?: Record<string, unknown>
) {
  if (amount === 0) return;
  await tx.xPTransaction.create({
    data: {
      userId,
      amount,
      reason,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    },
  });
  await recordXpActivity(tx, userId, amount, reason);
  await tx.user.update({
    where: { id: userId },
    data: { xpTotal: { increment: amount } },
  });
}
