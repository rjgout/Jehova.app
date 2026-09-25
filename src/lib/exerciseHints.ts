import type { ExerciseType } from "@prisma/client";
import type { LanguageCode } from "./languages";
import { stopwordsFor } from "./exerciseGen";

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

function usefulKeywords(prompt: string, language: LanguageCode): string | null {
  // Het Nederlands houdt zijn eigen, ruimere lijst (bestaande hints blijven gelijk).
  const stopwords = language === "nl" ? STOPWORDS : stopwordsFor(language);
  const words = clean(prompt)
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !stopwords.has(word.toLowerCase()))
    .slice(0, 4);

  return words.length > 0 ? words.join(", ") : null;
}

// Hints in de taal van de uitgave waar de oefening bij hoort. {ref} is de
// versverwijzing, {context} een stukje brontekst, {keywords} kernwoorden.
const TEMPLATES: Record<LanguageCode, Record<string, string>> = {
  nl: {
    fillContext: "Lees {ref} nog eens. Het ontbrekende woord staat letterlijk in dit vers. Let vooral op dit stukje: “{context}”.",
    fill: "Lees {ref} nog eens rustig. Het ontbrekende woord staat letterlijk in het vers en past bij de woorden eromheen.",
    bankContext: "Kijk opnieuw naar {ref}. De ontbrekende woorden vormen samen één aaneengesloten stukje van de tekst. Dit stukje herken je aan: “{context}”.",
    bank: "Lees {ref} nog eens. De woorden die je zoekt staan samen als één aaneengesloten stukje in de tekst.",
    trueFalse: "Controleer de bewering nog eens aan de hand van {ref}. Let vooral op het concrete detail dat in de zin wordt genoemd.",
    choice: "Zoek het antwoord in {ref}. Let vooral op wat de tekst zegt over {keywords}.",
    choiceDetail: "het concrete detail waar de vraag over gaat",
    image: "Denk terug aan {ref} en let op het belangrijkste herkenningspunt uit de vraag.",
    other: "Lees {ref} nog eens en zoek naar het gedeelte dat direct bij deze vraag aansluit.",
  },
  en: {
    fillContext: "Read {ref} again. The missing word appears word for word in this verse. Look especially at this part: “{context}”.",
    fill: "Read {ref} again carefully. The missing word appears word for word in the verse and fits the words around it.",
    bankContext: "Look at {ref} again. The missing words form one continuous piece of the text. You can recognize it by: “{context}”.",
    bank: "Read {ref} again. The words you are looking for stand together as one continuous piece of the text.",
    trueFalse: "Check the statement against {ref}. Pay special attention to the specific detail mentioned in the sentence.",
    choice: "Look for the answer in {ref}. Pay special attention to what the text says about {keywords}.",
    choiceDetail: "the specific detail the question is about",
    image: "Think back to {ref} and look for the main clue in the question.",
    other: "Read {ref} again and look for the part that relates directly to this question.",
  },
  de: {
    fillContext: "Lies {ref} noch einmal. Das fehlende Wort steht wörtlich in diesem Vers. Achte besonders auf diese Stelle: „{context}“.",
    fill: "Lies {ref} noch einmal in Ruhe. Das fehlende Wort steht wörtlich im Vers und passt zu den Wörtern darum herum.",
    bankContext: "Schau dir {ref} noch einmal an. Die fehlenden Wörter bilden zusammen ein zusammenhängendes Stück des Textes. Du erkennst es an: „{context}“.",
    bank: "Lies {ref} noch einmal. Die gesuchten Wörter stehen zusammen als ein zusammenhängendes Stück im Text.",
    trueFalse: "Prüfe die Aussage noch einmal anhand von {ref}. Achte besonders auf das konkrete Detail in dem Satz.",
    choice: "Suche die Antwort in {ref}. Achte besonders darauf, was der Text über {keywords} sagt.",
    choiceDetail: "das konkrete Detail, um das es in der Frage geht",
    image: "Denk an {ref} zurück und achte auf das wichtigste Erkennungsmerkmal aus der Frage.",
    other: "Lies {ref} noch einmal und suche den Teil, der direkt zu dieser Frage passt.",
  },
  fr: {
    fillContext: "Relis {ref}. Le mot manquant figure tel quel dans ce verset. Fais surtout attention à ce passage : « {context} ».",
    fill: "Relis {ref} calmement. Le mot manquant figure tel quel dans le verset et s’accorde avec les mots qui l’entourent.",
    bankContext: "Regarde à nouveau {ref}. Les mots manquants forment ensemble un seul passage continu du texte. Tu le reconnais à : « {context} ».",
    bank: "Relis {ref}. Les mots que tu cherches se suivent et forment un seul passage du texte.",
    trueFalse: "Vérifie l’affirmation à l’aide de {ref}. Fais surtout attention au détail précis mentionné dans la phrase.",
    choice: "Cherche la réponse dans {ref}. Fais surtout attention à ce que le texte dit de {keywords}.",
    choiceDetail: "le détail précis sur lequel porte la question",
    image: "Repense à {ref} et cherche l’indice principal de la question.",
    other: "Relis {ref} et cherche le passage qui répond directement à cette question.",
  },
};

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => vars[name] ?? match);
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
  sourceText?: string | null,
  language: LanguageCode = "nl"
): string {
  const text = TEMPLATES[language] ?? TEMPLATES.nl;
  const ref = verseRef;
  const source = clean(sourceText ?? "");
  const answer = clean(answers[0] ?? "");

  if (type === "FILL_BLANK" && source && answer) {
    const context = contextAround(source, answer);
    return context ? fill(text.fillContext, { ref, context }) : fill(text.fill, { ref });
  }

  if ((type === "WORD_BANK" || type === "SEQUENCE") && source) {
    const missing = answers.map(clean).filter(Boolean);
    const first = missing[0];
    const context = first ? contextAround(source, first, 4) : null;
    return context ? fill(text.bankContext, { ref, context }) : fill(text.bank, { ref });
  }

  if (type === "TRUE_FALSE") return fill(text.trueFalse, { ref });

  if (type === "MULTIPLE_CHOICE") {
    return fill(text.choice, { ref, keywords: usefulKeywords(prompt, language) ?? text.choiceDetail });
  }

  if (type === "IMAGE_CHOICE") return fill(text.image, { ref });

  return fill(text.other, { ref });
}
