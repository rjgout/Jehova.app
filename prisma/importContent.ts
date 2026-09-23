import { PrismaClient, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import {
  generateFillBlank,
  generateWordBank,
  generateTrueFalse,
  buildDistractorPool,
  shuffleWithSeed,
} from "../src/lib/exerciseGen";
import { generateExerciseHint } from "../src/lib/exerciseHints";
import { syncCourses } from "../src/lib/courses";
import type { SeedBook } from "./content";

/**
 * Laadt boeken/hoofdstukken/verzen in de database en genereert er
 * invuloefeningen bij. Idempotent: herdraaien overschrijft bestaande
 * verzen/oefeningen van dezelfde hoofdstukken.
 *
 * Batcht per hoofdstuk met `createMany` in plaats van één losse
 * insert-aanroep per vers/oefening: voor de volledige tekst (239 hoofdstukken,
 * ruim 6600 verzen, ruim 13.000 gegenereerde oefeningen) scheelt dat de
 * overgrote meerderheid van ~20.000 sequentiële round-trips naar de database
 * — dat was de daadwerkelijke oorzaak van de trage "content opnieuw laden".
 * ID's worden zelf gegenereerd (in plaats van cuid() door Prisma te laten
 * toekennen) zodat een oefening haar `sourceVerseId` al kent vóór het vers
 * daadwerkelijk is weggeschreven, zonder de aangemaakte rijen te moeten
 * terugvragen.
 */
export async function importBooks(
  prisma: PrismaClient,
  books: SeedBook[],
  log: (msg: string) => void = console.log,
  contentCollectionId?: string
) {
  const collectionId = contentCollectionId ?? (await prisma.contentCollection.findFirst({
    where: { enabled: true },
    orderBy: { order: "asc" },
    select: { id: true },
  }))?.id;
  if (!collectionId) throw new Error("Geen contentcollectie beschikbaar om boeken aan te koppelen.");

  for (let bookOrder = 0; bookOrder < books.length; bookOrder++) {
    const seedBook = books[bookOrder];
    const book = await prisma.book.upsert({
      where: { slug: seedBook.slug },
      update: { name: seedBook.name, order: bookOrder, contentCollectionId: collectionId },
      create: { slug: seedBook.slug, name: seedBook.name, order: bookOrder, contentCollectionId: collectionId },
    });

    for (let chapterOrder = 0; chapterOrder < seedBook.chapters.length; chapterOrder++) {
      const seedChapter = seedBook.chapters[chapterOrder];
      const chapter = await prisma.chapter.upsert({
        where: { bookId_number: { bookId: book.id, number: seedChapter.number } },
        update: { order: chapterOrder, heading: seedChapter.heading },
        create: { bookId: book.id, number: seedChapter.number, order: chapterOrder, heading: seedChapter.heading },
      });

      await prisma.exercise.deleteMany({ where: { chapterId: chapter.id } });
      await prisma.verse.deleteMany({ where: { chapterId: chapter.id } });

      const verseIds: string[] = seedChapter.verses.map(() => randomUUID());
      if (verseIds.length > 0) {
        await prisma.verse.createMany({
          data: seedChapter.verses.map((text, i) => ({
            id: verseIds[i],
            chapterId: chapter.id,
            number: i + 1,
            text,
          })),
        });
      }

      const distractorPool = buildDistractorPool(seedChapter.verses);

      const exerciseRows: Prisma.ExerciseCreateManyInput[] = [];
      const optionRows: Prisma.QuestionOptionCreateManyInput[] = [];
      let exerciseOrder = 0;

      for (let i = 0; i < seedChapter.verses.length; i++) {
        const verseRef = `${seedBook.name} ${seedChapter.number}:${i + 1}`;
        const sourceVerseId = verseIds[i];

        const fillBlank = generateFillBlank(seedChapter.verses[i], verseRef, i, distractorPool);
        if (fillBlank) {
          const exerciseId = randomUUID();
          exerciseRows.push({
            id: exerciseId,
            chapterId: chapter.id,
            order: exerciseOrder++,
            type: fillBlank.type,
            verseRef: fillBlank.verseRef,
            sourceVerseId,
            prompt: fillBlank.prompt,
            answers: JSON.stringify(fillBlank.answers),
            hint: generateExerciseHint(
              fillBlank.type,
              fillBlank.prompt,
              fillBlank.answers,
              fillBlank.verseRef,
              seedChapter.verses[i]
            ),
          });
          fillBlank.options?.forEach((label, order) => {
            optionRows.push({
              id: randomUUID(),
              exerciseId,
              label,
              isCorrect: fillBlank.answers.includes(label.toLowerCase()),
              order,
            });
          });
        }

        if (i % 2 === 0) {
          const wordBank = generateWordBank(seedChapter.verses[i], verseRef, i);
          if (wordBank) {
            exerciseRows.push({
              id: randomUUID(),
              chapterId: chapter.id,
              order: exerciseOrder++,
              type: wordBank.type,
              verseRef: wordBank.verseRef,
              sourceVerseId,
              prompt: wordBank.prompt,
              answers: JSON.stringify(wordBank.answers),
              wordBank: JSON.stringify(wordBank.wordBank),
              hint: generateExerciseHint(
                wordBank.type,
                wordBank.prompt,
                wordBank.answers,
                wordBank.verseRef,
                seedChapter.verses[i]
              ),
            });
          }
        } else {
          const trueFalse = generateTrueFalse(seedChapter.verses[i], verseRef, i);
          if (trueFalse) {
            exerciseRows.push({
              id: randomUUID(),
              chapterId: chapter.id,
              order: exerciseOrder++,
              type: trueFalse.type,
              verseRef: trueFalse.verseRef,
              sourceVerseId,
              prompt: trueFalse.prompt,
              answers: JSON.stringify(trueFalse.answers),
              hint: generateExerciseHint(
                trueFalse.type,
                trueFalse.prompt,
                trueFalse.answers,
                trueFalse.verseRef,
                seedChapter.verses[i]
              ),
            });
          }
        }
      }

      // Handmatig geschreven begrijpend-lezen-oefeningen (zie ComprehensionExercise
      // in prisma/content.ts) — kunnen niet automatisch uit de verzen worden
      // afgeleid zoals de rest hierboven.
      for (let c = 0; c < (seedChapter.comprehension ?? []).length; c++) {
        const comp = seedChapter.comprehension![c];
        const exerciseId = randomUUID();
        if (comp.type === "MULTIPLE_CHOICE") {
          exerciseRows.push({
            id: exerciseId,
            chapterId: chapter.id,
            order: exerciseOrder++,
            type: "MULTIPLE_CHOICE",
            verseRef: comp.verseRef,
            prompt: comp.prompt,
            answers: JSON.stringify([comp.options[comp.correctIndex].toLowerCase()]),
            hint: generateExerciseHint(
              "MULTIPLE_CHOICE",
              comp.prompt,
              [comp.options[comp.correctIndex]],
              comp.verseRef
            ),
          });
          // Geshuffeld, want handmatig geschreven meerkeuzevragen hebben het
          // juiste antwoord vaak als eerste optie genoteerd (leesbaarheid
          // tijdens het schrijven) — zonder shuffle staat het dus (bijna)
          // altijd op dezelfde plek.
          const shuffledOptions = shuffleWithSeed(
            comp.options.map((label, i) => ({ label, isCorrect: i === comp.correctIndex })),
            c + 1
          );
          shuffledOptions.forEach(({ label, isCorrect }, order) => {
            optionRows.push({ id: randomUUID(), exerciseId, label, isCorrect, order });
          });
        } else {
          const shuffled = shuffleWithSeed(comp.items, c + 1);
          exerciseRows.push({
            id: exerciseId,
            chapterId: chapter.id,
            order: exerciseOrder++,
            type: "SEQUENCE",
            verseRef: comp.verseRef,
            prompt: comp.prompt,
            answers: JSON.stringify(comp.items.map((item) => item.toLowerCase())),
            wordBank: JSON.stringify(shuffled),
            hint: generateExerciseHint("SEQUENCE", comp.prompt, comp.items, comp.verseRef),
          });
        }
      }

      if (exerciseRows.length > 0) {
        await prisma.exercise.createMany({ data: exerciseRows });
      }
      if (optionRows.length > 0) {
        await prisma.questionOption.createMany({ data: optionRows });
      }

      log(`  - ${seedBook.name} ${seedChapter.number}: ${exerciseOrder} oefeningen`);
    }
  }

  await syncCourses(prisma);
}
