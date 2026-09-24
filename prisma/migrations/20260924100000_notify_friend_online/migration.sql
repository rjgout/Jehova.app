-- AlterTable
-- Standaard aan, net als de andere meldingscategorieën: een categorie is een
-- manier om iets uit te zetten, geen extra opt-in. De melding komt bovendien
-- alleen bij wie zelf al gekozen heeft zijn online-status te delen (standaard
-- uit), dus niemand krijgt hem zonder eerdere eigen keuze.
ALTER TABLE "User" ADD COLUMN "notifyFriendOnline" BOOLEAN NOT NULL DEFAULT true;
