import { nl } from "./messages/nl";
import type { MessageKey, TFunction } from "./core";

// Teksten die in gedeelde servercode (src/lib, de socketserver) als
// Nederlandse zin worden gemaakt, bv. { ok: false, error: "Spel niet
// gevonden." }. Die code blijft Nederlands; wie zo'n tekst aan een gebruiker
// doorgeeft, vertaalt hem met translateServerText. De Nederlandse bron staat
// in nl.serverTexts, zodat het Nederlands per definitie gelijk blijft.
// {naam} in de bron matcht elke waarde en gaat mee naar de vertaling.

interface Pattern {
  key: MessageKey;
  regex: RegExp;
  names: string[];
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const patterns: Pattern[] = Object.entries(nl.serverTexts).map(([name, source]) => {
  const names: string[] = [];
  const body = source
    .split(/(\{\w+\})/)
    .map((part) => {
      const placeholder = /^\{(\w+)\}$/.exec(part);
      if (!placeholder) return escape(part);
      names.push(placeholder[1]);
      return "(.+?)";
    })
    .join("");
  return { key: `serverTexts.${name}` as MessageKey, regex: new RegExp(`^${body}$`), names };
});

/** Vertaalt een bekende Nederlandse servertekst; onbekende tekst komt ongewijzigd terug. */
export function translateServerText(text: string, t: TFunction): string {
  for (const pattern of patterns) {
    const match = pattern.regex.exec(text);
    if (!match) continue;
    const vars = Object.fromEntries(pattern.names.map((name, index) => [name, match[index + 1]]));
    return t(pattern.key, vars);
  }
  return text;
}
