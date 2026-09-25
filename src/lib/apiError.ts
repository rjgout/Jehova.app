import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { requestLanguage } from "@/lib/requestLanguage";
import { getT } from "@/lib/i18n";
import type { MessageKey, Vars } from "@/lib/i18n/core";
import { translateServerText } from "@/lib/i18n/serverTexts";

// Alleen voor route handlers (gebruikt next/headers via session.ts en
// requestLanguage.ts): nooit importeren vanuit de eager-keten van server.ts.

/**
 * Foutantwoord van een API-route in de taal van de gebruiker (of, zonder
 * inlog, van de browser). Zoekt de gebruiker zelf op: een extra query, maar
 * alleen op het foutpad, en de aanroepende route hoeft niets door te geven.
 */
export async function apiError(key: MessageKey, status: number, vars?: Vars): Promise<NextResponse> {
  const user = await getCurrentUser().catch(() => null);
  const t = getT(await requestLanguage(user));
  return NextResponse.json({ error: t(key, vars) }, { status });
}

/**
 * Zoals apiError, maar voor een Nederlandse tekst uit gedeelde servercode
 * (result.error, een Error-melding, een zod-melding): vertaald via
 * nl.serverTexts, of ongewijzigd als die tekst daar (nog) niet in staat.
 */
export async function apiErrorText(text: string | null | undefined, status: number): Promise<NextResponse> {
  if (!text) return NextResponse.json({ error: text ?? undefined }, { status });
  const user = await getCurrentUser().catch(() => null);
  const t = getT(await requestLanguage(user));
  return NextResponse.json({ error: translateServerText(text, t) }, { status });
}
