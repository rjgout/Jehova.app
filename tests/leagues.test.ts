// Competitie: promotie als percentage van de groep (standaard 75%),
// degradatie 10%, het eind van de week en de medailletelling. De rekenregels
// draaien altijd; de stukken met een database alleen met
// LEARNING_TEST_DATABASE_URL.
//
//   LEARNING_TEST_DATABASE_URL=postgresql://... npm run test:leagues
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import type { LeagueTier } from "@prisma/client";
import { movementCounts, weekEndsAt, type LeagueSettingsView } from "../src/lib/leagues";

const settings = { groupSize: 30, promoteCount: 3, demoteCount: 3, promotePercent: 75 } as LeagueSettingsView;

test("75% promoveert (naar beneden afgerond, minstens één), 10% degradeert", () => {
  assert.deepEqual(movementCounts(30, settings, 75), { promote: 22, demote: 3 });
  assert.deepEqual(movementCounts(20, settings, 75), { promote: 15, demote: 2 });
  assert.deepEqual(movementCounts(10, settings, 75), { promote: 7, demote: 1 });
  assert.deepEqual(movementCounts(8, settings, 75), { promote: 6, demote: 1 });
  assert.deepEqual(movementCounts(4, settings, 75), { promote: 3, demote: 0 });
  assert.deepEqual(movementCounts(2, settings, 75), { promote: 1, demote: 0 });
  assert.deepEqual(movementCounts(1, settings, 75), { promote: 1, demote: 0 });
  assert.deepEqual(movementCounts(0, settings, 75), { promote: 0, demote: 0 });
  // Nooit meer plekken dan spelers.
  for (let total = 1; total <= 60; total++) {
    const { promote, demote } = movementCounts(total, settings, 100);
    assert.ok(promote + demote <= total, `${total} spelers`);
  }
});

test("een groep zonder percentage houdt de oude regel", () => {
  assert.deepEqual(movementCounts(30, settings, null), { promote: 3, demote: 3 });
  assert.deepEqual(movementCounts(10, settings, null), { promote: 1, demote: 1 });
  assert.deepEqual(movementCounts(4, settings, null), { promote: 1, demote: 0 });
});

test("de week eindigt maandag 00:00 UTC", () => {
  assert.equal(weekEndsAt("2026-09-28").toISOString(), "2026-10-05T00:00:00.000Z");
});

const url = process.env.LEARNING_TEST_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;
const skip = !url && "LEARNING_TEST_DATABASE_URL niet gezet";

const load = async () => ({ db: (await import("../src/lib/db")).prisma, leagues: await import("../src/lib/leagues") });
let L: Awaited<ReturnType<typeof load>>;
const run = `${Date.now()}`;
const emails: string[] = [];
const groupIds: string[] = [];
let seq = 0;
// Een week ver in het verleden met een unieke groepsindex, zodat de test
// nooit botst met echte groepen.
const WEEK = "2020-01-06";
const NEXT = "2020-01-13";
const index = 100_000 + Math.floor(Math.random() * 1_000_000);

async function group(tier: LeagueTier, promotePercent: number | null, xps: number[], offset: number): Promise<string[]> {
  const g = await L.db.leagueGroup.create({
    data: { weekStart: WEEK, tier, index: index + offset, size: 30, memberCount: xps.length, promotePercent },
  });
  groupIds.push(g.id);
  const ids: string[] = [];
  for (const xp of xps) {
    const email = `competitie-${run}-${++seq}@test.invalid`;
    emails.push(email);
    const u = await L.db.user.create({ data: { email, passwordHash: "x", handle: "Speler", discriminator: String(seq % 100).padStart(2, "0") } });
    await L.db.weeklyScore.create({ data: { userId: u.id, weekStart: WEEK, xp, tier, groupId: g.id } });
    ids.push(u.id);
  }
  return ids;
}

before(async () => {
  if (skip) return;
  L = await load();
});
after(async () => {
  if (skip) return;
  await L.db.user.deleteMany({ where: { email: { in: emails } } });
  await L.db.leagueGroup.deleteMany({ where: { id: { in: groupIds } } });
  await L.db.$disconnect();
});

test("plaatsing volgt het percentage van de groep", { skip }, async () => {
  const ids = await group("GOLD", 75, [800, 700, 600, 500, 400, 300, 200, 100], 0);
  const tiers = await Promise.all(ids.map((id) => L.leagues.tierForWeek(L.db, id, NEXT)));
  // 8 spelers: 6 omhoog, 1 blijft, 1 omlaag.
  assert.deepEqual(tiers, ["PLATINUM", "PLATINUM", "PLATINUM", "PLATINUM", "PLATINUM", "PLATINUM", "GOLD", "SILVER"]);

  const old = await group("GOLD", null, [800, 700, 600, 500, 400, 300, 200, 100], 1);
  const oldTiers = await Promise.all(old.map((id) => L.leagues.tierForWeek(L.db, id, NEXT)));
  // Oude regel bij 8 spelers: 1 omhoog, 1 omlaag.
  assert.deepEqual(oldTiers, ["PLATINUM", "GOLD", "GOLD", "GOLD", "GOLD", "GOLD", "GOLD", "SILVER"]);
});

test("medailles: plek 1-3 van een afgelopen week, alleen met iemand onder je", { skip }, async () => {
  const ids = await group("SILVER", 75, [90, 80, 70, 60], 2);
  const medals = await Promise.all(ids.map((id) => L.leagues.medalCountsFor(L.db, id, NEXT)));
  assert.deepEqual(medals, [
    { gold: 1, silver: 0, bronze: 0 },
    { gold: 0, silver: 1, bronze: 0 },
    { gold: 0, silver: 0, bronze: 1 },
    { gold: 0, silver: 0, bronze: 0 },
  ]);
  // De lopende week telt nog niet mee.
  assert.deepEqual(await L.leagues.medalCountsFor(L.db, ids[0], WEEK), { gold: 0, silver: 0, bronze: 0 });

  // Alleen in je groep: geen goud. Met z'n tweeën: goud voor de eerste, geen zilver.
  const [alone] = await group("BRONZE", 75, [50], 3);
  assert.deepEqual(await L.leagues.medalCountsFor(L.db, alone, NEXT), { gold: 0, silver: 0, bronze: 0 });
  const pair = await group("BRONZE", 75, [50, 40], 4);
  assert.deepEqual(await L.leagues.medalCountsFor(L.db, pair[0], NEXT), { gold: 1, silver: 0, bronze: 0 });
  assert.deepEqual(await L.leagues.medalCountsFor(L.db, pair[1], NEXT), { gold: 0, silver: 0, bronze: 0 });
});
