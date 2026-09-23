import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSessionToken, createTwoFactorChallengeToken, verifyPassword, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { parseTag } from "@/lib/handle";
import { clearFailures, clientIp, failureLockSeconds, registerFailure, tooManyAttemptsMessage } from "@/lib/rateLimit";

// Per IP+account een krappe grens tegen wachtwoord raden op één account,
// per IP een ruimere tegen het afgaan van veel accounts. Bewust niet alleen
// per account: dan kan een ander iemands inlog blokkeren.
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_ACCOUNT = 10;
const MAX_FAILURES_PER_IP = 30;

const schema = z.object({
  identifier: z.string().trim().min(1, "Vul je e-mailadres of gebruikersnaam in."),
  password: z.string().min(1, "Vul je wachtwoord in."),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { identifier, password } = parsed.data;

  const ip = clientIp(req);
  const accountKey = `login:${ip}:${identifier.toLowerCase()}`;
  const ipKey = `login-ip:${ip}`;
  const lockSeconds = Math.max(
    failureLockSeconds(accountKey, MAX_FAILURES_PER_ACCOUNT),
    failureLockSeconds(ipKey, MAX_FAILURES_PER_IP)
  );
  if (lockSeconds > 0) {
    return NextResponse.json({ error: tooManyAttemptsMessage(lockSeconds) }, { status: 429 });
  }
  const fail = () => {
    registerFailure(accountKey, LOGIN_WINDOW_MS);
    registerFailure(ipKey, LOGIN_WINDOW_MS);
    return NextResponse.json({ error: "Onjuiste inloggegevens." }, { status: 401 });
  };

  // Inloggen kan met e-mailadres, of met de volledige unieke tag
  // ("Handle#42") — de kale handle alleen is niet uniek genoeg.
  const tag = parseTag(identifier);
  const user = tag
    ? await prisma.user.findFirst({
        where: { handle: { equals: tag.handle, mode: "insensitive" }, discriminator: tag.discriminator },
      })
    : await prisma.user.findUnique({ where: { email: identifier.toLowerCase() } });

  if (!user) return fail();

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return fail();
  clearFailures(accountKey);

  if (user.totpEnabled) {
    const challengeToken = await createTwoFactorChallengeToken(user.id);
    return NextResponse.json({ requiresTwoFactor: true, challengeToken });
  }

  const token = await createSessionToken(user.id);
  const res = NextResponse.json({ id: user.id, mustSetupTwoFactor: user.isAdmin });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
