-- Persoonlijke uitnodigingslink per gebruiker. Leeg tot iemand de link voor
-- het eerst opvraagt, dus bestaande accounts veranderen niet: geen backfill.
ALTER TABLE "User" ADD COLUMN "inviteCode" TEXT;

CREATE UNIQUE INDEX "User_inviteCode_key" ON "User"("inviteCode");
