// Seintjes: een licht sociaal duwtje van een vriend, geen chat. Algemeen
// opgezet (de context bepaalt alleen de tweede regel van de melding), zodat
// spellen en andere onderdelen het later ook kunnen gebruiken. Alleen
// tussen vrienden, hooguit één per 6 uur per richting, geen XP, geen teller.

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { dayKeyInZone, resolveTimeZone } from "@/lib/timeZone";
import { notifyNudge } from "@/lib/notify";
import type { TFunction } from "@/lib/i18n/core";
import { NUDGE_INTERVAL_HOURS, requiredContributors } from "@/lib/social/rules";
import { SocialError, type Db } from "@/lib/social/common";
import { areFriends, pairOf } from "@/lib/social/friendStreaks";
import { activeMembership } from "@/lib/social/groups";
import { groupDayCounts } from "@/lib/social/groupDays";

export type NudgeContext = { kind: "general" } | { kind: "friend-streak" } | { kind: "group"; groupId: string };

const INTERVAL_MS = NUDGE_INTERVAL_HOURS * 60 * 60 * 1000;

/** Wanneer mag deze afzender deze ontvangers weer een seintje geven? Ontbreekt een id: nu al. */
export async function nudgeAvailability(db: Db, senderId: string, recipientIds: string[], now: Date = new Date()): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (recipientIds.length === 0) return result;
  const rows = await db.nudge.findMany({
    where: { senderId, recipientId: { in: recipientIds }, lastSentAt: { gt: new Date(now.getTime() - INTERVAL_MS) } },
    select: { recipientId: true, lastSentAt: true },
  });
  for (const row of rows) result.set(row.recipientId, new Date(row.lastSentAt.getTime() + INTERVAL_MS).toISOString());
  return result;
}

/** Wie seintjes van vrienden heeft uitgezet: voor die vrienden toont de app geen seintjesknop. */
export async function nudgesDisabled(db: Db, userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const rows = await db.user.findMany({ where: { id: { in: userIds }, nudgesEnabled: false }, select: { id: true } });
  return new Set(rows.map((r) => r.id));
}

async function contextLine(context: NudgeContext, recipientId: string, senderId: string, now: Date): Promise<{ url: string; line: (t: TFunction) => string }> {
  if (context.kind === "friend-streak") {
    const open = await prisma.friendStreak.findUnique({ where: { openKey: pairOf(senderId, recipientId).openKey } });
    if (open?.status !== "ACTIVE") throw new SocialError("together.errors.friendStreakNotFound", 404);
    return { url: "/friends", line: (t) => t("together.notify.nudgeFriendStreak") };
  }
  if (context.kind === "group") {
    const [mine, theirs] = await Promise.all([activeMembership(prisma, context.groupId, senderId), activeMembership(prisma, context.groupId, recipientId)]);
    if (!mine || !theirs) throw new SocialError("together.errors.groupNotFound", 404);
    const recipient = await prisma.user.findUniqueOrThrow({ where: { id: recipientId }, select: { timeZone: true } });
    const day = dayKeyInZone(now, resolveTimeZone(recipient.timeZone));
    const counts = (await groupDayCounts(prisma, [context.groupId], day)).get(context.groupId);
    const required = counts ? requiredContributors(counts.eligible) : null;
    const missing = counts && required !== null ? Math.max(0, required - counts.contributors) : 0;
    const group = await prisma.socialGroup.findUniqueOrThrow({ where: { id: context.groupId }, select: { name: true } });
    const url = `/groups/${context.groupId}`;
    return missing > 0
      ? { url, line: (t) => (missing === 1 ? t("together.notify.nudgeGroupMissingOne", { group: group.name }) : t("together.notify.nudgeGroupMissing", { n: missing, group: group.name })) }
      : { url, line: (t) => t("together.notify.nudgeGroup", { group: group.name }) };
  }
  return { url: "/dashboard", line: (t) => t("together.notify.nudgeGeneral") };
}

/**
 * Geeft een seintje. De grens van één per 6 uur zit in één atomaire
 * insert-of-update: twee gelijktijdige seintjes leveren er hooguit één op.
 */
export async function sendNudge(senderId: string, recipientId: string, context: NudgeContext, now: Date = new Date()): Promise<{ availableAt: string }> {
  if (senderId === recipientId) throw new SocialError("apiErrors.invalidInput", 400);
  if (!(await areFriends(prisma, senderId, recipientId))) throw new SocialError("together.errors.nudgeFriendsOnly", 403);
  const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { nudgesEnabled: true } });
  if (!recipient?.nudgesEnabled) throw new SocialError("together.errors.nudgesOff", 409);
  const { url, line } = await contextLine(context, recipientId, senderId, now);

  const cutoff = new Date(now.getTime() - INTERVAL_MS);
  const claimed = await prisma.$queryRaw<{ senderId: string }[]>(Prisma.sql`
    INSERT INTO "Nudge" ("senderId", "recipientId", "context", "lastSentAt")
    VALUES (${senderId}, ${recipientId}, ${context.kind}, ${now})
    ON CONFLICT ("senderId", "recipientId") DO UPDATE
      SET "lastSentAt" = EXCLUDED."lastSentAt", "context" = EXCLUDED."context"
      WHERE "Nudge"."lastSentAt" <= ${cutoff}
    RETURNING "senderId"`);
  if (claimed.length === 0) {
    const existing = await prisma.nudge.findUnique({ where: { senderId_recipientId: { senderId, recipientId } } });
    const availableAt = new Date((existing?.lastSentAt ?? now).getTime() + INTERVAL_MS);
    throw new SocialError("together.errors.nudgeTooSoon", 429, { time: availableAt.toISOString() });
  }
  const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { handle: true } });
  notifyNudge(recipientId, sender?.handle ?? "", url, line).catch(() => {});
  return { availableAt: new Date(now.getTime() + INTERVAL_MS).toISOString() };
}
