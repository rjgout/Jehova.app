// Een eigen reeksbevriezing aanbieden om de groepsreeks van vandaag te
// beschermen. Tijdens de dag is hij alleen gereserveerd (apart gezet, zodat
// hij niet ook elders kan worden gebruikt); pas als de groepsdag definitief
// is afgelopen zonder het doel te halen, wordt hij echt gebruikt. Haalt de
// groep het doel toch, dan gaat hij terug. Zie docs/SAMEN.md.

import { prisma } from "@/lib/db";
import { dayKeyInZone, resolveTimeZone } from "@/lib/timeZone";
import { GROUP_FREEZE_COOLDOWN_DAYS, requiredContributors } from "@/lib/social/rules";
import { SocialError, isUniqueViolation, lockGroup, lockUsers, recordSocialEvent, type Db, type Tx } from "@/lib/social/common";
import { groupDayCounts } from "@/lib/social/groupDays";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Tot wanneer deze gebruiker voor deze groep geen bevriezing kan aanbieden (na een gebruikte), of null. */
export async function freezeCooldownUntil(db: Db, userId: string, groupId: string, now: Date): Promise<Date | null> {
  const last = await db.groupFreezeOffer.findFirst({
    where: { userId, groupId, status: "CONSUMED" },
    orderBy: { resolvedAt: "desc" },
    select: { resolvedAt: true },
  });
  if (!last?.resolvedAt) return null;
  const until = new Date(last.resolvedAt.getTime() + GROUP_FREEZE_COOLDOWN_DAYS * DAY_MS);
  return until > now ? until : null;
}

/**
 * Biedt een reeksbevriezing aan voor de groepsdag van vandaag (de eigen
 * kalenderdag van de aanbieder). Hooguit één per groepsdag: een tweede
 * gelijktijdige poging loopt vast op de unieke sleutel en krijgt zijn
 * bevriezing nooit afgeschreven (de hele transactie gaat terug).
 */
export async function offerGroupFreeze(userId: string, groupId: string, now: Date = new Date()): Promise<{ dayKey: string }> {
  return prisma
    .$transaction(async (tx) => {
      await lockUsers(tx, [userId]);
      if (!(await lockGroup(tx, groupId))) throw new SocialError("together.errors.groupNotFound", 404);
      const membership = await tx.groupMembership.findUnique({ where: { groupId_userId: { groupId, userId } } });
      if (!membership || membership.leftAt) throw new SocialError("together.errors.groupNotFound", 404);
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { timeZone: true, freezeCount: true } });
      const group = await tx.socialGroup.findUniqueOrThrow({ where: { id: groupId }, select: { nextDay: true } });
      const dayKey = dayKeyInZone(now, resolveTimeZone(user.timeZone));
      if (dayKey < group.nextDay) throw new SocialError("together.errors.groupFreezeDayClosed", 409);

      const day = await tx.groupDay.findUnique({ where: { groupId_dayKey: { groupId, dayKey } } });
      if (day && day.status !== "OPEN") throw new SocialError("together.errors.groupFreezeNotNeeded", 409);
      const counts = (await groupDayCounts(tx, [groupId], dayKey)).get(groupId) ?? { eligible: 0, contributors: 0 };
      const required = requiredContributors(counts.eligible);
      if (required === null || counts.contributors >= required) throw new SocialError("together.errors.groupFreezeNotNeeded", 409);

      if (await tx.groupFreezeOffer.findUnique({ where: { groupId_dayKey: { groupId, dayKey } } })) {
        throw new SocialError("together.errors.groupFreezeAlreadyOffered", 409);
      }
      const cooldown = await freezeCooldownUntil(tx, userId, groupId, now);
      if (cooldown) throw new SocialError("together.errors.groupFreezeCooldown", 409, { date: cooldown.toISOString().slice(0, 10) });

      const debited = await tx.user.updateMany({ where: { id: userId, freezeCount: { gte: 1 } }, data: { freezeCount: { decrement: 1 } } });
      if (debited.count === 0) throw new SocialError("together.errors.groupFreezeNone", 409);
      await tx.freezeTransaction.create({ data: { userId, type: "GROUP_RESERVED", amount: -1, reason: `Groep ${groupId} (${dayKey})` } });
      await tx.groupFreezeOffer.create({ data: { groupId, dayKey, userId } });
      await recordSocialEvent(tx, { kind: "FREEZE_OFFERED", groupId, userId, dayKey });
      return { dayKey };
    })
    .catch((error) => {
      if (isUniqueViolation(error)) throw new SocialError("together.errors.groupFreezeAlreadyOffered", 409);
      throw error;
    });
}

/** Terug naar de aanbieder: niet nodig (RELEASED) of aanbieder vertrokken (CANCELLED). */
export async function returnOfferTx(tx: Tx, offerId: string, status: "RELEASED" | "CANCELLED", now: Date): Promise<{ userId: string; groupId: string } | null> {
  const offer = await tx.groupFreezeOffer.findUnique({ where: { id: offerId } });
  if (!offer) return null;
  const updated = await tx.groupFreezeOffer.updateMany({ where: { id: offerId, status: "RESERVED" }, data: { status, resolvedAt: now } });
  if (updated.count === 0) return null;
  await tx.user.update({ where: { id: offer.userId }, data: { freezeCount: { increment: 1 } } });
  await tx.freezeTransaction.create({ data: { userId: offer.userId, type: "GROUP_RELEASED", amount: 1, reason: `Groep ${offer.groupId} (${offer.dayKey})` } });
  await recordSocialEvent(tx, { kind: status === "RELEASED" ? "FREEZE_RELEASED" : "FREEZE_CANCELLED", groupId: offer.groupId, userId: offer.userId, dayKey: offer.dayKey });
  return { userId: offer.userId, groupId: offer.groupId };
}

/** Bij vertrek uit een groep: een nog gereserveerde bevriezing gaat terug. */
export async function cancelOffersOnLeaveTx(tx: Tx, userId: string, groupId: string, now: Date): Promise<void> {
  const offers = await tx.groupFreezeOffer.findMany({ where: { userId, groupId, status: "RESERVED" }, select: { id: true } });
  for (const offer of offers) await returnOfferTx(tx, offer.id, "CANCELLED", now);
}

/** De groepsdag is gemist: de gereserveerde bevriezing wordt echt gebruikt (hij was al afgeschreven). */
export async function consumeOfferTx(tx: Tx, offerId: string, now: Date): Promise<string | null> {
  const offer = await tx.groupFreezeOffer.findUnique({ where: { id: offerId } });
  if (!offer) return null;
  const updated = await tx.groupFreezeOffer.updateMany({ where: { id: offerId, status: "RESERVED" }, data: { status: "CONSUMED", resolvedAt: now } });
  return updated.count > 0 ? offer.userId : null;
}
