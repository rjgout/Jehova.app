"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ACHIEVEMENT_DISPLAY } from "@/lib/achievementDisplay";
import { announceXpChanged } from "@/lib/xpBroadcast";
import { ExerciseCard, ReaderView, type Exercise } from "@/components/LessonFlow";

interface VerseView {
  id: string;
  number: number;
  text: string;
  bookmarked: boolean;
  highlighted: boolean;
  note: string;
}

interface Props {
  lessonId: string;
  chapterId: string;
  bookName: string;
  chapterNumber: number;
  lessonNumber: number;
  totalLessons: number;
  startVerse: number;
  endVerse: number;
  nextLessonId: string | null;
  verses: VerseView[];
  exercises: Exercise[];
}

interface Result {
  correctCount: number;
  total: number;
  xpEarned: number;
  scorePercent: number;
  currentStreak: number;
  freezeCount: number;
  freezesEarned: number;
  freezeUsed: boolean;
  streakBroken: boolean;
  alreadyStudiedToday: boolean;
  newAchievements: string[];
  readingLessonCompleted: boolean;
  comboCount: number;
  comboMultiplier: number;
  nextLessonId: string | null;
  alreadyCompleted: boolean;
}

type Phase = "read" | "exercises" | "summary";

export default function ReadingLessonFlow({
  lessonId,
  chapterId,
  bookName,
  chapterNumber,
  lessonNumber,
  totalLessons,
  startVerse,
  endVerse,
  nextLessonId,
  verses,
  exercises,
}: Props) {
  const [phase, setPhase] = useState<Phase>("read");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<{ exerciseId: string; given: string[]; correct: boolean }[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const current = exercises[index];
  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  async function finish(finalAnswers: { exerciseId: string; given: string[]; correct: boolean }[]) {
    setSubmitting(true);
    const res = await fetch("/api/reading-lessons/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId, answers: finalAnswers }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setResult(null);
      setPhase("read");
      return;
    }
    setResult(data);
    setPhase("summary");
    announceXpChanged();
  }

  function onDone(given: string[], correct: boolean) {
    const next = [...answers, { exerciseId: current.id, given, correct }];
    setAnswers(next);
    if (index + 1 < exercises.length) {
      setIndex(index + 1);
    } else {
      finish(next);
    }
  }

  if (phase === "read") {
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Les {lessonNumber} van {totalLessons}
          </p>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500">
            {startVerse}–{endVerse}
          </p>
        </div>
        <ReaderView
          chapterId={chapterId}
          bookName={bookName}
          chapterNumber={chapterNumber}
          verses={verses}
        />
        <button
          className="btn-primary self-start"
          onClick={() => {
            if (exercises.length === 0) finish([]);
            else setPhase("exercises");
          }}
        >
          {exercises.length === 0 ? "Les afronden →" : "Naar de vragen →"}
        </button>
      </div>
    );
  }

  if (phase === "exercises" && current) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
            Les {lessonNumber} · {startVerse}–{endVerse}
          </p>
          <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${Math.round((index / exercises.length) * 100)}%` }} />
          </div>
        </div>
        <ExerciseCard
          key={current.id}
          exercise={current}
          onDone={onDone}
          disabled={submitting}
        />
      </div>
    );
  }

  if (phase === "summary" && result) {
    const effectiveNextLessonId = result.nextLessonId ?? nextLessonId;
    return (
      <div className="max-w-md mx-auto card flex flex-col items-center gap-4 text-center animate-pop">
        <div className="text-5xl">{result.scorePercent >= 80 ? "🎉" : result.scorePercent >= 60 ? "👍" : "💪"}</div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Les {lessonNumber} voltooid
        </p>
        <h2 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">
          {result.correctCount} / {result.total} goed
        </h2>

        {result.readingLessonCompleted ? (
          <>
            <p className="text-gold-600 dark:text-gold-400 font-extrabold text-lg">
              +{result.xpEarned} XP
            </p>
            {result.comboCount > 1 && (
              <div className="rounded-2xl bg-gold-50 dark:bg-slate-700 px-4 py-3 w-full">
                <p className="font-extrabold text-gold-700 dark:text-gold-300">
                  🔥 Combo ×{result.comboMultiplier}
                </p>
                <p className="text-sm text-gold-600 dark:text-gold-400">
                  Ga meteen door voor nog meer XP.
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nog even oefenen. Haal 60% om deze les vrij te spelen.
          </p>
        )}

        <div className="flex gap-6 mt-2">
          {!result.alreadyStudiedToday && (
            <div>
              <div className="text-xl font-extrabold text-orange-500">🔥 {result.currentStreak}</div>
              <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">Streak</div>
            </div>
          )}
          <div>
            <div className="text-xl font-extrabold text-ice-600">🧊 {result.freezeCount}</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">Freezes</div>
          </div>
        </div>

        {result.newAchievements.length > 0 && (
          <div className="flex flex-col gap-2 w-full">
            <p className="text-sm font-bold text-brand-700 dark:text-brand-300">Nieuwe achievement{result.newAchievements.length > 1 ? "s" : ""}! 🎊</p>
            <div className="flex justify-center gap-3 flex-wrap">
              {result.newAchievements.map((slug) => {
                const display = ACHIEVEMENT_DISPLAY[slug];
                return display ? (
                  <div key={slug} className="flex flex-col items-center gap-1">
                    <span className="text-3xl">{display.icon}</span>
                    <span className="text-xs font-bold dark:text-slate-200">{display.name}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-4">
          {result.readingLessonCompleted && effectiveNextLessonId ? (
            <Link href={`/reading-lesson/${effectiveNextLessonId}`} className="btn-primary">
              Volgende les → 🔥
            </Link>
          ) : (
            <Link href={`/courses`} className="btn-primary">
              Terug naar cursussen
            </Link>
          )}
          {!result.readingLessonCompleted && (
            <button className="btn-secondary" onClick={() => { setAnswers([]); setIndex(0); setResult(null); setPhase("read"); }}>
              Opnieuw
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
