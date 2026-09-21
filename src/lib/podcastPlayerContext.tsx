"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useActivityStatus } from "@/lib/useActivity";

export interface PodcastEpisodeInfo {
  id: string;
  number: number;
  title: string;
  audioUrl: string;
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

// Hoe vaak de afspeelpositie tijdens het afspelen naar de server gaat —
// vaak genoeg om nooit meer dan een paar seconden terug te hoeven als de
// app onverwacht sluit, niet zo vaak dat het onnodig veel schrijfacties
// oplevert (zie ook de directe saves bij pauzeren/de pagina verlaten
// hieronder, die dat "onverwacht sluiten"-geval al grotendeels afdekken).
const SAVE_INTERVAL_MS = 10_000;
// Vanaf hier (in seconden resterend) telt een aflevering als "afgeluisterd":
// de opgeslagen positie wordt dan gewist i.p.v. bijgewerkt.
const FINISHED_REMAINING_SECONDS = 15;

// Onthoudt, puur lokaal in deze browser, welke aflevering je bewust met het
// kruisje hebt weggeklikt — anders duikt "waar was ik gebleven" (zie de
// mount-effect hieronder) 'm bij elke nieuwe paginalading weer op, ook al
// wilde je 'm net even niet meer zien. De opgeslagen afspeelpositie zelf
// blijft gewoon bestaan (zie close()), dus expliciet opnieuw afspelen vanaf
// de aflevering zelf hervat nog steeds op de juiste plek.
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
    // Privé-modus/geblokkeerde storage: dan komt de mini-player soms
    // opnieuw terug na sluiten, maar de speler zelf blijft werken.
  }
}

/**
 * Eén gedeelde, altijd-gemonteerde <audio>-speler (zie layout.tsx) — zodat
 * navigeren tussen pagina's het afspelen niet meer onderbreekt, en de
 * huidige positie server-side onthouden wordt (zie /api/podcast-playback)
 * zodat je ook op een ander apparaat verder kan luisteren.
 */
export function PodcastPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [episode, setEpisode] = useState<PodcastEpisodeInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [suppressedByOtherPlayer, setSuppressedByOtherPlayer] = useState(false);\n\n  useActivityStatus(\n    "🎙️",\n    isPlaying && episode ? `Luistert naar aflevering ${episode.number} — ${episode.title}` : null,\n  );

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
      // Bij het verlaten/verbergen van de pagina (zie visibilitychange/
      // pagehide hieronder) kan een gewone fetch halverwege afgebroken
      // worden zodra de browser de pagina daadwerkelijk opruimt — keepalive
      // laat 'm ook dan nog afronden (net als navigator.sendBeacon, maar
      // met dezelfde aanroep als de periodieke save hierboven).
      keepalive,
    }).catch(() => {});
  }, []);

  // Bij het laden van de app: is er een niet-afgeluisterde aflevering?
  // Toon die dan meteen (gepauzeerd) in de mini-player, klaar om te hervatten.
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
    // De podcast is de andere audiobron: zodra deze bewust wordt gestart,
    // wordt een eventueel actieve voorleesstream direct gestopt.
    window.addEventListener("jehovaapp:podcast-started", stopReadAloud);
    return () => window.removeEventListener("jehovaapp:podcast-started", stopReadAloud);
  }, []);

  useEffect(() => {
    fetch("/api/podcast-playback")
      .then((r) => r.json())
      .then((data) => {
        if (data.episode && data.episode.id !== getDismissedEpisodeId()) {
          pendingSeekRef.current = data.positionSeconds ?? 0;
          setCurrentTime(data.positionSeconds ?? 0);
          setEpisode(data.episode);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Laadt de audiobron pas echt (en spoelt naar de bewaarde positie) zodra
  // er daadwerkelijk een aflevering actief is — los van of dat net via
  // playEpisode() of via de "waar was ik gebleven"-herstelling hierboven kwam.
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

  // Periodiek opslaan tijdens het afspelen.
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

  // Meteen opslaan bij een handmatige pauze (niet wachten op het interval
  // hierboven) en bij het verlaten/verbergen van de pagina (dekt "de app
  // sluiten" — een tabblad dat naar de achtergrond gaat of dichtgaat krijgt
  // geen volgende interval-tik meer).
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

    // Een nieuwe podcastactie neemt de audio-uitvoer over van de voorlezer.
    window.dispatchEvent(new Event("jehovaapp:podcast-started"));

    // Een bewuste, nieuwe afspeelactie overschrijft een eerdere "wegklik" —
    // de mini-player is nu toch weer zichtbaar, dus de dismissal heeft
    // verder geen functie meer totdat er weer op het kruisje wordt gedrukt.
    setDismissedEpisodeId(null);

    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `Aflevering ${newEpisode.number} — ${newEpisode.title}`,
        artist: "Geloof je dat ook?",
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
        // De src-toewijzing gebeurt in de useEffect hierboven zodra
        // `episode` verandert; hier alleen nog na een korte tik afspelen
        // (audio.load() is asynchroon, play() vlak erna werkt in de praktijk
        // prima omdat browsers een pending load-aanvraag zelf afhandelen).
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
