// Vertalen op de server: serverpagina's, API-routes, meldingen en e-mails.
// Veilig in de eager-keten van server.ts (geen Next- of database-imports).
// Client-componenten gebruiken useT() uit src/components/I18nProvider.tsx.
import { fallbackChain, type LanguageCode } from "@/lib/languages";
import { translateWith, type MessageKey, type PartialMessages, type TFunction, type Vars } from "./core";
import { nl } from "./messages/nl";
import { en } from "./messages/en";
import { de } from "./messages/de";
import { fr } from "./messages/fr";

export type { MessageKey, TFunction, Vars } from "./core";

const MESSAGES: Record<LanguageCode, PartialMessages> = { nl, en, de, fr };

function merge(base: unknown, over: unknown): unknown {
  if (!over || typeof over !== "object") return over ?? base;
  if (!base || typeof base !== "object") return over;
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(over)) result[key] = merge(result[key], value);
  return result;
}

// Per taal één keer samengevoegd langs fallbackChain (bv. Duits over Engels);
// het Nederlands als laatste terugval zit al in translateWith.
const MERGED = new Map<LanguageCode, PartialMessages>();

/** De teksten van één taal, aangevuld met de terugvaltalen; bv. als prop voor de I18nProvider. */
export function messagesFor(language: string | null | undefined): PartialMessages {
  const chain = fallbackChain(language).filter((code) => code !== "nl");
  const key = chain[0] ?? "nl";
  let merged = MERGED.get(key);
  if (!merged) {
    merged = chain.reduceRight<PartialMessages>((acc, code) => merge(acc, MESSAGES[code]) as PartialMessages, {});
    MERGED.set(key, merged);
  }
  return merged;
}

export function t(language: string | null | undefined, key: MessageKey, vars?: Vars): string {
  return translateWith(messagesFor(language), key, vars);
}

/** t-functie voor één taal, bv. `const t = getT(user.uiLanguage)`. */
export function getT(language: string | null | undefined): TFunction {
  const messages = messagesFor(language);
  return (key, vars) => translateWith(messages, key, vars);
}
