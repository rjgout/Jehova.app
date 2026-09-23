import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { createOtpauthUri, encryptTotpSecret, generateTotpSecret } from "@/lib/totp";
import { formatTag } from "@/lib/handle";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecretEncrypted: encryptTotpSecret(secret) },
  });

  return NextResponse.json({
    secret,
    otpauthUri: createOtpauthUri(secret, formatTag(user.handle, user.discriminator)),
  });
}
