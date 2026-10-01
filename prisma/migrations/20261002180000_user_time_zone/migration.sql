-- Tijdzones per gebruiker. Beide kolommen beginnen leeg, zonder backfill:
-- null betekent voor timeZone "nog onbekend, gebruik Europe/Amsterdam" en
-- voor lastStudyTimeZone "vastgelegd als UTC-dag", precies hoe de reeks tot
-- nu toe werkte. Bestaande reeksen, StreakDay-rijen en lastStudyDate
-- veranderen dus niet.
ALTER TABLE "User" ADD COLUMN "timeZone" TEXT;
ALTER TABLE "User" ADD COLUMN "lastStudyTimeZone" TEXT;
