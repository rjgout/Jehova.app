"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SoloLeaderboardEntry, SoloOverview } from "@/lib/alleskenner/solo";

type Board = "today" | "week" | "friends";

const BOARDS: { key: Board; label: string; empty: string }[] = [
  { key: "today", label: "Vandaag", empty: "Nog niemand heeft de Alleskenner van vandaag gespeeld. Wees de eerste!" },
  { key: "week", label: "Deze week", empty: "Deze week heeft nog niemand gespeeld." },
  { key: "friends", label: "Vrienden", empty: "Nog geen van je vrienden heeft vandaag gespeeld." },
];

/**
 * Alleen spelen: de Alleskenner van de dag (één poging, klassement) en vrij
 * oefenen. Het potje zelf draait in AlleskennerRoom, met dezelfde rondes als
 * een quizavond behalve de finale.
 */
export default function SoloClient({ myUserId }: { myUserId: string }) {
  const router = useRouter();
  const [overview, setOverview] = useState<SoloOverview | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [board, setBoard] = useState<Board>("today");
  const [busy, setBusy] = useState<"DAILY" | "PRACTICE" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/alleskenner/solo", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setOverview)
      .catch(() => setLoadError(true));
  }, []);

  async function start(mode: "DAILY" | "PRACTICE") {
    setBusy(mode);
    setError(null);
    const res = await fetch("/api/alleskenner/solo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(null);
      setError(data.error ?? "Kon het spel niet starten.");
      return;
    }
    router.push(`/alleskenner/alleen/${data.runId}`);
  }

  const today = overview?.today;
  const entries = overview?.leaderboards[board] ?? [];

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card !bg-gradient-to-br from-brand-600 to-brand-800 text-white !border-0 flex flex-col gap-3">
          <p className="text-4xl" aria-hidden>
            🧠
          </p>
          <h1 className="text-2xl font-extrabold">Alleskenner van de dag</h1>
          <p className="text-brand-100 text-sm">
            Elke dag dezelfde vragen voor iedereen, en je hebt één poging. 3-6-9, Open Deur, Puzzel, Galerij en Collectief
            Geheugen: de seconden die je overhoudt zijn je score.
          </p>
          {!overview ? (
            <p className="text-sm text-brand-100">{loadError ? "Kon je stand niet laden." : "Laden..."}</p>
          ) : today!.status === "FINISHED" ? (
            <div className="rounded-2xl bg-white/15 px-4 py-3 flex items-center justify-between gap-3">
              <span>
                <span className="block text-xs font-bold uppercase tracking-wider text-brand-100">Vandaag gespeeld</span>
                <span className="text-2xl font-extrabold tabular-nums">{today!.seconds} seconden</span>
              </span>
              <span className="text-right text-sm font-bold">
                {today!.rank !== null && <span className="block">Plek {today!.rank}</span>}
                <span className="text-gold-400">+{today!.xpEarned} XP</span>
              </span>
            </div>
          ) : today!.status === "ABANDONED" ? (
            <p className="rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold">
              Je bent vandaag gestopt; die poging telt niet mee. Morgen staat er een nieuwe klaar.
            </p>
          ) : (
            <button
              className="btn-primary !bg-gold-500 !text-brand-900 self-start"
              onClick={() => start("DAILY")}
              disabled={busy !== null}
            >
              {busy === "DAILY" ? "Bezig..." : today!.status === "IN_PROGRESS" ? "Verder spelen" : "Speel de Alleskenner van vandaag"}
            </button>
          )}
        </div>

        <div className="card flex flex-col gap-3">
          <p className="text-4xl" aria-hidden>
            🎯
          </p>
          <h2 className="text-2xl font-extrabold dark:text-slate-100">Vrij oefenen</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Zo vaak je wilt, met vragen die je nog niet eerder had. Telt niet mee voor het klassement, maar levert wel XP op
            en houdt je reeks vast.
          </p>
          <button className="btn-secondary self-start mt-auto" onClick={() => start("PRACTICE")} disabled={busy !== null}>
            {busy === "PRACTICE" ? "Bezig..." : overview?.practiceRunId ? "Nieuw oefenpotje" : "Begin met oefenen"}
          </button>
          {overview?.practiceRunId && (
            <button
              className="text-sm font-semibold text-brand-700 dark:text-brand-300 hover:underline self-start"
              onClick={() => router.push(`/alleskenner/alleen/${overview.practiceRunId}`)}
            >
              Of ga verder met je vorige oefenpotje →
            </button>
          )}
        </div>
      </div>

      {error && <p className="card !py-3 text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}

      <div className="card flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-extrabold text-lg dark:text-slate-100">Klassement</h2>
          <div className="flex rounded-full bg-slate-100 dark:bg-slate-700 p-1">
            {BOARDS.map((b) => (
              <button
                key={b.key}
                onClick={() => setBoard(b.key)}
                className={`rounded-full px-3 py-1 text-sm font-bold transition ${
                  board === b.key
                    ? "bg-white dark:bg-slate-900 text-brand-700 dark:text-brand-300 shadow-sm"
                    : "text-slate-500 dark:text-slate-300"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {board === "week"
            ? "Alle seconden van de Alleskenner van de dag sinds maandag bij elkaar opgeteld."
            : `Seconden over bij de Alleskenner van vandaag${overview ? ` · ${overview.playersToday} ${overview.playersToday === 1 ? "speler" : "spelers"}` : ""}.`}
        </p>
        {!overview ? (
          <p className="text-sm text-slate-400">{loadError ? "Kon het klassement niet laden." : "Laden..."}</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{BOARDS.find((b) => b.key === board)!.empty}</p>
        ) : (
          <ol className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
            {entries.map((e) => (
              <LeaderboardRow key={e.userId} entry={e} mine={e.userId === myUserId} board={board} />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function LeaderboardRow({ entry, mine, board }: { entry: SoloLeaderboardEntry; mine: boolean; board: Board }) {
  const medal = entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : null;
  return (
    <li className={`flex items-center gap-3 py-2 ${mine ? "rounded-xl bg-brand-50 dark:bg-slate-700/60 px-2 -mx-2" : ""}`}>
      <span className="w-7 text-center font-extrabold text-slate-400">{medal ?? entry.rank}</span>
      <span className="flex-1 min-w-0 truncate font-semibold dark:text-slate-100">
        {entry.handle}
        <span className="text-xs font-normal text-slate-400">#{entry.discriminator}</span>
        {mine && <span className="ml-1.5 text-xs font-bold text-brand-600 dark:text-brand-300">(jij)</span>}
      </span>
      {board === "week" && entry.days !== undefined && (
        <span className="text-xs text-slate-400">
          {entry.days} {entry.days === 1 ? "dag" : "dagen"}
        </span>
      )}
      <span className="font-extrabold tabular-nums dark:text-slate-100">{entry.seconds} s</span>
    </li>
  );
}
