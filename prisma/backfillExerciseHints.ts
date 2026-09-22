import { PrismaClient } from "@prisma/client";
import { generateExerciseHint } from "../src/lib/exerciseHints";

const prisma = new PrismaClient();

async function main() {
  const exercises = await prisma.exercise.findMany({
    where: { hint: null },
    include: { sourceVerse: { select: { text: true } } },
  });

  console.log(`Denkhints genereren voor ${exercises.length} oefeningen...`);

  let done = 0;
  for (const exercise of exercises) {
    const answers = JSON.parse(exercise.answers) as string[];
    const hint = generateExerciseHint(
      exercise.type,
      exercise.prompt,
      answers,
      exercise.verseRef,
      exercise.sourceVerse?.text
    );

    await prisma.exercise.update({
      where: { id: exercise.id },
      data: { hint },
    });

    done++;
    if (done % 250 === 0) console.log(`  ${done}/${exercises.length}`);
  }

  console.log(`Klaar: ${done} denkhints opgeslagen.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
