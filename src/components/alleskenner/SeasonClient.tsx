"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SEASON_STATUS_LABEL } from "@/components/alleskenner/SeasonListClient";
import UserAvatar from "@/components/UserAvatar";

type MemberStatus = "WAITING" | "ACTIVE" | "ELIMINATED" | "RETIRED";

interface Member {
  userId: string;
  name: string;
  status: MemberStatus;
  queuePosition: number;
  evenings: number;
  points: number;
  secondsTotal: number;
  finaleSeed: number | null;
  finaleEntered: boolean;
  finaleOut: boolean;
}

interface Season {
  id: string;
  name: string;
  status: "REGULAR" | "FINALE" | "FINISHED";
  host: { id: string; handle: string };
  deputyHost: { id: string; handle: string } | null;
  champion: { id: string; handle: string } | null;
  canManage: boolean;
  isHost: boolean;
  finaleReady: boolean;
  openEvening: { number: number; code: string; isFinale: boolean } | null;
  nextEvening: { lineup: { userId: string; name: string }[]; error: string | null; isFinale: boolean; isLast: boolean };
  members: Member[];
  ranking: string[];
  evenings: {
    number: number;
    isFinale: boolean;
    isLast: boolean;
    finishedAt: string | null;
    results: { userId: string; name: string; place: number; seconds: number; points: number }[];
  }[];
}

interface Friend {
  id: string;
  handle: string;
}

function statusLabel(m: Member, season: Season): { text: string; style: string } {
  const seasonStatus = season.status;
  if (season.champion?.id === m.userId) {
    return { text: "👑 Alleskenner", style: "bg-gold-500 text-brand-900" };
  }
  if (seasonStatus !== "REGULAR" && m.finaleSeed !== null) {
    if (m.finaleOut) return { text: "Eruit in de finale", style: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" };
    return {
      text: m.finaleEntered ? "Finalist · speelt" : "Finalist · wacht",
      style: "bg-gold-50 text-gold-700 dark:bg-slate-700 dark:text-gold-400",
    };
  }
  switch (m.status) {
    case "WAITING":
      return { text: "Wachtrij", style: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200" };
    case "ACTIVE":
      return { text: "Blijver", style: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200" };
    case "RETIRED":
      return { text: "Ongeslagen gestopt", style: "bg-gold-50 text-gold-700 dark:bg-slate-700 dark:text-gold-400" };
    default:
      return { text: "Eruit", style: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" };
  }
}

export default function SeasonClient({ id }: { id: string }) {
  const router = useRouter();
  const [season, setSeason] = useState<Season | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [absent, setAbsent] = useState<string[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/alleskenner/seasons/${id}?absent=${absent.join(",")}`);
    if (!res.ok) {
      setNotFound(true);
      return;
    }
    setSeason(await res.json());
  }, [id, absent]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!season?.canManage) return;
    fetch("/api/friends")
      .then((r) => r.json())
      .then((d) => setFriends((d.friends ?? []).map((entry: { user: Friend }) => entry.user)))
      .catch(() => {});
  }, [season?.canManage]);

  async function call(url: string, method: string, body?: unknown): Promise<Record<string, unknown> | null> {
    setBusy(true);
    setError(null);
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Er ging iets mis.");
      return null;
    }
    return data;
  }

  async function startEvening() {
    const data = await call(`/api/alleskenner/seasons/${id}/evenings`, "POST", { absentIds: absent });
    if (data?.code) router.push(`/live/${data.code}`);
  }

  async function startFinale() {
    if (!window.confirm("De seizoensfinale starten? Daarna kunnen er geen leden meer bij.")) return;
    if (await call(`/api/alleskenner/seasons/${id}/finale`, "POST")) load();
  }

  async function addMember(userId: string) {
    if (await call(`/api/alleskenner/seasons/${id}/members`, "POST", { userId })) load();
  }

  async function removeMember(userId: string) {
    if (await call(`/api/alleskenner/seasons/${id}/members`, "DELETE", { userId })) load();
  }

  async function setRoles(body: { hostId?: string; deputyHostId?: string | null }) {
    if (body.hostId && !window.confirm("De hostrol overdragen? Je kunt daarna zelf geen avonden meer starten.")) return;
    if (await call(`/api/alleskenner/seasons/${id}`, "PATCH", body)) load();
  }

  if (notFound) {
    return (
      <div className="max-w-md mx-auto card text-center flex flex-col gap-3">
        <p className="font-semibold dark:text-slate-100">Dit seizoen bestaat niet, of je bent er geen lid van.</p>
        <Link href="/alleskenner/seizoen" className="btn-secondary self-center">
          Naar je seizoenen
        </Link>
      </div>
    );
  }
  if (!season) return <p className="text-center text-slate-400">Laden...</p>;

  const byId = new Map(season.members.map((m) => [m.userId, m]));
  const ranked = season.ranking.map((userId) => byId.get(userId)!).filter(Boolean);
  const queue = season.members.filter((m) => m.status === "WAITING");
  const addable = friends.filter((f) => !byId.has(f.id));
  const managing = season.canManage && season.status !== "FINISHED";
  // Wie kan er vanavond afwezig zijn: iedereen die nog zou kunnen spelen.
  const absentCandidates = season.members.filter((m) =>
    season.status === "FINALE" ? m.finaleSeed !== null && !m.finaleOut : m.status === "WAITING" || m.status === "ACTIVE"
  );

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <div className="card !bg-gradient-to-br from-brand-600 to-brand-800 !border-0 text-white flex flex-col gap-1">
        <Link href="/alleskenner/seizoen" className="text-xs font-bold uppercase tracking-wider text-brand-100 hover:underline">
          De Alleskenner · seizoenen
        </Link>
        <h1 className="text-3xl font-extrabold">{season.name}</h1>
        <p className="text-sm text-brand-100">
          {SEASON_STATUS_LABEL[season.status]} · host {season.host.handle}
          {season.deputyHost ? ` · vervangend host ${season.deputyHost.handle}` : ""}
        </p>
        {season.champion && (
          <p className="mt-2 text-lg font-extrabold text-gold-400">👑 Alleskenner van het seizoen: {season.champion.handle}</p>
        )}
      </div>

      {error && <p className="card !py-3 text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}

      {season.openEvening && (
        <Link
          href={`/live/${season.openEvening.code}`}
          className="card !bg-gold-50 dark:!bg-slate-800 !border-gold-400 border-2 flex items-center gap-3 animate-invite-glow"
        >
          <span className="text-3xl" aria-hidden>
            🎙️
          </span>
          <span className="flex-1 font-extrabold dark:text-slate-100">
            {season.openEvening.isFinale ? "Finaleavond" : "Avond"} {season.openEvening.number} is bezig — doe mee of kijk mee
          </span>
          <span className="btn-primary !px-3 !py-1.5 !text-sm">Openen</span>
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        {/* min-w-0: anders rekt de brede tabel de gridkolom op mobiel op. */}
        <div className="flex flex-col gap-6 min-w-0">
          <div className="card flex flex-col gap-2 overflow-x-auto">
            <h2 className="font-extrabold dark:text-slate-100">Klassement</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-2">Naam</th>
                  <th className="py-1 pr-2">Status</th>
                  <th className="py-1 pr-2 text-right hidden sm:table-cell">Avonden</th>
                  <th className="py-1 pr-2 text-right">Punten</th>
                  <th className="py-1 text-right">Sec.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {ranked.map((m, i) => {
                  const label = statusLabel(m, season);
                  return (
                    <tr key={m.userId} className="dark:text-slate-100">
                      <td className="py-2 pr-2 font-extrabold text-slate-400">{i + 1}</td>
                      <td className="py-2 pr-2 font-semibold">
                        <span className="flex items-center gap-2">
                          <UserAvatar id={m.userId} handle={m.name} size="xs" />
                          {m.name}
                        </span>
                      </td>
                      <td className="py-2 pr-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap ${label.style}`}>{label.text}</span>
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums hidden sm:table-cell">{m.evenings}</td>
                      <td className="py-2 pr-2 text-right font-extrabold tabular-nums">{m.points}</td>
                      <td className="py-2 text-right tabular-nums">{m.secondsTotal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Per avond: 3 punten voor de Alleskenner van de avond, 2 voor de winnaar van de finale, 1 voor de verliezer. Bij
              gelijke punten telt het totaal verdiende seconden.
            </p>
          </div>

          {season.evenings.length > 0 && (
            <div className="card flex flex-col gap-3">
              <h2 className="font-extrabold dark:text-slate-100">Gespeelde avonden</h2>
              <ul className="flex flex-col gap-3">
                {[...season.evenings].reverse().map((e) => (
                  <li key={e.number} className="rounded-2xl bg-slate-50 dark:bg-slate-900/50 px-3 py-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {e.isLast ? "Laatste finaleavond" : e.isFinale ? "Finaleavond" : "Avond"} {e.number}
                    </p>
                    <ol className="text-sm dark:text-slate-100">
                      {e.results.map((r) => (
                        <li key={r.userId}>
                          {r.place}. <span className="font-semibold">{r.name}</span>{" "}
                          <span className="text-slate-500 dark:text-slate-400">
                            {r.seconds} s{r.points > 0 ? ` · +${r.points} ${r.points === 1 ? "punt" : "punten"}` : ""}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6 min-w-0">
          {managing && !season.openEvening && (
            <div className="card flex flex-col gap-3">
              <h2 className="font-extrabold dark:text-slate-100">
                Volgende {season.nextEvening.isLast ? "(laatste) finaleavond" : season.nextEvening.isFinale ? "finaleavond" : "avond"}
              </h2>
              {absentCandidates.length > 0 && (
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Wie is er niet?</p>
                  {absentCandidates.map((m) => (
                    <label key={m.userId} className="flex items-center gap-2 text-sm dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={absent.includes(m.userId)}
                        onChange={(e) =>
                          setAbsent((prev) => (e.target.checked ? [...prev, m.userId] : prev.filter((x) => x !== m.userId)))
                        }
                      />
                      {m.name} is afwezig
                    </label>
                  ))}
                </div>
              )}
              {season.nextEvening.lineup.length > 0 && (
                <p className="text-sm dark:text-slate-200">
                  Spelen: <strong>{season.nextEvening.lineup.map((p) => p.name).join(", ")}</strong>
                </p>
              )}
              {season.nextEvening.error && !season.finaleReady && (
                <p className="text-sm text-slate-500 dark:text-slate-400">{season.nextEvening.error}</p>
              )}
              {season.finaleReady ? (
                <button className="btn-primary" disabled={busy} onClick={startFinale}>
                  Seizoensfinale starten
                </button>
              ) : (
                <button className="btn-primary" disabled={busy || season.nextEvening.error !== null} onClick={startEvening}>
                  Avond starten
                </button>
              )}
            </div>
          )}

          {season.status === "REGULAR" && (
            <div className="card flex flex-col gap-2">
              <h2 className="font-extrabold dark:text-slate-100">Wachtrij</h2>
              {queue.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Niemand meer in de wachtrij.</p>
              ) : (
                <ol className="flex flex-col gap-1 text-sm dark:text-slate-100">
                  {queue.map((m, i) => (
                    <li key={m.userId} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        {i + 1}.
                        <UserAvatar id={m.userId} handle={m.name} size="xs" />
                        {m.name}
                      </span>
                      {managing && m.userId !== season.host.id && m.userId !== season.deputyHost?.id && (
                        <button className="text-xs text-red-500 hover:underline" disabled={busy} onClick={() => removeMember(m.userId)}>
                          Verwijderen
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
              )}
              {managing && (
                <>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-400">Lid toevoegen</p>
                  <div className="flex flex-wrap gap-2">
                    {season.isHost && !byId.has(season.host.id) && (
                      <button className="btn-secondary !px-3 !py-1 !text-sm" disabled={busy} onClick={() => addMember(season.host.id)}>
                        + Ikzelf
                      </button>
                    )}
                    {addable.map((f) => (
                      <button key={f.id} className="btn-secondary !px-3 !py-1 !text-sm" disabled={busy} onClick={() => addMember(f.id)}>
                        + {f.handle}
                      </button>
                    ))}
                    {addable.length === 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">Al je vrienden zijn lid.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {season.isHost && season.status !== "FINISHED" && (
            <div className="card flex flex-col gap-3">
              <h2 className="font-extrabold dark:text-slate-100">Host</h2>
              <label className="flex flex-col gap-1 text-sm dark:text-slate-200">
                Vaste vervangende host
                <select
                  className="input"
                  value={season.deputyHost?.id ?? ""}
                  disabled={busy}
                  onChange={(e) => setRoles({ deputyHostId: e.target.value || null })}
                >
                  <option value="">Geen</option>
                  {season.members
                    .filter((m) => m.userId !== season.host.id)
                    .map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm dark:text-slate-200">
                Hostrol overdragen aan
                <select
                  className="input"
                  value=""
                  disabled={busy}
                  onChange={(e) => e.target.value && setRoles({ hostId: e.target.value })}
                >
                  <option value="">Kies een lid...</option>
                  {season.members
                    .filter((m) => m.userId !== season.host.id)
                    .map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name}
                      </option>
                    ))}
                </select>
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ben je er een avond niet? De vervangende host kan dan de avond starten. De host kan ook zelf meespelen.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
