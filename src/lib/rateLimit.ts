import type { NextRequest } from "next/server";

// Eenvoudige in-memory teller voor mislukte pogingen. Genoeg voor deze app:
// er draait één app-instantie (zie README), en na een herstart beginnen de
// tellers opnieuw, wat voor een beperking per kwartier geen probleem is.
// Op globalThis zodat alle routebundels dezelfde Map delen.
interface Bucket {
  count: number;
  resetAt: number;
}

const globalForRateLimit = globalThis as unknown as { __jehovaFailureBuckets?: Map<string, Bucket> };
const buckets = globalForRateLimit.__jehovaFailureBuckets ?? new Map<string, Bucket>();
globalForRateLimit.__jehovaFailureBuckets = buckets;

function prune(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** Aantal seconden tot een nieuwe poging mag, of 0 als dat nu al mag. */
export function failureLockSeconds(key: string, maxFailures: number): number {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) return 0;
  return bucket.count >= maxFailures ? Math.ceil((bucket.resetAt - now) / 1000) : 0;
}

export function registerFailure(key: string, windowMs: number): void {
  const now = Date.now();
  prune(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
  } else {
    bucket.count++;
  }
}

export function clearFailures(key: string): void {
  buckets.delete(key);
}

// X-Real-IP zet onze eigen nginx (deploy/nginx/nginx.conf) op het echte
// remote-adres; X-Forwarded-For alleen als terugval.
export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "onbekend"
  );
}

export function tooManyAttemptsMessage(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `Te veel mislukte pogingen. Probeer het over ${minutes} ${minutes === 1 ? "minuut" : "minuten"} opnieuw.`;
}
