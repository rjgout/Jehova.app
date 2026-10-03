import { createHash, randomBytes } from "crypto";
import type { AuthTokenType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 uur
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 uur

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function ttlFor(type: AuthTokenType): number {
  return type === "EMAIL_VERIFY" ? EMAIL_VERIFY_TTL_MS : PASSWORD_RESET_TTL_MS;
}

/** Maakt een nieuw token aan en geeft de RUWE waarde terug — die komt alleen in de e-maillink, nooit in de database. */
export async function createAuthToken(userId: string, type: AuthTokenType): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  await prisma.authToken.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + ttlFor(type)),
    },
  });
  return raw;
}

/** Verbruikt een token (eenmalig, mits nog geldig) en geeft de bijbehorende userId terug, of null. */
export async function consumeAuthToken(raw: string, type: AuthTokenType): Promise<string | null> {
  const tokenHash = hashToken(raw);
  const token = await prisma.authToken.findUnique({ where: { tokenHash } });
  if (!token || token.type !== type || token.usedAt || token.expiresAt < new Date()) {
    return null;
  }
  await prisma.authToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
  return token.userId;
}
