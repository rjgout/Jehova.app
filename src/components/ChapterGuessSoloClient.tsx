"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { announceXpChanged } from "@/lib/xpBroadcast";

type Level = "BEGINNER" | "ADVANCED" | "EXPERT";

interface ChapterLabel {
  chapterId: string;
  bookId: string;
  bookName: string;
  number: number;
  label: string;
}

interface QuestionView {
  index: number;
  total: number;
  introText: string;
  options: ChapterLabel[] | null;
  hintUsed: boolean;
}

interface GameView {
  gameId: string;
  level: Level;
  questionCount: number;
  currentIndex: number;
  hintCredits: number;
  status: "IN_PROGRESS" | "FINISHED";
  question: QuestionView | null;
  summary: { correctCount: number; total: number } | null;
}

interface ChapterOption {
  id: string;
  bookId: string;
  bookName: string;
  number: number;
}

interface Summary {
  correctCount: number;
  total: number;
  xpEarned?: number;
  currentStreak?: number;
  newAchievements?: string[];
  alreadyStudiedToday?: boolean;
}

interface AnswerResult {
  correct: boolean;
  correctChapter: ChapterLabel;
  finished: boolean;
  nextQuestion: QuestionView | null;
  hintCredits: number;
  summary: Summary | null;
}

interface HintResult {
  eliminatedChapterId?: string;
  bookId?: string;
  bookName?: string;
  hintCredits: number;
}

export default function ChapterGuessSoloClient({ gameId }: { gameId: string }) {
  const [game, setGame] = useState<GameView | null>(null);
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [finalSummary, setFinalSummary] = useState<Summary | null>(null);

  const [pickedBookId, setPickedBookId] = useState("");
  const [pickedNumber, setPickedNumber] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<AnswerResult | null>(null);
  const [chosenChapterId, setChosenChapterId] = useState<string | null>(null);
  const [hint, setHint] = useState<HintResult | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [confirmingGiveUp, setConfirmingGiveUp] = useState(false);
  const [givingUp, setGivingUp] = useState(false);
  const [gaveUpSummary, setGaveUpSummary] = useState<{ correctCount: number; total: number } | null>(null);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    fetch(`/api/chapter-guess/${gameId}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Spel niet gevonden.");
        setGame(data);
        if (data.status === "FINISHED" && data.summary) setFinalSummary(data.summary);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Er ging iets mis."));
    fetch("/api/chapters")
      .then((r) => r.json())
      .then(setChapters);
  }, [gameId]);

  function resetInputs() {
    setPickedBookId("");
    setPickedNumber("");
    setHint(null);
    setChosenChapterId(null);
  }

  async function submitAnswer(chapterId: string) {
    if (submitting) return;
    setSubmitting(true);
    setChosenChapterId(chapterId);
    setError(null);
    const res = await fetch(`/api/chapter-guess/${gameId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Er ging iets mis.");
      return;
    }
    setFeedback(data);
    setGame((g) => (g ? { ...g, hintCredits: data.hintCredits } : g));
    if (data.finished) {
      setFinalSummary(data.summary);
      announceXpChanged();
    }
  }

  function nextQuestion() {
    if (!game || !feedback?.nextQuestion) return;
    setGame({ ...game, currentIndex: feedback.nextQuestion.index, question: feedback.nextQuestion });
    setFeedback(null);
    resetInputs();
  }

  async function useHint() {
    if (hintLoading || hint || !game) return;
    setHintLoading(true);
    setError(null);
    const res = await fetch(`/api/chapter-guess/${gameId}/hint`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setHintLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Geen hint beschikbaar.");
      return;
    }
    setHint(data);
    setGame((g) => (g ? { ...g, hintCredits: data.hintCredits } : g));
    if (data.bookId) setPickedBookId(data.bookId);
  }

  async function giveUp() {
    if (givingUp) return;
    setGivingUp(true);
    setError(null);
    const res = await fetch(`/api/chapter-guess/${gameId}/forfeit`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setGivingUp(false);
    if (!res.ok) {
      setError(data.error ?? "Er ging iets mis.");
      return;
    }
    setConfirmingGiveUp(false);
    setGaveUpSummary(data);
  }

  if (error && !game) {
    return (
      <div className="max-w-md mx-auto card text-center flex flex-col gap-3">
        <p className="text-red-600 dark:text-red-400 font-semibold">{error}</p>
        <Link href="/chapter-guess" className="btn-secondary self-center">
          Terug
        </Link>
      </div>
    );
  }

  if (!game) {
    return <p className="text-center text-slate-400 dark:text-slate-500">Laden...</p>;
  }

  if (gaveUpSummary) {
    return (
      <div className="max-w-md mx-auto card flex flex-col items-center gap-4 text-center animate-pop">
        <div className="text-5xl">🏳️</div>
        <h2 className="text-2xl font-extrabold text-slate-600 dark:text-slate-300">Je hebt opgegeven</h2>
        <p className="text-slate-500 dark:text-slate-400">
          Je stond op {gaveUpSummary.correctCount} / {gaveUpSummary.total} goed — geen XP voor dit potje.
        </p>
        <div className="flex gap-3 mt-2">
          <Link href="/chapter-guess" className="btn-primary">
            Nog een keer
          </Link>
          <Link href="/live" className="btn-secondary">
            Terug
          </Link>
        </div>
      </div>
    );
  }

  if (finalSummary) {
    return (
      <div className="max-w-md mx-auto card flex flex-col items-center gap-4 text-center animate-pop">
        <div className="text-5xl">🔎</div>
        <h2 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">
          {finalSummary.correctCount} / {finalSummary.total} goed
        </h2>
        {!!finalSummary.xpEarned && <p className="text-gold-600 dark:text-gold-400 font-extrabold text-lg">+{finalSummary.xpEarned} XP</p>}
        {!!finalSummary.currentStreak && !finalSummary.alreadyStudiedToday && (
          <p className="text-orange-500 font-extrabold text-lg">🔥 {finalSummary.currentStreak}</p>
        )}
        <div className="flex gap-3 mt-2">
          <Link href="/chapter-guess" className="btn-primary">
            Nog een keer
          </Link>
          <Link href="/live" className="btn-secondary">
            Terug
          </Link>
        </div>
      </div>
    );
  }

  const question = game.question;
  if (!question) return <p className="text-center text-slate-400 dark:text-slate-500">Laden...</p>;

  const chaptersForBook = chapters.filter((c) => c.bookId === pickedBookId).sort((a, b) => a.number - b.number);
  const uniqueBooks = [...new Map(chapters.map((c) => [c.bookId, c.bookName])).entries()];
  const answered = feedback !== null;

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between text-sm font-bold text-slate-400 dark:text-slate-500">
        <span>
          Vraag {question.index + 1} / {question.total}
        </span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowRules(true)} className="w-9 h-9 rounded-full border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-300 font-extrabold flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Speluitleg openen" title="Speluitleg">i</button>
          {game.level !== "EXPERT" && (
            <button className="btn-secondary !px-3 !py-1.5 !text-xs" disabled={hintLoading || hint !== null || answered} onClick={useHint}>
              💡 Hint ({game.hintCredits})
            </button>
          )}
          <button
            className="btn-secondary !px-3 !py-1.5 !text-xs !text-red-500 dark:!text-red-400"
            disabled={givingUp}
            onClick={() => setConfirmingGiveUp(true)}
          >
            🏳️ Opgeven
          </button>
        </div>
      </div>

      {showRules && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="presentation" onClick={() => setShowRules(false)}>
          <div className="card max-w-lg w-full max-h-[85vh] overflow-y-auto relative" role="dialog" aria-modal="true" aria-labelledby="chapter-solo-rules-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setShowRules(false)} className="absolute top-3 right-3 w-9 h-9 rounded-full text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xl" aria-label="Speluitleg sluiten">×</button>
            <h2 id="chapter-solo-rules-title" className="text-xl font-extrabold text-brand-800 dark:text-brand-300 pr-10">Speluitleg</h2>
            <div className="mt-4 space-y-4 text-sm text-slate-700 dark:text-slate-200">
              <section><h3 className="font-extrabold mb-1">Doel</h3><p>Lees de hoofdstukkop en ontdek uit welk hoofdstuk van het Boek van Mormon die komt.</p></section>
              <section><h3 className="font-extrabold mb-1">Zo speel je</h3><ul className="list-disc pl-5 space-y-1"><li>Beantwoord {game.questionCount} vragen.</li><li>Bij Beginner en Gevorderd krijg je meerkeuze-opties. Bij Expert kies je zelf het boek en hoofdstuk.</li><li>Je kunt een hint gebruiken als je daar tegoed voor hebt. Een hint kan het juiste boek verklappen of een optie uitsluiten.</li><li>Je krijgt punten/XP voor je resultaten en kunt een reeks opbouwen.</li></ul></section>
              <section><h3 className="font-extrabold mb-1">Einde</h3><p>Na de laatste vraag zie je je score en verdiensten. Je kunt tussentijds opgeven, maar krijgt dan geen XP voor dat potje.</p></section>
            </div>
          </div>
        </div>
      )}

      {confirmingGiveUp && (
        <div className="card !py-3 flex flex-col sm:flex-row items-center justify-between gap-3 !border-2 !border-red-200 dark:!border-red-900">
          <p className="text-sm font-bold text-red-600 dark:text-red-400">
            Weet je het zeker? Je krijgt dan geen XP voor dit potje.
          </p>
          <div className="flex gap-2 shrink-0">
            <button className="btn-secondary !px-3 !py-1.5 !text-xs" disabled={givingUp} onClick={() => setConfirmingGiveUp(false)}>
              Annuleren
            </button>
            <button className="btn-primary !bg-red-500 !px-3 !py-1.5 !text-xs" disabled={givingUp} onClick={giveUp}>
              {givingUp ? "Bezig..." : "Ja, opgeven"}
            </button>
          </div>
        </div>
      )}
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${(question.index / question.total) * 100}%` }} />
      </div>

      <div className="card flex flex-col gap-5">
        <p className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Lees deze hoofdstukkop — welk hoofdstuk is dit?</p>
        <p className="text-xl leading-relaxed italic">&ldquo;{question.introText}&rdquo;</p>

        {hint?.bookName && !answered && (
          <p className="text-sm bg-gold-50 dark:bg-slate-700 text-gold-600 dark:text-gold-400 rounded-xl px-3 py-2 font-bold">
            💡 Hint: dit hoofdstuk staat in {hint.bookName}.
          </p>
        )}

        {question.options ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {question.options.map((opt) => {
              const eliminated = hint?.eliminatedChapterId === opt.chapterId;
              const isCorrectOption = answered && feedback?.correctChapter.chapterId === opt.chapterId;
              const isWrongPick = answered && chosenChapterId === opt.chapterId && !isCorrectOption;
              return (
                <button
                  key={opt.chapterId}
                  disabled={submitting || answered || eliminated}
                  onClick={() => submitAnswer(opt.chapterId)}
                  className={`btn text-left border-2 ${
                    isCorrectOption
                      ? "bg-brand-500 text-white border-brand-500"
                      : isWrongPick
                        ? "bg-red-100 text-red-600 border-red-400"
                        : eliminated
                          ? "opacity-30 line-through border-slate-200 dark:border-slate-700"
                          : "bg-white dark:bg-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-600 hover:border-brand-300"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <select
              className="input"
              value={pickedBookId}
              disabled={answered}
              onChange={(e) => {
                setPickedBookId(e.target.value);
                setPickedNumber("");
              }}
            >
              <option value="">Kies een boek...</option>
              {uniqueBooks.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={pickedNumber}
              disabled={answered || !pickedBookId}
              onChange={(e) => setPickedNumber(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Kies een hoofdstuk...</option>
              {chaptersForBook.map((c) => (
                <option key={c.id} value={c.number}>
                  Hoofdstuk {c.number}
                </option>
              ))}
            </select>
            {!answered && (
              <button
                className="btn-primary self-start"
                disabled={submitting || !pickedBookId || pickedNumber === ""}
                onClick={() => {
                  const match = chapters.find((c) => c.bookId === pickedBookId && c.number === pickedNumber);
                  if (match) submitAnswer(match.id);
                }}
              >
                Bevestig keuze
              </button>
            )}
          </div>
        )}

        {answered && feedback && (
          <p
            className={`rounded-xl px-3 py-2 font-bold text-sm ${
              feedback.correct
                ? "bg-brand-50 dark:bg-slate-700 text-brand-700 dark:text-brand-300"
                : "bg-red-50 dark:bg-slate-700 text-red-500 dark:text-red-400"
            }`}
          >
            {feedback.correct ? "Goed gedaan! ✅" : `Niet helemaal — het juiste antwoord was: ${feedback.correctChapter.label}`}
          </p>
        )}

        {answered && !feedback?.finished && (
          <button className="btn-primary self-end" onClick={nextQuestion}>
            Volgende vraag →
          </button>
        )}

        {error && <p className="text-red-600 dark:text-red-400 text-sm font-semibold">{error}</p>}
      </div>
    </div>
  );
}
