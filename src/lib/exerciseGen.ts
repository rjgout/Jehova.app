// Genereert oefeningen uit brontekst. Altijd keuze-gebaseerd (multiple choice
// / woorden aantikken) — nooit typen, zodat spelling nooit in de weg zit.
// Taalgebonden woordenlijsten per taal van de uitgave; zonder opgegeven taal
// Nederlands, zoals voorheen.
import type { LanguageCode } from "./languages";

interface WordLists {
  // Vaste noodgreep-distractoren voor als een hoofdstuk te weinig eigen
  // woorden heeft om als afleider te dienen (garandeert altijd genoeg opties).
  distractors: string[];
  // Korte, veelvoorkomende woorden die geen zinnige invulvraag opleveren.
  stopwords: Set<string>;
  // Bekende namen, in de spelling van die taal; gebruikt om een vals
  // statement te maken voor TRUE_FALSE-oefeningen (naam vervangen door een
  // andere naam uit deze lijst).
  names: string[];
}

const SHARED_NAMES = [
  "Nephi", "Laman", "Lemuel", "Sam", "Lehi", "Alma", "Zarahemla", "Laban", "Mosiah", "Benjamin", "Zeniff",
  "Abinadi", "Limhi", "Ammon", "Lamoni", "Korihor", "Moroni", "Helaman", "Pahoran", "Hagoth", "Samuel",
  "Mormon", "Ether", "Jared", "Sariah", "Enos", "Sherem", "Zerahemnah", "Shiblon", "Corianton", "Joseph",
];

const WORD_LISTS: Record<LanguageCode, WordLists> = {
  nl: {
    distractors: [
      "profeet", "verbond", "geloof", "wildernis", "koning", "priester",
      "gerechtigheid", "gehoorzaam", "gebed", "visioen", "zwaard", "tempel",
      "gebod", "getuigenis", "bekering", "openbaring",
    ],
    stopwords: new Set([
      "de", "het", "een", "en", "van", "ik", "dat", "is", "in", "zijn", "op", "te",
      "met", "hij", "zij", "er", "om", "aan", "voor", "niet", "die", "dit", "dan",
      "wat", "we", "wij", "jij", "u", "maar", "of", "als", "dus", "ook", "naar",
      "uit", "bij", "zo", "nog", "toen", "want", "tot", "over", "onder", "zal",
      "zult", "zou", "had", "heeft", "hebben", "was", "waren", "wordt",
    ]),
    // Exact de oorspronkelijke lijst en volgorde: de volgorde bepaalt welke
    // naam in een valse bewering komt, dus een andere volgorde zou bestaande
    // Nederlandse oefeningen bij een nieuwe import veranderen.
    names: [
      "Nephi", "Laman", "Lemuel", "Lemuël", "Sam", "Lehi", "Alma", "Zarahemla", "Jeruzalem", "Laban",
      "Mosiah", "Benjamin", "Zeniff", "Abinadi", "Noach", "Limhi", "Ammon", "Lamoni", "Aäron", "Korihor",
      "Moroni", "Helaman", "Pahoran", "Hagoth", "Samuel", "Samuël", "Mormon", "Ether", "Jared", "Sariah", "Jakob",
      "Enos", "Sherem", "Zerahemnah", "Shiblon", "Corianton", "Joseph",
    ],
  },
  en: {
    distractors: [
      "prophet", "covenant", "faith", "wilderness", "king", "priest",
      "righteousness", "obedient", "prayer", "vision", "sword", "temple",
      "commandment", "testimony", "repentance", "revelation",
    ],
    stopwords: new Set([
      "the", "and", "that", "this", "with", "from", "they", "them", "their", "there",
      "were", "have", "which", "unto", "shall", "will", "would", "also", "into", "upon",
      "because", "behold", "yea", "for", "not", "but", "his", "her", "him", "who",
      "what", "when", "then", "than", "been", "being", "had", "has", "was", "are",
      "did", "even", "all", "our", "your", "you", "thee", "thou", "thy", "hath",
      // "And it came to pass" en dergelijke: geen zinnige invulvraag.
      "came", "pass", "these", "those", "said", "forth", "therefore", "wherefore",
    ]),
    names: [...SHARED_NAMES, "Jerusalem", "Noah", "Aaron", "Jacob"],
  },
  de: {
    distractors: [
      "Prophet", "Bund", "Glaube", "Wildnis", "König", "Priester",
      "Rechtschaffenheit", "gehorsam", "Gebet", "Vision", "Schwert", "Tempel",
      "Gebot", "Zeugnis", "Umkehr", "Offenbarung",
    ],
    stopwords: new Set([
      "der", "die", "das", "und", "den", "dem", "des", "ein", "eine", "einen", "einem",
      "einer", "nicht", "sich", "auch", "auf", "aus", "mit", "von", "für", "sie", "ihr",
      "ihre", "ihn", "ihm", "sein", "seine", "seinen", "wir", "uns", "euch", "dass", "denn",
      "aber", "wenn", "als", "wie", "was", "wer", "hat", "hatte", "haben", "war", "waren",
      "wird", "werden", "wurde", "siehe", "doch", "noch", "nach", "über", "unter",
    ]),
    names: [...SHARED_NAMES, "Jerusalem", "Noa", "Aaron", "Jakob"],
  },
  fr: {
    distractors: [
      "prophète", "alliance", "foi", "désert", "roi", "prêtre",
      "justice", "obéissant", "prière", "vision", "épée", "temple",
      "commandement", "témoignage", "repentir", "révélation",
    ],
    stopwords: new Set([
      "le", "la", "les", "un", "une", "des", "du", "de", "et", "que", "qui", "dans",
      "pour", "par", "sur", "avec", "pas", "plus", "ils", "elles", "leur", "leurs",
      "nous", "vous", "son", "sa", "ses", "mon", "ma", "mes", "ce", "cet", "cette",
      "ces", "car", "mais", "donc", "est", "sont", "était", "étaient", "avait", "avaient",
      "voici", "aussi", "comme", "quand", "alors", "tout", "tous",
    ]),
    names: [...SHARED_NAMES, "Jérusalem", "Noé", "Aaron", "Jacob"],
  },
};

function wordLists(language: LanguageCode = "nl"): WordLists {
  return WORD_LISTS[language] ?? WORD_LISTS.nl;
}

/** Stopwoorden van een taal, ook gebruikt door de hints (src/lib/exerciseHints.ts). */
export function stopwordsFor(language: LanguageCode): Set<string> {
  return wordLists(language).stopwords;
}

export interface GeneratedExercise {
  type: "FILL_BLANK" | "WORD_BANK" | "TRUE_FALSE";
  verseRef: string;
  prompt: string;
  answers: string[];
  wordBank?: string[];
  /** Keuzeopties voor FILL_BLANK (bevat het juiste antwoord, geschud). */
  options?: string[];
}

/** Deterministische shuffle (zelfde patroon als generateWordBank hieronder). */
export function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = (seed * 31 + i * 17) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Schudt de weergavevolgorde van handmatig geschreven `options`/`wordBank`
 * (introcursus, kinderverhalen, podcast, gezinsspel, live quiz) — die staan
 * in de database in de volgorde waarin de auteur ze getypt heeft, en dat was
 * in de praktijk vaak "het juiste antwoord eerst" (bij MULTIPLE_CHOICE/
 * FILL_BLANK) of zelfs "exact de goede volgorde" (bij WORD_BANK/SEQUENCE,
 * waar wordBank toevallig gelijk was aan answers) — dus altijd hierdoorheen
 * halen vóór het naar de client gaat, nooit de opslagvolgorde direct tonen.
 * Puur presentatie (geen seed nodig: het antwoord wordt op tekst
 * gecontroleerd, nooit op positie, zie isExerciseCorrect hieronder).
 */
export function shuffleForDisplay<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function cleanWord(raw: string): string {
  return raw.replace(/^[^a-zA-ZÀ-ÿ]+|[^a-zA-ZÀ-ÿ]+$/g, "");
}

function eligibleWords(text: string, language?: LanguageCode): { word: string; index: number }[] {
  const { stopwords } = wordLists(language);
  const tokens = text.split(/\s+/);
  const eligible: { word: string; index: number }[] = [];
  tokens.forEach((token, index) => {
    const clean = cleanWord(token);
    if (clean.length >= 4 && !stopwords.has(clean.toLowerCase())) {
      eligible.push({ word: clean, index });
    }
  });
  return eligible;
}

/** Verzamelt kandidaat-afleiders uit alle verzen van een hoofdstuk, voor generateFillBlank. */
export function buildDistractorPool(verseTexts: string[], language?: LanguageCode): string[] {
  const words = new Set<string>();
  for (const text of verseTexts) {
    for (const { word } of eligibleWords(text, language)) words.add(word);
  }
  return [...words];
}

/**
 * Kiest een woord uit de zin en vervangt het door een streepjeslijn. Levert
 * ook `options` op (het juiste woord + 3 afleiders) zodat de gebruiker kan
 * kiezen in plaats van typen — `distractorPool` zijn kandidaat-afleiders uit
 * de rest van het hoofdstuk, aangevuld met een vaste woordenlijst als dat er
 * te weinig zijn.
 */
export function generateFillBlank(
  verseText: string,
  verseRef: string,
  seed = 0,
  distractorPool: string[] = [],
  language?: LanguageCode
): GeneratedExercise | null {
  const candidates = eligibleWords(verseText, language);
  if (candidates.length === 0) return null;
  const pick = candidates[seed % candidates.length];
  const tokens = verseText.split(/\s+/);
  const target = tokens[pick.index];
  const answer = cleanWord(target);
  tokens[pick.index] = target.replace(answer, "____");

  const lowerAnswer = answer.toLowerCase();
  const distractorCandidates = Array.from(
    new Set([...distractorPool, ...wordLists(language).distractors].map(cleanWord).filter(Boolean))
  ).filter((w) => w.toLowerCase() !== lowerAnswer);
  const distractors = shuffleWithSeed(distractorCandidates, seed).slice(0, 3);
  const options = shuffleWithSeed([answer, ...distractors], seed + 7);

  return {
    type: "FILL_BLANK",
    verseRef,
    prompt: tokens.join(" "),
    answers: [lowerAnswer],
    options,
  };
}

/** Haalt 3-4 opeenvolgende woorden weg; gebruiker moet ze in de juiste volgorde terugslepen. */
export function generateWordBank(verseText: string, verseRef: string, seed = 0): GeneratedExercise | null {
  const tokens = verseText.split(/\s+/).filter(Boolean);
  const spanLength = Math.min(4, Math.max(3, Math.floor(tokens.length / 4)));
  if (tokens.length < spanLength + 3) return null;

  const maxStart = tokens.length - spanLength;
  const start = 1 + (seed % Math.max(1, maxStart - 1));
  const span = tokens.slice(start, start + spanLength).map(cleanWord).filter(Boolean);
  if (span.length !== spanLength) return null;

  const before = tokens.slice(0, start).join(" ");
  const after = tokens.slice(start + spanLength).join(" ");
  const blankMarker = `[${span.map(() => "____").join(" ")}]`;
  const prompt = `${before} ${blankMarker} ${after}`.trim();

  const shuffled = shuffleWithSeed(span, seed);

  return {
    type: "WORD_BANK",
    verseRef,
    prompt,
    answers: span.map((w) => w.toLowerCase()),
    wordBank: shuffled,
  };
}

/**
 * Waar/niet-waar: bij een "vals" statement wordt een bekende naam in het
 * vers vervangen door een andere naam. Levert null op als het vers geen
 * bekende naam bevat om mee te wisselen.
 */
export function generateTrueFalse(verseText: string, verseRef: string, seed = 0, language?: LanguageCode): GeneratedExercise | null {
  const { names } = wordLists(language);
  const tokens = verseText.split(/\s+/);
  const nameIndex = tokens.findIndex((t) => names.includes(cleanWord(t)));
  if (nameIndex === -1) return null;

  const makeFalse = seed % 2 === 1;
  if (!makeFalse) {
    return { type: "TRUE_FALSE", verseRef, prompt: verseText, answers: ["true"] };
  }

  const original = cleanWord(tokens[nameIndex]);
  const alternatives = names.filter((n) => n !== original);
  const replacement = alternatives[seed % alternatives.length];
  const falseTokens = [...tokens];
  falseTokens[nameIndex] = falseTokens[nameIndex].replace(original, replacement);

  return { type: "TRUE_FALSE", verseRef, prompt: falseTokens.join(" "), answers: ["false"] };
}

export function normalizeAnswer(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:"'()]/g, "");
}

export function isAnswerCorrect(given: string, accepted: string[]): boolean {
  const normalizedGiven = normalizeAnswer(given);
  return accepted.some((a) => normalizeAnswer(a) === normalizedGiven);
}

/** Voor WORD_BANK (en SEQUENCE): de geplaatste items moeten in exact dezelfde volgorde staan. */
export function isWordBankCorrect(placedWords: string[], answers: string[]): boolean {
  if (placedWords.length !== answers.length) return false;
  return placedWords.every((w, i) => normalizeAnswer(w) === normalizeAnswer(answers[i]));
}

/** Eén centrale plek voor "is dit antwoord goed", per oefeningtype — gebruikt door
 * de check-route, de submit-route, het live-spel en de snelle-ronde-oefening. */
export function isExerciseCorrect(type: string, given: string[], accepted: string[]): boolean {
  return type === "WORD_BANK" || type === "SEQUENCE"
    ? isWordBankCorrect(given, accepted)
    : isAnswerCorrect(given[0] ?? "", accepted);
}
