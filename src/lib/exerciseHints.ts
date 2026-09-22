import type { ExerciseType } from "@prisma/client";

const STOPWORDS = new Set([
  "de", "het", "een", "en", "van", "ik", "dat", "is", "in", "zijn", "op", "te",
  "met", "hij", "zij", "er", "om", "aan", "voor", "niet", "die", "dit", "dan",
  "wat", "we", "wij", "jij", "u", "maar", "of", "als", "dus", "ook", "naar",
  "uit", "bij", "zo", "nog", "toen", "want", "tot", "over", "onder", "zal",
  "zult", "zou", "had", "heeft", "hebben", "was", "waren", "wordt", "wel",
  "wie", "waar", "welke", "waarom", "hoe", "iets", "iemand", "hier", "daar",
]);

function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function contextAround(text: string, needle: string, radius = 5): string | null {
  const tokens = text.split(/\s+/).filter(Boolean);
  const index = tokens.findIndex((token) =>
    token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").toLowerCase() === needle.toLowerCase()
  );
  if (index < 0) return null;

  const start = Math.max(0, index - radius);
  const end = Math.min(tokens.length, index + radius + 1);
  const snippet = tokens.slice(start, end).map((token, i) => {
    const absolute = start + i;
    return absolute === index ? "…" : token;
  });
  return snippet.join(" ");
}

function usefulKeywords(prompt: string): string {
  const words = clean(prompt)
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !STOPWORDS.has(word.toLowerCase()))
    .slice(0, 4);

  return words.length > 0 ? words.join(", ") : "het concrete detail waar de vraag over gaat";
}

/**
 * Maakt een inhoudelijke denkhint uit de bestaande oefening en de bron waaruit
 * die oefening is opgebouwd. De hint geeft een richting of herkenningspunt,
 * maar zet het antwoord niet letterlijk in de tekst.
 */
export function generateExerciseHint(
  type: ExerciseType | string,
  prompt: string,
  answers: string[],
  verseRef: string,
  sourceText?: string | null
): string {
  const source = clean(sourceText ?? "");
  const answer = clean(answers[0] ?? "");

  if (type === "FILL_BLANK" && source && answer) {
    const context = contextAround(source, answer);
    if (context) {
      return `Lees ${verseRef} nog eens. Het ontbrekende woord staat letterlijk in dit vers. Let vooral op dit stukje: “${context}”.`;
    }
    return `Lees ${verseRef} nog eens rustig. Het ontbrekende woord staat letterlijk in het vers en past bij de woorden eromheen.`;
  }

  if ((type === "WORD_BANK" || type === "SEQUENCE") && source) {
    const missing = answers.map(clean).filter(Boolean);
    const first = missing[0];
    const context = first ? contextAround(source, first, 4) : null;
    if (context) {
      return `Kijk opnieuw naar ${verseRef}. De ontbrekende woorden vormen samen één aaneengesloten stukje van de tekst. Dit stukje herken je aan: “${context}”.`;
    }
    return `Lees ${verseRef} nog eens. De woorden die je zoekt staan samen als één aaneengesloten stukje in de tekst.`;
  }

  if (type === "TRUE_FALSE") {
    return `Controleer de bewering nog eens aan de hand van ${verseRef}. Let vooral op het concrete detail dat in de zin wordt genoemd.`;
  }

  if (type === "MULTIPLE_CHOICE") {
    return `Zoek het antwoord in ${verseRef}. Let vooral op wat de tekst zegt over ${usefulKeywords(prompt)}.`;
  }

  if (type === "IMAGE_CHOICE") {
    return `Denk terug aan ${verseRef} en let op het belangrijkste herkenningspunt uit de vraag.`;
  }

  return `Lees ${verseRef} nog eens en zoek naar het gedeelte dat direct bij deze vraag aansluit.`;
}
