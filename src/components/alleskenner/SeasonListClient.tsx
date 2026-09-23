"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SeasonSummary {
  id: string;
  name: string;
  status: "REGULAR" | "FINALE" | "FINISHED";
  host: string;
  champion: string | null;
  members: number;
  evenings: number;
}

export const SEASON_STATUS_LABEL = { REGULAR: "Gewone avonden", FINALE: "Seizoensfinale", FINISHED: "Afgelopen" } as const;

export default function SeasonListClient() {
  const router = useRouter();
  const [seasons, setSeasons] = useState<SeasonSummary[] | null>(null);
  const [name, setName] = useState("");
  const [joinAsPlayer, setJoinAsPlayer] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/alleskenner/seasons")
      .then((r) => r.json())
      .then((d) => setSeasons(d.seasons ?? []))
      .catch(() => setSeasons([]));
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/alleskenner/seasons", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, joinAsPlayer }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      setError(data.error ?? "Kon het seizoen niet maken.");
      return;
    }
    router.push(`/alleskenner/seizoen/${data.id}`);
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">De Alleskenner</p>
          <h1 className="text-3xl font-extrabold text-brand-800 dark:text-brand-300">Seizoenen</h1>
        </div>
        <Link href="/alleskenner" className="btn-secondary !px-3 !py-1.5 !text-sm">
          Los spel
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-3">
          {seasons === null && <p className="text-slate-400">Laden...</p>}
          {seasons?.length === 0 && (
            <div className="card text-slate-500 dark:text-slate-400">
              Je zit nog in geen enkel seizoen. Maak er een voor je vaste quizavond met vrienden.
            </div>
          )}
          {seasons?.map((s) => (
            <Link key={s.id} href={`/alleskenner/seizoen/${s.id}`} className="card flex items-center gap-4 hover:shadow-md transition">
              <span className="text-3xl" aria-hidden>
                {s.status === "FINISHED" ? "👑" : s.status === "FINALE" ? "🏁" : "📅"}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-extrabold truncate dark:text-slate-100">{s.name}</span>
                <span className="block text-sm text-slate-500 dark:text-slate-400">
                  {SEASON_STATUS_LABEL[s.status]} · {s.members} leden · {s.evenings} {s.evenings === 1 ? "avond" : "avonden"} · host {s.host}
                </span>
                {s.champion && <span className="block text-sm font-bold text-gold-600 dark:text-gold-400">Alleskenner: {s.champion}</span>}
              </span>
            </Link>
          ))}
        </div>

        <form onSubmit={create} className="card flex flex-col gap-3 self-start">
          <h2 className="font-extrabold dark:text-slate-100">Nieuw seizoen</h2>
          <input
            className="input"
            placeholder="Naam, bv. Quizavond najaar"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm dark:text-slate-200">
            <input type="checkbox" checked={joinAsPlayer} onChange={(e) => setJoinAsPlayer(e.target.checked)} />
            Ik speel zelf ook mee
          </label>
          <button className="btn-primary" disabled={busy || !name.trim()}>
            {busy ? "Bezig..." : "Seizoen maken"}
          </button>
          {error && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Elke avond spelen drie leden. De winnaar van de avond en de winnaar van de finale blijven zitten, de verliezer
            ligt eruit. Na drie avonden stop je ongeslagen. Aan het eind strijden de ongeslagenen om de titel Alleskenner
            van het seizoen.
          </p>
        </form>
      </div>
    </div>
  );
}
