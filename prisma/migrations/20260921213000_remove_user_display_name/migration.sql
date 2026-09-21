-- Verwijder het oude losse naamveld; gebruikersnamen (handle) zijn de enige publieke identiteit.
ALTER TABLE "User" DROP COLUMN "displayName";
