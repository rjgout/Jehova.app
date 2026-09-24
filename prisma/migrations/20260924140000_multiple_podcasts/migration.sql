-- Meerdere podcasts: een Podcast-tabel, afleveringen per podcast (nummer
-- uniek per podcast in plaats van over alles heen), een transcript-URL uit
-- de feed, en een PODCAST-cursus per podcast via Course.podcastId.

-- CreateTable
CREATE TABLE "Podcast" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "feedUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Podcast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Podcast_slug_key" ON "Podcast"("slug");

-- AlterTable: podcastId eerst nullable, zodat de backfill hieronder de
-- bestaande afleveringen kan koppelen voordat NOT NULL geldt.
ALTER TABLE "Course" ADD COLUMN "podcastId" TEXT;
ALTER TABLE "PodcastEpisode" ADD COLUMN "podcastId" TEXT,
ADD COLUMN "transcriptUrl" TEXT;

-- Backfill: alle bestaande afleveringen, oefeningen en voortgang horen bij
-- "Geloof je dat ook?", en de bestaande podcastcursus (slug "podcast") ook.
-- Voor gebruikers verandert er daardoor niets.
INSERT INTO "Podcast" ("id", "slug", "name", "feedUrl", "order")
VALUES ('podcast_gjdo', 'geloof-je-dat-ook', 'Geloof je dat ook?', 'https://geloofjedatook.nl/@geloofjedatook/feed.xml', 0);

UPDATE "PodcastEpisode" SET "podcastId" = 'podcast_gjdo' WHERE "podcastId" IS NULL;
UPDATE "Course" SET "podcastId" = 'podcast_gjdo' WHERE "slug" = 'podcast';

ALTER TABLE "PodcastEpisode" ALTER COLUMN "podcastId" SET NOT NULL;

-- DropIndex
DROP INDEX "PodcastEpisode_number_key";

-- CreateIndex
CREATE UNIQUE INDEX "PodcastEpisode_podcastId_number_key" ON "PodcastEpisode"("podcastId", "number");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_podcastId_fkey" FOREIGN KEY ("podcastId") REFERENCES "Podcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodcastEpisode" ADD CONSTRAINT "PodcastEpisode_podcastId_fkey" FOREIGN KEY ("podcastId") REFERENCES "Podcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
