import bomContent from "./bomContent.json";
import kidsManifest from "./kidsManifest.json";
import { alleskennerItems } from "./alleskennerContent";
import { normalizeAnswer, parsePassage, type Evidence } from "../src/lib/alleskenner/content";

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

function checkEvidence(itemId: string, evidence: Evidence) {
  const text = verseText(evidence.ref);
  if (!text) {
    errors.push(`${itemId}: vers "${evidence.ref}" bestaat niet`);
    return;
  }
  if (!normalizeAnswer(text).includes(normalizeAnswer(evidence.quote))) {
    errors.push(`${itemId}: citaat staat niet in ${evidence.ref}: "${evidence.quote}"`);
  }
}

function unique(values: string[]): boolean {
  return new Set(values.map(normalizeAnswer)).size === values.length;
}

const kidsStories = kidsManifest as { number: number; title: string; images: string[] }[];

const seenIds = new Set<string>();
for (const item of alleskennerItems) {
  if (seenIds.has(item.id)) errors.push(`${item.id}: dubbele ID`);
  seenIds.add(item.id);

  if (item.kind === "QUESTION") {
    const { options, answer, evidence, listen } = item.data;
    if (options.length !== 4) errors.push(`${item.id}: precies 4 opties nodig`);
    if (!options.includes(answer)) errors.push(`${item.id}: antwoord staat niet tussen de opties`);
    if (!unique(options)) errors.push(`${item.id}: dubbele opties`);
    if (evidence.length === 0) errors.push(`${item.id}: geen bronvers`);
    if (listen && !verseText(listen.ref)) errors.push(`${item.id}: luistervers "${listen.ref}" bestaat niet`);
    evidence.forEach((e) => checkEvidence(item.id, e));
  }

  if (item.kind === "TOPIC") {
    const { answers, distractors } = item.data;
    if (answers.length < 5) errors.push(`${item.id}: minstens 5 antwoorden nodig`);
    if (distractors.length < 6) errors.push(`${item.id}: minstens 6 foute opties nodig`);
    if (!unique([...answers.map((a) => a.text), ...distractors])) errors.push(`${item.id}: dubbele antwoorden/opties`);
    answers.forEach((a) => checkEvidence(item.id, a.evidence));
  }

  if (item.kind === "PUZZLE") {
    const { groups } = item.data;
    if (groups.length !== 3) errors.push(`${item.id}: precies 3 groepen nodig`);
    for (const group of groups) {
      if (group.clues.length !== 4) errors.push(`${item.id}/${group.answer}: precies 4 omschrijvingen nodig`);
      if (group.evidence.length === 0) errors.push(`${item.id}/${group.answer}: geen bronvers`);
      group.evidence.forEach((e) => checkEvidence(`${item.id}/${group.answer}`, e));
    }
    if (!unique(groups.flatMap((g) => g.clues))) errors.push(`${item.id}: dubbele omschrijvingen`);
  }

  if (item.kind === "GALLERY") {
    const data = item.data;
    if (data.variant === "QUOTES") {
      if (data.refs.length !== 8) errors.push(`${item.id}: precies 8 verzen nodig`);
      if (new Set(data.refs).size !== data.refs.length) errors.push(`${item.id}: dubbele verzen`);
      for (const ref of data.refs) if (!verseText(ref)) errors.push(`${item.id}: vers "${ref}" bestaat niet`);
    } else {
      if (data.stories.length !== 8) errors.push(`${item.id}: precies 8 illustraties nodig`);
      if (new Set(data.stories.map((s) => s.number)).size !== data.stories.length) errors.push(`${item.id}: dubbel verhaal`);
      for (const { number, image } of data.stories) {
        const story = kidsStories.find((s) => s.number === number);
        if (!story) errors.push(`${item.id}: kinderverhaal ${number} bestaat niet`);
        else if (!story.images[image]) errors.push(`${item.id}: verhaal ${number} heeft geen illustratie ${image}`);
      }
    }
  }

  if (item.kind === "MEMORY") {
    const { passage, answers, distractors } = item.data;
    const range = parsePassage(passage);
    if (!range || !verseText(`${range.book} ${range.chapter}:${range.from}`) || !verseText(`${range.book} ${range.chapter}:${range.to}`)) {
      errors.push(`${item.id}: passage "${passage}" bestaat niet`);
    }
    if (answers.length !== 5) errors.push(`${item.id}: precies 5 antwoorden nodig`);
    if (distractors.length < 6) errors.push(`${item.id}: minstens 6 foute opties nodig`);
    if (!unique([...answers.map((a) => a.text), ...distractors])) errors.push(`${item.id}: dubbele antwoorden/opties`);
    for (const answer of answers) {
      checkEvidence(item.id, answer.evidence);
      // Het antwoord moet te vinden zijn in wat de spelers net gelezen hebben.
      const ref = parsePassage(answer.evidence.ref);
      if (range && ref && (ref.book !== range.book || ref.chapter !== range.chapter || ref.from < range.from || ref.from > range.to)) {
        errors.push(`${item.id}: bron ${answer.evidence.ref} valt buiten de passage ${passage}`);
      }
    }
  }
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
