import type { NextResponse } from "next/server";
import { apiError } from "@/lib/apiError";
import { SocialError } from "@/lib/social/common";

// Alleen voor route handlers (apiError gebruikt next/headers): nooit
// importeren vanuit de eager-keten van server.ts.

/** Een verwachte weigering (SocialError) vertaald als antwoord; al het andere gooit door. */
export async function socialError(error: unknown): Promise<NextResponse> {
  if (error instanceof SocialError) return apiError(error.key, error.status, error.vars);
  throw error;
}
