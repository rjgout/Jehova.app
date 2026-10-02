// Vriendenreeksen: twee vrienden die allebei hun persoonlijke reeks
// behouden. Geen eigen oefeningen of XP; de persoonlijke reeks (StreakDay)
// is de bron. Bewust streng: één dag niet allebei behouden en de reeks is
// verbroken. Zie docs/SAMEN.md.

import { prisma } from "@/lib/db";
import { addDays } from "@/lib/dates";
import { dayKeyInZone, resolveTimeZone } from "@/lib/timeZone";
import { checkAndAwardAchievements } from "@/lib/achievements";
import { notifyFriendStreakAccepted, notifyFriendStreakInvite, notifyNewAchievements } from "@/lib/notify";
import {
  FRIEND_STREAK_LIMIT,
  FRIEND_STREAK_MILESTONES,
  dayEndsForAll,
  latestDayKey,
  resolveSocialDay,
} from "@/lib/social/rules";
import {
  SocialError,
  isUniqueViolation,
  keptOn,
  lockUsers,
  memberDayStates,
  personSelect,
  recordSocialEvent,
  type Db,
  type PersonSummary,
} from "@/lib/social/common";

export function pairOf(a: string, b: string): { userAId: string; userBId: string; openKey: string } {
  const [userAId, userBId] = a < b ? [a, b] : [b, a];
  return { userAId, userBId, openKey: `${userAId}:${userBId}` };
}

export async function areFriends(db: Db, a: string, b: string): Promise<boolean> {
  const count = await db.friendship.count({
    where: { status: "ACCEPTED", OR: [{ senderId: a, receiverId: b }, { senderId: b, receiverId: a }] },
  });
  return count > 0;
}

async function activeCount(db: Db, userId: string): Promise<number> {
  return db.friendStreak.count({ where: { status: "ACTIVE", OR: [{ userAId: userId }, { userBId: userId }] } });
}

/** Nodigt een vriend uit voor een vriendenreeks. */
export async function inviteFriendStreak(inviterId: string, friendId: string): Promise<{ id: string }> {
  if (inviterId === friendId) throw new SocialError("together.errors.friendStreakSelf", 400);
  const pair = pairOf(inviterId, friendId);
  const created = await prisma
    .$transaction(async (tx) => {
      await lockUsers(tx, [inviterId, friendId]);
      if (!(await areFriends(tx, inviterId, friendId))) throw new SocialError("together.errors.friendStreakNotFriends", 403);
      const open = await tx.friendStreak.findUnique({ where: { openKey: pair.openKey } });
      if (open) throw new SocialError(open.status === "ACTIVE" ? "together.errors.friendStreakExists" : "together.errors.friendStreakPending", 409);
      if ((await activeCount(tx, inviterId)) >= FRIEND_STREAK_LIMIT) throw new SocialError("together.errors.friendStreakLimit", 409, { n: FRIEND_STREAK_LIMIT });
      return tx.friendStreak.create({ data: { ...pair, inviterId, status: "PENDING" } });
    })
    .catch((error) => {
      if (isUniqueViolation(error)) throw new SocialError("together.errors.friendStreakPending", 409);
      throw error;
    });
  const inviter = await prisma.user.findUnique({ where: { id: inviterId }, select: { handle: true } });
  notifyFriendStreakInvite(friendId, inviter?.handle ?? "").catch(() => {});
  return { id: created.id };
}

/**
 * Accepteren of weigeren door de uitgenodigde. Accepteren is idempotent en
 * controleert de limiet van beide kanten opnieuw, onder vergrendeling.
 */
export async function respondFriendStreak(userId: string, streakId: string, accept: boolean, now: Date = new Date()): Promise<void> {
  const streak = await prisma.friendStreak.findUnique({ where: { id: streakId } });
  if (!streak || (streak.userAId !== userId && streak.userBId !== userId) || streak.inviterId === userId) {
    throw new SocialError("together.errors.friendStreakNotFound", 404);
  }
  if (streak.status === "ACTIVE" && accept) return;
  if (streak.status !== "PENDING") throw new SocialError("together.errors.friendStreakNotFound", 404);

  if (!accept) {
    await prisma.friendStreak.updateMany({ where: { id: streakId, status: "PENDING" }, data: { status: "DECLINED", openKey: null, endedAt: now } });
    return;
  }

  const accepted = await prisma.$transaction(async (tx) => {
    await lockUsers(tx, [streak.userAId, streak.userBId]);
    if (!(await areFriends(tx, streak.userAId, streak.userBId))) throw new SocialError("together.errors.friendStreakNotFriends", 403);
    for (const id of [streak.userAId, streak.userBId]) {
      if ((await activeCount(tx, id)) >= FRIEND_STREAK_LIMIT) {
        throw new SocialError(id === userId ? "together.errors.friendStreakLimit" : "together.errors.friendStreakLimitOther", 409, { n: FRIEND_STREAK_LIMIT });
      }
    }
    // De eerste dag die meetelt: de nieuwste "vandaag" van de twee, zodat
    // geen van beiden een dag mist die al voorbij was.
    const users = await tx.user.findMany({ where: { id: { in: [streak.userAId, streak.userBId] } }, select: { timeZone: true } });
    const startDay = users.map((u) => dayKeyInZone(now, resolveTimeZone(u.timeZone))).sort().at(-1)!;
    const updated = await tx.friendStreak.updateMany({
      where: { id: streakId, status: "PENDING" },
      data: { status: "ACTIVE", acceptedAt: now, startDay, nextDay: startDay },
    });
    if (updated.count === 0) return false;
    await recordSocialEvent(tx, { kind: "FRIEND_STREAK_STARTED", friendStreakId: streakId, userId, dayKey: startDay });
    return true;
  });
  if (!accepted) return;
  // Hebben ze vandaag allebei al hun reeks behouden, dan staat de eerste dag er meteen.
  await refreshFriendStreak(streakId, now);
  const accepter = await prisma.user.findUnique({ where: { id: userId }, select: { handle: true } });
  notifyFriendStreakAccepted(streak.inviterId, accepter?.handle ?? "").catch(() => {});
}

/** Een eigen, nog niet geaccepteerde uitnodiging intrekken. Een lopende reeks kan niet worden beëindigd. */
export async function cancelFriendStreakInvite(userId: string, streakId: string, now: Date = new Date()): Promise<void> {
  const result = await prisma.friendStreak.updateMany({
    where: { id: streakId, inviterId: userId, status: "PENDING" },
    data: { status: "CANCELLED", openKey: null, endedAt: now },
  });
  if (result.count === 0) throw new SocialError("together.errors.friendStreakNotFound", 404);
}

/** Geen vrienden meer: een open of lopende vriendenreeks stopt (zonder iemand de schuld te geven). */
export async function endFriendStreaksBetween(a: string, b: string, now: Date = new Date()): Promise<void> {
  const { openKey } = pairOf(a, b);
  const open = await prisma.friendStreak.findUnique({ where: { openKey } });
  if (!open) return;
  await prisma.$transaction(async (tx) => {
    const ended = await tx.friendStreak.updateMany({
      where: { id: open.id, openKey },
      data: { status: open.status === "ACTIVE" ? "ENDED" : "CANCELLED", openKey: null, endedAt: now },
    });
    if (ended.count > 0 && open.status === "ACTIVE") {
      await recordSocialEvent(tx, { kind: "FRIEND_STREAK_ENDED", friendStreakId: open.id, data: { streak: open.currentStreak } });
    }
  });
}

/**
 * Werkt een lopende vriendenreeks bij: elke dag waarop beiden hun reeks
 * behielden telt direct mee; een dag die voor beiden definitief is en niet
 * door allebei werd behouden, verbreekt de reeks. Veilig om vaak en
 * gelijktijdig aan te roepen (rijvergrendeling, overslaan als bezet).
 */
export async function refreshFriendStreak(streakId: string, now: Date = new Date()): Promise<void> {
  const awarded = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "FriendStreak" WHERE "id" = ${streakId} AND "status" = 'ACTIVE' FOR UPDATE SKIP LOCKED`;
    if (locked.length === 0) return [] as string[];
    const streak = await tx.friendStreak.findUniqueOrThrow({ where: { id: streakId } });
    const users = [streak.userAId, streak.userBId];
    let { currentStreak, longestStreak, lastAchievedDay } = streak;
    let day = streak.nextDay ?? streak.startDay ?? latestDayKey(now);
    let changed = false;
    let milestone = false;
    let broken = false;
    const horizon = latestDayKey(now);

    while (day <= horizon) {
      const kept = await keptOn(tx, users, day);
      const outcome = resolveSocialDay({
        eligible: 2,
        contributors: kept.size,
        required: 2,
        freezeReserved: false,
        settled: kept.size === 2 || [...(await memberDayStates(tx, users, day, now)).values()].every((s) => s !== "pending"),
      });
      if (outcome === "pending") break;
      changed = true;
      if (outcome === "achieved") {
        currentStreak += 1;
        longestStreak = Math.max(longestStreak, currentStreak);
        lastAchievedDay = day;
        await recordSocialEvent(tx, { kind: "FRIEND_STREAK_DAY", friendStreakId: streakId, dayKey: day, data: { streak: currentStreak } });
        if ((FRIEND_STREAK_MILESTONES as readonly number[]).includes(currentStreak)) {
          milestone = true;
          await recordSocialEvent(tx, { kind: "FRIEND_STREAK_MILESTONE", friendStreakId: streakId, dayKey: day, data: { streak: currentStreak } });
        }
        day = addDays(day, 1);
        continue;
      }
      broken = true;
      await recordSocialEvent(tx, { kind: "FRIEND_STREAK_BROKEN", friendStreakId: streakId, dayKey: day, data: { streak: currentStreak } });
      break;
    }
    // Pas weer kijken als de open dag voor allebei voorbij kan zijn; is hij
    // dat al (de eigen reeksafsluiting loopt nog), dan over een minuut.
    const zones = await tx.user.findMany({ where: { id: { in: users } }, select: { timeZone: true, lastStudyTimeZone: true } });
    const endsAt = dayEndsForAll(day, zones.flatMap((z) => [z.timeZone, z.lastStudyTimeZone]));
    const nextCheckAt = endsAt > now ? endsAt : new Date(now.getTime() + 60_000);
    if (!changed) {
      await tx.friendStreak.update({ where: { id: streakId }, data: { nextCheckAt } });
      return [] as string[];
    }
    await tx.friendStreak.update({
      where: { id: streakId },
      data: broken
        ? { status: "BROKEN", openKey: null, endedAt: now, currentStreak, longestStreak, lastAchievedDay, nextDay: day }
        : { currentStreak, longestStreak, lastAchievedDay, nextDay: day, nextCheckAt },
    });
    if (!milestone) return [] as string[];
    const newly: string[] = [];
    for (const id of users) {
      const slugs = await checkAndAwardAchievements(tx, id);
      if (slugs.length > 0) newly.push(`${id}|${slugs.join(",")}`);
    }
    return newly;
  });
  for (const entry of awarded) {
    const [id, slugs] = entry.split("|");
    notifyNewAchievements(id, slugs.split(",")).catch(() => {});
  }
}

/** Alle lopende vriendenreeksen van deze gebruikers bijwerken (na nieuwe reeksdagen). */
export async function refreshFriendStreaksFor(userIds: string[], now: Date = new Date()): Promise<void> {
  if (userIds.length === 0) return;
  const streaks = await prisma.friendStreak.findMany({
    where: { status: "ACTIVE", OR: [{ userAId: { in: userIds } }, { userBId: { in: userIds } }] },
    select: { id: true },
  });
  for (const s of streaks) await refreshFriendStreak(s.id, now).catch((e) => console.error(`Vriendenreeks ${s.id}:`, e));
}

/**
 * Lopende vriendenreeksen waarvan de open dag nu voor beiden voorbij kan
 * zijn. Via de index (status, nextCheckAt): meestal een handvol rijen, nooit
 * alle reeksen.
 */
export async function refreshDueFriendStreaks(now: Date = new Date()): Promise<void> {
  const due = await prisma.friendStreak.findMany({ where: { status: "ACTIVE", nextCheckAt: { lte: now } }, select: { id: true } });
  for (const s of due) await refreshFriendStreak(s.id, now).catch((e) => console.error(`Vriendenreeks ${s.id}:`, e));
}

export interface FriendStreakView {
  id: string;
  friend: PersonSummary;
  status: "ACTIVE" | "PENDING";
  /** Bij een uitnodiging: heb ik hem gestuurd (wachten) of ontvangen (reageren)? */
  direction: "sent" | "received" | null;
  currentStreak: number;
  longestStreak: number;
  /** Vandaag (mijn kalenderdag): wie heeft zijn reeks al behouden? */
  today: { me: boolean; friend: boolean } | null;
}

/** Voor de vriendenpagina en Vandaag: lopende reeksen en open uitnodigingen. */
export async function listFriendStreaks(userId: string, timeZone: string | null, now: Date = new Date()): Promise<{ streaks: FriendStreakView[]; activeCount: number; limit: number }> {
  const rows = await prisma.friendStreak.findMany({
    where: { status: { in: ["ACTIVE", "PENDING"] }, OR: [{ userAId: userId }, { userBId: userId }] },
    include: { userA: { select: personSelect }, userB: { select: personSelect } },
    orderBy: [{ currentStreak: "desc" }, { createdAt: "asc" }],
  });
  const today = dayKeyInZone(now, resolveTimeZone(timeZone));
  const people = rows.map((r) => (r.userAId === userId ? r.userB : r.userA));
  const kept = await keptOn(prisma, [userId, ...people.map((p) => p.id)], today);
  const streaks = rows.map((row, i): FriendStreakView => {
    const friend = people[i];
    const active = row.status === "ACTIVE";
    return {
      id: row.id,
      friend,
      status: active ? "ACTIVE" : "PENDING",
      direction: active ? null : row.inviterId === userId ? "sent" : "received",
      currentStreak: row.currentStreak,
      longestStreak: row.longestStreak,
      today: active ? { me: kept.has(userId), friend: kept.has(friend.id) } : null,
    };
  });
  return { streaks, activeCount: streaks.filter((s) => s.status === "ACTIVE").length, limit: FRIEND_STREAK_LIMIT };
}
