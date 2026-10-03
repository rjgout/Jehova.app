import { createPrismaClient } from "../src/lib/db";
import { seedBooks } from "./content";

// Eenmalig script om Chapter.heading te vullen op een database die al
// geseed was vóórdat dat veld bestond, zonder de volledige (zwaardere,
// verzen/oefeningen verwijderende) importBooks opnieuw te draaien.
async function main() {
  const prisma = createPrismaClient();
  let updated = 0;
  for (const book of seedBooks) {
    const dbBook = await prisma.book.findUnique({ where: { slug: book.slug } });
    if (!dbBook) {
      console.warn(`Boek niet gevonden in database, overgeslagen: ${book.slug}`);
      continue;
    }
    for (const chapter of book.chapters) {
      if (!chapter.heading) continue;
      const result = await prisma.chapter.updateMany({
        where: { bookId: dbBook.id, number: chapter.number },
        data: { heading: chapter.heading },
      });
      updated += result.count;
    }
  }
  console.log(`${updated} hoofdstukken bijgewerkt met een heading.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
