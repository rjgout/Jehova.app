"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { getSocket } from "@/lib/socketClient";
import { getDutchVoices, getSelectedDutchVoice } from "@/lib/readAloud";
import type { AkStateView } from "@/lib/alleskenner/types";

const GROUP_STYLES = [
  "bg-sky-200 dark:bg-sky-800 text-sky-950 dark:text-white",
  "bg-amber-200 dark:bg-amber-700 text-amber-950 dark:text-white",
  "bg-emerald-200 dark:bg-emerald-800 text-emerald-950 dark:text-white",
];

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

/** Leest een vers voor met een Nederlandse stem (alleen op één apparaat, zie hieronder). */
function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "nl-NL";
  const voice = getSelectedDutchVoice() ?? getDutchVoices()[0];
  if (voice) utterance.voice = voice;
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

export default function AlleskennerGame({ state, receivedAt }: { state: AkStateView; receivedAt: number }) {
  const socket = getSocket();
  const ticking = state.clockRunning || state.turnDeadline !== null;
  const now = useNow(ticking);
  const elapsed = ticking ? Math.max(0, (now - receivedAt) / 1000) : 0;
  const isActive = state.activeId === state.me.userId;
  const isQuizmaster = state.quizmasterId === state.me.userId;
  const tapMode = state.quizmasterId === null;
  const activeName = state.players.find((p) => p.userId === state.activeId)?.name ?? null;
  const deadlineLeft =
    state.turnDeadline !== null ? Math.max(0, Math.ceil((state.turnDeadline - state.serverNow) / 1000 - elapsed)) : null;

  const displaySeconds = (userId: string, seconds: number) =>
    state.clockRunning && state.activeId === userId ? Math.max(0, seconds - elapsed) : seconds;

  const scoreboardPlayers =
    state.phase === "FINALE" && state.finalists
      ? state.players.filter((p) => state.finalists!.includes(p.userId))
      : state.players;

  return (
    <>
      <Header state={state} deadlineLeft={deadlineLeft} />

      <div className={`grid gap-2 ${scoreboardPlayers.length <= 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
        {scoreboardPlayers.map((p) => {
          const active = p.userId === state.activeId;
          const seconds = displaySeconds(p.userId, p.seconds);
          return (
            <div
              key={p.userId}
              className={`rounded-2xl px-3 py-2.5 flex flex-col items-center transition ${
                active
                  ? "bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg animate-invite-glow"
                  : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm"
              }`}
            >
              <span className="text-xs font-bold truncate max-w-full">
                {p.name}
                {p.userId === state.me.userId && " (jij)"}
              </span>
              <span className={`text-3xl font-extrabold tabular-nums ${active && state.clockRunning ? "text-gold-400" : ""}`}>
                {Math.ceil(seconds)}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? "text-brand-100" : "text-slate-400"}`}>
                {active ? (state.clockRunning ? "⏱ klok loopt" : "aan de beurt") : "seconden"}
              </span>
            </div>
          );
        })}
      </div>

      {state.intermission ? (
        <div className="card !bg-gradient-to-br from-brand-700 to-brand-900 !border-0 text-white text-center flex flex-col gap-2 py-10 animate-pop">
          <h2 className="text-3xl font-extrabold">{state.intermission.title}</h2>
          <p className="text-brand-100">{state.intermission.subtitle}</p>
        </div>
      ) : (
        <>
          <TurnBanner state={state} isActive={isActive} isQuizmaster={isQuizmaster} activeName={activeName} tapMode={tapMode} />
          {state.phase === "R369" && state.r369 && (
            <Round369 state={state} isActive={isActive} isQuizmaster={isQuizmaster} tapMode={tapMode} />
          )}
          {state.phase === "PUZZLE" && state.puzzle && (
            <RoundPuzzle state={state} isActive={isActive} isQuizmaster={isQuizmaster} tapMode={tapMode} />
          )}
          {state.phase === "FINALE" && state.finale && (
            <RoundFinale state={state} isActive={isActive} isQuizmaster={isQuizmaster} tapMode={tapMode} />
          )}
          {(isActive || isQuizmaster) && state.activeId && (
            <button className="btn-secondary self-center !px-8" onClick={() => socket.emit("ak:pass")}>
              {isQuizmaster && !isActive ? `Beurt van ${activeName} beëindigen (pas)` : "PAS"}
            </button>
          )}
        </>
      )}

      <Feedback state={state} />

      {state.me.isHost && (
        <button
          className="text-xs text-slate-400 hover:text-red-500 hover:underline self-center"
          onClick={() => window.confirm("Het spel nu stoppen?") && socket.emit("ak:stop")}
        >
          Spel stoppen
        </button>
      )}
    </>
  );
}

function Header({ state, deadlineLeft }: { state: AkStateView; deadlineLeft: number | null }) {
  let title = "";
  let detail = "";
  if (state.phase === "R369" && state.r369) {
    title = "3-6-9";
    detail = `Vraag ${state.r369.number} van ${state.r369.total}`;
  } else if (state.phase === "PUZZLE" && state.puzzle) {
    title = "Puzzel";
    detail = `Puzzel ${state.puzzle.number} van ${state.puzzle.total}`;
  } else if (state.phase === "FINALE" && state.finale) {
    title = "Finale";
    detail = `Onderwerp ${state.finale.number} van ${state.finale.total}`;
  } else if (state.phase === "PUZZLE") {
    title = "Puzzel";
  } else if (state.phase === "FINALE") {
    title = "Finale";
  } else {
    title = "3-6-9";
  }
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">De Alleskenner</p>
        <h1 className="text-xl font-extrabold text-brand-800 dark:text-brand-300">
          {title} <span className="text-sm font-bold text-slate-400 dark:text-slate-500">{detail}</span>
        </h1>
      </div>
      {deadlineLeft !== null && (
        <span
          className={`rounded-full px-3 py-1 text-sm font-extrabold tabular-nums ${
            deadlineLeft <= 5 ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          }`}
          title="Bedenktijd"
        >
          ⏳ {deadlineLeft}
        </span>
      )}
    </div>
  );
}

function TurnBanner({
  state,
  isActive,
  isQuizmaster,
  activeName,
  tapMode,
}: {
  state: AkStateView;
  isActive: boolean;
  isQuizmaster: boolean;
  activeName: string | null;
  tapMode: boolean;
}) {
  if (!state.activeId) return null;
  let text: string;
  if (isActive) text = tapMode ? "🟢 Jij bent aan de beurt" : "🟢 Jij bent aan de beurt — zeg je antwoord hardop";
  else if (isQuizmaster) text = `🎙️ ${activeName} is aan de beurt — keur het antwoord goed of fout`;
  else text = `${activeName} is aan de beurt`;
  return (
    <p
      className={`text-center font-extrabold ${
        isActive ? "text-green-600 dark:text-green-400 text-lg" : "text-slate-500 dark:text-slate-400"
      }`}
    >
      {text}
    </p>
  );
}

function Round369({
  state,
  isActive,
  isQuizmaster,
  tapMode,
}: {
  state: AkStateView;
  isActive: boolean;
  isQuizmaster: boolean;
  tapMode: boolean;
}) {
  const socket = getSocket();
  const q = state.r369!;
  // De luistervraag wordt maar op één apparaat voorgelezen (quizmaster, of
  // zonder quizmaster degene die aan de beurt is): anders praat iedere
  // telefoon in de kamer door elkaar heen.
  const speaker = tapMode ? isActive : isQuizmaster;
  const spokenFor = useRef<string | null>(null);
  useEffect(() => {
    if (!q.listenText || !speaker || q.reveal) return;
    const key = `${q.number}`;
    if (spokenFor.current === key) return;
    spokenFor.current = key;
    speak(q.listenText);
  }, [q.listenText, q.number, q.reveal, speaker]);

  return (
    <div className="card flex flex-col gap-4">
      {q.isPointQuestion && (
        <span className="self-start rounded-full bg-gold-50 dark:bg-slate-700 px-3 py-1 text-xs font-extrabold text-gold-700 dark:text-gold-400">
          ⭐ Goed = +10 seconden
        </span>
      )}
      {q.listenText && (
        <div className="flex items-center gap-3 rounded-2xl bg-brand-50 dark:bg-slate-700 px-4 py-3">
          <span className="text-2xl" aria-hidden>
            🔊
          </span>
          <p className="flex-1 text-sm font-semibold text-brand-800 dark:text-brand-200">
            Luistervraag — {speaker ? "het vers wordt op dit apparaat voorgelezen." : "luister goed naar het voorgelezen vers."}
          </p>
          <button className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={() => speak(q.listenText!)}>
            Afspelen
          </button>
        </div>
      )}
      <h2 className="text-xl font-extrabold dark:text-slate-100">{q.prompt}</h2>

      {q.options && (
        <div className="grid gap-2 sm:grid-cols-2">
          {q.options.map((option) => {
            const revealed = q.reveal !== null;
            const isAnswer = revealed && option === q.reveal!.answer;
            return (
              <button
                key={option}
                disabled={!isActive || revealed}
                onClick={() => socket.emit("ak:tap_369", { option })}
                className={`rounded-2xl border-2 px-4 py-3 text-left font-bold transition ${
                  isAnswer
                    ? "border-green-500 bg-green-50 dark:bg-green-900/40 text-green-800 dark:text-green-200"
                    : "border-slate-200 dark:border-slate-600 dark:text-slate-100 enabled:hover:border-brand-400 enabled:active:scale-[0.98]"
                } disabled:cursor-default`}
              >
                {option}
              </button>
            );
          })}
        </div>
      )}

      {q.reveal && (
        <p className={`text-center font-extrabold ${q.reveal.correct ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
          {q.reveal.correct ? "✓ Goed!" : "✗ Niet goed"} — het antwoord is: {q.reveal.answer}
        </p>
      )}

      {isQuizmaster && state.quizmaster?.answer369 && !q.reveal && (
        <div className="rounded-2xl border-2 border-dashed border-gold-400 bg-gold-50 dark:bg-slate-900/50 p-3 flex flex-col gap-3">
          <p className="text-sm dark:text-slate-200">
            <span className="font-bold text-gold-700 dark:text-gold-400">Antwoord:</span> {state.quizmaster.answer369}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-primary !bg-green-600" onClick={() => socket.emit("ak:qm_369", { correct: true })}>
              ✓ Goed
            </button>
            <button className="btn-primary !bg-red-500" onClick={() => socket.emit("ak:qm_369", { correct: false })}>
              ✗ Fout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RoundPuzzle({
  state,
  isActive,
  isQuizmaster,
  tapMode,
}: {
  state: AkStateView;
  isActive: boolean;
  isQuizmaster: boolean;
  tapMode: boolean;
}) {
  const socket = getSocket();
  const puzzle = state.puzzle!;
  const [answer, setAnswer] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!answer.trim()) return;
    socket.emit("ak:type_puzzle", { text: answer.trim() });
    setAnswer("");
  }

  return (
    <div className="card flex flex-col gap-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Er horen telkens vier omschrijvingen bij elkaar. Noem het woord dat ze verbindt. Elke groep: +30 seconden.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {puzzle.clues.map((clue) => (
          <div
            key={clue.text}
            className={`rounded-xl px-2 py-3 min-h-[4.5rem] flex items-center justify-center text-center text-xs sm:text-sm font-bold transition ${
              clue.group !== null
                ? GROUP_STYLES[clue.group]
                : "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100"
            }`}
          >
            {clue.text}
          </div>
        ))}
      </div>

      {puzzle.found.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {puzzle.found.map((f) => (
            <span key={f.group} className={`rounded-full px-3 py-1 text-sm font-extrabold ${GROUP_STYLES[f.group]}`}>
              {f.answer}
            </span>
          ))}
        </div>
      )}

      {tapMode && isActive && (
        <form onSubmit={submit} className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Typ het verbindende woord"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
          />
          <button className="btn-primary" type="submit">
            Controleer
          </button>
        </form>
      )}

      {isQuizmaster && state.quizmaster?.puzzleGroups && !puzzle.revealed && (
        <div className="rounded-2xl border-2 border-dashed border-gold-400 bg-gold-50 dark:bg-slate-900/50 p-3 flex flex-col gap-2">
          <p className="text-sm font-bold text-gold-700 dark:text-gold-400">Tik een groep aan zodra die genoemd is:</p>
          {state.quizmaster.puzzleGroups.map((group, index) => (
            <button
              key={group.answer}
              disabled={group.found || !state.activeId}
              onClick={() => socket.emit("ak:qm_puzzle", { group: index })}
              className={`rounded-xl px-3 py-2 text-left disabled:opacity-60 ${GROUP_STYLES[index]}`}
            >
              <span className="font-extrabold">{group.found ? "✓ " : ""}{group.answer}</span>
              {group.accept.length > 0 && <span className="text-xs"> (ook goed: {group.accept.join(", ")})</span>}
              <span className="block text-xs opacity-80">{group.clues.join(" · ")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RoundFinale({
  state,
  isActive,
  isQuizmaster,
  tapMode,
}: {
  state: AkStateView;
  isActive: boolean;
  isQuizmaster: boolean;
  tapMode: boolean;
}) {
  const socket = getSocket();
  const finale = state.finale!;

  return (
    <div className="card flex flex-col gap-4">
      <h2 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">Wat weet je van {finale.subject}?</h2>
      <div className="flex items-center gap-2">
        {Array.from({ length: finale.answerCount }).map((_, i) => (
          <span
            key={i}
            className={`h-3 flex-1 rounded-full ${i < finale.found.length ? "bg-green-500" : "bg-slate-200 dark:bg-slate-700"}`}
          />
        ))}
        <span className="text-sm font-extrabold tabular-nums dark:text-slate-100">
          {finale.found.length}/{finale.answerCount}
        </span>
      </div>

      {finale.found.length > 0 && !finale.revealed && (
        <ul className="flex flex-col gap-1">
          {finale.found.map((text) => (
            <li key={text} className="text-sm font-bold text-green-700 dark:text-green-400">
              ✓ {text}
            </li>
          ))}
        </ul>
      )}

      {finale.revealed && (
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Alle antwoorden</p>
          <ul className="flex flex-col gap-1">
            {finale.revealed.map((text) => (
              <li key={text} className={`text-sm font-bold ${finale.found.includes(text) ? "text-green-700 dark:text-green-400" : "text-slate-600 dark:text-slate-300"}`}>
                {finale.found.includes(text) ? "✓" : "•"} {text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tapMode && finale.grid && !finale.revealed && (
        <>
          {isActive && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tik de antwoorden aan die bij {finale.subject} horen. Tik je een fout antwoord aan, dan is je beurt voorbij.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {finale.grid.map((cell) => (
              <button
                key={cell.text}
                disabled={!isActive || cell.state !== "open"}
                onClick={() => socket.emit("ak:tap_finale", { text: cell.text })}
                className={`rounded-xl border-2 px-3 py-2.5 text-left text-sm font-bold transition ${
                  cell.state === "found"
                    ? "border-green-500 bg-green-50 dark:bg-green-900/40 text-green-800 dark:text-green-200"
                    : cell.state === "wrong"
                      ? "border-red-400 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 line-through"
                      : "border-slate-200 dark:border-slate-600 dark:text-slate-100 enabled:hover:border-brand-400 enabled:active:scale-[0.98]"
                } disabled:cursor-default`}
              >
                {cell.text}
              </button>
            ))}
          </div>
        </>
      )}

      {isQuizmaster && state.quizmaster?.finaleAnswers && !finale.revealed && (
        <div className="rounded-2xl border-2 border-dashed border-gold-400 bg-gold-50 dark:bg-slate-900/50 p-3 flex flex-col gap-2">
          <p className="text-sm font-bold text-gold-700 dark:text-gold-400">Tik een antwoord aan zodra het genoemd is:</p>
          {state.quizmaster.finaleAnswers.map((answer, index) => (
            <button
              key={answer.text}
              disabled={answer.found || !state.activeId}
              onClick={() => socket.emit("ak:qm_finale", { index })}
              className="rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 px-3 py-2 text-left disabled:opacity-60"
            >
              <span className="font-extrabold dark:text-slate-100">{answer.found ? "✓ " : ""}{answer.text}</span>
              {answer.accept.length > 0 && (
                <span className="block text-xs text-slate-500 dark:text-slate-400">Ook goed: {answer.accept.join(", ")}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Feedback({ state }: { state: AkStateView }) {
  const [visible, setVisible] = useState<AkStateView["feedback"]>(null);
  // Alleen nieuwe meldingen tonen (niet de laatste van vóór het openen van
  // dit scherm); vergeleken op de servertijd van de melding zelf, zodat een
  // afwijkende klok van dit toestel niet uitmaakt.
  const lastShownAt = useRef<number | null>(state.feedback?.at ?? null);
  useEffect(() => {
    if (!state.feedback || state.feedback.at === lastShownAt.current) return;
    lastShownAt.current = state.feedback.at;
    setVisible(state.feedback);
    const timer = setTimeout(() => setVisible(null), 2500);
    return () => clearTimeout(timer);
  }, [state.feedback]);
  if (!visible) return null;
  const who = state.players.find((p) => p.userId === visible.userId)?.name;
  const mine = visible.userId === state.me.userId;
  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 top-[calc(var(--header-height,4.5rem)+0.75rem)] z-40 max-w-[90vw] text-center rounded-full px-5 py-2.5 font-extrabold shadow-lg animate-pop pointer-events-none ${
        visible.kind === "good" ? "bg-green-600 text-white" : visible.kind === "bad" ? "bg-red-500 text-white" : "bg-slate-800 text-white"
      }`}
    >
      {!mine && who ? `${who}: ` : ""}
      {visible.text}
    </div>
  );
}
