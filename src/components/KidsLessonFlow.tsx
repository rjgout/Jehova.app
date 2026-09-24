"use client";

import { useState } from "react";
import Link from "next/link";
import { ExerciseCard, type Exercise } from "@/components/LessonFlow";
import { ACHIEVEMENT_DISPLAY } from "@/lib/achievementDisplay";
import { announceXpChanged } from "@/lib/xpBroadcast";

interface Answer {
  exerciseId: string;
  given: string[];
}

interface Summary {
  correctCount: number;
  total: number;
  xpEarned: number;
  currentStreak: number;
  freezeCount: number;
  freezesEarned: number;
  freezeUsed: boolean;
  streakBroken: boolean;
  newAchievements: string[];
  alreadyStudiedToday: boolean;
}

type Phase = "read" | "exercises" | "summary";

export default function KidsLessonFlow({
  storyId,
  title,
  text,
  images,
  exercises,
  courseHref,
  nextStoryHref,
}: {
  storyId: string;
  title: string;
  text: string;
  images: string[];
  exercises: Exercise[];
  courseHref: string;
  nextStoryHref: string | null;
}) {
  const [phase, setPhase] = useState<Phase>("read");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const current = exercises[index];

  async function finish(all: Answer[]) {
    setSubmitting(true);
    const res = await fetch(`/api/kids-stories/${storyId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: all }),
    });
    const data = await res.json();
    setSubmitting(false);
    setSummary(data);
    announceXpChanged();
    setPhase("summary");
  }

  function onDone(given: string[]) {
    const next = [...answers, { exerciseId: current.id, given }];
    setAnswers(next);
    if (index + 1 < exercises.length) {
      setIndex(index + 1);
    } else {
      finish(next);
    }
  }

  if (phase === "read") {
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">{title}</h1>
        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {images.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" className="rounded-xl w-full h-auto" />
            ))}
          </div>
        )}
        <p className="text-lg leading-relaxed dark:text-slate-100 whitespace-pre-line">{text}</p>
        {exercises.length > 0 && (
          <button className="btn-primary self-start" onClick={() => setPhase("exercises")}>
            Begin met de vragen →
          </button>
        )}
      </div>
    );
  }

  if (phase === "summary" && summary) {
    return (
      <div className="max-w-md mx-auto card flex flex-col items-center gap-4 text-center animate-pop">
        <div className="text-5xl">🧒</div>
        <h2 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">
          {summary.correctCount} / {summary.total} goed
        </h2>
        <p className="text-gold-600 dark:text-gold-400 font-extrabold text-lg">+{summary.xpEarned} XP</p>
        {!summary.alreadyStudiedToday && (
          <p className="text-orange-500 font-extrabold text-lg">🔥 {summary.currentStreak}</p>
        )}

        {summary.freezeUsed && (
          <p className="text-sm bg-ice-50 dark:bg-slate-700 text-ice-600 dark:text-ice-400 rounded-xl px-3 py-2">
            Je hebt een dag gemist, maar een streak freeze heeft je streak gered! 🧊
          </p>
        )}
        {summary.freezesEarned > 0 && (
          <p className="text-sm bg-gold-50 dark:bg-slate-700 text-gold-600 dark:text-gold-400 rounded-xl px-3 py-2">
            Mijlpaal gehaald! Je hebt {summary.freezesEarned} streak freeze{summary.freezesEarned > 1 ? "s" : ""} verdiend. 🧊
          </p>
        )}

        {summary.newAchievements.length > 0 && (
          <div className="flex flex-col gap-2 w-full">
            <p className="text-sm font-bold text-brand-700 dark:text-brand-300">
              Nieuwe achievement{summary.newAchievements.length > 1 ? "s" : ""}! 🎊
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              {summary.newAchievements.map((slug) => {
                const display = ACHIEVEMENT_DISPLAY[slug];
                if (!display) return null;
                return (
                  <div key={slug} className="flex flex-col items-center gap-1">
                    <span className="text-3xl">{display.icon}</span>
                    <span className="text-xs font-bold dark:text-slate-200">{display.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3 flex-wrap justify-center">
          <Link href={courseHref} className={nextStoryHref ? "btn-secondary" : "btn-primary"}>
            Naar de verhalen
          </Link>
          {nextStoryHref && (
            <Link href={nextStoryHref} className="btn-primary">
              Volgend verhaal →
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className="h-full bg-brand-500 transition-all duration-300"
          style={{ width: `${Math.round((index / exercises.length) * 100)}%` }}
        />
      </div>
      <ExerciseCard
        key={current.id}
        exercise={current}
        onDone={onDone}
        disabled={submitting}
        checkEndpoint={`/api/kids-exercises/${current.id}/check`}
      />
    </div>
  );
}
