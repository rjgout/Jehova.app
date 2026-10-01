-- Countdown naar de Algemene Conferentie op Vandaag. Standaard aan, ook voor
-- bestaande accounts (bewuste productkeuze); de kolom-default vult alle
-- bestaande rijen, dus een aparte backfill is niet nodig.
ALTER TABLE "User" ADD COLUMN "conferenceCountdownEnabled" BOOLEAN NOT NULL DEFAULT true;
