"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getDutchVoices, getSelectedDutchVoice } from "@/lib/readAloud";

export interface ReadAloudVerse {
  number: number;
  text: string;
}

export interface ReadAloudSource {
  id: string;
  title: string;
  verses: ReadAloudVerse[];
}

interface ReadAloudPlayerContextValue {
  source: ReadAloudSource | null;
  isPlaying: boolean;
  currentIndex: number;
  speed: number;
  start: (source: ReadAloudSource, index?: number) => void;
  togglePlay: () => void;
  previousVerse: () => void;
  nextVerse: () => void;
  stop: () => void;
  setSpeed: (speed: number) => void;
}

const ReadAloudPlayerContext = createContext<ReadAloudPlayerContextValue | null>(null);
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export function useReadAloudPlayer(): ReadAloudPlayerContextValue {
  const ctx = useContext(ReadAloudPlayerContext);
  if (!ctx) throw new Error("useReadAloudPlayer moet binnen ReadAloudPlayerProvider gebruikt worden.");
  return ctx;
}

function getVoice(): SpeechSynthesisVoice | null {
  const voices = getDutchVoices();
  return getSelectedDutchVoice() ?? voices.find((voice) => voice.lang.toLowerCase() === "nl-nl")
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith("nl-"))
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith("nl"))
    ?? null;
}

export function ReadAloudPlayerProvider({ children }: { children: React.ReactNode }) {
  const [source, setSource] = useState<ReadAloudSource | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeedState] = useState(1);
  const sourceRef = useRef<ReadAloudSource | null>(null);
  const currentIndexRef = useRef(0);
  const playingRef = useRef(false);
  const utteranceIdRef = useRef(0);
  const speedRef = useRef(1);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    const saved = window.localStorage.getItem("jehovaapp-read-aloud-speed");
    const parsed = Number(saved);
    if (SPEEDS.includes(parsed)) {
      speedRef.current = parsed;
      setSpeedState(parsed);
    }
  }, []);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.getVoices();
    const onVoicesChanged = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", onVoicesChanged);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", onVoicesChanged);
  }, []);

  const speakFrom = useCallback((index: number) => {
    const currentSource = sourceRef.current;
    if (!currentSource || !("speechSynthesis" in window) || index < 0 || index >= currentSource.verses.length) return;

    const synth = window.speechSynthesis;
    const utteranceId = ++utteranceIdRef.current;
    const voice = getVoice();

    for (let verseIndex = index; verseIndex < currentSource.verses.length; verseIndex += 1) {
      const utterance = new SpeechSynthesisUtterance(currentSource.verses[verseIndex].text);
      utterance.lang = "nl-NL";
      utterance.rate = speedRef.current;
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }
      utterance.onstart = () => {
        if (!playingRef.current || utteranceId !== utteranceIdRef.current) return;
        currentIndexRef.current = verseIndex;
        setCurrentIndex(verseIndex);
      };
      utterance.onend = () => {
        if (!playingRef.current || utteranceId !== utteranceIdRef.current) return;
        if (verseIndex === currentSource.verses.length - 1) {
          playingRef.current = false;
          setIsPlaying(false);
          setCurrentIndex(0);
        }
      };
      utterance.onerror = () => {
        if (utteranceId !== utteranceIdRef.current) return;
        playingRef.current = false;
        setIsPlaying(false);
      };
      synth.speak(utterance);
    }
  }, []);

  const start = useCallback((newSource: ReadAloudSource, index = 0) => {
    if (!("speechSynthesis" in window) || newSource.verses.length === 0) return;
    // Voorlezen en de podcast delen één audio-uitvoer: een nieuwe voorleesactie
    // stopt de podcast direct, zodat nooit twee audiostreams tegelijk klinken.
    window.dispatchEvent(new Event("jehovaapp:stop-podcast"));
    utteranceIdRef.current += 1;
    window.speechSynthesis.cancel();
    sourceRef.current = newSource;
    setSource(newSource);
    currentIndexRef.current = index;
    setCurrentIndex(index);
    playingRef.current = true;
    setIsPlaying(true);
    speakFrom(index);
  }, [speakFrom]);

  const togglePlay = useCallback(() => {
    const currentSource = sourceRef.current;
    if (!currentSource || !("speechSynthesis" in window)) return;
    if (isPlaying) {
      playingRef.current = false;
      setIsPlaying(false);
      window.speechSynthesis.pause();
      return;
    }
    playingRef.current = true;
    setIsPlaying(true);
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    else speakFrom(currentIndexRef.current);
  }, [isPlaying, speakFrom]);

  const jumpTo = useCallback((index: number) => {
    const currentSource = sourceRef.current;
    if (!currentSource || !("speechSynthesis" in window)) return;
    const clamped = Math.max(0, Math.min(index, currentSource.verses.length - 1));
    const wasPlaying = playingRef.current;
    utteranceIdRef.current += 1;
    window.speechSynthesis.cancel();
    currentIndexRef.current = clamped;
    setCurrentIndex(clamped);
    if (wasPlaying) {
      playingRef.current = true;
      setIsPlaying(true);
      speakFrom(clamped);
    }
  }, [speakFrom]);

  const previousVerse = useCallback(() => jumpTo(currentIndexRef.current - 1), [jumpTo]);
  const nextVerse = useCallback(() => jumpTo(currentIndexRef.current + 1), [jumpTo]);

  const stop = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    utteranceIdRef.current += 1;
    playingRef.current = false;
    setIsPlaying(false);
    sourceRef.current = null;
    setSource(null);
    setCurrentIndex(0);
  }, []);

  useEffect(() => {
    const stopForPodcast = () => {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      utteranceIdRef.current += 1;
      playingRef.current = false;
      setIsPlaying(false);
      sourceRef.current = null;
      setSource(null);
      setCurrentIndex(0);
    };
    window.addEventListener("jehovaapp:stop-read-aloud", stopForPodcast);
    return () => window.removeEventListener("jehovaapp:stop-read-aloud", stopForPodcast);
  }, []);

  const setSpeed = useCallback((nextSpeed: number) => {
    if (!SPEEDS.includes(nextSpeed)) return;
    speedRef.current = nextSpeed;
    setSpeedState(nextSpeed);
    window.localStorage.setItem("jehovaapp-read-aloud-speed", String(nextSpeed));
    if (playingRef.current) {
      const index = currentIndexRef.current;
      utteranceIdRef.current += 1;
      window.speechSynthesis.cancel();
      playingRef.current = true;
      setIsPlaying(true);
      speakFrom(index);
    }
  }, [speakFrom]);

  useEffect(() => () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  return (
    <ReadAloudPlayerContext.Provider value={{ source, isPlaying, currentIndex, speed, start, togglePlay, previousVerse, nextVerse, stop, setSpeed }}>
      {children}
    </ReadAloudPlayerContext.Provider>
  );
}
