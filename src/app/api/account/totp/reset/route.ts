import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { formatTag } from "@/lib/handle";
import {
  consumeRecoveryCode,
  createOtpauthUri,
  encryptTotpSecret,
  generateTotpSecret,
  TWO_FACTOR_MAX_FAILURES,
  TWO_FACTOR_WINDOW_MS,
  twoFactorFailureKey,
} from "@/lib/totp";
import { clearFailures, failureLockSeconds, registerFailure, tooManyAttemptsMessage } from "@/lib/rateLimit";

const schema = z.object({ code: z.string().min(1) });

// "Authenticator opnieuw instellen" (bv. na een nieuwe telefoon): met een
// herstelcode wordt direct een nieuw secret gekoppeld, terwijl 2FA aan blijft.
// Voorheen zette deze route 2FA uit, waardoor ook een beheerder 2FA via deze
// weg kon uitschakelen. De nieuwe koppeling wordt pas bevestigd (en krijgt
// nieuwe herstelcodes) via /api/account/totp/verify; tot die tijd blijven de
// resterende oude herstelcodes geldig om in te loggen.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const failureKey = twoFactorFailureKey(user.id);
  const lockSeconds = failureLockSeconds(failureKey, TWO_FACTOR_MAX_FAILURES);
  if (lockSeconds > 0) {
    return NextResponse.json({ error: tooManyAttemptsMessage(lockSeconds) }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Vul een herstelcode in." }, { status: 400 });

  const current = await prisma.user.findUnique({
    where: { id: user.id },
    select: { totpEnabled: true, totpRecoveryCodes: true },
  });
  if (!current?.totpEnabled) return NextResponse.json({ error: "2FA staat niet aan." }, { status: 400 });

  const remaining = await consumeRecoveryCode(current.totpRecoveryCodes, parsed.data.code);
  if (!remaining) {
    registerFailure(failureKey, TWO_FACTOR_WINDOW_MS);
    return NextResponse.json({ error: "Herstelcode klopt niet." }, { status: 400 });
  }

  const secret = generateTotpSecret();
  const updated = await prisma.user.updateMany({
    where: { id: user.id, totpRecoveryCodes: current.totpRecoveryCodes },
    data: { totpSecretEncrypted: encryptTotpSecret(secret), totpRecoveryCodes: remaining },
  });
  if (updated.count === 0) return NextResponse.json({ error: "Herstelcode klopt niet." }, { status: 400 });
  clearFailures(failureKey);

  return NextResponse.json({
    secret,
    otpauthUri: createOtpauthUri(secret, formatTag(user.handle, user.discriminator)),
  });
}
