// Integratietest voor het woord van de dag met tijdzones, tegen een echte
// Postgres-database. Draait alleen met LEARNING_TEST_DATABASE_URL; gebruikt
// woorddagen ver in de toekomst en ruimt eigen gebruikers en woorden op.
//
//   LEARNING_TEST_DATABASE_URL=postgresql://... npm run test:time
import test, { after, before } from "node:test";
import assert from "node:assert/strict";

const url = process.env.LEARNING_TEST_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;
const skip = !url && "LEARNING_TEST_DATABASE_URL niet gezet";

const load = async () => ({
  db: (await import("../src/lib/db")).prisma,
  game: await import("../src/lib/wordGame"),
});
let L: Awaited<ReturnType<typeof load>>;
const users: Record<string, string> = {};
const DAY = "2031-03-04";
const NEXT = "2031-03-05";

before(async () => {
  if (skip) return;
  L = await load();
  for (const name of ["nl", "tokio", "ny"]) {
    const u = await L.db.user.create({
      data: { email: `woord-${name}-${Date.now()}@test.invalid`, passwordHash: "x", handle: `Woord${name}`, discriminator: String(1000 + Math.floor(Math.random() * 9000)) },
    });
    users[name] = u.id;
  }
  await L.db.dailyWord.deleteMany({ where: { dayKey: { in: [DAY, NEXT] } } });
});

after(async () => {
  if (skip) return;
  await L.db.user.deleteMany({ where: { id: { in: Object.values(users) } } });
  await L.db.dailyWord.deleteMany({ where: { dayKey: { in: [DAY, NEXT] } } });
  await L.db.$disconnect();
});

test("17:59 / 18:00 / 18:01 lokaal en hetzelfde woord in elke tijdzone", { skip }, async () => {
  const before = await L.game.getOrCreateTodayGame(users.nl, "Europe/Amsterdam", new Date("2031-03-04T16:59:00Z")); // NL 17:59
  assert.equal(before.dayKey, "2031-03-03");
  const nl = await L.game.getOrCreateTodayGame(users.nl, "Europe/Amsterdam", new Date("2031-03-04T17:00:00Z")); // NL 18:00
  assert.equal(nl.dayKey, DAY);
  assert.equal(nl.nextReleaseAt, "2031-03-05T17:00:00.000Z");
  const tokyo = await L.game.getOrCreateTodayGame(users.tokio, "Asia/Tokyo", new Date("2031-03-04T09:01:00Z")); // Tokio 18:01
  assert.equal(tokyo.dayKey, DAY);
  const ny = await L.game.getOrCreateTodayGame(users.ny, "America/New_York", new Date("2031-03-04T23:30:00Z")); // NY 18:30
  assert.equal(ny.dayKey, DAY);
  const words = await L.db.wordGame.findMany({ where: { dayKey: DAY }, select: { word: true, releasedAt: true, userId: true } });
  assert.equal(new Set(words.map((w) => w.word)).size, 1, "iedereen hetzelfde woord");
  assert.equal(words.find((w) => w.userId === users.tokio)!.releasedAt!.toISOString(), "2031-03-04T09:00:00.000Z");
  assert.equal(words.find((w) => w.userId === users.nl)!.releasedAt!.toISOString(), "2031-03-04T17:00:00.000Z");
  await L.db.wordGame.deleteMany({ where: { userId: users.nl, dayKey: "2031-03-03" } });
  await L.db.dailyWord.deleteMany({ where: { dayKey: "2031-03-03" } });
});

test("refresh, opnieuw inloggen en meerdere apparaten: hetzelfde potje", { skip }, async () => {
  const a = await L.game.getOrCreateTodayGame(users.nl, "Europe/Amsterdam", new Date("2031-03-04T18:10:00Z"));
  const b = await L.game.getOrCreateTodayGame(users.nl, "Europe/Amsterdam", new Date("2031-03-04T20:45:00Z"));
  assert.equal(a.dayKey, b.dayKey);
  assert.equal(await L.db.wordGame.count({ where: { userId: users.nl, dayKey: DAY } }), 1);
});

test("klassement: tijd na de eigen 18:00, niet het absolute tijdstip", { skip }, async () => {
  const word = (await L.db.dailyWord.findUniqueOrThrow({ where: { dayKey: DAY } })).word;
  // Tokio raadt om 19:30 lokaal (10:30Z, absoluut veel eerder) = 90 min na zijn 18:00.
  const tokyo = await L.game.submitGuess(users.tokio, word, "Asia/Tokyo", new Date("2031-03-04T10:30:00Z"));
  assert.ok(!("error" in tokyo));
  // Nederland raadt om 18:05 lokaal (17:05Z) = 5 min na zijn 18:00.
  const nl = await L.game.submitGuess(users.nl, word, "Europe/Amsterdam", new Date("2031-03-04T17:05:00Z"));
  assert.ok(!("error" in nl));
  if ("error" in nl) return;
  // Rang en bonus staan in de database (de view geeft ze niet mee).
  const ranks = await L.db.wordGame.findMany({ where: { dayKey: DAY, status: "WON" }, select: { userId: true, leaderboardRank: true } });
  assert.equal(ranks.find((r) => r.userId === users.tokio)!.leaderboardRank, 1); // bij zijn eigen afronding de enige
  assert.equal(ranks.find((r) => r.userId === users.nl)!.leaderboardRank, 1); // sneller na zijn 18:00, dus ook #1
  assert.deepEqual(
    nl.leaderboard.map((e) => [e.userId, e.minutesAfterRelease]),
    [[users.nl, 5], [users.tokio, 90]]
  );
});

test("toestelklok doet niets: de server bepaalt de woorddag", { skip }, async () => {
  // De API geeft getOrCreateTodayGame geen tijd van de client mee; met de
  // echte servertijd blijft de woorddag die van nu, hoe de toestelklok ook staat.
  const view = await L.game.getOrCreateTodayGame(users.ny, "America/New_York");
  assert.equal(view.dayKey, L.game.wordGameDayKey(new Date(), "America/New_York"));
  assert.ok(Math.abs(view.serverNow - Date.now()) < 5_000);
  await L.db.wordGame.deleteMany({ where: { userId: users.ny, dayKey: view.dayKey } });
});
