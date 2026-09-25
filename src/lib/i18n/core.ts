// Kern van het vertaalsysteem, zonder database- of Next-imports: bruikbaar
// in serverpagina's, in de eager-keten van server.ts (meldingen, e-mails) en
// in client-componenten (zie I18nProvider.tsx). Alleen het Nederlands wordt
// hier geïmporteerd, als bron en terugval; de andere talen komen via
// ./index.ts (server) of als prop van de layout (client).
import { nl } from "./messages/nl";

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Messages = Widen<typeof nl>;
export type PartialMessages = { [K in keyof Messages]?: DeepPartial<Messages[K]> };
type DeepPartial<T> = { [K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]> };

type Paths<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];
/** Elke geldige sleutel, bv. "nav.courses"; een tikfout geeft een compileerfout. */
export type MessageKey = Paths<Messages>;

export type Vars = Record<string, string | number>;
export type TFunction = (key: MessageKey, vars?: Vars) => string;

function lookup(messages: unknown, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (node === null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

// "{naam}" in de tekst wordt vervangen door vars.naam; onbekende namen
// blijven zichtbaar staan, zodat een fout in een vertaling opvalt.
function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

export function translateWith(messages: PartialMessages | undefined, key: MessageKey, vars?: Vars): string {
  const text = lookup(messages, key) ?? lookup(nl, key) ?? key;
  return interpolate(text, vars);
}

/**
 * Voor teksten waarvan de sleutel uit data komt (bv. een achievement-slug uit
 * de database): ontbreekt de vertaling helemaal, dan de meegegeven tekst in
 * plaats van de kale sleutel.
 */
export function translateOr(t: TFunction, key: string, fallback: string, vars?: Vars): string {
  const text = t(key as MessageKey, vars);
  return text === key ? fallback : text;
}
