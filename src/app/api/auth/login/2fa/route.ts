import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions, verifyTwoFactorChallengeToken } from "@/lib/auth";
import {
  consumeRecoveryCode,
  decryptTotpSecret,
  TWO_FACTOR_MAX_FAILURES,
  TWO_FACTOR_WINDOW_MS,
  twoFactorFailureKey,
  verifyTotpCode,
} from "@/lib/totp";
import { clearFailures, failureLockSeconds, registerFailure, tooManyAttemptsMessage } from "@/lib/rateLimit";

const schema = z.object({ challengeToken: z.string().min(1), code: z.string().min(1) });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Vul je verificatiecode in." }, { status: 400 });

  const userId = await verifyTwoFactorChallengeToken(parsed.data.challengeToken);
  if (!userId) return NextResponse.json({ error: "Deze verificatie is verlopen. Log opnieuw in." }, { status: 401 });

  // Zonder deze grens kon je met één geldig wachtwoord onbeperkt 6-cijferige
  // codes proberen. Per account, omdat een nieuwe challenge (opnieuw
  // inloggen) de teller anders zou omzeilen.
  const failureKey = twoFactorFailureKey(userId);
  const lockSeconds = failureLockSeconds(failureKey, TWO_FACTOR_MAX_FAILURES);
  if (lockSeconds > 0) {
    return NextResponse.json({ error: tooManyAttemptsMessage(lockSeconds) }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, totpEnabled: true, totpSecretEncrypted: true, totpRecoveryCodes: true },
  });
  if (!user?.totpEnabled || !user.totpSecretEncrypted) {
    return NextResponse.json({ error: "2FA is niet beschikbaar voor dit account." }, { status: 400 });
  }

  const validTotp = verifyTotpCode(decryptTotpSecret(user.totpSecretEncrypted), parsed.data.code);
  let recoveryCodes = user.totpRecoveryCodes;
  if (!validTotp) {
    recoveryCodes = await consumeRecoveryCode(user.totpRecoveryCodes, parsed.data.code);
    if (!recoveryCodes) {
      registerFailure(failureKey, TWO_FACTOR_WINDOW_MS);
      return NextResponse.json({ error: "Code klopt niet." }, { status: 401 });
    }
    // Alleen bijwerken als de lijst sinds het lezen niet veranderd is, zodat
    // twee gelijktijdige verzoeken dezelfde herstelcode niet allebei kunnen
    // gebruiken.
    const consumed = await prisma.user.updateMany({
      where: { id: user.id, totpRecoveryCodes: user.totpRecoveryCodes },
      data: { totpRecoveryCodes: recoveryCodes },
    });
    if (consumed.count === 0) return NextResponse.json({ error: "Code klopt niet." }, { status: 401 });
  }

  clearFailures(failureKey);
  const token = await createSessionToken(user.id);
  const res = NextResponse.json({ ok: true, usedRecoveryCode: !validTotp });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
