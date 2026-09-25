// Telt per taal welke app-teksten nog ontbreken ten opzichte van het
// Nederlands (src/lib/i18n/messages/nl.ts), en welke sleutels een vertaling
// heeft die het Nederlands niet (meer) kent. Gebruik:
//   npx tsx scripts/i18n/check.ts        overzicht
//   npx tsx scripts/i18n/check.ts en     ook de ontbrekende sleutels van één taal
import { nl } from "../../src/lib/i18n/messages/nl";
import { en } from "../../src/lib/i18n/messages/en";
import { de } from "../../src/lib/i18n/messages/de";
import { fr } from "../../src/lib/i18n/messages/fr";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

function keys(node: unknown, prefix = ""): string[] {
  if (typeof node === "string") return [prefix];
  if (!node || typeof node !== "object") return [];
  return Object.entries(node).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

const source = new Set(keys(nl));
const only = process.argv[2];
for (const [code, messages] of Object.entries({ en, de, fr })) {
  const present = new Set(keys(messages));
  const missing = [...source].filter((key) => !present.has(key));
  const unknown = [...present].filter((key) => !source.has(key));
  console.log(`${code}: ${source.size - missing.length}/${source.size} vertaald${unknown.length ? `, ${unknown.length} onbekend` : ""}`);
  if (only === code) {
    for (const key of missing) console.log(`  ontbreekt: ${key}`);
    for (const key of unknown) console.log(`  onbekend:  ${key}`);
  }
}

// useT() is een client-hook: in een servercomponent (geen "use client"
// bovenaan) gaat dat pas bij het renderen mis, TypeScript ziet het niet.
// Servercomponenten gebruiken getT(user.uiLanguage).
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : path.endsWith(".tsx") ? [path] : [];
  });
}
const wrong = walk("src").filter((path) => {
  const text = readFileSync(path, "utf8");
  return /\buseT\(\)/.test(text) && !/^\s*["']use client["']/.test(text);
});
for (const path of wrong) console.log(`FOUT: useT() in servercomponent ${path}`);
if (wrong.length > 0) process.exitCode = 1;
