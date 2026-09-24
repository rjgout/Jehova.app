import type { PrismaClient } from "@prisma/client";

// De podcasts in de app. syncCourses zet ze in de Podcast-tabel en maakt per
// podcast een PODCAST-cursus aan; syncPodcastFeed haalt per podcast de
// afleveringen uit de feed. De oefeningen per aflevering blijven handwerk
// (zie prisma/podcastContent.ts en "Podcastafleveringen verwerken" in
// CLAUDE.md).
//
// Het id is vast: de migratie 20260924140000_multiple_podcasts koppelt de
// bestaande afleveringen aan "podcast_gjdo", en de oefeningbestanden
// verwijzen ernaar.

export interface PodcastDefinition {
  id: string;
  slug: string;
  name: string;
  feedUrl: string;
  courseSlug: string;
  courseName: string;
  courseDescription: string;
  /** Plek tussen de cursussen, opgeteld bij het aantal boeken (zie syncCourses). */
  courseOrderOffset: number;
}

// Eigen contentcollectie (migratie 20260924150000_podcasts_collection), los
// van het Boek van Mormon.
export const PODCASTS_COLLECTION_ID = "content_podcasts";
export const GJDO_PODCAST_ID = "podcast_gjdo";
export const KAST_PODCAST_ID = "podcast_kast";

const COURSE_DESCRIPTION = "Elke aflevering: vragen over de aflevering zelf, en de brug naar het Boek van Mormon.";

export const PODCASTS: PodcastDefinition[] = [
  {
    id: GJDO_PODCAST_ID,
    slug: "geloof-je-dat-ook",
    name: "Geloof je dat ook?",
    feedUrl: process.env.PODCAST_FEED_URL || "https://geloofjedatook.nl/@geloofjedatook/feed.xml",
    // De oude slug (PODCAST_SLUG in courses.ts) blijft, zodat bestaande links
    // en voortgang blijven werken. Letterlijk en niet geïmporteerd: courses.ts
    // importeert dit bestand, en een kringimport laat de waarde leeg.
    courseSlug: "podcast",
    courseName: "Geloof je dat ook? podcast",
    courseDescription: COURSE_DESCRIPTION,
    courseOrderOffset: 3,
  },
  {
    id: KAST_PODCAST_ID,
    slug: "de-kast-van-mormon",
    name: "De Kast van Mormon",
    feedUrl: "https://rss.buzzsprout.com/2386704.rss",
    courseSlug: "podcast-de-kast-van-mormon",
    courseName: "De Kast van Mormon podcast",
    courseDescription: COURSE_DESCRIPTION,
    courseOrderOffset: 5,
  },
];

/**
 * Zet de lijst hierboven in de Podcast-tabel. Idempotent; aangeroepen door
 * alles wat afleveringen of cursussen aanmaakt, want die hangen er via een
 * foreign key aan.
 */
export async function ensurePodcasts(db: PrismaClient): Promise<void> {
  for (const [order, podcast] of PODCASTS.entries()) {
    const data = { slug: podcast.slug, name: podcast.name, feedUrl: podcast.feedUrl, order };
    await db.podcast.upsert({ where: { id: podcast.id }, update: data, create: { id: podcast.id, ...data } });
  }
}
