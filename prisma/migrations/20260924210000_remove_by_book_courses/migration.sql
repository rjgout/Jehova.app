-- Cursussen per boek verdwijnen: elke schriftcollectie heeft "Van voor naar
-- achter", "Lezen van voor naar achter" en "Vrije keuze" (zie syncCourses in
-- src/lib/courses.ts), en de cursussen per boek stonden bij het Boek van
-- Mormon al uit. Geen schemawijziging; het enumtype BY_BOOK blijft bestaan
-- maar wordt niet meer gebruikt.
--
-- Voltooide hoofdstukken staan per hoofdstuk (ChapterProgress) en blijven
-- dus gewoon staan; alleen de voortgang binnen die cursussen (cascade) gaat
-- weg. Wie zo'n cursus als actieve cursus had, krijgt "Van voor naar achter"
-- van dezelfde collectie. Bestaat die (nog) niet, dan wordt de actieve
-- cursus leeg (onDelete: SetNull), net als wanneer iemand zijn actieve
-- cursus zelf uit zijn lijst haalt.

UPDATE "User" AS u
SET "activeCourseId" = f."id"
FROM "Course" AS c, "Course" AS f
WHERE u."activeCourseId" = c."id"
  AND c."type" = 'BY_BOOK'
  AND f."type" = 'FRONT_TO_BACK'
  AND f."contentCollectionId" = c."contentCollectionId";

DELETE FROM "Course" WHERE "type" = 'BY_BOOK';
