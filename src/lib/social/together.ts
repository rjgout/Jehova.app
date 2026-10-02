// Het compacte "Samen"-blok op Vandaag: geen feed, alleen wat vandaag
// telt. Hergebruikt dezelfde bronnen als de vrienden- en groepspagina.

import { listFriendStreaks } from "@/lib/social/friendStreaks";
import { listMyGroups } from "@/lib/social/groupViews";
import type { PersonSummary } from "@/lib/social/common";

export type TogetherHighlight =
  | { kind: "friend-waiting"; friend: PersonSummary; streak: number }
  | { kind: "group-missing"; groupId: string; name: string; missing: number }
  | { kind: "group-protected"; groupId: string; name: string; by: PersonSummary }
  | { kind: "group-achieved"; groupId: string; name: string; contributors: number };

export interface TogetherSummary {
  friendStreaks: { active: number; limit: number; longest: number };
  groups: { count: number; longest: number };
  invites: number;
  highlights: TogetherHighlight[];
}

const MAX_HIGHLIGHTS = 3;

/** Null als er niets te tonen is (geen vriendenreeksen, groepen of uitnodigingen). */
export async function getTogetherSummary(userId: string, timeZone: string | null, now: Date = new Date()): Promise<TogetherSummary | null> {
  const [friends, groups] = await Promise.all([listFriendStreaks(userId, timeZone, now), listMyGroups(userId, timeZone, now)]);
  const active = friends.streaks.filter((s) => s.status === "ACTIVE");
  const invites = friends.streaks.filter((s) => s.direction === "received").length + groups.invites.length;
  if (active.length === 0 && groups.groups.length === 0 && invites === 0) return null;

  // Eerst wat iemand anders van jou nodig heeft, dan wat de groep nog mist,
  // dan wat beschermd is. Gehaalde groepen alleen als er verder niets is.
  const highlights: TogetherHighlight[] = [];
  for (const s of active) {
    if (s.today && s.today.friend && !s.today.me) highlights.push({ kind: "friend-waiting", friend: s.friend, streak: s.currentStreak });
  }
  for (const g of groups.groups) {
    if (g.today.protectedBy) highlights.push({ kind: "group-protected", groupId: g.id, name: g.name, by: g.today.protectedBy });
    else if (!g.today.achieved && g.today.required !== null && g.today.missing > 0) highlights.push({ kind: "group-missing", groupId: g.id, name: g.name, missing: g.today.missing });
  }
  highlights.sort((a, b) => order(a) - order(b));
  if (highlights.length === 0) {
    for (const g of groups.groups) {
      if (g.today.achieved) highlights.push({ kind: "group-achieved", groupId: g.id, name: g.name, contributors: g.today.contributors });
    }
  }

  return {
    friendStreaks: { active: active.length, limit: friends.limit, longest: Math.max(0, ...active.map((s) => s.currentStreak)) },
    groups: { count: groups.groups.length, longest: Math.max(0, ...groups.groups.map((g) => g.currentStreak)) },
    invites,
    highlights: highlights.slice(0, MAX_HIGHLIGHTS),
  };
}

function order(h: TogetherHighlight): number {
  return { "friend-waiting": 0, "group-missing": 1, "group-protected": 2, "group-achieved": 3 }[h.kind];
}

