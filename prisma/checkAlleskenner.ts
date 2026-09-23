import bomContent from "./bomContent.json";
import kidsManifest from "./kidsManifest.json";
import { alleskennerItems } from "./alleskennerContent";
import { validateAlleskennerItem } from "../src/lib/alleskenner/validate";

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

const seenIds = new Set<string>();
for (const item of alleskennerItems) {
  if (seenIds.has(item.id)) errors.push(`${item.id}: dubbele ID`);
  seenIds.add(item.id);
  errors.push(
    ...validateAlleskennerItem(item, {
      verseText,
      kidsStory: (number) => kidsStories.find((s) => s.number === number) ?? null,
    })
  );
}

const counts = alleskennerItems.reduce<Record<string, number>>((acc, item) => {
  acc[item.kind] = (acc[item.kind] ?? 0) + 1;
  return acc;
}, {});

if (errors.length > 0) {
  console.error(`✗ ${errors.length} fout(en) in alleskennerContent.ts:`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`✓ Alleskenner-inhoud in orde: ${JSON.stringify(counts)}`);
