"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePodcastPlayer } from "@/lib/podcastPlayerContext";

interface EpisodeView {
  id: string;
  number: number;
  title: string;
  summary: string | null;
  listenUrl: string | null;
  audioUrl: string | null;
  contentCompleted: boolean;
  contentBestScore: number | null;
  hasContentExercises: boolean;
  bomCompleted: boolean;
  bomBestScore: number | null;
  hasBomExercises: boolean;
  resumeSeconds: number;
}

interface Props {
  courseName: string;
  podcastName: string;
  episodes: EpisodeView[];
}

type StatusFilter = "ALL" | "DONE" | "PARTIAL" | "TODO";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Alle" },
  { value: "DONE", label: "100% klaar" },
  { value: "PARTIAL", label: "Deels gedaan" },
  { value: "TODO", label: "Nog te doen" },
];

const PAGE_SIZE = 10;

function episodeStatus(episode: EpisodeView): StatusFilter {
  const availableCount = (episode.hasContentExercises ? 1 : 0) + (episode.hasBomExercises ? 1 : 0);
  if (availableCount === 0) return "TODO";
  const completedCount = (episode.hasContentExercises && episode.contentCompleted ? 1 : 0) + (episode.hasBomExercises && episode.bomCompleted ? 1 : 0);
  if (completedCount === availableCount) return "DONE";
  if (completedCount > 0) return "PARTIAL";
  return "TODO";
}

export default function PodcastCourseView({ courseName, podcastName, episodes }: Props) {
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (filter === "ALL") return episodes;
    return episodes.filter((e) => episodeStatus(e) === filter);
  }, [episodes, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageEpisodes = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function selectFilter(value: StatusFilter) {
    setFilter(value);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">{courseName}</h1>
        <div className="card bg-gradient-to-br from-brand-500 to-brand-600 text-white flex flex-col gap-2">
          <p className="text-brand-100 font-bold uppercase text-xs tracking-wide">Over deze cursus</p>
          <p>
            Bij elke aflevering van <span className="font-extrabold">{podcastName}</span> horen twee korte
            oefenrondes: één
            over de inhoud van de aflevering, en één die de brug slaat naar het Boek van Mormon.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => selectFilter(f.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-bold border-2 transition ${
                  filter === f.value
                    ? "bg-brand-500 text-white border-brand-500"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-brand-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {filtered.length} aflevering{filtered.length === 1 ? "" : "en"}
          </p>
        </div>

        <PageControls currentPage={currentPage} totalPages={totalPages} onChange={setPage} />

        {episodes.length === 0 && (
          <p className="text-slate-400 dark:text-slate-500">Er zijn nog geen afleveringen beschikbaar.</p>
        )}
        {episodes.length > 0 && filtered.length === 0 && (
          <p className="text-slate-400 dark:text-slate-500">Geen afleveringen in dit filter.</p>
        )}

        <div className="contents">
        {pageEpisodes.map((episode) => (
          <div key={episode.id} className="card flex flex-col gap-3 max-w-xl">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="font-extrabold text-lg dark:text-slate-100">
                🎙️ Aflevering {episode.number} — {episode.title}
              </h2>
              {episode.listenUrl && (
                <a
                  href={episode.listenUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-brand-600 dark:text-brand-300 underline underline-offset-2"
                >
                  Bekijk op de website ↗
                </a>
              )}
            </div>
            {episode.audioUrl && <EpisodePlayButton episode={episode} podcastName={podcastName} />}
            {episode.summary && <EpisodeSummary text={episode.summary} />}
            <div className="flex gap-3 flex-wrap">
              <ModeButton
                href={`/podcast/${episode.id}/CONTENT`}
                label="Inhoud van de aflevering"
                available={episode.hasContentExercises}
                completed={episode.contentCompleted}
                bestScore={episode.contentBestScore}
              />
              <ModeButton
                href={`/podcast/${episode.id}/BOM_CONNECTION`}
                label="Verband met het Boek van Mormon"
                available={episode.hasBomExercises}
                completed={episode.bomCompleted}
                bestScore={episode.bomBestScore}
              />
            </div>
          </div>
        ))}
        </div>

        <PageControls currentPage={currentPage} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}

function PageControls({
  currentPage,
  totalPages,
  onChange,
}: {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 flex-wrap">
      <button className="btn-secondary !px-3 !py-1.5" disabled={currentPage <= 1} onClick={() => onChange(currentPage - 1)}>
        ← Vorige
      </button>
      <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        Pagina
        <select
          className="input !w-auto !py-1.5 text-center"
          value={currentPage}
          onChange={(e) => onChange(Number(e.target.value))}
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        van {totalPages}
      </label>
      <button className="btn-secondary !px-3 !py-1.5" disabled={currentPage >= totalPages} onClick={() => onChange(currentPage + 1)}>
        Volgende →
      </button>
    </div>
  );
}

function EpisodePlayButton({ episode, podcastName }: { episode: EpisodeView; podcastName: string }) {
  const player = usePodcastPlayer();
  if (!episode.audioUrl) return null;

  const isThisEpisode = player.episode?.id === episode.id;
  const isPlaying = isThisEpisode && player.isPlaying;
  // "Hervatten" hoort niet alleen bij de op dit moment geladen aflevering,
  // maar bij elke aflevering met een eerder opgeslagen afspeelpositie — ook
  // als de mini-player inmiddels gesloten is (zie PodcastMiniPlayer's
  // sluitknop, die de positie bewust bewaart).
  const hasResumePoint = isThisEpisode ? player.currentTime > 0 : episode.resumeSeconds > 0;

  function handleClick() {
    if (isThisEpisode) {
      player.togglePlay();
    } else {
      player.playEpisode({
        id: episode.id,
        number: episode.number,
        title: episode.title,
        audioUrl: episode.audioUrl!,
        podcastName,
      });
    }
  }

  return (
    <button onClick={handleClick} className="btn-secondary !px-4 !py-2 self-start flex items-center gap-2">
      <span aria-hidden>{isPlaying ? "⏸" : "▶"}</span>
      {isPlaying ? "Pauzeren" : hasResumePoint ? "Hervatten" : "Afspelen"}
    </button>
  );
}

const SUMMARY_TRUNCATE_LENGTH = 220;

function EpisodeSummary({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  if (text.length <= SUMMARY_TRUNCATE_LENGTH) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{text}</p>;
  }

  // Knip af op een woordgrens, niet halverwege een woord.
  const truncated = text.slice(0, SUMMARY_TRUNCATE_LENGTH).replace(/\s+\S*$/, "");

  return (
    <p className="text-sm text-slate-500 dark:text-slate-400">
      {expanded ? text : `${truncated}…`}{" "}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-brand-600 dark:text-brand-300 font-bold hover:underline"
      >
        {expanded ? "Lees minder" : "Lees meer"}
      </button>
    </p>
  );
}

function ModeButton({
  href,
  label,
  available,
  completed,
  bestScore,
}: {
  href: string;
  label: string;
  available: boolean;
  completed: boolean;
  bestScore: number | null;
}) {
  if (!available) {
    return (
      <span className="btn flex-1 min-w-[220px] border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-default">
        {label} — oefeningen volgen nog
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`btn flex-1 min-w-[220px] border-2 ${
        completed
          ? "bg-brand-500 text-white border-brand-500"
          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600"
      }`}
    >
      {completed ? "✓ " : ""}
      {label}
      {bestScore !== null ? ` · ${bestScore}%` : ""}
    </Link>
  );
}
