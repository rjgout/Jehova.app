-- Kinderverhalen per cursus: naast de oudere Nederlandse uitgave komt de
-- uitgave 2023 in meerdere talen, elk als eigen kindercursus met eigen
-- verhalen. Het verhaalnummer is daarom alleen binnen een cursus uniek.
ALTER TABLE "KidsStory" ADD COLUMN "courseId" TEXT;
ALTER TABLE "KidsStory" ADD COLUMN "subtitle" TEXT;
ALTER TABLE "KidsStory" ADD COLUMN "reference" TEXT;

DROP INDEX "KidsStory_number_key";
CREATE UNIQUE INDEX "KidsStory_courseId_number_key" ON "KidsStory"("courseId", "number");

ALTER TABLE "KidsStory" ADD CONSTRAINT "KidsStory_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: de bestaande verhalen horen bij de bestaande kindercursus, zodat
-- voortgang en links precies blijven werken zoals ze waren. Het uitzetten
-- van die cursus gebeurt pas bij het laden van de nieuwe uitgave (seed),
-- zodat er nooit een moment zonder kindercursus is.
UPDATE "KidsStory" SET "courseId" = (SELECT "id" FROM "Course" WHERE "slug" = 'kinderen')
WHERE "courseId" IS NULL;
