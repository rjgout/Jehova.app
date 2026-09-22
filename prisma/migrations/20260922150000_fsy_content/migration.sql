-- Nieuwe, losstaande contentcollectie voor het wekelijkse leerplan
-- Voor de kracht van de jeugd. De collectie staat klaar voor de
-- Content Switcher, maar de bestaande globale schakelaar blijft uit tot de
-- beheerder die bewust inschakelt.

INSERT INTO "ContentCollection" ("id", "slug", "name", "icon", "order", "enabled")
VALUES ('content_fsy', 'voor-de-kracht-van-de-jeugd', 'Voor de kracht van de jeugd', '📘', 10, true)
ON CONFLICT ("id") DO UPDATE SET
  "slug" = EXCLUDED."slug",
  "name" = EXCLUDED."name",
  "icon" = EXCLUDED."icon",
  "order" = EXCLUDED."order";

INSERT INTO "FsySettings" ("id", "autoPublish", "lastCheckedAt", "lastError", "updatedAt")
VALUES ('singleton', false, NULL, NULL, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE "FsySettings" (
  "id" TEXT NOT NULL,
  "autoPublish" BOOLEAN NOT NULL DEFAULT false,
  "lastCheckedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FsySettings_pkey" PRIMARY KEY ("id")
);

CREATE TYPE "FsyLessonStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "FsyLesson" (
  "id" TEXT NOT NULL,
  "contentCollectionId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "category" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "images" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "sourceHash" TEXT NOT NULL,
  "status" "FsyLessonStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedTitle" TEXT,
  "publishedContent" TEXT,
  "publishedImages" TEXT,
  "publishedAt" TIMESTAMP(3),
  "lastScrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "order" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "FsyLesson_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FsyLesson_contentCollectionId_sourceUrl_key"
  ON "FsyLesson"("contentCollectionId", "sourceUrl");
CREATE UNIQUE INDEX "FsyLesson_contentCollectionId_year_month_slug_key"
  ON "FsyLesson"("contentCollectionId", "year", "month", "slug");
CREATE INDEX "FsyLesson_contentCollectionId_year_month_status_order_idx"
  ON "FsyLesson"("contentCollectionId", "year", "month", "status", "order");

ALTER TABLE "FsyLesson"
  ADD CONSTRAINT "FsyLesson_contentCollectionId_fkey"
  FOREIGN KEY ("contentCollectionId") REFERENCES "ContentCollection"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TYPE "CourseType" ADD VALUE 'FSY';

-- De cursus wordt meteen aangemaakt zodat de FSY-collectie na het inschakelen
-- van de Content Switcher direct een cursus kan tonen. De gebruiker moet hem
-- nog wel zelf toevoegen aan zijn persoonlijke cursuslijst.
INSERT INTO "Course" ("id", "slug", "type", "name", "description", "order", "contentCollectionId", "enabled")
VALUES (
  'course_fsy',
  'voor-de-kracht-van-de-jeugd',
  'FSY',
  'Voor de kracht van de jeugd',
  'Het wekelijkse leerplan met tekst en afbeeldingen uit de officiële bron.',
  0,
  'content_fsy',
  true
)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "contentCollectionId" = EXCLUDED."contentCollectionId",
  "enabled" = EXCLUDED."enabled";
