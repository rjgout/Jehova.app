import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSessionToken, createTwoFactorChallengeToken, verifyPassword, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { parseTag } from "@/lib/handle";

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

  // Inloggen kan met e-mailadres, of met de volledige unieke tag
  // ("Handle#42") — de kale handle alleen is niet uniek genoeg.
  const tag = parseTag(identifier);
  const user = tag
    ? await prisma.user.findFirst({
        where: { handle: { equals: tag.handle, mode: "insensitive" }, discriminator: tag.discriminator },
      })
    : await prisma.user.findUnique({ where: { email: identifier.toLowerCase() } });

  const genericError = { error: "Onjuiste inloggegevens." };
  if (!user) {
    return NextResponse.json(genericError, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json(genericError, { status: 401 });
  }

  if (user.totpEnabled) {
    const challengeToken = await createTwoFactorChallengeToken(user.id);
    return NextResponse.json({ requiresTwoFactor: true, challengeToken });
  }

  const token = await createSessionToken(user.id);
  const res = NextResponse.json({ id: user.id, mustSetupTwoFactor: user.isAdmin });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
