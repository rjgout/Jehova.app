// Hoofdstukken van een podcastaflevering (<podcast:chapters> in de feed,
// een JSON-bestand in het gangbare hoofdstukkenformaat). Geen afhankelijk-
// heden: gebruikt door de feedsync en door de cursuspagina.

export interface PodcastChapter {
  /** Begintijd in seconden. */
  start: number;
  title: string;
}

const MAX_CHAPTERS = 200;
const MAX_TITLE = 150;

/**
 * Maakt van een hoofdstukkenbestand een schone, oplopende lijst. Alles wat
 * niet klopt valt weg in plaats van de sync te laten mislukken: het bestand
 * komt van een externe host. Hoofdstukken met toc: false horen volgens het
 * formaat niet in een inhoudsopgave en tellen hier dus ook niet mee.
 */
export function parseChaptersFile(json: unknown): PodcastChapter[] {
  const list = (json as { chapters?: unknown } | null)?.chapters;
  if (!Array.isArray(list)) return [];
  const chapters: PodcastChapter[] = [];
  for (const raw of list) {
    const item = raw as { startTime?: unknown; title?: unknown; toc?: unknown };
    if (item?.toc === false) continue;
    const start = typeof item?.startTime === "number" ? item.startTime : Number(item?.startTime);
    const title = typeof item?.title === "string" ? item.title.replace(/\s+/g, " ").trim().slice(0, MAX_TITLE) : "";
    if (!Number.isFinite(start) || start < 0 || !title) continue;
    chapters.push({ start: Math.round(start * 100) / 100, title });
  }
  chapters.sort((a, b) => a.start - b.start);
  return chapters.filter((chapter, i) => i === 0 || chapter.start > chapters[i - 1].start).slice(0, MAX_CHAPTERS);
}

/** Leest PodcastEpisode.chapters. Minder dan twee hoofdstukken is geen indeling: dan geen. */
export function parseStoredChapters(text: string | null | undefined): PodcastChapter[] {
  if (!text) return [];
  try {
    const parsed = JSON.parse(text) as PodcastChapter[];
    return Array.isArray(parsed) && parsed.length >= 2 ? parsed : [];
  } catch {
    return [];
  }
}

/** Index van het hoofdstuk waarin `time` valt, of -1 vóór het eerste. */
export function chapterIndexAt(chapters: PodcastChapter[], time: number): number {
  let index = -1;
  for (let i = 0; i < chapters.length && chapters[i].start <= time + 0.25; i++) index = i;
  return index;
}
