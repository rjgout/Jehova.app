-- Persoonlijke gids per gebruiker. De standaardwaarde vult bestaande accounts
-- direct met NOVI (al de metgezel op de persoonlijke momenten), zodat er voor
-- hen niets verandert; een aparte backfill is daarom niet nodig. Bestaande
-- gebruikers worden niet opnieuw door de onboarding gestuurd.

-- CreateEnum
CREATE TYPE "Companion" AS ENUM ('NOVI', 'VARO', 'VERA');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "companion" "Companion" NOT NULL DEFAULT 'NOVI';
