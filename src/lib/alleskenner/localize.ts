import type { AlleskennerItemKind } from "@prisma/client";
import type { MemoryData, PuzzleData, QuestionData, TopicData } from "@/lib/alleskenner/content";

// Een spel De Alleskenner rekent intern met de Nederlandse teksten van de
// onderdelen: dezelfde vraag, dezelfde opties, dezelfde controle voor
// iedereen. Spelers in een andere contenttaal zien die teksten via een
// woordenboek per taal (Nederlandse tekst -> tekst in die taal), opgebouwd
// uit de vertaalde onderdelen (AlleskennerItemTranslation) die in dezelfde
// vorm en volgorde staan. Wat zo'n speler aantikt, gaat via hetzelfde
// woordenboek terug naar de Nederlandse tekst. Ontbreekt een tekst in het
// woordenboek, dan ziet de speler het Nederlands.

export interface AkDictionary {
  to: Map<string, string>;
  from: Map<string, string>;
  /** Extra geldige antwoorden per Nederlands antwoord (getypte puzzelgroepen, quizmaster). */
  accept: Map<string, string[]>;
}

export function emptyDictionary(): AkDictionary {
  return { to: new Map(), from: new Map(), accept: new Map() };
}

export function addPair(dict: AkDictionary, nl: string | null | undefined, translated: string | null | undefined) {
  if (!nl || !translated) return;
  if (!dict.to.has(nl)) dict.to.set(nl, translated);
  if (!dict.from.has(translated)) dict.from.set(translated, nl);
}

function addList(dict: AkDictionary, nl: string[] | undefined, translated: string[] | undefined) {
  if (!nl || !translated || nl.length !== translated.length) return;
  nl.forEach((text, i) => addPair(dict, text, translated[i]));
}

function addAccept(dict: AkDictionary, nlAnswer: string, answer: string, accept: string[]) {
  dict.accept.set(nlAnswer, [...(dict.accept.get(nlAnswer) ?? []), answer, ...accept]);
}

/**
 * Voegt de teksten van één onderdeel toe. Verzen (luistervraag, citaten,
 * passage) zitten er niet in: die komen uit de database van de uitgave en
 * worden door de spelserver apart gekoppeld.
 */
export function addItemPairs(dict: AkDictionary, kind: AlleskennerItemKind, nl: unknown, translated: unknown) {
  if (kind === "QUESTION") {
    const a = nl as QuestionData;
    const b = translated as QuestionData;
    addPair(dict, a.prompt, b.prompt);
    addList(dict, a.options, b.options);
    addPair(dict, a.answer, b.answer);
  } else if (kind === "TOPIC" || kind === "MEMORY") {
    const a = nl as TopicData & Partial<MemoryData>;
    const b = translated as TopicData & Partial<MemoryData>;
    addPair(dict, a.subject, b.subject);
    addPair(dict, a.title, b.title);
    addPair(dict, a.passage, b.passage);
    addPair(dict, a.readText, b.readText);
    addList(
      dict,
      a.answers.map((x) => x.text),
      b.answers.map((x) => x.text)
    );
    a.answers.forEach((answer, i) => {
      if (b.answers[i]) addAccept(dict, answer.text, b.answers[i].text, b.answers[i].accept);
    });
    addList(dict, a.distractors, b.distractors);
  } else if (kind === "PUZZLE") {
    const a = nl as PuzzleData;
    const b = translated as PuzzleData;
    a.groups.forEach((group, g) => {
      const other = b.groups[g];
      if (!other) return;
      addPair(dict, group.answer, other.answer);
      addAccept(dict, group.answer, other.answer, other.accept);
      addList(dict, group.clues, other.clues);
    });
  }
}

export function localizeText(dict: AkDictionary | null | undefined, text: string): string {
  return dict?.to.get(text) ?? text;
}

export function canonicalText(dict: AkDictionary | null | undefined, text: string): string {
  return dict?.from.get(text) ?? text;
}

/**
 * Feedback waarin een antwoord of onderwerp staat ("Nephi! +20 seconden",
 * "Kiest: …"): alleen dat stuk vertalen; de rest van de zin vertaalt de
 * client zelf (translateServerText).
 */
export function localizeFeedback(dict: AkDictionary | null | undefined, text: string): string {
  if (!dict) return text;
  const answer = /^(.+)! \+(\d+) seconden$/.exec(text);
  if (answer) return `${localizeText(dict, answer[1])}! +${answer[2]} seconden`;
  const chooses = /^Kiest: (.+)$/.exec(text);
  if (chooses) return `Kiest: ${localizeText(dict, chooses[1])}`;
  return text;
}
