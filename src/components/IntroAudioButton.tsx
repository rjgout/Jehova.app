"use client";

import { useEffect, useRef, useState } from "react";

interface IntroAudio {
  url: string;
  start: number;
  end: number;
}

/**
 * Speelt bij "Raad het hoofdstuk" alleen de voorgelezen hoofdstukkop af: een
 * stuk uit de audio van het hele hoofdstuk (zie Chapter.audioHeadingStart).
 * Stopt vanzelf aan het eind van de kop, en bij een volgende vraag.
 */
export default function IntroAudioButton({ audio }: { audio: IntroAudio | null | undefined }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  // Nieuwe vraag (ander fragment) of weg van het scherm: stoppen.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      setPlaying(false);
      setLoading(false);
    };
  }, [audio?.url, audio?.start]);

  if (!audio) return null;
  const clip = audio;

  function stop() {
    audioRef.current?.pause();
    setPlaying(false);
    setLoading(false);
  }

  function play() {
    // Voorlezen en de podcast delen één audio-uitvoer (zie podcastPlayerContext).
    window.dispatchEvent(new Event("jehovaapp:stop-podcast"));
    window.dispatchEvent(new Event("jehovaapp:stop-read-aloud"));
    let el = audioRef.current;
    if (!el) {
      el = new Audio();
      el.preload = "auto";
      audioRef.current = el;
    }
    const player = el;
    const begin = () => {
      player.currentTime = clip.start;
      player.play().then(
        () => {
          setLoading(false);
          setPlaying(true);
        },
        () => stop()
      );
    };
    player.ontimeupdate = () => {
      if (player.currentTime >= clip.end) stop();
    };
    player.onended = () => stop();
    player.onerror = () => stop();
    setLoading(true);
    if (player.src !== clip.url) {
      player.src = clip.url;
      // De starttijd kan pas gezet worden als de browser de duur kent.
      player.onloadedmetadata = () => {
        player.onloadedmetadata = null;
        begin();
      };
      player.load();
    } else {
      begin();
    }
  }

  return (
    <button
      type="button"
      onClick={playing || loading ? stop : play}
      className="btn-secondary !px-4 !py-2 self-start inline-flex items-center gap-2"
    >
      <span aria-hidden>{playing ? "⏸" : loading ? "⏳" : "🔊"}</span>
      {playing ? "Stop" : loading ? "Laden..." : "Luister naar het intro"}
    </button>
  );
}
