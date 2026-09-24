-- Eigen contentcollectie "Podcasts", los van het Boek van Mormon, zodat er
-- later ook podcasts over andere boeken bij kunnen. Geen schemawijziging:
-- alleen een nieuwe rij, en de bestaande podcastcursussen verhuizen erheen.
-- Bewust geen GameContentScope-rijen: de spellen halen hun hoofdstukken uit
-- het Boek van Mormon en horen daar te blijven.

INSERT INTO "ContentCollection" ("id", "slug", "name", "icon", "order", "enabled", "visibleToUsers")
VALUES ('content_podcasts', 'podcasts', 'Podcasts', '🎙️', 20, true, true)
ON CONFLICT ("id") DO NOTHING;

-- Abonnementen en voortgang hangen aan de cursus, niet aan de collectie:
-- wie de podcast volgde, vindt hem terug onder Podcasts.
UPDATE "Course" SET "contentCollectionId" = 'content_podcasts' WHERE "type" = 'PODCAST';
