"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socketClient";
import { useLobbyExit } from "@/lib/useLobbyExit";
import LobbyClosedNotice from "@/components/LobbyClosedNotice";
import type { AkStateView } from "@/lib/alleskenner/types";
import { AK_MAX_TEAMS, AK_MIN_PLAYERS, AK_MIN_TEAM_PLAYERS } from "@/lib/alleskenner/types";
import AlleskennerGame, { TEAM_DOTS } from "@/components/alleskenner/AlleskennerGame";
import UserAvatar from "@/components/UserAvatar";
import LobbyInviteCard from "@/components/LobbyInviteCard";

interface Friend {
  id: string;
  handle: string;
}

/**
 * Speelruimte van De Alleskenner. Alle spelstatus komt van de server
 * (src/server/alleskenner.ts) via "ak:state"; elke deelnemer krijgt een eigen
 * weergave, dus dit component beslist niets zelf over goed/fout of seconden.
 */
export default function AlleskennerRoom({ code, soloRunId }: { code: string; soloRunId?: string }) {
  const [state, setState] = useState<AkStateView | null>(null);
  const [receivedAt, setReceivedAt] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    const join = () => (soloRunId ? socket.emit("ak:solo_join", { runId: soloRunId }) : socket.emit("ak:join", { code }));
    function onState(next: AkStateView) {
      if (next.code !== code) return;
      setState(next);
      setReceivedAt(Date.now());
      setError(null);
    }
    function onError({ message }: { message: string }) {
      setError(message);
    }
    socket.on("ak:state", onState);
    socket.on("ak:error", onError);
    // Na een herverbinding (bv. telefoon even in slaap) opnieuw aanmelden.
    socket.on("connect", join);
    if (socket.connected) join();
    return () => {
      socket.off("ak:state", onState);
      socket.off("ak:error", onError);
      socket.off("connect", join);
    };
  }, [code, soloRunId]);

  // Sluiten door de host en zelf vertrekken: zie useLobbyExit.
  const { closedByHost, leave } = useLobbyExit(code, { isHost: state?.me.isHost ?? false, alleskenner: true });
  if (closedByHost) return <LobbyClosedNotice />;

  if (!state) {
    return (
      <div className="max-w-md mx-auto card text-center flex flex-col gap-3">
        {error ? (
          <>
            <p className="font-semibold text-red-600 dark:text-red-400">{error}</p>
            <Link href={soloRunId ? "/alleskenner/alleen" : "/live"} className="btn-secondary self-center">
              {soloRunId ? "Terug naar alleen spelen" : "Terug naar Spelen"}
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
      {state.phase === "LOBBY" && <Lobby state={state} onLeave={leave} />}
      {state.phase !== "LOBBY" && state.phase !== "FINISHED" && (
        <AlleskennerGame state={state} receivedAt={receivedAt} />
      )}
      {state.phase === "FINISHED" && <Finished state={state} />}
    </div>
  );
}

const ROLE_LABEL = { player: "Speler", spectator: "Toeschouwer", quizmaster: "Quizmaster" } as const;

function Lobby({ state, onLeave }: { state: AkStateView; onLeave: () => void }) {
  const socket = getSocket();
  const isHost = state.me.isHost;
  const [friends, setFriends] = useState<Friend[]>([]);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const playerCount = state.participants.filter((p) => p.role === "player").length;
  const teams = state.lobbyTeams;
  const season = state.season;
  const minPlayers = season ? season.lineup.length : teams ? AK_MIN_TEAM_PLAYERS : AK_MIN_PLAYERS;

  useEffect(() => {
    if (!isHost) return;
    fetch("/api/friends")
      .then((r) => r.json())
      .then((d) => setFriends((d.friends ?? []).map((entry: { user: Friend }) => entry.user)))
      .catch(() => {});
  }, [isHost]);


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
        <p className="text-xs font-bold uppercase tracking-wider text-brand-100">
          {season ? (season.isLast ? "Laatste seizoensfinale-avond" : season.isFinale ? "Seizoensfinale-avond" : "Seizoensavond") : "Lobby"}
        </p>
        <h1 className="text-2xl font-extrabold">De Alleskenner</h1>
        <p className="text-sm text-brand-100">
          {isHost
            ? "Nodig je vrienden uit, kies wie meespeelt en wie de quizmaster is, en start het spel."
            : `Je doet mee als ${ROLE_LABEL[state.me.role].toLowerCase()}. Wachten tot de host het spel start...`}
        </p>
        {season && (
          <p className="text-sm text-white mt-1">
            Vanavond spelen: <strong>{season.lineup.map((p) => p.name).join(", ")}</strong>. De rest van het seizoen kijkt mee.
          </p>
        )}
        <p className="text-xs font-bold text-gold-400 mt-1">
          {state.length === "FULL" ? "Volledig spel: zes rondes" : "Kort spel: 3-6-9, Puzzel en Finale"}
          {teams ? ` · ${teams.length} teams` : ""}
        </p>
      </div>

      <div className="card flex flex-col gap-3">
        <h2 className="font-extrabold dark:text-slate-100">Deelnemers</h2>
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
          {state.participants.map((p) => {
            const team = teams && p.teamIndex !== null ? teams[p.teamIndex] : null;
            const isLeader = team?.leaderId === p.userId;
            return (
              <li key={p.userId} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2">
                {/* Groene rand = online; wie (nog) niet verbonden is, staat vager. */}
                <UserAvatar
                  id={p.userId}
                  handle={p.name}
                  size="xs"
                  className={p.online ? "ring-2 ring-green-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-800" : "opacity-50"}
                />
                <span className="flex-1 min-w-[8rem] truncate font-semibold dark:text-slate-100">
                  {p.name}
                  {p.userId === state.hostId && <span className="ml-1.5 text-xs text-slate-400">(host)</span>}
                  {isLeader && <span className="ml-1.5 text-xs font-bold text-gold-600 dark:text-gold-400">★ teamleider</span>}
                </span>
                {teams && p.teamIndex !== null && !isHost && (
                  <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                    <span className={`h-2 w-2 rounded-full ${TEAM_DOTS[p.teamIndex % TEAM_DOTS.length]}`} aria-hidden />
                    {teams[p.teamIndex].name}
                  </span>
                )}
                {isHost && teams && p.teamIndex !== null && (
                  <>
                    <select
                      className="input !w-auto !py-1 !text-sm"
                      value={p.teamIndex}
                      onChange={(e) => socket.emit("ak:set_team", { userId: p.userId, team: Number(e.target.value) })}
                    >
                      {teams.map((t, i) => (
                        <option key={t.name} value={i}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        isLeader
                          ? "bg-gold-50 text-gold-700 dark:bg-slate-700 dark:text-gold-400"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:text-gold-600"
                      }`}
                      disabled={isLeader}
                      onClick={() => socket.emit("ak:set_leader", { userId: p.userId })}
                      title="Maak teamleider"
                    >
                      ★
                    </button>
                  </>
                )}
                {isHost && p.role !== "quizmaster" && !season ? (
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
            );
          })}
        </ul>
      </div>

      {isHost && (
        <div className="card flex flex-col gap-3">
          <h2 className="font-extrabold dark:text-slate-100">Spelduur</h2>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "SHORT", title: "Kort", text: "3-6-9, Puzzel, Finale" },
                { value: "FULL", title: "Volledig", text: "Alle zes rondes" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                onClick={() => socket.emit("ak:set_length", { length: option.value })}
                className={`rounded-2xl border-2 px-3 py-2.5 text-left transition ${
                  state.length === option.value
                    ? "border-brand-500 bg-brand-50 dark:bg-slate-700"
                    : "border-slate-200 dark:border-slate-600 hover:border-brand-300"
                }`}
              >
                <span className="block font-extrabold dark:text-slate-100">{option.title}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{option.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {isHost && (
        <div className="card flex flex-col gap-3">
          <h2 className="font-extrabold dark:text-slate-100">Quizmaster</h2>
          <select
            className="input"
            value={state.quizmasterId ?? ""}
            onChange={(e) => socket.emit("ak:set_quizmaster", { userId: e.target.value || null })}
          >
            <option value="">Zonder quizmaster — iedereen tikt zijn antwoord</option>
            {state.participants
              .filter((p) => !season?.lineup.some((l) => l.userId === p.userId))
              .map((p) => (
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

      {isHost && !season && (playerCount >= AK_MIN_TEAM_PLAYERS || teams) && (
        <div className="card flex flex-col gap-3">
          <h2 className="font-extrabold dark:text-slate-100">Teams</h2>
          <select
            className="input"
            value={teams?.length ?? 0}
            onChange={(e) => socket.emit("ak:set_teams", { count: Number(e.target.value) })}
          >
            <option value={0}>Iedereen voor zich</option>
            {Array.from({ length: AK_MAX_TEAMS - 1 }, (_, i) => i + 2).map((count) => (
              <option key={count} value={count}>
                {count} teams
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Alleen het antwoord van de teamleider (★) telt voor het team. De andere teamleden kiezen stil hun eigen antwoord
            voor persoonlijke punten; aan het eind is er naast het winnende team ook een beste speler.
          </p>
        </div>
      )}

      {isHost && !season && (
        <LobbyInviteCard
          friends={friends}
          invitedIds={invited}
          joinedIds={state.participants.map((p) => p.userId)}
          onInvite={invite}
        />
      )}

      {isHost && (
        <div className="flex flex-col items-center gap-2">
          <button className="btn-primary" disabled={playerCount < minPlayers} onClick={() => socket.emit("ak:start")}>
            Start het spel ({playerCount} {playerCount === 1 ? "speler" : "spelers"})
          </button>
          {playerCount < minPlayers && (
            <p className="text-xs text-slate-500 dark:text-slate-400">Er zijn minstens {minPlayers} spelers nodig.</p>
          )}
          <button className="text-sm text-red-500 hover:underline" onClick={cancel}>
            Spel beëindigen
          </button>
        </div>
      )}

      {!isHost && (
        <button className="self-center text-sm font-semibold text-slate-500 dark:text-slate-400 hover:underline" onClick={onLeave}>
          Lobby verlaten
        </button>
      )}
    </>
  );
}

function Finished({ state }: { state: AkStateView }) {
  if (state.season && state.winnerId) return <SeasonFinished state={state} />;
  if (state.solo) return <SoloFinished state={state} solo={state.solo} />;
  const winner = state.contestants.find((c) => c.id === state.winnerId);
  const standings = [...state.contestants].sort((a, b) => b.seconds - a.seconds);
  const best = state.personal?.ranking?.[0] ?? null;
  const mine = winner && winner.id === state.me.contestantId;
  return (
    <>
      <div className="card !bg-gradient-to-br from-gold-500 to-gold-700 !border-0 text-brand-900 text-center flex flex-col items-center gap-2 animate-pop">
        <p className="text-5xl" aria-hidden>
          🏆
        </p>
        {winner ? (
          <h1 className="text-2xl font-extrabold">
            {state.teamMode
              ? `${winner.name}${mine ? " (jouw team)" : ""} is de Alleskenner!`
              : `${mine ? "Jij bent" : `${winner.name} is`} de Alleskenner!`}
          </h1>
        ) : (
          <h1 className="text-2xl font-extrabold">Het spel is gestopt</h1>
        )}
        {best && best.points > 0 && (
          <p className="font-bold">
            Beste speler: {best.userId === state.me.userId ? "jij" : best.name} ({best.points} punten)
          </p>
        )}
      </div>
      <div className="card flex flex-col gap-2">
        <h2 className="font-extrabold dark:text-slate-100">Eindstand</h2>
        <ol className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
          {standings.map((c, i) => (
            <li key={c.id} className="flex items-center gap-3 py-2">
              <span className="w-6 text-center font-extrabold text-slate-400">{i + 1}</span>
              {/* Bij teams is een deelnemer een team, geen gebruiker. */}
              {!state.teamMode && <UserAvatar id={c.id} handle={c.name} size="xs" />}
              <span className="flex-1 font-semibold dark:text-slate-100">
                {c.name}
                {state.teamMode && (
                  <span className="block text-xs font-normal text-slate-400">{c.members.map((m) => m.name).join(", ")}</span>
                )}
              </span>
              <span className="font-extrabold tabular-nums dark:text-slate-100">{Math.round(c.seconds)} s</span>
            </li>
          ))}
        </ol>
      </div>
      {state.personal?.ranking && (
        <div className="card flex flex-col gap-2">
          <h2 className="font-extrabold dark:text-slate-100">Persoonlijke punten</h2>
          <ol className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
            {state.personal.ranking.map((p, i) => (
              <li key={p.userId} className="flex items-center gap-3 py-1.5">
                <span className="w-6 text-center font-extrabold text-slate-400">{i + 1}</span>
                <UserAvatar id={p.userId} handle={p.name} size="xs" />
                <span className="flex-1 font-semibold dark:text-slate-100">{p.name}</span>
                <span className="font-extrabold tabular-nums dark:text-slate-100">{p.points}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <Link href="/live" className="btn-secondary self-center">
        Terug naar Spelen
      </Link>
    </>
  );
}

function SeasonFinished({ state }: { state: AkStateView }) {
  const season = state.season!;
  const name = (id: string | null) =>
    id === state.me.userId ? "Jij" : (state.contestants.find((c) => c.id === id)?.name ?? "");
  const loser = state.finalists?.find((id) => id !== state.winnerId) ?? null;
  const standings = [...state.contestants].sort((a, b) => b.seconds - a.seconds);
  return (
    <>
      <div className="card !bg-gradient-to-br from-gold-500 to-gold-700 !border-0 text-brand-900 text-center flex flex-col items-center gap-2 animate-pop">
        <p className="text-5xl" aria-hidden>
          {season.isLast ? "👑" : "🏆"}
        </p>
        {season.isLast ? (
          <h1 className="text-2xl font-extrabold">{name(state.winnerId)} {state.winnerId === state.me.userId ? "bent" : "is"} de Alleskenner van het seizoen!</h1>
        ) : (
          <>
            {season.safeId && (
              <h1 className="text-2xl font-extrabold">
                {name(season.safeId)} {season.safeId === state.me.userId ? "bent" : "is"} Alleskenner van de avond!
              </h1>
            )}
            <p className="font-bold">
              {name(state.winnerId)} wint de finale en is door. {name(loser)} ligt eruit.
            </p>
          </>
        )}
      </div>
      <div className="card flex flex-col gap-2">
        <h2 className="font-extrabold dark:text-slate-100">Stand van vanavond</h2>
        <ol className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
          {standings.map((c, i) => (
            <li key={c.id} className="flex items-center gap-3 py-2">
              <span className="w-6 text-center font-extrabold text-slate-400">{i + 1}</span>
              <UserAvatar id={c.id} handle={c.name} size="xs" />
              <span className="flex-1 font-semibold dark:text-slate-100">{c.name}</span>
              <span className="font-extrabold tabular-nums dark:text-slate-100">{Math.round(c.seconds)} s</span>
            </li>
          ))}
        </ol>
      </div>
      <Link href={`/alleskenner/seizoen/${season.seasonId}`} className="btn-primary self-center">
        Naar het seizoen
      </Link>
    </>
  );
}

function SoloFinished({ state, solo }: { state: AkStateView; solo: NonNullable<AkStateView["solo"]> }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seconds = Math.round(state.contestants[0]?.seconds ?? 0);
  const stopped = state.winnerId === null;

  async function practice() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/alleskenner/solo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "PRACTICE" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      setError(data.error ?? "Kon geen nieuw potje beginnen.");
      return;
    }
    router.push(`/alleskenner/alleen/${data.runId}`);
  }

  return (
    <>
      <div className="card !bg-gradient-to-br from-gold-500 to-gold-700 !border-0 text-brand-900 text-center flex flex-col items-center gap-2 animate-pop">
        <p className="text-xs font-bold uppercase tracking-wider">
          {solo.mode === "DAILY" ? "Alleskenner van de dag" : "Vrij oefenen"}
        </p>
        {stopped ? (
          <>
            <h1 className="text-2xl font-extrabold">Je bent gestopt</h1>
            <p className="font-semibold">
              {solo.mode === "DAILY" ? "Deze poging telt niet mee. Morgen staat er een nieuwe klaar." : "Dit potje telt niet mee."}
            </p>
          </>
        ) : (
          <>
            <p className="text-6xl font-extrabold tabular-nums">{seconds}</p>
            <p className="font-bold">seconden over</p>
            <p className="text-sm font-semibold">
              {solo.xpEarned === null
                ? "Resultaat opslaan..."
                : `+${solo.xpEarned} XP${solo.rank !== null ? ` · plek ${solo.rank} van vandaag` : ""}`}
            </p>
          </>
        )}
      </div>
      {error && <p className="card !py-3 text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/alleskenner/alleen" className="btn-primary">
          {solo.mode === "DAILY" ? "Naar het klassement" : "Terug"}
        </Link>
        <button className="btn-secondary" onClick={practice} disabled={busy}>
          {busy ? "Bezig..." : solo.mode === "DAILY" ? "Vrij oefenen" : "Nog een potje"}
        </button>
      </div>
    </>
  );
}
