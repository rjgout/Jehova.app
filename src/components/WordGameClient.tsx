"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { announceXpChanged } from "@/lib/xpBroadcast";
import UserTag from "@/components/UserTag";
import UserAvatar from "@/components/UserAvatar";
import { useT, useUiLanguage } from "@/components/I18nProvider";
import { getLanguage } from "@/lib/languages";
import { rich } from "@/lib/i18n/rich";

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

interface LeaderboardEntry {
  rank: number;
  handle: string;
  discriminator: string;
  userId: string;
  finishedAt: string;
}

interface GameView {
  dayKey: string;
  wordLength: number;
  maxGuesses: number;
  guesses: GuessView[];
  status: "IN_PROGRESS" | "WON" | "LOST";
  xpEarned: number;
  leaderboardRank: number | null;
  leaderboardXpBonus: number;
  word: string | null;
  verses: VerseMatch[];
  leaderboard: LeaderboardEntry[];
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
  const t = useT();
  const intlLocale = getLanguage(useUiLanguage()).intlLocale;
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
        if (!r.ok) throw new Error(data.error ?? t("wordOfTheDay.loadFailed"));
        setGame(data);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : t("wordOfTheDay.somethingWrong")));
  }, []);

  async function submitGuess() {
    if (!game || submitting) return;
    if (guess.length !== game.wordLength) {
      setFormError(t("wordOfTheDay.wrongLength", { n: game.wordLength }));
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
      setFormError(data.error ?? t("wordOfTheDay.somethingWrong"));
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
          {t("wordOfTheDay.back")}
        </Link>
      </div>
    );
  }

  if (!game) {
    return <p className="text-center text-slate-400 dark:text-slate-500">{t("common.loading")}</p>;
  }

  const finished = game.status !== "IN_PROGRESS";
  const rows: GuessView[] = [...game.guesses];
  const emptyRows = game.maxGuesses - rows.length - (finished ? 0 : 1);

  function formatFinishedAt(value: string): string {
    return new Intl.DateTimeFormat(intlLocale, {
      timeZone: "Europe/Amsterdam",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  return (
    <div className="max-w-md mx-auto flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">🔤 {t("pages.wordOfTheDay")}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {t("wordOfTheDay.intro", { length: game.wordLength, tries: game.maxGuesses })}
          </p>
        </div>
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
              placeholder={t("wordOfTheDay.placeholder", { n: game.wordLength })}
              autoFocus
            />
            <button className="btn-primary" disabled={submitting} onClick={submitGuess}>
              {submitting ? "..." : t("wordOfTheDay.guess")}
            </button>
          </div>
          {formError && <p className="text-red-600 dark:text-red-400 text-sm font-semibold">{formError}</p>}
        </div>
      )}

      {finished && (
        <div className="card flex flex-col items-center gap-3 text-center animate-pop">
          <div className="text-4xl">{game.status === "WON" ? "🎉" : "😔"}</div>
          <p className="text-lg font-extrabold dark:text-slate-100">
            {game.status === "WON" ? t("wordOfTheDay.won") : t("wordOfTheDay.lost")}
          </p>
          {game.word && (
            <p className="text-slate-500 dark:text-slate-400">
              {rich(t("wordOfTheDay.theWordWas"), {
                word: <span className="font-extrabold uppercase text-brand-700 dark:text-brand-300">{game.word}</span>,
              })}
            </p>
          )}
          {game.xpEarned > 0 && (
            <div className="flex flex-col items-center gap-1">
              <p className="text-gold-600 dark:text-gold-400 font-extrabold text-lg">+{game.xpEarned} XP</p>
              {game.leaderboardRank && game.leaderboardXpBonus > 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("wordOfTheDay.rankBonus", { rank: game.leaderboardRank, xp: game.leaderboardXpBonus })}
                </p>
              )}
            </div>
          )}
          <p className="text-sm text-slate-400 dark:text-slate-500">{t("wordOfTheDay.comeBack")}</p>
          <Link href="/live" className="btn-secondary mt-1">
            {t("wordOfTheDay.back")}
          </Link>
        </div>
      )}

      {finished && game.verses.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-extrabold dark:text-slate-100">
            {t("wordOfTheDay.whereItAppears", { word: game.word ?? "", count: game.verses.length })}
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

      <div className="card flex flex-col gap-3">
        <div>
          <h2 className="font-extrabold dark:text-slate-100">{t("wordOfTheDay.fastestTitle")}</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {t("wordOfTheDay.fastestIntro")}
          </p>
        </div>

        {game.leaderboard.length > 0 ? (
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
            {game.leaderboard.map((entry) => (
              <div key={entry.rank} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <span className="w-7 text-center font-extrabold text-slate-500 dark:text-slate-400">
                  {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : entry.rank}
                </span>
                <UserAvatar id={entry.userId} handle={entry.handle} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate dark:text-slate-100">
                    <UserTag handle={entry.handle} discriminator={entry.discriminator} />
                  </p>
                </div>
                <time className="text-sm font-bold text-slate-500 dark:text-slate-400 shrink-0">
                  {formatFinishedAt(entry.finishedAt)}
                </time>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {t("wordOfTheDay.nobodyYet")}
          </p>
        )}
      </div>
    </div>
  );
}
