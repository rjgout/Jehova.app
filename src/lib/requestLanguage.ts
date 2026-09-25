import { headers } from "next/headers";
import { DEFAULT_LANGUAGE, LANGUAGES, toLanguageCode, type LanguageCode } from "@/lib/languages";

// Gebruikt next/headers: alleen importeren vanuit page/layout/route-bestanden,
// nooit vanuit de eager-keten van server.ts (zie CLAUDE.md).

/**
 * Taal voor wie (nog) niet ingelogd is: de eerste taal uit de browser
 * (Accept-Language) waarvan de app-teksten af zijn (uiReady), anders
 * Nederlands. Onafgemaakte talen tellen bewust niet mee: een bezoeker krijgt
 * geen half vertaalde app te zien.
 */
export async function anonymousLanguage(): Promise<LanguageCode> {
  const accept = (await headers()).get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const code = part.split(";")[0].trim().slice(0, 2).toLowerCase();
    const language = LANGUAGES.find((item) => item.code === code);
    if (language?.uiReady) return language.code;
  }
  return DEFAULT_LANGUAGE;
}

/** Taal van de app voor dit verzoek: die van de gebruiker, of die van de browser. */
export async function requestLanguage(user: { uiLanguage: string } | null | undefined): Promise<LanguageCode> {
  return user ? toLanguageCode(user.uiLanguage) : anonymousLanguage();
}
