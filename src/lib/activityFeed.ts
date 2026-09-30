import type { Prisma, XPReason } from "@prisma/client";

const XP_GROUP_WINDOW_MS = 15 * 60 * 1000;

type Transaction = Prisma.TransactionClient;

/** Legt een XP-activiteit vast zonder voor elk klein XP-bedrag een feed-item te maken. */
export async function recordXpActivity(
  tx: Transaction,
  userId: string,
  amount: number,
  reason: XPReason,
  now = new Date()
): Promise<void> {
  if (amount <= 0) return;

  const existing = await tx.activityFeedItem.findFirst({
    where: {
      userId,
      kind: "XP",
      groupKey: reason,
      updatedAt: { gte: new Date(now.getTime() - XP_GROUP_WINDOW_MS) },
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (existing) {
    await tx.activityFeedItem.update({ where: { id: existing.id }, data: { xpAmount: { increment: amount } } });
    return;
  }

  await tx.activityFeedItem.create({
    data: { userId, kind: "XP", groupKey: reason, xpAmount: amount, xpReason: reason, createdAt: now },
  });
}

export async function recordAchievementActivity(
  tx: Transaction,
  userId: string,
  achievement: { slug: string; name: string; icon: string },
  now = new Date()
): Promise<void> {
  await tx.activityFeedItem.create({
    data: {
      userId,
      kind: "ACHIEVEMENT",
      groupKey: achievement.slug,
      achievementSlug: achievement.slug,
      achievementName: achievement.name,
      achievementIcon: achievement.icon,
      createdAt: now,
    },
  });
}
