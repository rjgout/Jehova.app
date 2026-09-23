"use client";

import { usePathname } from "next/navigation";
import { useActivityStatus } from "@/lib/useActivity";
import { usePodcastPlayer } from "@/lib/podcastPlayerContext";
import { useReadAloudPlayer } from "@/lib/readAloudPlayerContext";

/**
 * Houdt ook op pagina's zonder een eigen interactieve component een
 * herkenbare activiteit bij. Specifieke activiteiten zoals een hoofdstuk
 * lezen of een podcast luisteren hebben voorrang.
 */
export default function ActivityTracker() {
  const pathname = usePathname();
  const { isPlaying: podcastPlaying } = usePodcastPlayer();
  const { isPlaying: readAloudPlaying } = useReadAloudPlayer();

  let activity: { icon: string; label: string } | null = null;

  if (!podcastPlaying && !readAloudPlaying) {
    if (pathname === "/dashboard") {
      activity = { icon: "🏠", label: "Op de startpagina" };
    } else if (pathname === "/friends") {
      activity = { icon: "👥", label: "Bekijkt vrienden" };
    } else if (pathname === "/competition") {
      activity = { icon: "🏆", label: "Bekijkt de competitie" };
    } else if (pathname === "/live" || pathname.startsWith("/live/")) {
      activity = { icon: "🎮", label: "Speelt een spel" };
    } else if (pathname === "/shop") {
      activity = { icon: "🛍️", label: "Bekijkt de winkel" };
    } else if (pathname === "/profile") {
      activity = { icon: "👤", label: "Bekijkt profiel" };
    } else if (pathname === "/courses" || pathname.startsWith("/courses/")) {
      activity = { icon: "📚", label: "Bekijkt een cursus" };
    } else if (pathname.startsWith("/lesson/")) {
      // LessonFlow meldt hier de specifieke activiteit, bijvoorbeeld
      // "📖 Leest Alma 32".
      activity = null;
    }
  }

  useActivityStatus(activity?.icon ?? "", activity?.label ?? null);

  return null;
}
