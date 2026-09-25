-- Fundament voor meerdere talen (Nederlands, Engels, Duits, Frans) in één
-- app. Zichtbaar verandert er niets: alles wat er nu is, is Nederlands.
--
-- - ContentCollection.work + language: een collectie is voortaan één
--   uitgave (werk + taal). Een Engelse uitgave van het Boek van Mormon wordt
--   later een eigen collectie met work = 'bofm' en language = 'en'.
-- - Book.key: taalonafhankelijke sleutel (het pad dat de kerk gebruikt), zodat
--   hetzelfde vers in elke taal te vinden is. Nodig om spelers in
--   verschillende talen samen te laten spelen.
-- - User.uiLanguage / contentLanguage: taal van de app en taal van de content,
--   los van elkaar. Voor iedereen 'nl', dus geen gedragsverandering.

-- AlterTable
ALTER TABLE "ContentCollection" ADD COLUMN "work" TEXT,
ADD COLUMN "language" TEXT NOT NULL DEFAULT 'nl';

-- AlterTable
ALTER TABLE "Book" ADD COLUMN "key" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "uiLanguage" TEXT NOT NULL DEFAULT 'nl',
ADD COLUMN "contentLanguage" TEXT NOT NULL DEFAULT 'nl';

-- CreateIndex
CREATE UNIQUE INDEX "Book_contentCollectionId_key_key" ON "Book"("contentCollectionId", "key");

-- Backfill: de bestaande collecties en boeken.
UPDATE "ContentCollection" SET "work" = CASE "id"
  WHEN 'content_bom' THEN 'bofm'
  WHEN 'content_dc' THEN 'dc-testament'
  WHEN 'content_pgp' THEN 'pgp'
  WHEN 'content_fsy' THEN 'fsy'
  WHEN 'content_podcasts' THEN 'podcasts'
END
WHERE "work" IS NULL;

-- Zelfde tabel als prisma/bookKeys.ts (daar gebruikt de import hem).
UPDATE "Book" AS b SET "key" = k."key"
FROM (VALUES
  ('1-nephi', 'bofm/1-ne'),
  ('2-nephi', 'bofm/2-ne'),
  ('jakob', 'bofm/jacob'),
  ('enos', 'bofm/enos'),
  ('jarom', 'bofm/jarom'),
  ('omni', 'bofm/omni'),
  ('woorden-van-mormon', 'bofm/w-of-m'),
  ('mosiah', 'bofm/mosiah'),
  ('alma', 'bofm/alma'),
  ('helaman', 'bofm/hel'),
  ('3-nephi', 'bofm/3-ne'),
  ('4-nephi', 'bofm/4-ne'),
  ('mormon', 'bofm/morm'),
  ('ether', 'bofm/ether'),
  ('moroni', 'bofm/moro'),
  ('leer-en-verbonden', 'dc-testament/dc'),
  ('mozes', 'pgp/moses'),
  ('abraham', 'pgp/abr'),
  ('joseph-smith-mattheus', 'pgp/js-m'),
  ('joseph-smith-geschiedenis', 'pgp/js-h'),
  ('geloofsartikelen', 'pgp/a-of-f')
) AS k("slug", "key")
WHERE b."slug" = k."slug" AND b."key" IS NULL;
