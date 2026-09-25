import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  consumeRecoveryCode,
  decryptTotpSecret,
  TWO_FACTOR_MAX_FAILURES,
  TWO_FACTOR_WINDOW_MS,
  twoFactorFailureKey,
  verifyTotpCode,
} from "@/lib/totp";
import { failureLockSeconds, registerFailure, tooManyAttempts } from "@/lib/rateLimit";
import { apiError } from "@/lib/apiError";

const schema = z.object({ code: z.string().min(1) });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  if (user.isAdmin) {
    return await apiError("apiErrors.twoFactorAdminRequired", 403);
  }

  const failureKey = twoFactorFailureKey(user.id);
  const lockSeconds = failureLockSeconds(failureKey, TWO_FACTOR_MAX_FAILURES);
  if (lockSeconds > 0) {
    const [key, vars] = tooManyAttempts(lockSeconds);
    return await apiError(key, 429, vars);
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return await apiError("apiErrors.enterVerificationOrRecovery", 400);

  const current = await prisma.user.findUnique({
    where: { id: user.id },
    select: { totpSecretEncrypted: true, totpRecoveryCodes: true, totpEnabled: true },
  });
  if (!current?.totpEnabled || !current.totpSecretEncrypted) {
    return await apiError("apiErrors.twoFactorNotOn", 400);
  }

  const validTotp = verifyTotpCode(decryptTotpSecret(current.totpSecretEncrypted), parsed.data.code);
  if (validTotp) {
    await prisma.user.update({ where: { id: user.id }, data: { totpEnabled: false, totpSecretEncrypted: null, totpRecoveryCodes: null } });
    return NextResponse.json({ ok: true });
  }

  const remaining = await consumeRecoveryCode(current.totpRecoveryCodes, parsed.data.code);
  if (!remaining) {
    registerFailure(failureKey, TWO_FACTOR_WINDOW_MS);
    return await apiError("apiErrors.codeWrong", 400);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecretEncrypted: null, totpRecoveryCodes: null },
  });
  return NextResponse.json({ ok: true });
}
