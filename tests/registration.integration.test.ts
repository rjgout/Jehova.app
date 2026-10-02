// Integratietests voor registreren met e-mailbevestiging: pas bij het
// klikken op de link bestaat er een account (src/lib/registration.ts), en
// het opruimen van oude aanmeldingen en onbevestigde accounts. Draait alleen
// met LEARNING_TEST_DATABASE_URL; mails gaan nergens heen (geen SMTP).
//
//   LEARNING_TEST_DATABASE_URL=postgresql://... npm run test:registration
import test, { after, before } from "node:test";
import assert from "node:assert/strict";

const url = process.env.LEARNING_TEST_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;
process.env.SESSION_SECRET ??= "testsleutel-voor-registratietests-0123456789";
const skip = !url && "LEARNING_TEST_DATABASE_URL niet gezet";

const load = async () => ({
  db: (await import("../src/lib/db")).prisma,
  reg: await import("../src/lib/registration"),
  tokens: await import("../src/lib/authTokens"),
});
let L: Awaited<ReturnType<typeof load>>;

const BASE = "https://test.invalid";
const DAY = 24 * 3_600_000;
const run = `${Date.now()}`;
let seq = 0;
const email = (name: string) => `reg-${name}-${run}-${++seq}@test.invalid`;
const input = (address: string, extra: Partial<{ handle: string; inviteCode: string; returnTo: string }> = {}) => ({
  email: address,
  handle: extra.handle ?? "Nieuw",
  passwordHash: "hash-1",
  uiLanguage: "nl",
  contentLanguage: "nl",
  inviteCode: extra.inviteCode ?? null,
  returnTo: extra.returnTo ?? null,
});

const emails: string[] = [];
async function cleanup(): Promise<void> {
  await L.db.pendingRegistration.deleteMany({ where: { email: { in: emails } } });
  await L.db.user.deleteMany({ where: { email: { in: emails } } });
}

before(async () => {
  if (skip) return;
  L = await load();
});
after(async () => {
  if (skip) return;
  await cleanup();
  await L.db.$disconnect();
});

async function start(address: string, extra: Parameters<typeof input>[1] = {}): Promise<string> {
  emails.push(address);
  const token = await L.reg.startPendingRegistration(input(address, extra), BASE);
  assert.ok(token, "binnen de mailgrens hoort er een link te komen");
  return token;
}

test("aanmelden maakt nog geen account; bevestigen wel, en logt dan in", { skip }, async () => {
  const address = email("basis");
  const token = await start(address, { handle: "Basis", returnTo: "/groups" });
  assert.equal(await L.db.user.count({ where: { email: address } }), 0);
  assert.equal(await L.db.pendingRegistration.count({ where: { email: address, confirmedAt: null } }), 1);

  const result = await L.reg.confirmPendingRegistration(token);
  assert.equal(result.status, "confirmed");
  assert.ok(result.status === "confirmed");
  assert.equal(result.user.email, address);
  assert.equal(result.user.handle, "Basis");
  assert.equal(result.user.passwordHash, "hash-1");
  assert.ok(result.user.emailVerifiedAt, "een bevestigd account is meteen bevestigd");
  assert.equal(result.returnTo, "/groups");

  const pending = await L.db.pendingRegistration.findUnique({ where: { email: address } });
  assert.ok(pending?.confirmedAt);
  assert.equal(pending?.passwordHash, "", "het wachtwoord-hash blijft niet dubbel bewaard");

  // Tweede klik (of een mailscanner die eerst klikte): geen tweede account.
  assert.equal((await L.reg.confirmPendingRegistration(token)).status, "already");
  assert.equal(await L.db.user.count({ where: { email: address } }), 1);
});

test("twee gelijktijdige klikken geven één account", { skip }, async () => {
  const address = email("tegelijk");
  const token = await start(address);
  const results = await Promise.all([L.reg.confirmPendingRegistration(token), L.reg.confirmPendingRegistration(token)]);
  assert.deepEqual(results.map((r) => r.status).sort(), ["already", "confirmed"]);
  assert.equal(await L.db.user.count({ where: { email: address } }), 1);
});

test("opnieuw aanmelden vervangt de oude aanmelding en link", { skip }, async () => {
  const address = email("opnieuw");
  const first = await start(address, { handle: "Eerste" });
  const second = await start(address, { handle: "Tweede" });
  assert.equal(await L.db.pendingRegistration.count({ where: { email: address } }), 1);
  assert.equal((await L.reg.confirmPendingRegistration(first)).status, "notPending");
  const result = await L.reg.confirmPendingRegistration(second);
  assert.ok(result.status === "confirmed");
  assert.equal(result.user.handle, "Tweede");
});

test("een verlopen link maakt geen account; een nieuwe link via inloggen wel", { skip }, async () => {
  const address = email("verlopen");
  const token = await start(address);
  await L.db.pendingRegistration.update({ where: { email: address }, data: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await L.reg.confirmPendingRegistration(token)).status, "expired");
  assert.equal(await L.db.user.count({ where: { email: address } }), 0);

  const pending = await L.reg.findOpenPendingRegistration(address);
  assert.ok(pending);
  const fresh = await L.reg.resendPendingVerification(pending, BASE);
  assert.ok(fresh);
  assert.equal((await L.reg.confirmPendingRegistration(token)).status, "notPending", "de oude link vervalt");
  assert.equal((await L.reg.confirmPendingRegistration(fresh)).status, "confirmed");
});

test("hooguit drie bevestigingsmails per adres per uur", { skip }, async () => {
  const address = email("grens");
  await start(address, { handle: "Een" });
  await start(address, { handle: "Twee" });
  const third = await start(address, { handle: "Drie" });
  assert.equal(await L.reg.startPendingRegistration(input(address, { handle: "Vier" }), BASE), null);
  const pending = await L.db.pendingRegistration.findUnique({ where: { email: address } });
  assert.equal(pending?.handle, "Drie", "boven de grens verandert de aanmelding niet");
  assert.equal(await L.reg.resendPendingVerification(pending!, BASE), null);
  assert.equal((await L.reg.confirmPendingRegistration(third)).status, "confirmed");
});

test("een uitnodiging wordt pas bij bevestigen een vriendschap", { skip }, async () => {
  const inviterEmail = email("uitnodiger");
  emails.push(inviterEmail);
  const code = `t${run}`.slice(-8);
  const inviter = await L.db.user.create({
    data: { email: inviterEmail, passwordHash: "x", handle: "Uitnodiger", discriminator: "97", inviteCode: code, emailVerifiedAt: new Date() },
  });
  const address = email("genodigde");
  const token = await start(address, { inviteCode: code });
  assert.equal(await L.db.friendship.count({ where: { OR: [{ senderId: inviter.id }, { receiverId: inviter.id }] } }), 0);

  const result = await L.reg.confirmPendingRegistration(token);
  assert.ok(result.status === "confirmed");
  const friendship = await L.db.friendship.findFirst({ where: { senderId: inviter.id, receiverId: result.user.id } });
  assert.equal(friendship?.status, "ACCEPTED");
  assert.equal((await L.db.user.findUnique({ where: { id: result.user.id } }))?.registeredViaInvite, true);
});

test("opruimen: oude aanmeldingen en inactieve onbevestigde accounts na 30 dagen", { skip }, async () => {
  const now = new Date();
  const old = new Date(now.getTime() - 31 * DAY);
  async function account(name: string, extra: { createdAt?: Date; xpTotal?: number; isAdmin?: boolean; token?: boolean; verified?: boolean } = {}) {
    const address = email(name);
    emails.push(address);
    const u = await L.db.user.create({
      data: {
        email: address,
        passwordHash: "x",
        handle: `Oud${name}`,
        discriminator: String(10 + seq).slice(-2),
        createdAt: extra.createdAt ?? old,
        xpTotal: extra.xpTotal ?? 0,
        isAdmin: extra.isAdmin ?? false,
        emailVerifiedAt: extra.verified ? old : null,
      },
    });
    if (extra.token !== false) await L.tokens.createAuthToken(u.id, "EMAIL_VERIFY");
    return u.id;
  }
  const stale = await account("weg");
  const active = await account("actief", { xpTotal: 25 });
  const young = await account("jong", { createdAt: new Date(now.getTime() - 29 * DAY) });
  const neverMailed = await account("zondermail", { token: false });
  const admin = await account("beheer", { isAdmin: true });
  const verified = await account("bevestigd", { verified: true });

  const oldPending = email("oudeaanmelding");
  await start(oldPending);
  await L.db.pendingRegistration.update({ where: { email: oldPending }, data: { expiresAt: new Date(now.getTime() - 8 * DAY) } });
  const recentPending = email("vers");
  await start(recentPending);

  const result = await L.reg.cleanupRegistrations(now);
  assert.ok(result.accounts >= 1);
  const left = new Set((await L.db.user.findMany({ where: { id: { in: [stale, active, young, neverMailed, admin, verified] } }, select: { id: true } })).map((u) => u.id));
  assert.equal(left.has(stale), false, "inactief, onbevestigd en ouder dan 30 dagen: weg");
  for (const kept of [active, young, neverMailed, admin, verified]) assert.ok(left.has(kept));
  assert.equal(await L.db.pendingRegistration.count({ where: { email: oldPending } }), 0);
  assert.equal(await L.db.pendingRegistration.count({ where: { email: recentPending } }), 1);
});
