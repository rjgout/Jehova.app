// De talen van de app. Bewust zonder database- of Next-imports: dit bestand
// wordt ook gebruikt in de eager-keten van server.ts (meldingen, e-mails) en
// in importscripts.
//
// Twee losse keuzes per gebruiker (User.uiLanguage en User.contentLanguage):
// - taal van de app: menu's, knoppen, meldingen en e-mails;
// - taal van de content: welke uitgave van een werk je leest en speelt.

export type LanguageCode = "nl" | "en" | "de" | "fr";

export interface Language {
  code: LanguageCode;
  /** Naam in de taal zelf, zodat iedereen de eigen taal herkent in een keuzelijst. */
  nativeName: string;
  /** Korte, altijd leesbare aanduiding naast een collectie of spel (geen vlag: een taal is geen land). */
  badge: string;
  /** Taalcode op de kerkwebsite (?lang=...), gebruikt door de importscripts. */
  churchCode: string;
  /** Voor datums en getallen (Intl). */
  intlLocale: string;
}

export const LANGUAGES: Language[] = [
  { code: "nl", nativeName: "Nederlands", badge: "NL", churchCode: "nld", intlLocale: "nl-NL" },
  { code: "en", nativeName: "English", badge: "EN", churchCode: "eng", intlLocale: "en-US" },
  { code: "de", nativeName: "Deutsch", badge: "DE", churchCode: "deu", intlLocale: "de-DE" },
  { code: "fr", nativeName: "Français", badge: "FR", churchCode: "fra", intlLocale: "fr-FR" },
];

export const DEFAULT_LANGUAGE: LanguageCode = "nl";

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === "string" && LANGUAGES.some((language) => language.code === value);
}

/** Onbekende of lege waarden (bv. uit de database) vallen terug op Nederlands. */
export function toLanguageCode(value: string | null | undefined): LanguageCode {
  return isLanguageCode(value) ? value : DEFAULT_LANGUAGE;
}

/**
 * In welke volgorde we terugvallen als iets in een taal ontbreekt (een
 * app-tekst of een uitgave): eerst de taal zelf, dan Engels (dat verstaan
 * Duits- en Franstaligen doorgaans beter dan Nederlands), en als laatste
 * Nederlands, de enige taal die altijd compleet is.
 */
export function fallbackChain(code: string | null | undefined): LanguageCode[] {
  const language = toLanguageCode(code);
  // Nederlands is compleet: nooit terugvallen op Engels.
  if (language === DEFAULT_LANGUAGE) return [DEFAULT_LANGUAGE];
  const chain: LanguageCode[] = [language, "en", DEFAULT_LANGUAGE];
  return chain.filter((item, index) => chain.indexOf(item) === index);
}

export function getLanguage(code: string | null | undefined): Language {
  const resolved = toLanguageCode(code);
  return LANGUAGES.find((language) => language.code === resolved)!;
}
