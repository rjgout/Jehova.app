import { headers } from "next/headers";
import { DEFAULT_LANGUAGE, LANGUAGES, getLanguage, toLanguageCode, type LanguageCode } from "@/lib/languages";

// Gebruikt next/headers: alleen importeren vanuit page/layout/route-bestanden,
// nooit vanuit de eager-keten van server.ts (zie CLAUDE.md).

// Wie een taal van het apparaat heeft die (nog) niet af is, krijgt Engels:
// dat verstaan de meeste mensen beter dan Nederlands.
const FOREIGN_FALLBACK: LanguageCode = "en";

/**
 * Taal voor wie (nog) niet ingelogd is: de eerste taal uit de browser
 * (Accept-Language) waarvan de app-teksten af zijn (uiReady); vraagt de
 * browser alleen andere talen, dan Engels. Onafgemaakte talen tellen bewust
 * niet mee: een bezoeker krijgt geen half vertaalde app te zien. Zonder
 * taalvoorkeur (bv. een zoekmachine) blijft het Nederlands.
 */
export async function anonymousLanguage(): Promise<LanguageCode> {
  const accept = (await headers()).get("accept-language") ?? "";
  let anyLanguage = false;
  for (const part of accept.split(",")) {
    const code = part.split(";")[0].trim().slice(0, 2).toLowerCase();
    if (!/^[a-z]{2}$/.test(code)) continue;
    anyLanguage = true;
    const language = LANGUAGES.find((item) => item.code === code);
    if (language?.uiReady) return language.code;
  }
  return anyLanguage && getLanguage(FOREIGN_FALLBACK).uiReady ? FOREIGN_FALLBACK : DEFAULT_LANGUAGE;
}

/** Taal van de app voor dit verzoek: die van de gebruiker, of die van de browser. */
export async function requestLanguage(user: { uiLanguage: string } | null | undefined): Promise<LanguageCode> {
  return user ? toLanguageCode(user.uiLanguage) : anonymousLanguage();
}
