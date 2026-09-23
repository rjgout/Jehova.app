import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { decryptTotpSecret, generateRecoveryCodes, hashRecoveryCodes, verifyTotpCode } from "@/lib/totp";

const schema = z.object({ code: z.string().min(1) });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Vul de 6-cijferige code in." }, { status: 400 });

  const current = await prisma.user.findUnique({ where: { id: user.id }, select: { totpSecretEncrypted: true } });
  if (!current?.totpSecretEncrypted) return NextResponse.json({ error: "Start eerst de installatie van 2FA." }, { status: 400 });

  const secret = decryptTotpSecret(current.totpSecretEncrypted);
  if (!verifyTotpCode(secret, parsed.data.code)) {
    return NextResponse.json({ error: "De verificatiecode klopt niet." }, { status: 400 });
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
