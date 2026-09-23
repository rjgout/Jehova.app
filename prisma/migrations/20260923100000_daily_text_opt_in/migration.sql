-- De tekst van de dag wordt opt-in. De vorige migratie zette dit voor iedereen
-- aan zonder dat iemand ervoor koos, dus zet het voor alle bestaande accounts
-- weer uit. Aanzetten kan via de onboarding of het profiel.
ALTER TABLE "User" ALTER COLUMN "notifyDailyText" SET DEFAULT false;

UPDATE "User" SET "notifyDailyText" = false;
