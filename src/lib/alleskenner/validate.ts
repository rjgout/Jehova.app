import type { AlleskennerItemKind } from "@prisma/client";
import { z } from "zod";
import { normalizeAnswer, parsePassage, type AlleskennerSeedItem, type Evidence } from "@/lib/alleskenner/content";

// Controle van één Alleskenner-onderdeel: vorm per soort, en of elk citaat
// letterlijk in het opgegeven vers staat. Gedeeld door
// prisma/checkAlleskenner.ts (tegen bomContent.json) en de editor in
// /adminbackend (tegen de database), zodat een correctie via de beheeromgeving
// aan precies dezelfde eisen voldoet als nieuwe inhoud.

export interface ValidationContext {
  verseText: (ref: string) => string | null;
  kidsStory: (number: number) => { images: string[] } | null;
}

// Vorm per soort, voor invoer uit de editor: pas als die klopt, heeft de
// inhoudelijke controle hieronder zin.
const text = z.string().trim().min(1);
const evidence = z.object({ ref: text, quote: text });
const topicAnswer = z.object({ text, accept: z.array(text), evidence: evidence.optional() });
const source = text.optional();
const dataSchemas: Record<AlleskennerItemKind, z.ZodTypeAny> = {
  QUESTION: z.object({
    prompt: text,
    options: z.array(text),
    answer: text,
    listen: z.object({ ref: text }).optional(),
    evidence: z.array(evidence),
    source,
  }),
  TOPIC: z.object({
    subject: text,
    answers: z.array(topicAnswer),
    distractors: z.array(text),
    tapOnly: z.boolean().optional(),
    source,
  }),
  PUZZLE: z.object({
    groups: z.array(z.object({ answer: text, accept: z.array(text), clues: z.array(text), evidence: z.array(evidence) })),
    source,
  }),
  GALLERY: z.union([
    z.object({ variant: z.literal("QUOTES"), refs: z.array(text) }),
    z.object({
      variant: z.literal("IMAGES"),
      stories: z.array(z.object({ number: z.number().int(), image: z.number().int().min(0) })),
    }),
  ]),
  MEMORY: z.object({
    title: text,
    passage: text,
    readText: text.optional(),
    answers: z.array(topicAnswer),
    distractors: z.array(text),
    source,
  }),
};

/** Leest en controleert de vorm; geeft het onderdeel of een foutmelding. */
export function parseItem(id: string, kind: AlleskennerItemKind, data: unknown): AlleskennerSeedItem | string {
  const parsed = dataSchemas[kind].safeParse(data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return `Onjuiste vorm bij "${issue.path.join(".") || "(geheel)"}": ${issue.message}`;
  }
  return { id, kind, data: parsed.data } as AlleskennerSeedItem;
}

/** Alle versverwijzingen die de controle nodig heeft (om vooraf op te halen). */
export function referencedVerses(item: AlleskennerSeedItem): string[] {
  switch (item.kind) {
    case "QUESTION":
      return [...item.data.evidence.map((e) => e.ref), ...(item.data.listen ? [item.data.listen.ref] : [])];
    case "TOPIC":
      return item.data.answers.flatMap((a) => (a.evidence ? [a.evidence.ref] : []));
    case "PUZZLE":
      return item.data.groups.flatMap((g) => g.evidence.map((e) => e.ref));
    case "GALLERY":
      return item.data.variant === "QUOTES" ? item.data.refs : [];
    case "MEMORY": {
      const range = item.data.readText ? null : parsePassage(item.data.passage);
      const ends = range ? [`${range.book} ${range.chapter}:${range.from}`, `${range.book} ${range.chapter}:${range.to}`] : [];
      return [...ends, ...item.data.answers.flatMap((a) => (a.evidence ? [a.evidence.ref] : []))];
    }
  }
}

function unique(values: string[]): boolean {
  return new Set(values.map(normalizeAnswer)).size === values.length;
}

/** Geeft een lijst foutmeldingen terug; leeg = in orde. */
export function validateAlleskennerItem(item: AlleskennerSeedItem, ctx: ValidationContext): string[] {
  const errors: string[] = [];
  const id = item.id;

  const checkEvidence = (label: string, evidence: Evidence | undefined, source?: string) => {
    // Automatisch samengestelde onderdelen hebben een bron i.p.v. een citaat.
    if (!evidence) {
      if (!source) errors.push(`${label}: geen bronvers`);
      return;
    }
    const text = ctx.verseText(evidence.ref);
    if (!text) {
      errors.push(`${label}: vers "${evidence.ref}" bestaat niet`);
      return;
    }
    if (!evidence.quote || !normalizeAnswer(text).includes(normalizeAnswer(evidence.quote))) {
      errors.push(`${label}: citaat staat niet in ${evidence.ref}: "${evidence.quote}"`);
    }
  };

  if (item.kind === "QUESTION") {
    const { prompt, options, answer, evidence, listen, source } = item.data;
    if (!prompt?.trim()) errors.push(`${id}: vraag ontbreekt`);
    if (options.length !== 4) errors.push(`${id}: precies 4 opties nodig`);
    if (!options.includes(answer)) errors.push(`${id}: antwoord staat niet tussen de opties`);
    if (!unique(options)) errors.push(`${id}: dubbele opties`);
    if (evidence.length === 0 && !source) errors.push(`${id}: geen bronvers`);
    if (listen && !ctx.verseText(listen.ref)) errors.push(`${id}: luistervers "${listen.ref}" bestaat niet`);
    evidence.forEach((e) => checkEvidence(id, e));
  }

  if (item.kind === "TOPIC") {
    const { subject, answers, distractors, source } = item.data;
    if (!subject?.trim()) errors.push(`${id}: onderwerp ontbreekt`);
    if (answers.length < 5) errors.push(`${id}: minstens 5 antwoorden nodig`);
    if (distractors.length < 6) errors.push(`${id}: minstens 6 foute opties nodig`);
    if (!unique([...answers.map((a) => a.text), ...distractors])) errors.push(`${id}: dubbele antwoorden/opties`);
    answers.forEach((a) => checkEvidence(id, a.evidence, source));
  }

  if (item.kind === "PUZZLE") {
    const { groups, source } = item.data;
    if (groups.length !== 3) errors.push(`${id}: precies 3 groepen nodig`);
    for (const group of groups) {
      if (group.clues.length !== 4) errors.push(`${id}/${group.answer}: precies 4 omschrijvingen nodig`);
      if (group.evidence.length === 0 && !source) errors.push(`${id}/${group.answer}: geen bronvers`);
      group.evidence.forEach((e) => checkEvidence(`${id}/${group.answer}`, e));
    }
    if (!unique(groups.flatMap((g) => g.clues))) errors.push(`${id}: dubbele omschrijvingen`);
  }

  if (item.kind === "GALLERY") {
    const data = item.data;
    if (data.variant === "QUOTES") {
      if (data.refs.length !== 8) errors.push(`${id}: precies 8 verzen nodig`);
      if (new Set(data.refs).size !== data.refs.length) errors.push(`${id}: dubbele verzen`);
      for (const ref of data.refs) if (!ctx.verseText(ref)) errors.push(`${id}: vers "${ref}" bestaat niet`);
    } else if (data.variant === "IMAGES") {
      if (data.stories.length !== 8) errors.push(`${id}: precies 8 illustraties nodig`);
      if (new Set(data.stories.map((s) => s.number)).size !== data.stories.length) errors.push(`${id}: dubbel verhaal`);
      for (const { number, image } of data.stories) {
        const story = ctx.kidsStory(number);
        if (!story) errors.push(`${id}: kinderverhaal ${number} bestaat niet`);
        else if (!story.images[image]) errors.push(`${id}: verhaal ${number} heeft geen illustratie ${image}`);
      }
    } else {
      errors.push(`${id}: onbekende galerijsoort`);
    }
  }

  if (item.kind === "MEMORY") {
    const { title, passage, answers, distractors, readText, source } = item.data;
    if (!title?.trim()) errors.push(`${id}: titel ontbreekt`);
    const range = readText ? null : parsePassage(passage);
    if (
      !readText &&
      (!range ||
      !ctx.verseText(`${range.book} ${range.chapter}:${range.from}`) ||
      !ctx.verseText(`${range.book} ${range.chapter}:${range.to}`))
    ) {
      errors.push(`${id}: passage "${passage}" bestaat niet`);
    }
    if (answers.length !== 5) errors.push(`${id}: precies 5 antwoorden nodig`);
    if (distractors.length < 6) errors.push(`${id}: minstens 6 foute opties nodig`);
    if (!unique([...answers.map((a) => a.text), ...distractors])) errors.push(`${id}: dubbele antwoorden/opties`);
    for (const answer of answers) {
      if (readText) {
        // Het antwoord moet letterlijk in de getoonde tekst staan.
        if (!normalizeAnswer(readText).includes(normalizeAnswer(answer.text))) {
          errors.push(`${id}: "${answer.text}" staat niet in de getoonde tekst`);
        }
        continue;
      }
      checkEvidence(id, answer.evidence, source);
      if (!answer.evidence) continue;
      // Het antwoord moet te vinden zijn in wat de spelers net gelezen hebben.
      const ref = parsePassage(answer.evidence.ref);
      if (range && ref && (ref.book !== range.book || ref.chapter !== range.chapter || ref.from < range.from || ref.from > range.to)) {
        errors.push(`${id}: bron ${answer.evidence.ref} valt buiten de passage ${passage}`);
      }
    }
  }

  return errors;
}
