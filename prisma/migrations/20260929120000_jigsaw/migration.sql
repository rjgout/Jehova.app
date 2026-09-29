ALTER TABLE "GameSettings" ADD COLUMN "jigsawEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Bestaande installaties houden hun huidige aanbod totdat de beheerder
-- de legpuzzel aanzet; ook wanneer de singleton nog niet bestaat.
UPDATE "GameSettings" SET "jigsawEnabled" = false;

-- Dezelfde kinderillustraties werken bij elke taaluitgave van dit werk.
INSERT INTO "GameContentScope" ("id", "gameKey", "contentCollectionId")
SELECT 'jigsaw_' || "id", 'jigsaw', "id"
FROM "ContentCollection" WHERE "work" = 'bofm'
ON CONFLICT ("gameKey", "contentCollectionId") DO NOTHING;
