"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { announceXpChanged } from "@/lib/xpBroadcast";

type LetterState = "correct" | "present" | "absent";

interface GuessView {
  word: string;
  result: LetterState[];
}

interface VerseMatch {
  bookName: string;
  chapterNumber: number;
  verseNumber: number;
  text: string;
}

interface GameView {
  dayKey: string;
  wordLength: number;
  maxGuesses: number;
  guesses: GuessView[];
  status: "IN_PROGRESS" | "WON" | "LOST";
  xpEarned: number;
  word: string | null;
  verses: VerseMatch[];
}

const TILE_STYLES: Record<LetterState, string> = {
  // Groen voor "goede letter, goede plek" is de universeel herkende kleur
  // hiervoor; emerald (i.p.v. een generiek groen) omdat dat al elders in de
  // huisstijl gebruikt wordt (zie bv. ScrabbleBoardClient.tsx) en beter
  // combineert met het blauw/goud-palet dan een fel primair groen.
  correct: "bg-emerald-500 border-emerald-500 text-white",
  present: "bg-gold-500 border-gold-500 text-white",
  absent: "bg-slate-400 dark:bg-slate-600 border-slate-400 dark:border-slate-600 text-white",
};

export default function WordGameClient() {
  const [game, setGame] = useState<GameView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [guess, setGuess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    fetch("/api/word-game")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Kon het woordspel niet laden.");
        setGame(data);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Er ging iets mis."));
  }, []);

  async function submitGuess() {
    if (!game || submitting) return;
    if (guess.length !== game.wordLength) {
      setFormError(`Het woord moet ${game.wordLength} letters hebben.`);
      setShake(true);
      setTimeout(() => setShake(false), 350);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    const res = await fetch("/api/word-game/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setFormError(data.error ?? "Er ging iets mis.");
      setShake(true);
      setTimeout(() => setShake(false), 350);
      return;
    }
    setGame(data);
    setGuess("");
    if (data.status !== "IN_PROGRESS") announceXpChanged();
  }

  if (loadError) {
    return (
      <div className="max-w-md mx-auto card text-center flex flex-col gap-3">
        <p className="text-red-600 dark:text-red-400 font-semibold">{loadError}</p>
        <Link href="/live" className="btn-secondary self-center">
          Terug
        </Link>
      </div>
    );
  }

  if (!game) {
    return <p className="text-center text-slate-400 dark:text-slate-500">Laden...</p>;
  }

  const finished = game.status !== "IN_PROGRESS";
  const rows: GuessView[] = [...game.guesses];
  const emptyRows = game.maxGuesses - rows.length - (finished ? 0 : 1);

  return (
    <div className="max-w-md mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">🔤 Woord van de dag</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Raad het {game.wordLength}-letterwoord uit het Boek van Mormon in {game.maxGuesses} pogingen. Elke dag om
          18:00 uur komt er een nieuw woord.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-5 gap-2">
            {row.word.split("").map((letter, j) => (
              <div
                key={j}
                className={`no-select aspect-square rounded-lg border-2 flex items-center justify-center text-xl font-extrabold uppercase animate-pop ${TILE_STYLES[row.result[j]]}`}
              >
                {letter}
              </div>
            ))}
          </div>
        ))}

        {!finished && (
          <div className={`grid grid-cols-5 gap-2 ${shake ? "animate-shake" : ""}`}>
            {Array.from({ length: game.wordLength }, (_, j) => (
              <div
                key={j}
                className="no-select aspect-square rounded-lg border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center text-xl font-extrabold uppercase dark:text-slate-100"
              >
                {guess[j] ?? ""}
              </div>
            ))}
          </div>
        )}

        {Array.from({ length: Math.max(0, emptyRows) }, (_, i) => (
          <div key={`empty-${i}`} className="grid grid-cols-5 gap-2">
            {Array.from({ length: game.wordLength }, (_, j) => (
              <div
                key={j}
                className="aspect-square rounded-lg border-2 border-slate-200 dark:border-slate-700"
              />
            ))}
          </div>
        ))}
      </div>

      {!finished && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              className="input text-center uppercase tracking-widest font-extrabold"
              value={guess}
              maxLength={game.wordLength}
              disabled={submitting}
              onChange={(e) => setGuess(e.target.value.replace(/[^a-zA-Zà-ÿÀ-Ÿ]/g, "").toLowerCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitGuess();
              }}
              placeholder={`${game.wordLength} letters...`}
              autoFocus
            />
            <button className="btn-primary" disabled={submitting} onClick={submitGuess}>
              {submitting ? "..." : "Raad"}
            </button>
          </div>
          {formError && <p className="text-red-600 dark:text-red-400 text-sm font-semibold">{formError}</p>}
        </div>
      )}

      {finished && (
        <div className="card flex flex-col items-center gap-3 text-center animate-pop">
          <div className="text-4xl">{game.status === "WON" ? "🎉" : "😔"}</div>
          <p className="text-lg font-extrabold dark:text-slate-100">
            {game.status === "WON" ? "Goed geraden!" : "Helaas, dit keer niet gelukt."}
          </p>
          {game.word && (
            <p className="text-slate-500 dark:text-slate-400">
              Het woord was: <span className="font-extrabold uppercase text-brand-700 dark:text-brand-300">{game.word}</span>
            </p>
          )}
          {game.xpEarned > 0 && <p className="text-gold-600 dark:text-gold-400 font-extrabold text-lg">+{game.xpEarned} XP</p>}
          <p className="text-sm text-slate-400 dark:text-slate-500">Kom morgen om 18:00 uur terug voor een nieuw woord!</p>
          <Link href="/live" className="btn-secondary mt-1">
            Terug
          </Link>
        </div>
      )}

      {finished && game.verses.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-extrabold dark:text-slate-100">
            📖 Waar &ldquo;{game.word}&rdquo; voorkomt ({game.verses.length})
          </h2>
          <div className="flex flex-col gap-2">
            {game.verses.map((v, i) => (
              <details key={i} className="group card !py-2">
                <summary className="font-bold text-sm cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden flex items-center justify-between dark:text-slate-100">
                  {v.bookName} {v.chapterNumber}:{v.verseNumber}
                  <span className="text-slate-400 transition-transform group-open:rotate-180" aria-hidden>
                    ▾
                  </span>
                </summary>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{v.text}</p>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
