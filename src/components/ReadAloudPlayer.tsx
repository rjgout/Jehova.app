"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getDutchVoices, getSelectedDutchVoice } from "@/lib/readAloud";

interface ReadAloudVerse {
  number: number;
  text: string;
}

interface Props {
  verses: ReadAloudVerse[];
  onVerseChange?: (verseNumber: number | null) => void;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export default function ReadAloudPlayer({ verses, onVerseChange }: Props) {
  const [supported, setSupported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const currentIndexRef = useRef(0);
  const speedRef = useRef(1);
  const playingRef = useRef(false);
  const utteranceIdRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    setSupported(true);
    // Op iOS worden de beschikbare stemmen soms pas na het laden van de pagina gevuld.
    window.speechSynthesis.getVoices();
    const handleVoicesChanged = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", handleVoicesChanged);

    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", handleVoicesChanged);
    };
  }, []);

  useEffect(() => {
    const savedSpeed = window.localStorage.getItem("jehovaapp-read-aloud-speed");
    if (savedSpeed) {
      const parsedSpeed = Number(savedSpeed);
      if (SPEEDS.includes(parsedSpeed)) {
        speedRef.current = parsedSpeed;
        setSpeed(parsedSpeed);
      }
    }
  }, []);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
    onVerseChange?.(isPlaying ? verses[currentIndex]?.number ?? null : null);
  }, [currentIndex, isPlaying, onVerseChange, verses]);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      playingRef.current = false;
    };
  }, []);

  const speakVerse = useCallback(
    (index: number) => {
      if (!supported || index < 0 || index >= verses.length) return;

      const synth = window.speechSynthesis;
      const utteranceId = ++utteranceIdRef.current;

      const utterance = new SpeechSynthesisUtterance(verses[index].text);
      utterance.lang = "nl-NL";
      utterance.rate = speedRef.current;

      const selectedVoice = getSelectedDutchVoice();
      const voices = getDutchVoices();
      const dutchVoice =
        selectedVoice ??
        voices.find((voice) => voice.lang.toLowerCase() === "nl-nl") ??
        voices.find((voice) => voice.lang.toLowerCase().startsWith("nl-")) ??
        voices.find((voice) => voice.lang.toLowerCase().startsWith("nl"));

      // Safari op iOS kan stil eindigen wanneer er geen expliciete stem is ingesteld.
      if (dutchVoice) {
        utterance.voice = dutchVoice;
        utterance.lang = dutchVoice.lang;
      }

      utterance.onend = () => {
        if (!playingRef.current || utteranceId !== utteranceIdRef.current) return;
        const nextIndex = index + 1;
        if (nextIndex >= verses.length) {
          playingRef.current = false;
          setIsPlaying(false);
          setCurrentIndex(0);
          return;
        }
        currentIndexRef.current = nextIndex;
        setCurrentIndex(nextIndex);
        requestAnimationFrame(() => speakVerse(nextIndex));
      };

      utterance.onerror = () => {
        if (utteranceId !== utteranceIdRef.current) return;
        playingRef.current = false;
        setIsPlaying(false);
      };

      currentIndexRef.current = index;
      setCurrentIndex(index);
      synth.speak(utterance);
    },
    [supported, verses],
  );

  function play() {
    if (!supported || verses.length === 0) return;
    playingRef.current = true;
    setIsPlaying(true);

    const synth = window.speechSynthesis;
    if (synth.paused) {
      synth.resume();
      return;
    }
    speakVerse(currentIndexRef.current);
  }

  function pause() {
    if (!supported) return;
    playingRef.current = false;
    setIsPlaying(false);
    window.speechSynthesis.pause();
  }

  function stop() {
    if (!supported) return;
    playingRef.current = false;
    utteranceIdRef.current += 1;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentIndex(0);
    onVerseChange?.(null);
  }

  function changeSpeed(nextSpeed: number) {
    speedRef.current = nextSpeed;
    setSpeed(nextSpeed);
    window.localStorage.setItem("jehovaapp-read-aloud-speed", String(nextSpeed));
    if (isPlaying) {
      const index = currentIndexRef.current;
      playingRef.current = true;
      speakVerse(index);
    }
  }

  if (!supported || verses.length === 0) return null;

  const progress = ((currentIndex + (isPlaying ? 1 : 0)) / verses.length) * 100;
  const currentVerse = verses[currentIndex];

  return (
    <div className="bg-brand-50 dark:bg-slate-800 border border-brand-100 dark:border-slate-700 rounded-2xl px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          onClick={isPlaying ? pause : play}
          className="shrink-0 w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center text-lg"
          aria-label={isPlaying ? "Pauzeren" : "Voorlezen"}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-brand-700 dark:text-brand-300 truncate">
            🔊 {isPlaying ? `Vers ${currentVerse?.number ?? ""} wordt voorgelezen` : "Voorlezen"}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
              {currentIndex + 1}/{verses.length}
            </span>
            <div className="w-full h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden" aria-hidden>
              <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
              {speed}×
            </span>
          </div>
        </div>

        <select
          value={speed}
          onChange={(e) => changeSpeed(Number(e.target.value))}
          className="shrink-0 bg-transparent text-xs font-bold text-slate-500 dark:text-slate-300 border-0 outline-none"
          aria-label="Voorleessnelheid"
        >
          {SPEEDS.map((value) => (
            <option key={value} value={value}>
              {value}×
            </option>
          ))}
        </select>

        <button
          onClick={stop}
          className="shrink-0 w-7 h-7 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 flex items-center justify-center"
          aria-label="Voorlezen stoppen"
          title="Stoppen"
        >
          ✕
        </button>
      </div>
    </div>
  );
}