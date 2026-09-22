"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSocket } from "@/lib/socketClient";
import { announceXpChanged } from "@/lib/xpBroadcast";

interface LobbyPlayer {
  userId: string;
  displayName: string;
  score: number;
}

interface ChapterOptionView {
  id: string;
  label: string;
}

interface QuestionData {
  index: number;
  total: number;
  timeLimitMs: number;
  introText: string;
  options?: ChapterOptionView[];
}

interface ChapterOption {
  id: string;
  bookId: string;
  bookName: string;
  number: number;
}

interface Friend {
  id: string;
  handle: string;
}

interface HintResult {
  eliminatedChapterId?: string;
  bookId?: string;
  bookName?: string;
}

type Phase = "connecting" | "lobby" | "question" | "reveal" | "finished" | "error";
type Level = "BEGINNER" | "ADVANCED" | "EXPERT";

const LEVEL_LABELS: Record<Level, string> = { BEGINNER: "Beginner", ADVANCED: "Gevorderd", EXPERT: "Expert" };

export default function ChapterGuessGameRoom({ code, myUserId }: { code: string; myUserId: string }) {
  const [phase, setPhase] = useState<Phase>("connecting");
  const [hostId, setHostId] = useState<string | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [answeredCount, setAnsweredCount] = useState({ answered: 0, total: 0 });
  const [correctChapterId, setCorrectChapterId] = useState<string | null>(null);
  const [correctChapterLabel, setCorrectChapterLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [choice, setChoice] = useState("");
  const [pickedBookId, setPickedBookId] = useState("");
  const [pickedNumber, setPickedNumber] = useState<number | "">("");
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [hint, setHint] = useState<HintResult | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintError, setHintError] = useState<string | null>(null);
  const [forfeitedBy, setForfeitedBy] = useState<string | null>(null);

  const socket = getSocket();

  useEffect(() => {
    socket.emit("join_game", { code });

    function onLobby(data: { hostId: string; status: string; level: Level | null; players: LobbyPlayer[] }) {
      setHostId(data.hostId);
      setPlayers(data.players);
      setLevel(data.level);
      if (data.status === "LOBBY") setPhase((p) => (p === "connecting" ? "lobby" : p));
    }
    function onQuestion(data: QuestionData) {
      setQuestion(data);
      setCorrectChapterId(null);
      setCorrectChapterLabel(null);
      setSubmitted(false);
      setChoice("");
      setPickedBookId("");
      setPickedNumber("");
      setHint(null);
      setHintError(null);
      setAnsweredCount({ answered: 0, total: players.length });
      setPhase("question");
    }
    function onAnswerReceived(data: { answered: number; total: number }) {
      setAnsweredCount(data);
    }
    function onReveal(data: { correctAnswer: string[]; correctChapterLabel?: string; scoreboard: LobbyPlayer[] }) {
      setCorrectChapterId(data.correctAnswer[0] ?? null);
      setCorrectChapterLabel(data.correctChapterLabel ?? null);
      setPlayers(data.scoreboard);
      setPhase("reveal");
    }
    function onFinished(data: { scoreboard: LobbyPlayer[]; forfeitedBy?: string }) {
      setPlayers(data.scoreboard);
      setForfeitedBy(data.forfeitedBy ?? null);
      setPhase("finished");
      announceXpChanged();
    }
    function onError(data: { message: string }) {
      setErrorMessage(data.message);
      setPhase("error");
    }
    function onHintResult(data: HintResult) {
      setHint(data);
      if (data.bookId) setPickedBookId(data.bookId);
      setHintLoading(false);
    }
    function onHintError(data: { message: string }) {
      setHintError(data.message);
      setHintLoading(false);
    }

    socket.on("lobby_update", onLobby);
    socket.on("question", onQuestion);
    socket.on("answer_received", onAnswerReceived);
    socket.on("reveal", onReveal);
    socket.on("game_finished", onFinished);
    socket.on("error_message", onError);
    socket.on("hint_result", onHintResult);
    socket.on("hint_error", onHintError);

    return () => {
      socket.off("lobby_update", onLobby);
      socket.off("question", onQuestion);
      socket.off("answer_received", onAnswerReceived);
      socket.off("reveal", onReveal);
      socket.off("game_finished", onFinished);
      socket.off("error_message", onError);
      socket.off("hint_result", onHintResult);
      socket.off("hint_error", onHintError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    fetch("/api/friends")
      .then((r) => r.json())
      .then((d) => setFriends(d.friends ?? []));
    fetch("/api/chapters")
      .then((r) => r.json())
      .then(setChapters);
  }, []);

  function startGame() {
    socket.emit("start_game");
  }

  function inviteFriend(friendId: string) {
    socket.emit("invite_friend", { toUserId: friendId, code });
    setInvited((prev) => new Set(prev).add(friendId));
  }

  function cancelGame() {
    if (!window.confirm("Dit spel beëindigen? Dit kan niet ongedaan worden gemaakt.")) return;
    socket.emit("cancel_game", { code });
  }

  function submitAnswer(chapterId: string) {
    if (submitted) return;
    setChoice(chapterId);
    socket.emit("submit_answer", { given: [chapterId] });
    setSubmitted(true);
  }

  function confirmAdvanced() {
    const match = chapters.find((c) => c.bookId === pickedBookId && c.number === pickedNumber);
    if (match) submitAnswer(match.id);
  }

  function requestHint() {
    if (hintLoading || hint) return;
    setHintError(null);
    setHintLoading(true);
    socket.emit("use_hint");
  }

  function forfeit() {
    if (!window.confirm("Weet je zeker dat je wil opgeven? Je tegenstander wint dan automatisch.")) return;
    socket.emit("forfeit");
  }

  if (phase === "error") {
    return (
      <div className="max-w-md mx-auto card text-center flex flex-col gap-4">
        <p className="text-red-600 dark:text-red-400 font-bold">{errorMessage}</p>
        <Link href="/live" className="btn-secondary self-center">
          Terug
        </Link>
      </div>
    );
  }

  if (phase === "connecting") {
    return <p className="text-center text-slate-400 dark:text-slate-500">Verbinden...</p>;
  }

  if (phase === "lobby") {
    const nonPlayerFriends = friends.filter((f) => !players.some((p) => p.userId === f.id));
    return (
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        <div className="flex justify-end">
        </div>
        ;
  }

  if (phase === "finished") {
    const forfeiter = players.find((p) => p.userId === forfeitedBy);
    return (
      <div className="max-w-xl mx-auto flex flex-col gap-6 items-center">
        <h1 className="text-3xl font-extrabold text-brand-800 dark:text-brand-300">🏁 Spel afgelopen!</h1>
        {forfeiter && (
          <p className="text-sm font-bold text-red-500 bg-red-50 dark:bg-slate-700 rounded-xl px-3 py-2">
            {forfeiter.userId === myUserId ? "Je hebt opgegeven." : `${forfeiter.displayName} heeft opgegeven.`}
          </p>
        )}
        <Scoreboard players={players} myUserId={myUserId} showMedals />
        <Link href="/chapter-guess" className="btn-primary">
          Nieuw spel
        </Link>
      </div>
    );
  }

  return null;
}

function CountdownBar({ timeLimitMs, active }: { timeLimitMs: number; active: boolean }) {
  const [pct, setPct] = useState(100);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (!active) return;
    startRef.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      setPct(Math.max(0, 100 - (elapsed / timeLimitMs) * 100));
    }, 100);
    return () => clearInterval(interval);
  }, [active, timeLimitMs]);

  return (
    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
      <div
        className={`h-full transition-all duration-100 ${pct < 25 ? "bg-red-400" : "bg-brand-500"}`}
        style={{ width: `${active ? pct : 0}%` }}
      />
    </div>
  );
}

function Scoreboard({ players, myUserId, showMedals }: { players: LobbyPlayer[]; myUserId: string; showMedals?: boolean }) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="card flex flex-col divide-y divide-slate-100 w-full">
      {players.map((p, i) => (
        <div key={p.userId} className={`flex items-center justify-between py-2 ${p.userId === myUserId ? "font-extrabold" : ""}`}>
          <span>
            {showMedals ? medals[i] ?? i + 1 : i + 1}. {p.displayName} {p.userId === myUserId && "(jij)"}
          </span>
          <span className="text-gold-600 font-bold">{p.score}</span>
        </div>
      ))}
    </div>
  );
}
