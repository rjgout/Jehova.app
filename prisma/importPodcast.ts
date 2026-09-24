import { PrismaClient, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { shuffleWithSeed } from "../src/lib/exerciseGen";
import type { PodcastEpisodeSeed, PodcastComprehensionExercise } from "./podcastContent";
import { ensurePodcasts } from "../src/lib/podcasts";

// De vragen zijn handmatig geschreven met het juiste antwoord steeds als
// eerste optie genoteerd (leesbaarheid tijdens het schrijven) — zonder
// shuffle zou het juiste antwoord bij multiple choice dus (bijna) altijd op
// dezelfde plek staan. `seed` maakt de shuffle stabiel per oefening (niet
// willekeurig bij elke herimport), zodat herdraaien van de import geen
// ruis geeft in bv. testen/screenshots.
function toAnswersAndOptions(comp: PodcastComprehensionExercise, seed: number): {
  type: "MULTIPLE_CHOICE" | "SEQUENCE" | "TRUE_FALSE";
  prompt: string;
  answers: string[];
  wordBank?: string[];
  options?: { label: string; isCorrect: boolean }[];
} {
  if (comp.type === "MULTIPLE_CHOICE") {
    const options = comp.options.map((label, i) => ({ label, isCorrect: i === comp.correctIndex }));
    return {
      type: "MULTIPLE_CHOICE",
      prompt: comp.prompt,
      answers: [comp.options[comp.correctIndex].toLowerCase()],
      options: shuffleWithSeed(options, seed),
    };
  }
  if (comp.type === "SEQUENCE") {
    return {
      type: "SEQUENCE",
      prompt: comp.prompt,
      answers: comp.items.map((item) => item.toLowerCase()),
      wordBank: [...comp.items].reverse(),
    };
  }
  return {
    type: "TRUE_FALSE",
    prompt: comp.prompt,
    answers: [comp.answer ? "true" : "false"],
  };
}

/**
 * Idempotent: herdraaien overschrijft de oefeningen van dezelfde aflevering.
 *
 * Batcht de oefeningen/opties per aflevering met `createMany` in plaats van
 * één losse insert-aanroep per oefening — zelfde reden en aanpak als
 * importBooks() in prisma/importContent.ts.
 */
export async function importPodcastEpisodes(
  prisma: PrismaClient,
  podcastId: string,
  episodes: PodcastEpisodeSeed[],
  log: (msg: string) => void = console.log
) {
  await ensurePodcasts(prisma);
  for (let i = 0; i < episodes.length; i++) {
    const seed = episodes[i];
    // order = -number, zodat de nieuwste (hoogst genummerde) aflevering
    // altijd bovenaan staat — ongeacht in welke volgorde ze hier of via de
    // feed-sync (zie src/lib/podcastFeed.ts) binnenkomen.
    const episode = await prisma.podcastEpisode.upsert({
      where: { podcastId_number: { podcastId, number: seed.number } },
      update: { title: seed.title, summary: seed.summary, listenUrl: seed.listenUrl, order: -seed.number },
      create: {
        podcastId,
        number: seed.number,
        title: seed.title,
        summary: seed.summary,
        listenUrl: seed.listenUrl,
        order: -seed.number,
      },
    });

    await prisma.podcastExercise.deleteMany({ where: { episodeId: episode.id } });

    const exerciseRows: Prisma.PodcastExerciseCreateManyInput[] = [];
    const optionRows: Prisma.PodcastExerciseOptionCreateManyInput[] = [];

    const addExercises = (comps: PodcastComprehensionExercise[], mode: "CONTENT" | "BOM_CONNECTION") => {
      // +500 voor BOM_CONNECTION zodat de twee blokken van dezelfde
      // aflevering niet toevallig dezelfde shuffle-uitkomst krijgen.
      const seedOffset = mode === "CONTENT" ? 0 : 500;
      comps.forEach((comp, order) => {
        const data = toAnswersAndOptions(comp, seed.number * 1000 + seedOffset + order);
        const exerciseId = randomUUID();
        exerciseRows.push({
          id: exerciseId,
          episodeId: episode.id,
          mode,
          order,
          type: data.type,
          prompt: data.prompt,
          answers: JSON.stringify(data.answers),
          wordBank: data.wordBank ? JSON.stringify(data.wordBank) : undefined,
        });
        data.options?.forEach((o, idx) => {
          optionRows.push({ id: randomUUID(), exerciseId, label: o.label, isCorrect: o.isCorrect, order: idx });
        });
      });
    };

    addExercises(seed.content, "CONTENT");
    addExercises(seed.bomConnection, "BOM_CONNECTION");

    if (exerciseRows.length > 0) {
      await prisma.podcastExercise.createMany({ data: exerciseRows });
    }
    if (optionRows.length > 0) {
      await prisma.podcastExerciseOption.createMany({ data: optionRows });
    }

    log(`  - Aflevering ${seed.number}: ${seed.content.length} + ${seed.bomConnection.length} oefeningen`);
  }
}
