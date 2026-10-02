-- Promotie als deel van de groep (standaard 75%) in plaats van een vast
-- aantal. Bestaande groepen houden promotePercent leeg en dus de oude regel
-- (promoteCount op groupSize): een lopende of afgelopen week verandert niet
-- met terugwerkende kracht. Alleen groepen die vanaf nu ontstaan krijgen het
-- percentage mee, in de praktijk vanaf de eerstvolgende week.
ALTER TABLE "LeagueSettings" ADD COLUMN "promotePercent" INTEGER NOT NULL DEFAULT 75;
ALTER TABLE "LeagueGroup" ADD COLUMN "promotePercent" INTEGER;
