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
  const { episode, isPlaying, currentTime, duration, isSuppressed, togglePlay, seek, close } = usePodcastPlayer();

  if (!episode || isSuppressed) return null;

  return (
    <div className="bg-brand-50 dark:bg-slate-800 border-b border-brand-100 dark:border-slate-700">
      <div className="mx-auto max-w-5xl px-4 py-2 flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="shrink-0 w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center text-lg"
          aria-label={isPlaying ? t("player.pause") : t("player.play")}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-brand-700 dark:text-brand-300 truncate">
            {t("player.episode", { n: episode.number, title: episode.title })}
          </p>
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
