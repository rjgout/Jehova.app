import bomContent from "./bomContent.json";
import bomChapterHeadings from "./bomChapterHeadings.json";
import kidsManifest from "./kidsManifest.json";
import { introPersons } from "./introPersons";
import type { AlleskennerSeedItem, TopicAnswer } from "../src/lib/alleskenner/content";

// Automatisch samengestelde inhoud voor De Alleskenner, naast de
// handgeschreven onderdelen in alleskennerContent.ts. Alles komt rechtstreeks
// uit bestaande bronnen in de app — de verzen (bomContent.json), de officiële
// hoofdstukkoppen (bomChapterHeadings.json), de personen van de
// introductiecursus en de kinderplaatjes — zodat het antwoord per definitie
// klopt. De uitkomst is deterministisch (vaste zaadwaarde per onderdeel): elke
// run levert dezelfde onderdelen met dezelfde vaste ID's, zodat "al gezien"
// (AlleskennerSeen) en correcties in de beheeromgeving blijven werken.

interface Book {
  slug: string;
  name: string;
  chapters: { number: number; verses: string[] }[];
}

const books = bomContent as Book[];
const headings = bomChapterHeadings as [string, number, string][];
const kids = kidsManifest as { number: number; title: string; images: string[] }[];

const SOURCE_HEADINGS = "Officiële hoofdstukkoppen";
const SOURCE_PERSONS = "Personen uit de introductiecursus";
const SOURCE_TEXT = "Brontekst";

// --- Hulpfuncties ---------------------------------------------------------------

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Vaste pseudo-willekeur per sleutel, zodat elke run hetzelfde oplevert. */
function rng(key: string): () => number {
  let a = hash(key);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pick<T>(items: T[], count: number, random: () => number): T[] {
  return shuffled(items, random).slice(0, count);
}

const pad = (n: number) => String(n).padStart(3, "0");

/** Het woord waaraan je een boek herkent: "1 Nephi" -> "Nephi", "Woorden van Mormon" -> "Mormon". */
function bookWord(name: string): string {
  return name.replace(/^\d\s+/, "").replace(/^Woorden van /, "");
}

// De vier Nephi-boeken zijn één "familie": twee daarvan in dezelfde puzzel is
// eerder verwarrend dan leuk.
function bookFamily(name: string): string {
  return bookWord(name);
}

const ORDINALS: Record<string, string> = { "1": "eerste", "2": "tweede", "3": "derde", "4": "vierde" };

function bookAccept(name: string): string[] {
  const match = /^(\d) (.+)$/.exec(name);
  if (!match) return [];
  return [`${ORDINALS[match[1]]} ${match[2]}`, `${match[1]}e ${match[2]}`, `${match[2]} ${match[1]}`];
}

function containsWord(text: string, word: string): boolean {
  return new RegExp(`(^|[^\\p{L}])${word}([^\\p{L}]|$)`, "u").test(text);
}

/**
 * Onderdelen van een hoofdstukkop: de kop bestaat uit delen gescheiden door
 * " — ", met aan het eind een jaartal ("Ongeveer 76–74 v.C.", soms per vers).
 */
function headingParts(text: string): string[] {
  const withoutDate = text.replace(/\s+(Ongeveer|Vers(zen)? \d|De verzen)\b[\s\S]*$/, "");
  return withoutDate
    .split(/\s+—\s+/)
    .map((part) => part.trim().replace(/[.;:]$/, "").trim())
    .filter((part) => part.length > 0);
}

const bookNameBySlug = new Map(books.map((b) => [b.slug, b.name]));

interface HeadingPart {
  book: string;
  chapter: number;
  text: string;
}

const partsByChapter = headings.map(([slug, chapter, text]) => ({
  book: bookNameBySlug.get(slug) ?? slug,
  slug,
  chapter,
  parts: headingParts(text),
}));

// Losse kopdelen die zonder de boeknaam te herkennen zijn, voor puzzels en
// "wat weet je van het boek ..."-onderwerpen.
function usableParts(maxLength: number): HeadingPart[] {
  return partsByChapter.flatMap(({ book, chapter, parts }) =>
    parts
      .filter((text) => text.length >= 20 && text.length <= maxLength && !containsWord(text, bookWord(book)))
      .map((text) => ({ book, chapter, text }))
  );
}

function otherBooks(answer: string, count: number, random: () => number): string[] {
  return pick(
    books.map((b) => b.name).filter((name) => name !== answer),
    count,
    random
  );
}

// --- 3-6-9: wie wordt hier beschreven? --------------------------------------------

function baseName(name: string): string {
  return name.replace(/\s*\(.*\)\s*$/, "").trim();
}

function personQuestions(): AlleskennerSeedItem[] {
  const items: AlleskennerSeedItem[] = [];
  const allNames = [...new Set(introPersons.map((p) => baseName(p.name)))];
  for (const person of introPersons) {
    const name = baseName(person.name);
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const description = person.description.replace(new RegExp(`(^|[^\\p{L}])${escaped}(?=[^\\p{L}]|$)`, "gu"), "$1…");
    if (description.length < 50 || containsWord(description, name)) continue;
    const random = rng(`persoon-${person.slug}`);
    // Afleiders bij voorkeur van hetzelfde geslacht, anders is het te makkelijk.
    const sameGender = introPersons
      .filter((p) => p.gender === person.gender && baseName(p.name) !== name)
      .map((p) => baseName(p.name));
    const pool = [...new Set(sameGender.length >= 3 ? sameGender : allNames.filter((n) => n !== name))];
    const options = shuffled([name, ...pick(pool, 3, random)], random);
    items.push({
      id: `gen-persoon-${person.slug}`,
      kind: "QUESTION",
      data: { prompt: `Wie wordt hier beschreven? “${description}”`, options, answer: name, evidence: [], source: SOURCE_PERSONS },
    });
  }
  return items;
}

// --- 3-6-9: in welk boek staat dit hoofdstuk? --------------------------------------

function headingQuestions(): AlleskennerSeedItem[] {
  const items: AlleskennerSeedItem[] = [];
  for (const { book, slug, chapter, parts } of partsByChapter) {
    const candidates = parts
      .filter((p) => p.length >= 25 && p.length <= 140 && !containsWord(p, bookWord(book)))
      .sort((a, b) => b.length - a.length);
    if (candidates.length === 0) continue;
    const random = rng(`kop-${slug}-${chapter}`);
    items.push({
      id: `gen-kop-${slug}-${chapter}`,
      kind: "QUESTION",
      data: {
        prompt: `In welk boek staat het hoofdstuk over: “${candidates[0]}”?`,
        options: shuffled([book, ...otherBooks(book, 3, random)], random),
        answer: book,
        evidence: [],
        source: SOURCE_HEADINGS,
      },
    });
  }
  return items;
}

// --- 3-6-9: welke naam ontbreekt? ----------------------------------------------------

function fillNameQuestions(): AlleskennerSeedItem[] {
  const items: AlleskennerSeedItem[] = [];
  const names = [...new Set(introPersons.map((p) => baseName(p.name)))].filter((n) => n.length >= 4 && /^\p{Lu}/u.test(n));
  for (const book of books) {
    // Namen die in dit boek voorkomen: geloofwaardige afleiders.
    const bookText = book.chapters.flatMap((c) => c.verses).join(" ");
    const namesInBook = names.filter((n) => containsWord(bookText, n));
    book.chapters.forEach((chapter, ci) => {
      const random = rng(`invul-${book.slug}-${ci + 1}`);
      const verseIndexes = shuffled(
        chapter.verses.map((_, i) => i),
        random
      );
      for (const vi of verseIndexes) {
        const verse = chapter.verses[vi];
        if (verse.length < 60 || verse.length > 220) continue;
        const present = names.filter((n) => containsWord(verse, n));
        if (present.length === 0) continue;
        const answer = present[Math.floor(random() * present.length)];
        const occurrences = verse.match(new RegExp(`(^|[^\\p{L}])${answer}(?=[^\\p{L}]|$)`, "gu")) ?? [];
        if (occurrences.length !== 1) continue;
        const pool = namesInBook.filter((n) => n !== answer && !containsWord(verse, n));
        const distractors = pick(pool.length >= 3 ? pool : names.filter((n) => n !== answer && !containsWord(verse, n)), 3, random);
        const blanked = verse.replace(new RegExp(`(^|[^\\p{L}])${answer}(?=[^\\p{L}]|$)`, "u"), "$1_____");
        const ref = `${book.name} ${ci + 1}:${vi + 1}`;
        items.push({
          id: `gen-invul-${book.slug}-${ci + 1}`,
          kind: "QUESTION",
          data: {
            prompt: `Welke naam ontbreekt? “${blanked}” (${ref})`,
            options: shuffled([answer, ...distractors], random),
            answer,
            evidence: [{ ref, quote: verse }],
            source: SOURCE_TEXT,
          },
        });
        break;
      }
    });
  }
  return items;
}

// --- 3-6-9: luistervragen ----------------------------------------------------------

function listenQuestions(): AlleskennerSeedItem[] {
  const items: AlleskennerSeedItem[] = [];
  for (const book of books) {
    book.chapters.forEach((chapter, ci) => {
      // Om het andere hoofdstuk: genoeg luistervragen zonder dat ze de pot vullen.
      if (ci % 2 === 1 && book.chapters.length > 1) return;
      const random = rng(`luister-${book.slug}-${ci + 1}`);
      const candidates = chapter.verses
        .map((text, vi) => ({ text, vi }))
        .filter(({ text }) => text.length >= 60 && text.length <= 200 && !containsWord(text, bookWord(book.name)));
      if (candidates.length === 0) return;
      const { text, vi } = candidates[Math.floor(random() * candidates.length)];
      const ref = `${book.name} ${ci + 1}:${vi + 1}`;
      items.push({
        id: `gen-luister-${book.slug}-${ci + 1}`,
        kind: "QUESTION",
        data: {
          prompt: "Luister goed: uit welk boek komt het voorgelezen vers?",
          options: shuffled([book.name, ...otherBooks(book.name, 3, random)], random),
          answer: book.name,
          listen: { ref },
          evidence: [{ ref, quote: text }],
          source: SOURCE_TEXT,
        },
      });
    });
  }
  return items;
}

// --- Puzzel: drie boeken, elk vier kopdelen ------------------------------------------

function puzzles(count: number): AlleskennerSeedItem[] {
  const parts = usableParts(70);
  const byBook = new Map<string, HeadingPart[]>();
  for (const part of parts) byBook.set(part.book, [...(byBook.get(part.book) ?? []), part]);
  const eligible = [...byBook.entries()].filter(([, list]) => list.length >= 8).map(([book]) => book);
  const items: AlleskennerSeedItem[] = [];
  for (let n = 1; items.length < count && n < count * 3; n++) {
    const random = rng(`puzzel-${n}`);
    const chosen: string[] = [];
    for (const book of shuffled(eligible, random)) {
      if (chosen.some((c) => bookFamily(c) === bookFamily(book))) continue;
      chosen.push(book);
      if (chosen.length === 3) break;
    }
    if (chosen.length < 3) continue;
    const groups = chosen.map((book) => ({
      answer: book,
      accept: bookAccept(book),
      clues: pick(byBook.get(book)!, 4, random).map((p) => p.text),
      evidence: [],
    }));
    if (new Set(groups.flatMap((g) => g.clues)).size !== 12) continue;
    items.push({ id: `gen-puzzel-${pad(items.length + 1)}`, kind: "PUZZLE", data: { groups, source: SOURCE_HEADINGS } });
  }
  return items;
}

// --- Open Deur/Finale: wat weet je van het boek ...? ----------------------------------

function bookTopics(perBookMax: number): AlleskennerSeedItem[] {
  const parts = usableParts(80);
  const items: AlleskennerSeedItem[] = [];
  for (const book of books) {
    const own = parts.filter((p) => p.book === book.name);
    const others = parts.filter((p) => p.book !== book.name && !containsWord(p.text, bookWord(book.name)));
    const topicCount = Math.min(perBookMax, Math.floor(own.length / 5));
    for (let n = 1; n <= topicCount; n++) {
      const random = rng(`onderwerp-${book.slug}-${n}`);
      const answers: TopicAnswer[] = pick(own, 5, random).map((p) => ({ text: p.text, accept: [] }));
      const distractors = pick(others, 8, random).map((p) => p.text);
      items.push({
        id: `gen-onderwerp-${book.slug}-${n}`,
        kind: "TOPIC",
        data: { subject: `het boek ${book.name}`, answers, distractors, tapOnly: true, source: SOURCE_HEADINGS },
      });
    }
  }
  return items;
}

// --- Collectief Geheugen: een hoofdstukkop lezen en onthouden ----------------------

function headingMemories(): AlleskennerSeedItem[] {
  const items: AlleskennerSeedItem[] = [];
  for (const { book, slug, chapter, parts } of partsByChapter) {
    if (parts.length < 5 || parts.some((p) => p.length > 140)) continue;
    const random = rng(`geheugen-${slug}-${chapter}`);
    const answers = pick(parts, 5, random).map((text) => ({ text, accept: [] }));
    const others = partsByChapter
      .filter((c) => c.book === book && c.chapter !== chapter)
      .flatMap((c) => c.parts)
      .filter((p) => p.length <= 140 && !parts.includes(p));
    const pool = others.length >= 7 ? others : partsByChapter.filter((c) => c.chapter !== chapter || c.book !== book).flatMap((c) => c.parts);
    items.push({
      id: `gen-geheugen-${slug}-${chapter}`,
      kind: "MEMORY",
      data: {
        title: `${book} ${chapter}`,
        passage: "hoofdstukkop",
        readText: parts.join(" — "),
        answers,
        distractors: pick(pool, 7, random),
        source: SOURCE_HEADINGS,
      },
    });
  }
  return items;
}

// --- Galerij ---------------------------------------------------------------------

function quoteGalleries(count: number): AlleskennerSeedItem[] {
  const verses = books.flatMap((book) =>
    book.chapters.flatMap((chapter, ci) =>
      chapter.verses
        .map((text, vi) => ({ book: book.name, ref: `${book.name} ${ci + 1}:${vi + 1}`, text }))
        .filter((v) => v.text.length >= 50 && v.text.length <= 220 && !containsWord(v.text, bookWord(v.book)))
    )
  );
  const items: AlleskennerSeedItem[] = [];
  for (let n = 1; n <= count; n++) {
    const random = rng(`citaat-${n}`);
    const refs = pick(verses, 8, random).map((v) => v.ref);
    items.push({ id: `gen-galerij-citaat-${pad(n)}`, kind: "GALLERY", data: { variant: "QUOTES", refs } });
  }
  return items;
}

function imageGalleries(count: number): AlleskennerSeedItem[] {
  const items: AlleskennerSeedItem[] = [];
  for (let n = 1; n <= count; n++) {
    const random = rng(`plaat-${n}`);
    const stories = pick(
      kids.filter((s) => s.images.length > 0),
      8,
      random
    ).map((s) => ({ number: s.number, image: Math.floor(random() * s.images.length) }));
    items.push({ id: `gen-galerij-plaat-${pad(n)}`, kind: "GALLERY", data: { variant: "IMAGES", stories } });
  }
  return items;
}

let cache: AlleskennerSeedItem[] | null = null;

/** Alle automatisch samengestelde onderdelen (eenmaal berekend per proces). */
export function generatedAlleskennerItems(): AlleskennerSeedItem[] {
  cache ??= [
    ...personQuestions(),
    ...headingQuestions(),
    ...fillNameQuestions(),
    ...listenQuestions(),
    ...puzzles(120),
    ...bookTopics(8),
    ...headingMemories(),
    ...quoteGalleries(150),
    ...imageGalleries(60),
  ];
  return cache;
}
