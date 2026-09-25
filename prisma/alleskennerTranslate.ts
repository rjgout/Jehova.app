import bomContent from "./bomContent.json";
import bomChapterHeadings from "./bomChapterHeadings.json";
import bomContentEn from "./bomContent.en.json";
import { alleskennerItemsEn } from "./alleskennerContent.en";
import { BOOK_KEYS_BY_SLUG } from "./bookKeys";
import type { SeedBook } from "./content";
import { containsWord, headingParts } from "./alleskennerGenerated";
import type { AlleskennerSeedItem, GalleryData, MemoryData, PuzzleData, QuestionData, TopicData } from "../src/lib/alleskenner/content";
import { parsePassage } from "../src/lib/alleskenner/content";
import { getT } from "../src/lib/i18n";
import type { LanguageCode } from "../src/lib/languages";

// Zet automatisch samengestelde Alleskenner-onderdelen (alleskennerGenerated.ts)
// om naar een andere uitgave van het Boek van Mormon. Elk onderdeel komt uit
// een bron met een vaste plek — een deel van een hoofdstukkop, een vers, een
// boek — en die plek bestaat in elke taal. Omzetten gaat dus via die plek,
// nooit via een vertaling van de Nederlandse tekst: het antwoord blijft per
// definitie kloppen. Past een plek in een taal niet (andere opdeling van de
// kop, naam komt niet precies één keer in het vers voor), dan krijgt dat
// onderdeel in die taal geen vertaling en speelt het daar niet mee.
//
// Meerkeuzeopties blijven in dezelfde volgorde als in het Nederlands, zodat
// spelers in verschillende talen op dezelfde vraag spelen.

interface NlBook {
  slug: string;
  name: string;
  chapters: { number: number; verses: string[] }[];
}

const nlBooks = bomContent as NlBook[];
const nlHeadings = bomChapterHeadings as [string, number, string][];

/** Onderdelen van een hoofdstukkop in een andere taal (zie headingParts voor het Nederlands). */
function editionHeadingParts(text: string): string[] {
  const withoutDate = text.replace(/\s*\[?(About|Between|Verses? \d|The verses|Ungefähr|Etwa|Vers(e)? \d|Environ|Vers(et)?s? \d)\b[\s\S]*$/, "");
  return withoutDate
    .split(/\s*[—–]\s*/)
    .map((part) => part.trim().replace(/[.;:]$/, "").trim())
    .filter((part) => part.length > 0);
}

/** Het woord waaraan je een boek herkent: "1 Nephi" -> "Nephi", "Words of Mormon" -> "Mormon". */
function editionBookWord(name: string): string {
  return name.replace(/^\d\s+/u, "").replace(/^(Words of|Worte Mormons|Paroles de) /, "").replace(/s$/, "");
}

const ORDINALS: Partial<Record<LanguageCode, Record<string, string>>> = {
  en: { "1": "First", "2": "Second", "3": "Third", "4": "Fourth" },
  de: { "1": "Erstes", "2": "Zweites", "3": "Drittes", "4": "Viertes" },
  fr: { "1": "Premier", "2": "Deuxième", "3": "Troisième", "4": "Quatrième" },
};

function editionBookAccept(name: string, language: LanguageCode): string[] {
  const match = /^(\d)\s+(.+)$/u.exec(name);
  if (!match) return [];
  const ordinal = ORDINALS[language]?.[match[1]];
  return [...(ordinal ? [`${ordinal} ${match[2]}`] : []), `${match[1]}. ${match[2]}`, `${match[2]} ${match[1]}`];
}

interface Edition {
  language: LanguageCode;
  t: ReturnType<typeof getT>;
  /** Nederlandse boeknaam -> naam in deze uitgave. */
  bookName: Map<string, string>;
  /** Nederlandse boeknaam -> boek in deze uitgave. */
  book: Map<string, SeedBook>;
  /** Nederlandse kopdeeltekst -> [boek (NL), hoofdstuk, index]. */
  partLocation: Map<string, [string, number, number]>;
  /** Kopdelen per "NL-boek|hoofdstuk" in deze uitgave. */
  parts: Map<string, string[]>;
  /** Kopdelen per "NL-boek|hoofdstuk" in het Nederlands. */
  nlParts: Map<string, string[]>;
}

function buildEdition(language: LanguageCode, books: SeedBook[]): Edition {
  const byKey = new Map(books.map((b) => [b.key, b]));
  const bookName = new Map<string, string>();
  const book = new Map<string, SeedBook>();
  for (const nl of nlBooks) {
    const edition = byKey.get(BOOK_KEYS_BY_SLUG[nl.slug]);
    if (!edition) continue;
    bookName.set(nl.name, edition.name);
    book.set(nl.name, edition);
  }
  const nlNameBySlug = new Map(nlBooks.map((b) => [b.slug, b.name]));
  const partLocation = new Map<string, [string, number, number]>();
  const nlParts = new Map<string, string[]>();
  for (const [slug, chapter, text] of nlHeadings) {
    const name = nlNameBySlug.get(slug) ?? slug;
    const list = headingParts(text);
    nlParts.set(`${name}|${chapter}`, list);
    list.forEach((part, index) => {
      if (!partLocation.has(part)) partLocation.set(part, [name, chapter, index]);
    });
  }
  const parts = new Map<string, string[]>();
  for (const [nlName, edition] of book) {
    for (const chapter of edition.chapters) {
      if (chapter.heading) parts.set(`${nlName}|${chapter.number}`, editionHeadingParts(chapter.heading));
    }
  }
  return { language, t: getT(language), bookName, book, partLocation, parts, nlParts };
}

/** Hetzelfde kopdeel in deze uitgave, of null als de kop daar anders is opgedeeld. */
function mapPart(edition: Edition, nlText: string): { text: string; book: string } | null {
  const location = edition.partLocation.get(nlText);
  if (!location) return null;
  const [nlBook, chapter, index] = location;
  const nl = edition.nlParts.get(`${nlBook}|${chapter}`);
  const own = edition.parts.get(`${nlBook}|${chapter}`);
  if (!nl || !own || nl.length !== own.length) return null;
  const bookName = edition.bookName.get(nlBook);
  if (!bookName) return null;
  const text = own[index];
  // Zoals bij het Nederlands: een kopdeel mag het boek niet verraden.
  if (containsWord(text, editionBookWord(bookName))) return null;
  return { text, book: bookName };
}

/** Versverwijzing en tekst in deze uitgave ("Alma 17:25" -> "Alma 17:25", "Jakob 2:3" -> "Jacob 2:3"). */
function mapVerse(edition: Edition, ref: string): { ref: string; text: string; book: string } | null {
  const parsed = parsePassage(ref);
  if (!parsed || parsed.from !== parsed.to) return null;
  const book = edition.book.get(parsed.book);
  const text = book?.chapters.find((c) => c.number === parsed.chapter)?.verses[parsed.from - 1];
  if (!book || !text) return null;
  return { ref: `${book.name} ${parsed.chapter}:${parsed.from}`, text, book: book.name };
}

function mapBookNames(edition: Edition, names: string[]): string[] | null {
  const mapped = names.map((n) => edition.bookName.get(n));
  return mapped.every(Boolean) ? (mapped as string[]) : null;
}

function nameOccurrences(text: string, name: string): number {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (text.match(new RegExp(`(^|[^\\p{L}])${escaped}(?=[^\\p{L}]|$)`, "gu")) ?? []).length;
}

function translateItem(edition: Edition, item: AlleskennerSeedItem): unknown | null {
  const { t } = edition;
  if (item.id.startsWith("gen-kop-")) {
    const data = item.data as QuestionData;
    const part = /“(.+)”/.exec(data.prompt)?.[1];
    const mapped = part ? mapPart(edition, part) : null;
    const options = mapBookNames(edition, data.options);
    const answer = edition.bookName.get(data.answer);
    if (!mapped || !options || !answer || mapped.text.length < 25 || mapped.text.length > 160) return null;
    return { ...data, prompt: t("akGen.headingQuestion", { part: mapped.text }), options, answer } satisfies QuestionData;
  }
  if (item.id.startsWith("gen-luister-")) {
    const data = item.data as QuestionData;
    const verse = data.listen ? mapVerse(edition, data.listen.ref) : null;
    const options = mapBookNames(edition, data.options);
    const answer = edition.bookName.get(data.answer);
    if (!verse || !options || !answer || containsWord(verse.text, editionBookWord(answer))) return null;
    return {
      ...data,
      prompt: t("akGen.listen"),
      options,
      answer,
      listen: { ref: verse.ref },
      evidence: [{ ref: verse.ref, quote: verse.text }],
    } satisfies QuestionData;
  }
  if (item.id.startsWith("gen-invul-")) {
    const data = item.data as QuestionData;
    const verse = data.evidence[0] ? mapVerse(edition, data.evidence[0].ref) : null;
    if (!verse) return null;
    // Namen worden niet vertaald: alleen als de naam in deze uitgave precies
    // één keer in het vers staat en geen van de andere opties erin voorkomt.
    if (nameOccurrences(verse.text, data.answer) !== 1) return null;
    if (data.options.some((o) => o !== data.answer && nameOccurrences(verse.text, o) > 0)) return null;
    const escaped = data.answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const blanked = verse.text.replace(new RegExp(`(^|[^\\p{L}])${escaped}(?=[^\\p{L}]|$)`, "u"), "$1_____");
    return {
      ...data,
      prompt: t("akGen.fillName", { verse: blanked, ref: verse.ref }),
      evidence: [{ ref: verse.ref, quote: verse.text }],
    } satisfies QuestionData;
  }
  if (item.id.startsWith("gen-puzzel-")) {
    const data = item.data as PuzzleData;
    const groups = [];
    for (const group of data.groups) {
      const answer = edition.bookName.get(group.answer);
      const clues = group.clues.map((c) => mapPart(edition, c));
      if (!answer || clues.some((c) => !c || c.book !== answer || c.text.length > 90)) return null;
      groups.push({ ...group, answer, accept: editionBookAccept(answer, edition.language), clues: clues.map((c) => c!.text) });
    }
    if (new Set(groups.flatMap((g) => g.clues)).size !== 12) return null;
    return { ...data, groups } satisfies PuzzleData;
  }
  if (item.id.startsWith("gen-onderwerp-")) {
    const data = item.data as TopicData;
    const book = /^het boek (.+)$/.exec(data.subject)?.[1];
    const bookName = book ? edition.bookName.get(book) : undefined;
    const answers = data.answers.map((a) => mapPart(edition, a.text));
    if (!bookName || answers.some((a) => !a || a.book !== bookName)) return null;
    const distractors = data.distractors
      .map((d) => mapPart(edition, d))
      .filter((d): d is { text: string; book: string } => d !== null && d.book !== bookName && !containsWord(d.text, editionBookWord(bookName)))
      .map((d) => d.text);
    if (distractors.length < 6) return null;
    return {
      ...data,
      subject: t("akGen.bookSubject", { book: bookName }),
      answers: answers.map((a) => ({ text: a!.text, accept: [] })),
      distractors,
    } satisfies TopicData;
  }
  if (item.id.startsWith("gen-geheugen-")) {
    const data = item.data as MemoryData;
    const match = /^(.+) (\d+)$/.exec(data.title);
    if (!match) return null;
    const key = `${match[1]}|${match[2]}`;
    const nl = edition.nlParts.get(key);
    const own = edition.parts.get(key);
    const bookName = edition.bookName.get(match[1]);
    if (!nl || !own || !bookName || nl.length !== own.length || own.some((p) => p.length > 160)) return null;
    const answers = data.answers.map((a) => own[nl.indexOf(a.text)]);
    const distractors = data.distractors.map((d) => mapPart(edition, d)?.text).filter((d): d is string => Boolean(d) && !own.includes(d!));
    if (answers.some((a) => !a) || distractors.length < 6) return null;
    return {
      ...data,
      title: `${bookName} ${match[2]}`,
      passage: t("akGen.headingLabel"),
      readText: own.join(" — "),
      answers: answers.map((text) => ({ text, accept: [] })),
      distractors,
    } satisfies MemoryData;
  }
  if (item.kind === "GALLERY") {
    const data = item.data as GalleryData;
    if (data.variant !== "QUOTES") return null;
    const refs = data.refs.map((r) => mapVerse(edition, r)?.ref);
    if (refs.some((r) => !r)) return null;
    return { variant: "QUOTES", refs: refs as string[] } satisfies GalleryData;
  }
  // Personen (nog geen vertaalde beschrijvingen) en plaatjes uit de oudere
  // Nederlandse kinderverhalen hebben geen vertaling.
  return null;
}

export interface AlleskennerTranslationSeed {
  itemId: string;
  language: LanguageCode;
  data: unknown;
}

/** Vertalingen van de automatisch samengestelde onderdelen voor deze uitgave. */
export function translateGeneratedItems(
  items: AlleskennerSeedItem[],
  language: LanguageCode,
  editionBooks: SeedBook[]
): AlleskennerTranslationSeed[] {
  const edition = buildEdition(language, editionBooks);
  const result: AlleskennerTranslationSeed[] = [];
  for (const item of items) {
    const data = translateItem(edition, item);
    if (data) result.push({ itemId: item.id, language, data });
  }
  return result;
}

// Uitgaven waarvoor vertalingen gemaakt worden, met de handgeschreven
// vertalingen per ID. Duits en Frans komen erbij zodra die uitgaven in de app
// staan (scripts/church-text/fetch_scripture.py).
const EDITIONS: [LanguageCode, SeedBook[], Record<string, unknown>][] = [["en", bomContentEn as SeedBook[], alleskennerItemsEn]];

let cache: AlleskennerTranslationSeed[] | null = null;

/** Alle vertalingen van Alleskenner-onderdelen (eenmaal berekend per proces). */
export function alleskennerTranslations(items: AlleskennerSeedItem[]): AlleskennerTranslationSeed[] {
  cache ??= EDITIONS.flatMap(([language, books, handwritten]) => [
    ...translateGeneratedItems(items, language, books),
    ...items.flatMap((item) => (item.id in handwritten ? [{ itemId: item.id, language, data: handwritten[item.id] }] : [])),
  ]);
  return cache;
}
