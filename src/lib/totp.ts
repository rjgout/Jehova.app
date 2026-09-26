import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";

const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;
export const TWO_FACTOR_MAX_FAILURES = 5;
export const TWO_FACTOR_WINDOW_MS = 15 * 60 * 1000;

export function twoFactorFailureKey(userId: string): string {
  return `2fa:${userId}`;
}

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function getEncryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET ontbreekt of is te kort.");
  }
  return createHash("sha256").update(secret).digest();
}


export function generateTotpSecret(): string {
  const bytes = randomBytes(20);
  let output = "";
  let buffer = 0;
  let bits = 0;

  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += BASE32_ALPHABET[(buffer >> bits) & 31];
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(buffer << (5 - bits)) & 31];
  return output;
}

function base32Decode(value: string): Buffer {
  const normalized = value.replace(/=+$/g, "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const char of normalized) {
    buffer = (buffer << 5) | BASE32_ALPHABET.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpCode(secret: string, timestamp = Date.now()): string {
  const counter = Math.floor(timestamp / 1000 / TOTP_PERIOD_SECONDS);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuffer.writeUInt32BE(counter >>> 0, 4);

  const digest = createHmac("sha1", base32Decode(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];
  return String(binary % 1_000_000).padStart(TOTP_DIGITS, "0");
}

export function verifyTotpCode(secret: string, code: string, timestamp = Date.now()): boolean {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;

  // Eén stap terug/vooruit vangt normale kleine klokafwijkingen op zonder
  // het geldige tijdvenster onnodig groot te maken. TOTP gebruikt standaard
  // tijdstappen van 30 seconden (RFC 6238).
  for (const offset of [-1, 0, 1]) {
    const expected = generateTotpCode(secret, timestamp + offset * TOTP_PERIOD_SECONDS * 1000);
    const a = Buffer.from(expected);
    const b = Buffer.from(normalized);
    if (timingSafeEqual(a, b)) return true;
  }
  return false;
}

export function encryptTotpSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptTotpSecret(value: string): string {
  const [ivText, tagText, encryptedText] = value.split(".");
  if (!ivText || !tagText || !encryptedText) throw new Error("Ongeldige opgeslagen TOTP-secret.");

  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function createOtpauthUri(secret: string, accountName: string): string {
  const issuer = "Versado.app";
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    const bytes = randomBytes(5);
    return bytes.toString("hex").toUpperCase().match(/.{1,5}/g)!.join("-");
  });
}

export async function hashRecoveryCodes(codes: string[]): Promise<string> {
  return JSON.stringify(await Promise.all(codes.map((code) => bcrypt.hash(code, 10))));
}

// Herstelcodes zijn 10 hex-tekens in de vorm "ABCDE-12345". Invoer zonder
// streepje of met spaties/kleine letters wordt eerst naar die vorm gebracht.
// Alles wat daarna geen herstelcode kan zijn (bv. een 6-cijferige TOTP-code)
// wordt meteen afgewezen, zonder 8 dure bcrypt-vergelijkingen.
function normalizeRecoveryCode(input: string): string | null {
  const compact = input.toUpperCase().replace(/[^0-9A-F]/g, "");
  if (compact.length !== 10) return null;
  return `${compact.slice(0, 5)}-${compact.slice(5)}`;
}

export async function consumeRecoveryCode(stored: string | null, input: string): Promise<string | null> {
  if (!stored) return null;
  const normalized = normalizeRecoveryCode(input);
  if (!normalized) return null;
  const hashes = JSON.parse(stored) as string[];
  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(normalized, hashes[i])) {
      hashes.splice(i, 1);
      return JSON.stringify(hashes);
    }
  }
  return null;
}
