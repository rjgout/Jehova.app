-- Elk ondersteund taalgebied krijgt een eigen woord van de dag en ranglijst.
-- Bestaande spellen en vastgelegde dagwoorden blijven Nederlands, zodat geen
-- lopend of historisch resultaat van bestaande gebruikers verandert.
ALTER TABLE "WordGame" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'nl';
ALTER TABLE "DailyWord" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'nl';

ALTER TABLE "DailyWord" DROP CONSTRAINT "DailyWord_pkey";
ALTER TABLE "DailyWord" ADD CONSTRAINT "DailyWord_pkey" PRIMARY KEY ("dayKey", "language");

DROP INDEX "WordGame_dayKey_status_finishedAt_idx";
CREATE INDEX "WordGame_dayKey_language_status_finishedAt_idx"
ON "WordGame"("dayKey", "language", "status", "finishedAt");

-- Maak het dagelijkse woordspel zichtbaar bij de Engelse uitgave. Andere
-- woordspellen blijven Nederlands totdat ze zelf taalbewust zijn gemaakt.
INSERT INTO "GameContentScope" ("id", "gameKey", "contentCollectionId")
SELECT 'game_scope_word_game_bom_en', 'word-game', 'content_bom_en'
WHERE EXISTS (SELECT 1 FROM "ContentCollection" WHERE "id" = 'content_bom_en')
ON CONFLICT ("gameKey", "contentCollectionId") DO NOTHING;
