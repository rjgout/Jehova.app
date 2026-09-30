-- Hoofdstukken per podcastaflevering uit <podcast:chapters> in de feed (zie
-- src/lib/podcastFeed.ts). Beide leeg tot de volgende feedsync; zonder
-- hoofdstukken werkt de speler zoals voorheen, dus geen backfill nodig.
ALTER TABLE "PodcastEpisode" ADD COLUMN "chaptersUrl" TEXT;
ALTER TABLE "PodcastEpisode" ADD COLUMN "chapters" TEXT;
