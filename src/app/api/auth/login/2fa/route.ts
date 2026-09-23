import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions, verifyTwoFactorChallengeToken } from "@/lib/auth";
import { consumeRecoveryCode, decryptTotpSecret, verifyTotpCode } from "@/lib/totp";

const schema = z.object({ challengeToken: z.string().min(1), code: z.string().min(1) });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Vul je verificatiecode in." }, { status: 400 });

  const userId = await verifyTwoFactorChallengeToken(parsed.data.challengeToken);
  if (!userId) return NextResponse.json({ error: "Deze verificatie is verlopen. Log opnieuw in." }, { status: 401 });

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
    if (!recoveryCodes) return NextResponse.json({ error: "Code klopt niet." }, { status: 401 });
    await prisma.user.update({ where: { id: user.id }, data: { totpRecoveryCodes: recoveryCodes } });
  }

  const token = await createSessionToken(user.id);
  const res = NextResponse.json({ ok: true, usedRecoveryCode: !validTotp });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
