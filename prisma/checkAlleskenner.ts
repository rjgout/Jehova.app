import bomContent from "./bomContent.json";
import kidsManifest from "./kidsManifest.json";
import { alleskennerItems } from "./alleskennerContent";
import { generatedAlleskennerItems } from "./alleskennerGenerated";
import { validateAlleskennerItem } from "../src/lib/alleskenner/validate";
import bomContentEn from "./bomContent.en.json";
import { alleskennerTranslations } from "./alleskennerTranslate";
import type { AlleskennerSeedItem, QuestionData } from "../src/lib/alleskenner/content";

// Controleert prisma/alleskennerContent.ts: vorm per soort, unieke ID's, en of
// elk citaat letterlijk in het opgegeven vers staat (zie docs/ALLESKENNER.md).
// Gebruik: npm run alleskenner:check — sluit af met code 1 bij fouten.

interface Book {
  name: string;
  chapters: { number: number; verses: string[] }[];
}

const books = bomContent as Book[];
const errors: string[] = [];

function verseText(ref: string): string | null {
  const match = /^(.+) (\d+):(\d+)$/.exec(ref);
  if (!match) return null;
  const book = books.find((b) => b.name === match[1]);
  return book?.chapters[Number(match[2]) - 1]?.verses[Number(match[3]) - 1] ?? null;
}

const kidsStories = kidsManifest as { number: number; title: string; images: string[] }[];

// Ook de automatisch samengestelde onderdelen: die komen uit dezelfde bronnen,
// maar een fout in de generator hoort hier net zo goed op te vallen.
const allItems = [...alleskennerItems, ...generatedAlleskennerItems()];

const seenIds = new Set<string>();
for (const item of allItems) {
  if (seenIds.has(item.id)) errors.push(`${item.id}: dubbele ID`);
  seenIds.add(item.id);
  errors.push(
    ...validateAlleskennerItem(item, {
      verseText,
      kidsStory: (number) => kidsStories.find((s) => s.number === number) ?? null,
    })
  );
}

// Vertalingen (zie alleskennerTranslate.ts): dezelfde controle tegen de
// uitgave van die taal, en bij meerkeuze het goede antwoord op dezelfde plek.
const editions: Record<string, Book[]> = { en: bomContentEn as Book[] };
const byId = new Map(allItems.map((item) => [item.id, item]));
const translations = alleskennerTranslations(allItems);
for (const translation of translations) {
  const original = byId.get(translation.itemId);
  const books = editions[translation.language];
  if (!original || !books) {
    errors.push(`${translation.itemId} (${translation.language}): geen origineel of uitgave`);
    continue;
  }
  const item = { id: translation.itemId, kind: original.kind, data: translation.data } as AlleskennerSeedItem;
  errors.push(
    ...validateAlleskennerItem(item, {
      verseText: (ref) => {
        const match = /^(.+) (\d+):(\d+)$/.exec(ref);
        if (!match) return null;
        const book = books.find((b) => b.name.replace(/\u00a0/g, " ") === match[1].replace(/\u00a0/g, " "));
        return book?.chapters[Number(match[2]) - 1]?.verses[Number(match[3]) - 1]?.replace(/\u00a0/g, " ") ?? null;
      },
      kidsStory: () => null,
    }).map((error) => `${translation.language}: ${error}`)
  );
  if (original.kind === "QUESTION") {
    const a = original.data as QuestionData;
    const b = translation.data as QuestionData;
    if (a.options.indexOf(a.answer) !== b.options.indexOf(b.answer) || a.options.length !== b.options.length) {
      errors.push(`${translation.itemId} (${translation.language}): opties niet in dezelfde volgorde`);
    }
  }
}

const counts = allItems.reduce<Record<string, number>>((acc, item) => {
  acc[item.kind] = (acc[item.kind] ?? 0) + 1;
  return acc;
}, {});

if (errors.length > 0) {
  console.error(`✗ ${errors.length} fout(en) in alleskennerContent.ts:`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`✓ Alleskenner-inhoud in orde: ${JSON.stringify(counts)}; vertalingen: ${translations.length}`);
