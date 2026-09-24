"use client";

import { usePathname } from "next/navigation";
import { ACTIVITY_PRIORITY, useActivityStatus } from "@/lib/useActivity";
import { usePodcastPlayer } from "@/lib/podcastPlayerContext";
import { useReadAloudPlayer } from "@/lib/readAloudPlayerContext";

interface Activity {
  icon: string;
  label: string;
}

// Op volgorde: de eerste die past wint. Pagina's zonder regel (bv. feedback of
// de adminomgeving) melden bewust niets.
const PAGE_ACTIVITIES: { match: (pathname: string) => boolean; activity: Activity }[] = [
  { match: (p) => p === "/dashboard", activity: { icon: "🏠", label: "Op de startpagina" } },
  { match: (p) => p === "/friends", activity: { icon: "👥", label: "Bekijkt vrienden" } },
  { match: (p) => p === "/competition", activity: { icon: "🏆", label: "Bekijkt de competitie" } },
  { match: (p) => p === "/shop", activity: { icon: "🛍️", label: "Bekijkt de winkel" } },
  { match: (p) => p === "/profile", activity: { icon: "👤", label: "Bekijkt profiel" } },
  { match: (p) => p === "/streak" || p === "/xp", activity: { icon: "🔥", label: "Bekijkt de voortgang" } },
  { match: (p) => p.startsWith("/word-game"), activity: { icon: "🟩", label: "Speelt Woord van de dag" } },
  { match: (p) => p.startsWith("/scrabble"), activity: { icon: "🔤", label: "Speelt Woordspel" } },
  { match: (p) => p.startsWith("/alleskenner"), activity: { icon: "🧠", label: "Speelt De Alleskenner" } },
  { match: (p) => p.startsWith("/gezinsavond"), activity: { icon: "🎉", label: "Speelt Gezinsavond" } },
  { match: (p) => p.startsWith("/chapter-guess"), activity: { icon: "🔎", label: "Speelt Raad het hoofdstuk" } },
  { match: (p) => p.startsWith("/challenges"), activity: { icon: "⚔️", label: "Doet een uitdaging" } },
  { match: (p) => p === "/live" || p.startsWith("/live/"), activity: { icon: "🎮", label: "Speelt een spel" } },
  { match: (p) => p.startsWith("/reading-lesson/"), activity: { icon: "📖", label: "Aan het lezen" } },
  { match: (p) => p.startsWith("/podcast/"), activity: { icon: "🎧", label: "Maakt podcastoefeningen" } },
  { match: (p) => p.startsWith("/fsy/"), activity: { icon: "📘", label: "Leest Voor de kracht van de jeugd" } },
  { match: (p) => p.startsWith("/kids/"), activity: { icon: "🧒", label: "Leest een kinderverhaal" } },
  { match: (p) => p.startsWith("/intro/"), activity: { icon: "✨", label: "Volgt de introductiecursus" } },
  { match: (p) => p === "/courses" || p.startsWith("/courses/"), activity: { icon: "📚", label: "Bekijkt een cursus" } },
  { match: (p) => p === "/tools" || p.startsWith("/tools/") || p === "/bookmarks", activity: { icon: "🧰", label: "Bekijkt hulpmiddelen" } },
];

/**
 * Houdt op elke pagina een herkenbare activiteit bij. Specifiekere meldingen
 * (een hoofdstuk lezen in LessonFlow, oefenen in QuickPracticeFlow) gaan
 * voor, zie ACTIVITY_PRIORITY. Luisteren naar een podcast of voorlezen gaat
 * voor de pagina, want dat loopt door terwijl je rondklikt.
 */
export default function ActivityTracker() {
  const pathname = usePathname();
  const podcast = usePodcastPlayer();
  const readAloud = useReadAloudPlayer();

  let activity: Activity | null = null;
  if (podcast.isPlaying && podcast.episode) {
    activity = { icon: "🎧", label: `Luistert naar ${podcast.episode.podcastName}` };
  } else if (readAloud.isPlaying && readAloud.source) {
    activity = { icon: "🔊", label: `Luistert naar ${readAloud.source.title}` };
  } else {
    activity = PAGE_ACTIVITIES.find((entry) => entry.match(pathname))?.activity ?? null;
  }

  useActivityStatus(activity?.icon ?? "", activity?.label ?? null, ACTIVITY_PRIORITY.page);

  return null;
}
