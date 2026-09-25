-- Nieuwe namen voor de twee vaste leesroutes, zodat het verschil al uit de
-- naam blijkt: "Hoofdstuk voor hoofdstuk" (bij de Leer en Verbonden
-- "Afdeling voor afdeling") voor hele hoofdstukken, en "Stap voor stap" voor
-- de korte lessen van een paar verzen. Geen schemawijziging; alleen namen en
-- omschrijvingen. syncCourses schrijft dezelfde namen bij de volgende seed,
-- maar die draait niet vanzelf, dus zonder deze update bleven bestaande
-- installaties de oude namen tonen. Slugs, voortgang en abonnementen blijven
-- ongemoeid. Alleen rijen die nog de oude naam dragen worden aangepast.

UPDATE "Course"
SET "name" = CASE WHEN "contentCollectionId" = 'content_dc' THEN 'Afdeling voor afdeling' ELSE 'Hoofdstuk voor hoofdstuk' END
WHERE "type" = 'FRONT_TO_BACK' AND "name" = 'Van voor naar achter';

-- Meteen ook het ontbrekende lidwoord in de omschrijving ("Lees de Leer en
-- Verbonden"), zoals syncCourses die nu schrijft.
UPDATE "Course"
SET "name" = 'Stap voor stap',
    "description" = REPLACE(REPLACE(REPLACE("description",
      'in kleine, behapbare lessen', 'in korte stappen'),
      'Lees Leer en Verbonden', 'Lees de Leer en Verbonden'),
      'Lees Parel van Grote Waarde', 'Lees de Parel van Grote Waarde')
WHERE "type" = 'READING_LESSONS' AND "name" = 'Lezen van voor naar achter';
