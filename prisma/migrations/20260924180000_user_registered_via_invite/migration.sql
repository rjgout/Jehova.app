-- Teller voor de admin: hoeveel accounts via een uitnodigingslink zijn
-- aangemaakt. Bestaande accounts: false (niet meer te herleiden), dus geen
-- backfill en geen gedragsverandering.
ALTER TABLE "User" ADD COLUMN "registeredViaInvite" BOOLEAN NOT NULL DEFAULT false;
