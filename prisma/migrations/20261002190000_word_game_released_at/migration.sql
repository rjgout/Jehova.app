-- Woord van de dag wisselt om 18:00 in de eigen tijdzone. Per potje wordt
-- vastgelegd wanneer het woord voor die speler vrijkwam, zodat het
-- klassement de tijd daarna telt. Geen backfill: null = 18:00 Nederlandse
-- tijd op dayKey, precies hoe oude potjes werkten; hun volgorde blijft gelijk.
ALTER TABLE "WordGame" ADD COLUMN "releasedAt" TIMESTAMP(3);
