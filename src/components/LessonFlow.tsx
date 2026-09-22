"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
import { ACHIEVEMENT_DISPLAY } from "@/lib/achievementDisplay";
import { normalizeAnswer } from "@/lib/exerciseGen";
import { useActivityStatus } from "@/lib/useActivity";
import { announceXpChanged } from "@/lib/xpBroadcast";
import ReadAloudPlayer from "@/components/ReadAloudPlayer";
import { useReadAloudPlayer } from "@/lib/readAloudPlayerContext";

export type ExerciseType = "FILL_BLANK" | "WORD_BANK" | "TRUE_FALSE" | "MULTIPLE_CHOICE" | "SEQUENCE" | "IMAGE_CHOICE";

export interface Exercise {
  id: string;
  type: ExerciseType;
  verseRef: string;
  prompt: string;
  blanks: number;
  wordBank?: string[];
  options?: string[];
}

interface VerseView {
  id: string;
  number: number;
  text: string;
  bookmarked: boolean;
  highlighted: boolean;
  note: string;
}

interface Props {
  chapterId: string;
  bookName: string;
  chapterNumber: number;
  nextChapterId: string | null;
  verses: VerseView[];
  exercises: Exercise[];
  // Gezet als deze les gespeeld wordt als iemands beurt in een uitdaging
  // (zie /challenges) — de score telt dan ook mee voor die uitdaging, zie
  // /api/chapters/[chapterId]/submit.
  challengeId?: string;
}

type Phase = "read" | "exercises" | "review" | "summary";

interface SubmittedAnswer {
  exerciseId: string;
  given: string[];
  correct: boolean;
}

interface SummaryResult {
  correctCount: number;
  total: number;
  xpEarned: number;
  scorePercent: number;
  currentStreak: number;
  longestStreak: number;
  streakBroken: boolean;
  freezeUsed: boolean;
  freezesEarned: number;
  freezeCount: number;
  newAchievements: string[];
  alreadyStudiedToday: boolean;
}

const FONT_SCALE_KEY = "bom-reader-font-scale";
const MIN_SCALE = 0.85;
const MAX_SCALE = 1.5;

export default function LessonFlow({ chapterId, bookName, chapterNumber, nextChapterId, verses, exercises, challengeId }: Props) {
  const [phase, setPhase] = useState<Phase>("read");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<SubmittedAnswer[]>([]);
  const [reviewQueue, setReviewQueue] = useState<string[]>([]);
  const [reviewPos, setReviewPos] = useState(0);
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const current = exercises[index];
  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  useActivityStatus("📖", `Leest ${bookName} ${chapterNumber}`);

  // Registreer dat dit hoofdstuk gelezen wordt, los van of de quiz erna
  // wordt afgemaakt (nodig voor "ga verder waar je gebleven was" en om
  // lezen meetbaar te maken).
  useEffect(() => {
    fetch("/api/reading-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  async function finishExercises(finalAnswers: SubmittedAnswer[]) {
    setSubmitting(true);
    const res = await fetch(`/api/chapters/${chapterId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: finalAnswers, challengeId }),
    });
    const data = await res.json();
    setSubmitting(false);
    setSummary(data);
    setPhase("summary");
    announceXpChanged();
  }

  function onExerciseDone(given: string[], correct: boolean) {
    const next = [...answers, { exerciseId: current.id, given, correct }];
    setAnswers(next);
    if (index + 1 < exercises.length) {
      setIndex(index + 1);
    } else {
      const wrongIds = next.filter((a) => !a.correct).map((a) => a.exerciseId);
      if (wrongIds.length > 0) {
        setReviewQueue(wrongIds);
        setReviewPos(0);
        setPhase("review");
      } else {
        finishExercises(next);
      }
    }
  }

  function advanceReview(latestAnswers: SubmittedAnswer[]) {
    if (reviewPos + 1 < reviewQueue.length) {
      setReviewPos(reviewPos + 1);
    } else {
      finishExercises(latestAnswers);
    }
  }

  function onReviewDone(given: string[], correct: boolean) {
    const currentId = reviewQueue[reviewPos];
    const updated = answers.map((a) => (a.exerciseId === currentId ? { ...a, given, correct } : a));
    setAnswers(updated);
    advanceReview(updated);
  }

  function skipCurrentReview() {
    advanceReview(answers);
  }

  function skipAllReview() {
    finishExercises(answers);
  }

  if (phase === "read") {
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        <Breadcrumb items={[{ label: bookName, href: "/dashboard" }, { label: `Hoofdstuk ${chapterNumber}` }]} />
        <ReaderView chapterId={chapterId} bookName={bookName} chapterNumber={chapterNumber} verses={verses} />
        <button className="btn-primary self-start" onClick={() => setPhase("exercises")}>
          Begin oefeningen →
        </button>
      </div>
    );
  }

  if (phase === "exercises" && current) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <ProgressBar current={index} total={exercises.length} />
        <ExerciseCard key={current.id} exercise={current} onDone={onExerciseDone} disabled={submitting} />
      </div>
    );
  }

  if (phase === "review") {
    const reviewExercise = exerciseById.get(reviewQueue[reviewPos]);
    if (!reviewExercise) {
      finishExercises(answers);
      return null;
    }
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold text-brand-800 dark:text-brand-300">
            Leermomenten ({reviewPos + 1}/{reviewQueue.length})
          </h2>
          <button
            className="text-sm font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            onClick={skipAllReview}
            disabled={submitting}
          >
            Alles overslaan →
          </button>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm -mt-2">
          Deze had je niet goed. Wil je het nog een keer proberen?
        </p>
        <ExerciseCard
          key={reviewExercise.id}
          exercise={reviewExercise}
          onDone={onReviewDone}
          onSkip={skipCurrentReview}
          disabled={submitting}
        />
      </div>
    );
  }

  if (phase === "summary" && summary) {
    return <SummaryScreen summary={summary} nextChapterId={nextChapterId} />;
  }

  return null;
}

export function ReaderView({
  chapterId,
  bookName,
  chapterNumber,
  verses,
}: {
  chapterId: string;
  bookName: string;
  chapterNumber: number;
  verses: VerseView[];
}) {
  const [scale, setScale] = useState(1);
  const [verseState, setVerseState] = useState(verses);
  const [openNoteFor, setOpenNoteFor] = useState<string | null>(null);
  const { source, currentIndex, isPlaying } = useReadAloudPlayer();
  const readingVerse = source && source.id === chapterId && isPlaying ? source.verses[currentIndex]?.number ?? null : null;


  useEffect(() => {
    try {
      const stored = localStorage.getItem(FONT_SCALE_KEY);
      if (stored) setScale(parseFloat(stored));
    } catch {
      // negeren
    }
  }, []);

  function changeScale(delta: number) {
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round((scale + delta) * 100) / 100));
    setScale(next);
    try {
      localStorage.setItem(FONT_SCALE_KEY, String(next));
    } catch {
      // negeren
    }
  }

  async function toggleBookmark(verseId: string) {
    setVerseState((vs) => vs.map((v) => (v.id === verseId ? { ...v, bookmarked: !v.bookmarked } : v)));
    await fetch(`/api/verses/${verseId}/bookmark`, { method: "POST" }).catch(() => {});
  }

  async function toggleHighlight(verseId: string) {
    setVerseState((vs) => vs.map((v) => (v.id === verseId ? { ...v, highlighted: !v.highlighted } : v)));
    await fetch(`/api/verses/${verseId}/highlight`, { method: "POST" }).catch(() => {});
  }

  async function saveNote(verseId: string, text: string) {
    setVerseState((vs) => vs.map((v) => (v.id === verseId ? { ...v, note: text } : v)));
    await fetch(`/api/verses/${verseId}/note`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }).catch(() => {});
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">
          {bookName} {chapterNumber}
        </h1>
        <div className="flex items-center gap-1 text-sm">
          <button
            aria-label="Kleinere tekst"
            className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
            onClick={() => changeScale(-0.1)}
          >
            A-
          </button>
          <button
            aria-label="Grotere tekst"
            className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
            onClick={() => changeScale(0.1)}
          >
            A+
          </button>
        </div>
      </div>

      <ReadAloudPlayer
        sourceId={chapterId}
        title={`${bookName} ${chapterNumber}`}
        verses={verseState.map((v) => ({ number: v.number, text: v.text }))}
      />

      <div className="card flex flex-col gap-4" style={{ "--reader-font-scale": scale } as React.CSSProperties}>
        {verseState.map((v) => (
          <div
            key={v.id}
            className={`reader-text flex flex-col gap-2 rounded-xl -mx-2 px-2 py-1 transition-colors ${
              v.highlighted
                ? "bg-gold-400/20 dark:bg-gold-400/10"
                : readingVerse === v.number
                  ? "bg-brand-100/70 dark:bg-brand-900/30 ring-2 ring-brand-300/50 dark:ring-brand-700/50"
                  : ""
            }`}
          >
            <p>
              <span className="text-brand-400 dark:text-brand-500 font-bold mr-2 select-none">{v.number}</span>
              {v.text}
            </p>
            <div className="flex items-center gap-3 text-sm">
              <button
                aria-label={v.bookmarked ? "Bladwijzer verwijderen" : "Bladwijzer toevoegen"}
                onClick={() => toggleBookmark(v.id)}
                className={v.bookmarked ? "opacity-100" : "opacity-40 hover:opacity-100"}
              >
                🔖
              </button>
              <button
                aria-label={v.highlighted ? "Highlight verwijderen" : "Vers highlighten"}
                onClick={() => toggleHighlight(v.id)}
                className={v.highlighted ? "opacity-100" : "opacity-40 hover:opacity-100"}
              >
                🖍️
              </button>
              <button
                aria-label="Notitie"
                onClick={() => setOpenNoteFor(openNoteFor === v.id ? null : v.id)}
                className={v.note ? "opacity-100" : "opacity-40 hover:opacity-100"}
              >
                📝
              </button>
            </div>
            {openNoteFor === v.id && (
              <NoteEditor initialText={v.note} onSave={(text) => saveNote(v.id, text)} />
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function NoteEditor({ initialText, onSave }: { initialText: string; onSave: (text: string) => void }) {
  const [text, setText] = useState(initialText);
  const [saved, setSaved] = useState(true);

  return (
    <div className="flex flex-col gap-2">
      <textarea
        className="input !text-sm !py-2 min-h-[4rem]"
        placeholder="Jouw notitie bij dit vers..."
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
      />
      <button
        className="btn-secondary self-start !px-3 !py-1.5 !text-xs"
        onClick={() => {
          onSave(text);
          setSaved(true);
        }}
      >
        {saved ? "Opgeslagen" : "Notitie opslaan"}
      </button>
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
      <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}

function formatCorrectAnswer(type: Exercise["type"], correctAnswer: string[]): string {
  if (type === "TRUE_FALSE") return correctAnswer[0] === "true" ? "Waar" : "Niet waar";
  return correctAnswer.join(" ");
}

export function ExerciseCard({
  exercise,
  onDone,
  onSkip,
  disabled,
  checkEndpoint,
}: {
  exercise: Exercise;
  onDone: (given: string[], correct: boolean) => void;
  onSkip?: () => void;
  disabled: boolean;
  /** Standaard /api/exercises/{id}/check — voor bv. podcastoefeningen kan een ander endpoint meegegeven worden. */
  checkEndpoint?: string;
}) {
  const [checked, setChecked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState<string[] | null>(null);
  const [givenAnswer, setGivenAnswer] = useState<string[]>([]);
  const [choice, setChoice] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{ word: string; poolIndex: number }[]>([]);
  const [trueFalseAnswer, setTrueFalseAnswer] = useState<"true" | "false" | null>(null);

  const pool = useMemo(() => exercise.wordBank ?? [], [exercise]);
  const availablePool = pool
    .map((word, poolIndex) => ({ word, poolIndex }))
    .filter(({ poolIndex }) => !placed.some((p) => p.poolIndex === poolIndex));

  const promptParts = exercise.prompt.split(/____/);

  const canCheck =
    exercise.type === "FILL_BLANK" || exercise.type === "MULTIPLE_CHOICE" || exercise.type === "IMAGE_CHOICE"
      ? choice !== null
      : exercise.type === "TRUE_FALSE"
        ? trueFalseAnswer !== null
        : placed.length === exercise.blanks;

  async function check() {
    if (checking || checked) return;
    const given =
      exercise.type === "FILL_BLANK" || exercise.type === "MULTIPLE_CHOICE" || exercise.type === "IMAGE_CHOICE"
        ? [choice ?? ""]
        : exercise.type === "TRUE_FALSE"
          ? [trueFalseAnswer ?? "true"]
          : placed.map((p) => p.word);

    setChecking(true);
    try {
      const res = await fetch(checkEndpoint ?? `/api/exercises/${exercise.id}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ given }),
      });
      const data = await res.json();
      setWasCorrect(Boolean(data.correct));
      setCorrectAnswer(Array.isArray(data.correctAnswer) ? data.correctAnswer : null);
      setGivenAnswer(given);
    } catch {
      setWasCorrect(false);
      setCorrectAnswer(null);
      setGivenAnswer(given);
    } finally {
      setChecking(false);
      setChecked(true);
    }
  }

  function next() {
    onDone(givenAnswer, wasCorrect);
  }

  const feedback = checked && (
    <p
      className={`rounded-xl px-3 py-2 font-bold text-sm ${
        wasCorrect
          ? "bg-brand-50 dark:bg-slate-700 text-brand-700 dark:text-brand-300"
          : "bg-red-50 dark:bg-slate-700 text-red-500 dark:text-red-400"
      }`}
    >
      {wasCorrect
        ? "Goed gedaan! ✅"
        : exercise.type === "IMAGE_CHOICE"
          ? "Niet helemaal — de juiste afbeelding staat hierboven omlijnd."
          : `Niet helemaal — het juiste antwoord was: ${formatCorrectAnswer(exercise.type, correctAnswer ?? [])}`}
    </p>
  );

  if (exercise.type === "TRUE_FALSE") {
    return (
      <div className="card flex flex-col gap-5">
        <p className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">{exercise.verseRef}</p>
        <p className="text-xl leading-relaxed dark:text-slate-100">{exercise.prompt}</p>
        <div className="flex gap-3">
          {(["true", "false"] as const).map((value) => {
            const isCorrectValue = checked && correctAnswer?.[0] === value;
            const isWrongPick = checked && trueFalseAnswer === value && !isCorrectValue;
            return (
              <button
                key={value}
                disabled={checked}
                onClick={() => setTrueFalseAnswer(value)}
                className={`btn flex-1 border-2 ${
                  isCorrectValue
                    ? "bg-brand-500 text-white border-brand-500"
                    : isWrongPick
                      ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 border-red-400"
                      : trueFalseAnswer === value
                        ? "bg-brand-500 text-white border-brand-500"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600"
                }`}
              >
                {value === "true" ? "✅ Waar" : "❌ Niet waar"}
              </button>
            );
          })}
        </div>
        {feedback}
        <FooterControls
          checked={checked}
          checking={checking}
          canCheck={canCheck}
          disabled={disabled}
          onCheck={check}
          onNext={next}
          onSkip={onSkip}
        />
      </div>
    );
  }

  if (exercise.type === "FILL_BLANK") {
    const options = exercise.options ?? [];

    // Oudere content (van vóór keuzeopties bestonden) heeft geen opties —
    // nooit een doodlopende weg tonen, gewoon doorlaten zonder score.
    if (options.length === 0) {
      return (
        <div className="card flex flex-col gap-5">
          <p className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">{exercise.verseRef}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Deze oefening kan nog niet getoond worden (verouderde content — herlaad de content via db:seed).
          </p>
          <button className="btn-primary self-end" disabled={disabled} onClick={() => onDone([""], false)}>
            Doorgaan →
          </button>
        </div>
      );
    }

    return (
      <div className="card flex flex-col gap-5">
        <p className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">{exercise.verseRef}</p>
        <p className="text-xl leading-relaxed dark:text-slate-100">
          {promptParts.map((part, i) => (
            <span key={i}>
              {part}
              {i < promptParts.length - 1 && (
                <span className="inline-block mx-1 px-3 py-0.5 rounded-lg border-b-2 border-dashed border-brand-400 font-bold text-brand-500 dark:text-brand-300">
                  {checked ? choice ?? "…" : "____"}
                </span>
              )}
            </span>
          ))}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {options.map((opt) => {
            const isCorrectOption = checked && correctAnswer && normalizeAnswer(opt) === normalizeAnswer(correctAnswer[0] ?? "");
            const isWrongPick = checked && choice === opt && !isCorrectOption;
            return (
              <button
                key={opt}
                disabled={checked}
                onClick={() => setChoice(opt)}
                className={`btn text-left border-2 ${
                  isCorrectOption
                    ? "bg-brand-500 text-white border-brand-500"
                    : isWrongPick
                      ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 border-red-400"
                      : choice === opt
                        ? "bg-brand-500 text-white border-brand-500"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:border-brand-300"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
        {feedback}
        <FooterControls
          checked={checked}
          checking={checking}
          canCheck={canCheck}
          disabled={disabled}
          onCheck={check}
          onNext={next}
          onSkip={onSkip}
        />
      </div>
    );
  }

  if (exercise.type === "MULTIPLE_CHOICE") {
    const options = exercise.options ?? [];
    return (
      <div className="card flex flex-col gap-5">
        <p className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">{exercise.verseRef}</p>
        <p className="text-xl leading-relaxed dark:text-slate-100">{exercise.prompt}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {options.map((opt) => {
            const isCorrectOption = checked && correctAnswer && normalizeAnswer(opt) === normalizeAnswer(correctAnswer[0] ?? "");
            const isWrongPick = checked && choice === opt && !isCorrectOption;
            return (
              <button
                key={opt}
                disabled={checked}
                onClick={() => setChoice(opt)}
                className={`btn text-left border-2 ${
                  isCorrectOption
                    ? "bg-brand-500 text-white border-brand-500"
                    : isWrongPick
                      ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 border-red-400"
                      : choice === opt
                        ? "bg-brand-500 text-white border-brand-500"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:border-brand-300"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
        {feedback}
        <FooterControls
          checked={checked}
          checking={checking}
          canCheck={canCheck}
          disabled={disabled}
          onCheck={check}
          onNext={next}
          onSkip={onSkip}
        />
      </div>
    );
  }

  if (exercise.type === "IMAGE_CHOICE") {
    const options = exercise.options ?? [];
    return (
      <div className="card flex flex-col gap-5">
        <p className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">{exercise.verseRef}</p>
        <p className="text-xl leading-relaxed dark:text-slate-100">{exercise.prompt}</p>
        <div className="grid grid-cols-2 gap-3">
          {options.map((opt) => {
            const isCorrectOption = checked && correctAnswer && normalizeAnswer(opt) === normalizeAnswer(correctAnswer[0] ?? "");
            const isWrongPick = checked && choice === opt && !isCorrectOption;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <button
                key={opt}
                disabled={checked}
                onClick={() => setChoice(opt)}
                className={`rounded-2xl overflow-hidden border-4 transition ${
                  isCorrectOption
                    ? "border-brand-500"
                    : isWrongPick
                      ? "border-red-400"
                      : choice === opt
                        ? "border-brand-500"
                        : "border-transparent hover:border-brand-300"
                }`}
              >
                <img src={opt} alt="" className="w-full h-auto block" />
              </button>
            );
          })}
        </div>
        {feedback}
        <FooterControls
          checked={checked}
          checking={checking}
          canCheck={canCheck}
          disabled={disabled}
          onCheck={check}
          onNext={next}
          onSkip={onSkip}
        />
      </div>
    );
  }

  // WORD_BANK / SEQUENCE — zelfde mechaniek (items in de juiste volgorde
  // aantikken), SEQUENCE gebruikt alleen langere zinnen i.p.v. losse woorden.
  return (
    <div className="card flex flex-col gap-5">
      <p className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">{exercise.verseRef}</p>
      <p className="text-xl leading-relaxed dark:text-slate-100">{exercise.prompt}</p>

      <div className="flex flex-wrap gap-2 min-h-[3rem] p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-700">
        {placed.length === 0 && (
          <span className="text-slate-400 dark:text-slate-500 text-sm">
            {exercise.type === "SEQUENCE"
              ? "Tik de gebeurtenissen hieronder in de juiste volgorde"
              : "Tik de woorden hieronder in de juiste volgorde"}
          </span>
        )}
        {placed.map((p, i) => (
          <button
            key={i}
            disabled={checked}
            onClick={() => setPlaced(placed.filter((_, idx) => idx !== i))}
            className="rounded-xl bg-brand-500 text-white px-3 py-1.5 font-bold"
          >
            {p.word}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {availablePool.map(({ word, poolIndex }) => (
          <button
            key={poolIndex}
            disabled={checked}
            onClick={() => setPlaced([...placed, { word, poolIndex }])}
            className="rounded-xl bg-white dark:bg-slate-800 dark:text-slate-100 border-2 border-slate-200 dark:border-slate-600 px-3 py-1.5 font-bold hover:border-brand-300"
          >
            {word}
          </button>
        ))}
      </div>

      {feedback}
      <FooterControls
        checked={checked}
        checking={checking}
        canCheck={canCheck}
        disabled={disabled}
        onCheck={check}
        onNext={next}
        onSkip={onSkip}
      />
    </div>
  );
}

function FooterControls({
  checked,
  checking,
  canCheck,
  disabled,
  onCheck,
  onNext,
  onSkip,
}: {
  checked: boolean;
  checking: boolean;
  canCheck: boolean;
  disabled: boolean;
  onCheck: () => void;
  onNext: () => void;
  onSkip?: () => void;
}) {
  if (!checked) {
    return (
      <div className="flex items-center justify-between gap-3">
        {onSkip ? (
          <button
            className="text-sm font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            disabled={disabled}
            onClick={onSkip}
          >
            Sla over
          </button>
        ) : (
          <span />
        )}
        <button className="btn-primary" disabled={!canCheck || disabled || checking} onClick={onCheck}>
          {checking ? "Controleren..." : "Controleer"}
        </button>
      </div>
    );
  }
  return (
    <button className="btn-primary self-end animate-pop" disabled={disabled} onClick={onNext}>
      {disabled ? "Bezig..." : "Doorgaan →"}
    </button>
  );
}

function SummaryScreen({ summary, nextChapterId }: { summary: SummaryResult; nextChapterId: string | null }) {
  return (
    <div className="max-w-md mx-auto card flex flex-col items-center gap-4 text-center animate-pop">
      <div className="text-5xl">{summary.scorePercent >= 80 ? "🎉" : summary.scorePercent >= 50 ? "👍" : "💪"}</div>
      <h2 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">
        {summary.correctCount} / {summary.total} goed ({summary.scorePercent}%)
      </h2>
      <p className="text-gold-600 dark:text-gold-400 font-extrabold text-lg">+{summary.xpEarned} XP</p>

      <div className="flex gap-6 mt-2">
        {!summary.alreadyStudiedToday && (
          <div>
            <div className="text-xl font-extrabold text-orange-500">🔥 {summary.currentStreak}</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">Streak</div>
          </div>
        )}
        <div>
          <div className="text-xl font-extrabold text-ice-600">🧊 {summary.freezeCount}</div>
          <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">Freezes</div>
        </div>
      </div>

      {summary.freezeUsed && (
        <p className="text-sm bg-ice-50 dark:bg-slate-700 text-ice-600 dark:text-ice-400 rounded-xl px-3 py-2">
          Je hebt een dag gemist, maar een streak freeze heeft je streak gered! 🧊
        </p>
      )}
      {summary.streakBroken && !summary.freezeUsed && (
        <p className="text-sm bg-red-50 dark:bg-slate-700 text-red-500 dark:text-red-400 rounded-xl px-3 py-2">
          Je streak is helaas verbroken — morgen weer opbouwen!
        </p>
      )}
      {summary.freezesEarned > 0 && (
        <p className="text-sm bg-gold-50 dark:bg-slate-700 text-gold-600 dark:text-gold-400 rounded-xl px-3 py-2">
          Mijlpaal gehaald! Je hebt {summary.freezesEarned} streak freeze{summary.freezesEarned > 1 ? "s" : ""} verdiend. 🧊
        </p>
      )}

      {summary.newAchievements.length > 0 && (
        <div className="flex flex-col gap-2 w-full">
          <p className="text-sm font-bold text-brand-700 dark:text-brand-300">Nieuwe achievement{summary.newAchievements.length > 1 ? "s" : ""}! 🎊</p>
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

      <div className="flex gap-3 mt-4">
        <Link href="/dashboard" className="btn-secondary">
          Terug naar lessen
        </Link>
        {nextChapterId && (
          <Link href={`/lesson/${nextChapterId}`} className="btn-primary">
            Volgend hoofdstuk →
          </Link>
        )}
      </div>
    </div>
  );
}
