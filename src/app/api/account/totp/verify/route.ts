import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { decryptTotpSecret, generateRecoveryCodes, hashRecoveryCodes, verifyTotpCode } from "@/lib/totp";
import { apiError } from "@/lib/apiError";

const schema = z.object({ code: z.string().min(1) });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return await apiError("apiErrors.enterSixDigits", 400);

  const current = await prisma.user.findUnique({ where: { id: user.id }, select: { totpSecretEncrypted: true } });
  if (!current?.totpSecretEncrypted) return await apiError("apiErrors.startTwoFactorSetupFirst", 400);

  const secret = decryptTotpSecret(current.totpSecretEncrypted);
  if (!verifyTotpCode(secret, parsed.data.code)) {
    return await apiError("apiErrors.verificationCodeWrong", 400);
  }

  const recoveryCodes = generateRecoveryCodes();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      totpEnabled: true,
      totpRecoveryCodes: await hashRecoveryCodes(recoveryCodes),
    },
  });

  return NextResponse.json({ ok: true, recoveryCodes });
}
