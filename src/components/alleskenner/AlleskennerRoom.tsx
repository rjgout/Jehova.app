"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socketClient";
import type { AkStateView } from "@/lib/alleskenner/types";
import { AK_MIN_PLAYERS } from "@/lib/alleskenner/types";
import AlleskennerGame from "@/components/alleskenner/AlleskennerGame";

interface Friend {
  id: string;
  handle: string;
}

/**
 * Speelruimte van De Alleskenner. Alle spelstatus komt van de server
 * (src/server/alleskenner.ts) via "ak:state"; elke deelnemer krijgt een eigen
 * weergave, dus dit component beslist niets zelf over goed/fout of seconden.
 */
export default function AlleskennerRoom({ code }: { code: string }) {
  const router = useRouter();
  const [state, setState] = useState<AkStateView | null>(null);
  const [receivedAt, setReceivedAt] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    const join = () => socket.emit("ak:join", { code });
    function onState(next: AkStateView) {
      if (next.code !== code) return;
      setState(next);
      setReceivedAt(Date.now());
      setError(null);
    }
    function onError({ message }: { message: string }) {
      setError(message);
    }
    function onCancelled({ code: cancelled }: { code: string }) {
      if (cancelled === code) router.push("/live");
    }
    socket.on("ak:state", onState);
    socket.on("ak:error", onError);
    socket.on("game_cancelled", onCancelled);
    // Na een herverbinding (bv. telefoon even in slaap) opnieuw aanmelden.
    socket.on("connect", join);
    if (socket.connected) join();
    return () => {
      socket.off("ak:state", onState);
      socket.off("ak:error", onError);
      socket.off("game_cancelled", onCancelled);
      socket.off("connect", join);
    };
  }, [code, router]);

  if (!state) {
    return (
      <div className="max-w-md mx-auto card text-center flex flex-col gap-3">
        {error ? (
          <>
            <p className="font-semibold text-red-600 dark:text-red-400">{error}</p>
            <Link href="/live" className="btn-secondary self-center">
              Terug naar Spelen
            </Link>
          </>
        ) : (
          <p className="text-slate-400 dark:text-slate-500">Verbinden met het spel...</p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      {error && <p className="card !py-3 text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}
      {state.phase === "LOBBY" && <Lobby state={state} />}
      {(state.phase === "R369" || state.phase === "PUZZLE" || state.phase === "FINALE") && (
        <AlleskennerGame state={state} receivedAt={receivedAt} />
      )}
      {state.phase === "FINISHED" && <Finished state={state} />}
    </div>
  );
}

const ROLE_LABEL = { player: "Speler", spectator: "Toeschouwer", quizmaster: "Quizmaster" } as const;

function Lobby({ state }: { state: AkStateView }) {
  const socket = getSocket();
  const isHost = state.me.isHost;
  const [friends, setFriends] = useState<Friend[]>([]);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const playerCount = state.participants.filter((p) => p.role === "player").length;

  useEffect(() => {
    if (!isHost) return;
    fetch("/api/friends")
      .then((r) => r.json())
      .then((d) => setFriends((d.friends ?? []).map((entry: { user: Friend }) => entry.user)))
      .catch(() => {});
  }, [isHost]);

  const invitable = friends.filter((f) => !state.participants.some((p) => p.userId === f.id));

  function invite(friendId: string) {
    socket.emit("invite_friend", { toUserId: friendId, code: state.code });
    setInvited((prev) => new Set(prev).add(friendId));
  }

  function cancel() {
    if (!window.confirm("Dit spel beëindigen? Dit kan niet ongedaan worden gemaakt.")) return;
    socket.emit("cancel_game", { code: state.code });
  }

  return (
    <>
      <div className="card !bg-gradient-to-br from-brand-600 to-brand-800 text-white !border-0 flex flex-col gap-1">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-100">De Alleskenner · lobby</p>
        <h1 className="text-2xl font-extrabold">Spelcode {state.code}</h1>
        <p className="text-sm text-brand-100">
          {isHost
            ? "Nodig je vrienden uit, kies wie meespeelt en wie de quizmaster is, en start het spel."
            : `Je doet mee als ${ROLE_LABEL[state.me.role].toLowerCase()}. Wachten tot de host het spel start...`}
        </p>
      </div>

      <div className="card flex flex-col gap-3">
        <h2 className="font-extrabold dark:text-slate-100">Deelnemers</h2>
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
          {state.participants.map((p) => (
            <li key={p.userId} className="flex items-center gap-3 py-2">
              <span className={`h-2.5 w-2.5 rounded-full ${p.online ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"}`} aria-hidden />
              <span className="flex-1 min-w-0 truncate font-semibold dark:text-slate-100">
                {p.name}
                {p.userId === state.hostId && <span className="ml-1.5 text-xs text-slate-400">(host)</span>}
              </span>
              {isHost && p.role !== "quizmaster" ? (
                <select
                  className="input !w-auto !py-1 !text-sm"
                  value={p.role}
                  onChange={(e) => socket.emit("ak:set_role", { userId: p.userId, role: e.target.value })}
                >
                  <option value="player">Speler</option>
                  <option value="spectator">Toeschouwer</option>
                </select>
              ) : (
                <span className="text-sm text-slate-500 dark:text-slate-400">{ROLE_LABEL[p.role]}</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isHost && (
        <div className="card flex flex-col gap-3">
          <h2 className="font-extrabold dark:text-slate-100">Quizmaster</h2>
          <select
            className="input"
            value={state.quizmasterId ?? ""}
            onChange={(e) => socket.emit("ak:set_quizmaster", { userId: e.target.value || null })}
          >
            <option value="">Zonder quizmaster — iedereen tikt zijn antwoord</option>
            {state.participants.map((p) => (
              <option key={p.userId} value={p.userId}>
                {p.name} is quizmaster (speelt niet mee)
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Met quizmaster antwoord je hardop en keurt de quizmaster het goed of fout. Zonder quizmaster tikt iedereen zelf.
          </p>
        </div>
      )}

      {isHost && invitable.length > 0 && (
        <div className="card flex flex-col gap-2">
          <h2 className="font-extrabold dark:text-slate-100">Vrienden uitnodigen</h2>
          <ul className="flex flex-col gap-2">
            {invitable.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3">
                <span className="dark:text-slate-100">{f.handle}</span>
                <button className="btn-secondary !px-3 !py-1.5 !text-sm" disabled={invited.has(f.id)} onClick={() => invite(f.id)}>
                  {invited.has(f.id) ? "Uitgenodigd" : "Nodig uit"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isHost && (
        <div className="flex flex-col items-center gap-2">
          <button className="btn-primary" disabled={playerCount < AK_MIN_PLAYERS} onClick={() => socket.emit("ak:start")}>
            Start het spel ({playerCount} {playerCount === 1 ? "speler" : "spelers"})
          </button>
          {playerCount < AK_MIN_PLAYERS && (
            <p className="text-xs text-slate-500 dark:text-slate-400">Er zijn minstens {AK_MIN_PLAYERS} spelers nodig.</p>
          )}
          <button className="text-sm text-red-500 hover:underline" onClick={cancel}>
            Spel beëindigen
          </button>
        </div>
      )}
    </>
  );
}

function Finished({ state }: { state: AkStateView }) {
  const winner = state.players.find((p) => p.userId === state.winnerId);
  const standings = [...state.players].sort((a, b) => b.seconds - a.seconds);
  return (
    <>
      <div className="card !bg-gradient-to-br from-gold-500 to-gold-700 !border-0 text-brand-900 text-center flex flex-col items-center gap-2 animate-pop">
        <p className="text-5xl" aria-hidden>
          🏆
        </p>
        {winner ? (
          <h1 className="text-2xl font-extrabold">{winner.userId === state.me.userId ? "Jij bent" : `${winner.name} is`} de Alleskenner!</h1>
        ) : (
          <h1 className="text-2xl font-extrabold">Het spel is gestopt</h1>
        )}
      </div>
      <div className="card flex flex-col gap-2">
        <h2 className="font-extrabold dark:text-slate-100">Eindstand</h2>
        <ol className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
          {standings.map((p, i) => (
            <li key={p.userId} className="flex items-center gap-3 py-2">
              <span className="w-6 text-center font-extrabold text-slate-400">{i + 1}</span>
              <span className="flex-1 font-semibold dark:text-slate-100">{p.name}</span>
              <span className="font-extrabold tabular-nums dark:text-slate-100">{Math.round(p.seconds)} s</span>
            </li>
          ))}
        </ol>
      </div>
      <Link href="/live" className="btn-secondary self-center">
        Terug naar Spelen
      </Link>
    </>
  );
}
