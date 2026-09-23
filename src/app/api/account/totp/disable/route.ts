import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { consumeRecoveryCode, decryptTotpSecret, verifyTotpCode } from "@/lib/totp";

const schema = z.object({ code: z.string().min(1) });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (user.isAdmin) {
    return NextResponse.json({ error: "2FA kan voor beheerders niet worden uitgeschakeld." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Vul je verificatiecode of herstelcode in." }, { status: 400 });

  const current = await prisma.user.findUnique({
    where: { id: user.id },
    select: { totpSecretEncrypted: true, totpRecoveryCodes: true, totpEnabled: true },
  });
  if (!current?.totpEnabled || !current.totpSecretEncrypted) {
    return NextResponse.json({ error: "2FA staat niet aan." }, { status: 400 });
  }

  const validTotp = verifyTotpCode(decryptTotpSecret(current.totpSecretEncrypted), parsed.data.code);
  if (validTotp) {
    await prisma.user.update({ where: { id: user.id }, data: { totpEnabled: false, totpSecretEncrypted: null, totpRecoveryCodes: null } });
    return NextResponse.json({ ok: true });
  }

  const remaining = await consumeRecoveryCode(current.totpRecoveryCodes, parsed.data.code);
  if (!remaining) return NextResponse.json({ error: "Code klopt niet." }, { status: 400 });

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecretEncrypted: null, totpRecoveryCodes: null },
  });
  return NextResponse.json({ ok: true });
}
