-- Voorgelezen hoofdstukken: audio per hoofdstuk en begintijd per vers. Alles
-- nullable en pas gevuld bij "Content opnieuw laden": zonder audio blijft de
-- computerstem voorlezen zoals nu, dus geen backfill nodig.
ALTER TABLE "Chapter" ADD COLUMN "audioUrl" TEXT;
ALTER TABLE "Chapter" ADD COLUMN "audioHeadingStart" DOUBLE PRECISION;
ALTER TABLE "Chapter" ADD COLUMN "audioHeadingEnd" DOUBLE PRECISION;

ALTER TABLE "Verse" ADD COLUMN "audioStart" DOUBLE PRECISION;
