// Integratietests voor de persoonlijke gids (User.companion, src/lib/companion.ts):
// standaard Novi, kiezen, weigeren en teruglezen. Draait alleen met
// LEARNING_TEST_DATABASE_URL.
//
//   LEARNING_TEST_DATABASE_URL=postgresql://... npm run test:companion
import test, { after, before } from "node:test";
import assert from "node:assert/strict";

const url = process.env.LEARNING_TEST_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;
process.env.SESSION_SECRET ??= "testsleutel-voor-gidstests-0123456789";
const skip = !url && "LEARNING_TEST_DATABASE_URL niet gezet";

const load = async () => ({
  db: (await import("../src/lib/db")).prisma,
  companion: await import("../src/lib/companion"),
  registration: await import("../src/lib/registration"),
});
let L: Awaited<ReturnType<typeof load>>;

const run = `${Date.now()}`;
const emails: string[] = [];
let seq = 0;

async function user(): Promise<string> {
  const email = `gids-${run}-${++seq}@test.invalid`;
  emails.push(email);
  const u = await L.db.user.create({ data: { email, passwordHash: "x", handle: "Gids", discriminator: String(10 + seq).slice(-2) } });
  return u.id;
}

before(async () => {
  if (skip) return;
  L = await load();
});
after(async () => {
  if (skip) return;
  await L.db.user.deleteMany({ where: { email: { in: emails } } });
  await L.db.$disconnect();
});

test("zonder keuze is de gids Novi", { skip }, async () => {
  const id = await user();
  assert.equal(await L.companion.getCompanion(id), "novi");
  assert.equal(L.companion.companionToMascot(null), "novi");
  assert.equal(L.companion.companionToMascot(undefined), "novi");
});

test("een nieuw account (registratie) begint ook met Novi", { skip }, async () => {
  const email = `gids-${run}-nieuw@test.invalid`;
  emails.push(email);
  const created = await L.registration.createAccount({ email, handle: "Nieuw", passwordHash: "x", uiLanguage: "nl", contentLanguage: "nl", emailVerifiedAt: null });
  assert.equal(created.companion, "NOVI");
  assert.equal(await L.companion.getCompanion(created.id), "novi");
});

test("Novi, Varo en Vera kiezen en teruglezen", { skip }, async () => {
  const id = await user();
  for (const choice of ["varo", "vera", "novi"] as const) {
    assert.equal(await L.companion.setCompanion(id, choice), choice);
    assert.equal(await L.companion.getCompanion(id), choice);
    const row = await L.db.user.findUnique({ where: { id }, select: { companion: true } });
    assert.equal(row?.companion, L.companion.mascotToCompanion(choice));
  }
});

test("een ongeldige gids wordt geweigerd en verandert niets", { skip }, async () => {
  const id = await user();
  await L.companion.setCompanion(id, "vera");
  for (const wrong of ["family", "NOVI", "Varo", "", null, undefined, 1, { character: "vera" }]) {
    assert.equal(await L.companion.setCompanion(id, wrong), null, `geweigerd: ${JSON.stringify(wrong)}`);
  }
  assert.equal(await L.companion.getCompanion(id), "vera");
});

test("de enum en de mascottes horen precies bij elkaar", { skip }, async () => {
  for (const c of ["novi", "varo", "vera"] as const) {
    assert.equal(L.companion.companionToMascot(L.companion.mascotToCompanion(c)), c);
  }
});
