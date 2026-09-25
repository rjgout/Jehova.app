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
import { clearFailures, failureLockSeconds, registerFailure, tooManyAttempts } from "@/lib/rateLimit";
import { apiError } from "@/lib/apiError";

const schema = z.object({ challengeToken: z.string().min(1), code: z.string().min(1) });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return await apiError("apiErrors.enterVerificationCode", 400);

  const userId = await verifyTwoFactorChallengeToken(parsed.data.challengeToken);
  if (!userId) return await apiError("apiErrors.verificationExpired", 401);

  // Zonder deze grens kon je met één geldig wachtwoord onbeperkt 6-cijferige
  // codes proberen. Per account, omdat een nieuwe challenge (opnieuw
  // inloggen) de teller anders zou omzeilen.
  const failureKey = twoFactorFailureKey(userId);
  const lockSeconds = failureLockSeconds(failureKey, TWO_FACTOR_MAX_FAILURES);
  if (lockSeconds > 0) {
    const [key, vars] = tooManyAttempts(lockSeconds);
    return await apiError(key, 429, vars);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, totpEnabled: true, totpSecretEncrypted: true, totpRecoveryCodes: true },
  });
  if (!user?.totpEnabled || !user.totpSecretEncrypted) {
    return await apiError("apiErrors.twoFactorUnavailable", 400);
  }

  const validTotp = verifyTotpCode(decryptTotpSecret(user.totpSecretEncrypted), parsed.data.code);
  let recoveryCodes = user.totpRecoveryCodes;
  if (!validTotp) {
    recoveryCodes = await consumeRecoveryCode(user.totpRecoveryCodes, parsed.data.code);
    if (!recoveryCodes) {
      registerFailure(failureKey, TWO_FACTOR_WINDOW_MS);
      return await apiError("apiErrors.codeWrong", 401);
    }
    // Alleen bijwerken als de lijst sinds het lezen niet veranderd is, zodat
    // twee gelijktijdige verzoeken dezelfde herstelcode niet allebei kunnen
    // gebruiken.
    const consumed = await prisma.user.updateMany({
      where: { id: user.id, totpRecoveryCodes: user.totpRecoveryCodes },
      data: { totpRecoveryCodes: recoveryCodes },
    });
    if (consumed.count === 0) return await apiError("apiErrors.codeWrong", 401);
  }

  clearFailures(failureKey);
  const token = await createSessionToken(user.id);
  const res = NextResponse.json({ ok: true, usedRecoveryCode: !validTotp });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
