import { nl } from "./messages/nl";
import type { MessageKey, TFunction } from "./core";

// Teksten die in gedeelde servercode (src/lib, de socketserver) als
// Nederlandse zin worden gemaakt, bv. { ok: false, error: "Spel niet
// gevonden." }. Die code blijft Nederlands; wie zo'n tekst aan een gebruiker
// doorgeeft, vertaalt hem met translateServerText. De Nederlandse bron staat
// in nl.serverTexts, zodat het Nederlands per definitie gelijk blijft.
// {naam} in de bron matcht elke waarde en gaat mee naar de vertaling.
// Zo'n waarde kan zelf weer een servertekst zijn (bv. "Fout" in "{note} —
// niemand wist het", of een teamnaam), dus die wordt ook vertaald — behalve
// waarden die letterlijk moeten blijven (antwoorden, getallen, woorden).
// Specifieke zinnen staan in nl.serverTexts vóór algemenere met dezelfde vorm.

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

const LITERAL = new Set(["n", "cost", "word", "guess", "subject", "answer", "names", "x"]);

function translateVar(name: string, value: string, t: TFunction): string {
  if (LITERAL.has(name)) return value;
  // Opsomming als "3, 6 en 9": alleen het laatste voegwoord is taal.
  if (name === "list") return value.replace(/ en (?=\S+$)/, ` ${t("akGame.listAnd")} `);
  return translateServerText(value, t);
}

/** Vertaalt een bekende Nederlandse servertekst; onbekende tekst komt ongewijzigd terug. */
export function translateServerText(text: string, t: TFunction): string {
  for (const pattern of patterns) {
    const match = pattern.regex.exec(text);
    if (!match) continue;
    const vars = Object.fromEntries(pattern.names.map((name, index) => [name, translateVar(name, match[index + 1], t)]));
    return t(pattern.key, vars);
  }
  return text;
}
