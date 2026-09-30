"use client";

import { useT } from "@/components/I18nProvider";
import { usePodcastPlayer } from "@/lib/podcastPlayerContext";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Blijft, samen met de header, vastzitten bovenaan (zie de sticky wrapper
 * in layout.tsx) zodat je 'm op elke pagina kan bedienen terwijl je verder
 * door de app navigeert — het afspelen zelf loopt door dankzij de altijd-
 * gemonteerde <audio> in PodcastPlayerProvider, dit is puur de bediening.
 */
export default function PodcastMiniPlayer() {
  const t = useT();
  const { episode, isPlaying, currentTime, duration, isSuppressed, togglePlay, seek, chapterIndex, previousChapter, nextChapter, close } = usePodcastPlayer();

  if (!episode || isSuppressed) return null;
  const chapters = episode.chapters ?? [];
  const hasChapters = chapters.length >= 2;
  const chapter = hasChapters && chapterIndex >= 0 ? chapters[chapterIndex] : null;

  return (
    <div className="bg-brand-50 dark:bg-slate-800 border-b border-brand-100 dark:border-slate-700">
      <div className={`mx-auto max-w-5xl px-4 py-2 flex items-center ${hasChapters ? "gap-2" : "gap-3"}`}>
        {hasChapters && (
          <button onClick={previousChapter} className="shrink-0 w-8 h-8 rounded-full text-slate-500 dark:text-slate-300" aria-label={t("player.prevChapter")} title={t("player.prevChapter")}>
            ⏮️
          </button>
        )}
        <button
          onClick={togglePlay}
          className="shrink-0 w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center text-lg"
          aria-label={isPlaying ? t("player.pause") : t("player.play")}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        {hasChapters && (
          <button onClick={nextChapter} disabled={chapterIndex >= chapters.length - 1} className="shrink-0 w-8 h-8 rounded-full text-slate-500 dark:text-slate-300 disabled:opacity-30" aria-label={t("player.nextChapter")} title={t("player.nextChapter")}>
            ⏭️
          </button>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-brand-700 dark:text-brand-300 truncate">
            {t("player.episode", { n: episode.number, title: episode.title })}
          </p>
          {chapter && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {t("player.chapterOf", { n: chapterIndex + 1, total: chapters.length, title: chapter.title })}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums shrink-0">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(e) => seek(Number(e.target.value))}
              className="w-full accent-brand-500 h-1"
              aria-label={t("player.position")}
            />
            <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums shrink-0">{formatTime(duration)}</span>
          </div>
        </div>

        <button
          onClick={close}
          className="shrink-0 w-7 h-7 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 flex items-center justify-center"
          aria-label={t("player.closeMini")}
          title={t("player.closeKeep")}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
