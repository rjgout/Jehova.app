// Vertalen op de server: serverpagina's, API-routes, meldingen en e-mails.
// Veilig in de eager-keten van server.ts (geen Next- of database-imports).
// Client-componenten gebruiken useT() uit src/components/I18nProvider.tsx.
import { toLanguageCode, type LanguageCode } from "@/lib/languages";
import { translateWith, type MessageKey, type PartialMessages, type TFunction, type Vars } from "./core";
import { nl } from "./messages/nl";
import { en } from "./messages/en";
import { de } from "./messages/de";
import { fr } from "./messages/fr";

export type { MessageKey, TFunction, Vars } from "./core";

const MESSAGES: Record<LanguageCode, PartialMessages> = { nl, en, de, fr };

/** De teksten van één taal, bv. om als prop aan de I18nProvider mee te geven. */
export function messagesFor(language: string | null | undefined): PartialMessages {
  return MESSAGES[toLanguageCode(language)];
}

export function t(language: string | null | undefined, key: MessageKey, vars?: Vars): string {
  return translateWith(messagesFor(language), key, vars);
}

/** t-functie voor één taal, bv. `const t = getT(user.uiLanguage)`. */
export function getT(language: string | null | undefined): TFunction {
  const messages = messagesFor(language);
  return (key, vars) => translateWith(messages, key, vars);
}
