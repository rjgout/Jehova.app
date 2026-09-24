"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export interface PodcastEpisodeInfo {
  id: string;
  number: number;
  title: string;
  audioUrl: string;
  podcastName: string;
}

interface PodcastPlayerContextValue {
  episode: PodcastEpisodeInfo | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isSuppressed: boolean;
  playEpisode: (episode: PodcastEpisodeInfo) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  close: () => void;
}

const PodcastPlayerContext = createContext<PodcastPlayerContextValue | null>(null);

export function usePodcastPlayer(): PodcastPlayerContextValue {
  const ctx = useContext(PodcastPlayerContext);
  if (!ctx) throw new Error("usePodcastPlayer moet binnen PodcastPlayerProvider gebruikt worden.");
  return ctx;
}

// Hoe vaak de afspeelpositie tijdens het afspelen naar de server gaat.
const SAVE_INTERVAL_MS = 10_000;
// Vanaf hier telt een aflevering als "afgeluisterd".
const FINISHED_REMAINING_SECONDS = 15;

const DISMISSED_KEY = "podcast-dismissed-episode-id";

function getDismissedEpisodeId(): string | null {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

function setDismissedEpisodeId(id: string | null) {
  try {
    if (id) localStorage.setItem(DISMISSED_KEY, id);
    else localStorage.removeItem(DISMISSED_KEY);
  } catch {
    // Privé-modus/geblokkeerde storage: de speler blijft gewoon werken.
  }
}

export function PodcastPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [episode, setEpisode] = useState<PodcastEpisodeInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [suppressedByOtherPlayer, setSuppressedByOtherPlayer] = useState(false);

  const loadedEpisodeIdRef = useRef<string | null>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const savePosition = useCallback((ep: PodcastEpisodeInfo, position: number, dur: number, keepalive = false) => {
    if (dur > 0 && dur - position <= FINISHED_REMAINING_SECONDS) {
      fetch(`/api/podcast-playback?episodeId=${ep.id}`, { method: "DELETE", keepalive }).catch(() => {});
      return;
    }
    fetch("/api/podcast-playback", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ episodeId: ep.id, positionSeconds: position }),
      keepalive,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const stopPodcast = () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.pause();
      setIsPlaying(false);
      setSuppressedByOtherPlayer(true);
    };
    window.addEventListener("jehovaapp:stop-podcast", stopPodcast);
    return () => window.removeEventListener("jehovaapp:stop-podcast", stopPodcast);
  }, []);

  useEffect(() => {
    const stopReadAloud = () => window.dispatchEvent(new Event("jehovaapp:stop-read-aloud"));
    window.addEventListener("jehovaapp:podcast-started", stopReadAloud);
    return () => window.removeEventListener("jehovaapp:podcast-started", stopReadAloud);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !episode || loadedEpisodeIdRef.current === episode.id) return;
    loadedEpisodeIdRef.current = episode.id;
    audio.src = episode.audioUrl;
    audio.load();
  }, [episode]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function onLoadedMetadata() {
      setDuration(audio!.duration || 0);
      if (pendingSeekRef.current !== null) {
        audio!.currentTime = pendingSeekRef.current;
        pendingSeekRef.current = null;
      }
    }
    function onTimeUpdate() {
      setCurrentTime(audio!.currentTime);
    }
    function onPlay() {
      setIsPlaying(true);
    }
    function onPause() {
      setIsPlaying(false);
    }
    function onEnded() {
      setIsPlaying(false);
      if (episode) fetch(`/api/podcast-playback?episodeId=${episode.id}`, { method: "DELETE" }).catch(() => {});
    }

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [episode]);

  useEffect(() => {
    if (!isPlaying || !episode) return;
    saveIntervalRef.current = setInterval(() => {
      const audio = audioRef.current;
      if (audio) savePosition(episode, audio.currentTime, audio.duration || 0);
    }, SAVE_INTERVAL_MS);
    return () => {
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, [isPlaying, episode, savePosition]);

  useEffect(() => {
    if (!episode) return;
    function saveNow(keepalive: boolean) {
      const audio = audioRef.current;
      if (audio && audio.currentTime > 0) savePosition(episode!, audio.currentTime, audio.duration || 0, keepalive);
    }
    if (!isPlaying) saveNow(false);
    const onLeave = () => saveNow(true);
    document.addEventListener("visibilitychange", onLeave);
    window.addEventListener("pagehide", onLeave);
    return () => {
      document.removeEventListener("visibilitychange", onLeave);
      window.removeEventListener("pagehide", onLeave);
    };
  }, [isPlaying, episode, savePosition]);

  const playEpisode = useCallback((newEpisode: PodcastEpisodeInfo) => {
    const audio = audioRef.current;
    if (!audio) return;

    window.dispatchEvent(new Event("jehovaapp:podcast-started"));
    setSuppressedByOtherPlayer(false);
    setDismissedEpisodeId(null);

    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `Aflevering ${newEpisode.number} — ${newEpisode.title}`,
        artist: newEpisode.podcastName,
      });
    }

    if (loadedEpisodeIdRef.current === newEpisode.id) {
      audio.play().catch(() => {});
      return;
    }

    setDuration(0);
    fetch(`/api/podcast-playback?episodeId=${newEpisode.id}`)
      .then((r) => r.json())
      .then((data) => {
        pendingSeekRef.current = data.positionSeconds ?? 0;
        setCurrentTime(data.positionSeconds ?? 0);
        setEpisode(newEpisode);
        requestAnimationFrame(() => audio.play().catch(() => {}));
      })
      .catch(() => {
        pendingSeekRef.current = 0;
        setEpisode(newEpisode);
        requestAnimationFrame(() => audio.play().catch(() => {}));
      });
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !episode) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, [episode]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = time;
  }, []);

  const close = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      if (episode && audio.currentTime > 0) savePosition(episode, audio.currentTime, audio.duration || 0);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    if (episode) setDismissedEpisodeId(episode.id);
    loadedEpisodeIdRef.current = null;
    setEpisode(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setSuppressedByOtherPlayer(false);
  }, [episode, savePosition]);

  return (
    <PodcastPlayerContext.Provider value={{ episode, isPlaying, currentTime, duration, isSuppressed: suppressedByOtherPlayer, playEpisode, togglePlay, seek, close }}>
      {children}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} className="hidden" />
    </PodcastPlayerContext.Provider>
  );
}
