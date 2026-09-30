// Haalt de voorgelezen hoofdstukken op naar AUDIO_DIR, los van een volledige
// seed (die doet dit ook, als laatste stap). Bv. in de container:
//   docker exec jehova-app npm run audio:mirror
import { PrismaClient } from "@prisma/client";
import { mirrorChapterAudio } from "../src/lib/audioMirror";

const prisma = new PrismaClient();
mirrorChapterAudio(prisma)
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
