"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface GameView {
  id: string;
  status: "PENDING" | "DECLINED" | "ACTIVE" | "FINISHED";
  isSender: boolean;
  opponent: { id: string; displayName: string };
  myScore: number;
  opponentScore: number;
  isMyTurn: boolean;
  won: boolean | null;
  tied: boolean | null;
}

interface FriendOption {
  id: string;
  handle: string;
}

export default function ScrabbleListClient() {
  const [games, setGames] = useState<GameView[] | null>(null);
  const [friends, setFriends] = useState<FriendOption[] | null>(null);
  const [selectedFriend, setSelectedFriend] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function load() {
    const res = await fetch("/api/scrabble");
    if (res.ok) setGames((await res.json()).games);
  }

  useEffect(() => {
    load();
    fetch("/api/friends")
      .then((r) => r.json())
      .then((d) => setFriends(d.friends ?? []));
    const friendParam = searchParams.get("friend");
    if (friendParam) setSelectedFriend(friendParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createGame() {
    if (!selectedFriend) return;
    setCreating(true);
    setMessage(null);
    const res = await fetch("/api/scrabble", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendUserId: selectedFriend }),
    });
    const body = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setMessage(body.error ?? "Kon het spel niet aanmaken.");
      return;
    }
    setMessage("Uitnodiging verstuurd! 🔤");
    setSelectedFriend("");
    load();
  }

  async function respond(id: string, action: "accept" | "decline") {
    const res = await fetch(`/api/scrabble/${id}/${action}`, { method: "POST" });
    if (res.ok && action === "accept") {
      router.push(`/scrabble/${id}`);
      return;
    }
    load();
  }

  if (!games || !friends) return <p className="text-slate-400 dark:text-slate-500">Laden...</p>;

  const incoming = games.filter((g) => g.status === "PENDING" && !g.isSender);
  const outgoing = games.filter((g) => g.status === "PENDING" && g.isSender);
  const active = games.filter((g) => g.status === "ACTIVE");
  const finished = games.filter((g) => g.status === "FINISHED" || g.status === "DECLINED");

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">Woordspel</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Een woordlegspel met alleen woorden uit het Boek van Mormon. Asynchroon: speel je
          beurt wanneer het uitkomt.
        </p>
      </div>

      <div className="card flex flex-col gap-3">
        <h2 className="font-extrabold dark:text-slate-100">Nieuw spel</h2>
        {friends.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Je hebt nog geen vrienden om tegen te spelen — voeg er eerst een toe bij Vrienden.
          </p>
        ) : (
          <>
            <select className="input" value={selectedFriend} onChange={(e) => setSelectedFriend(e.target.value)}>
              <option value="">Kies een vriend...</option>
              {friends.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.handle}
                </option>
              ))}
            </select>
            <button className="btn-primary self-start" disabled={!selectedFriend || creating} onClick={createGame}>
              {creating ? "Bezig..." : "Uitnodigen"}
            </button>
          </>
        )}
        {message && <p className="text-sm font-semibold text-brand-600 dark:text-brand-300">{message}</p>}
      </div>

      {incoming.length > 0 && (
        <section>
          <h2 className="font-extrabold mb-2 text-slate-700 dark:text-slate-200">Nieuwe uitnodigingen</h2>
          <div className="flex flex-col gap-2">
            {incoming.map((g) => (
              <div
                key={g.id}
                className="card !bg-gold-50 dark:!bg-slate-800 !border-gold-400/30 dark:!border-slate-700 flex items-center justify-between !py-3 flex-wrap gap-2"
              >
                <span className="dark:text-slate-100">
                  <strong>{g.opponent.displayName}</strong> daagt je uit voor een woordspel
                </span>
                <div className="flex gap-2">
                  <button className="btn-primary !px-3 !py-1.5" onClick={() => respond(g.id, "accept")}>
                    Accepteren
                  </button>
                  <button className="btn-secondary !px-3 !py-1.5" onClick={() => respond(g.id, "decline")}>
                    Weigeren
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {active.length > 0 && (
        <section>
          <h2 className="font-extrabold mb-2 text-slate-700 dark:text-slate-200">Actief</h2>
          <div className="flex flex-col gap-2">
            {active.map((g) => (
              <div
                key={g.id}
                className={`card flex items-center justify-between !py-3 flex-wrap gap-2 cursor-pointer ${
                  g.isMyTurn ? "!border-gold-400/40 dark:!border-gold-400/30" : ""
                }`}
                onClick={() => router.push(`/scrabble/${g.id}`)}
              >
                <span className="dark:text-slate-100">
                  Tegen <strong>{g.opponent.displayName}</strong> — {g.myScore} - {g.opponentScore}
                </span>
                {g.isMyTurn ? (
                  <span className="text-xs font-extrabold uppercase text-gold-700 dark:text-gold-400 bg-gold-50 dark:bg-slate-700 rounded-full px-3 py-1">
                    Jij bent aan de beurt!
                  </span>
                ) : (
                  <span className="text-sm text-slate-400 dark:text-slate-500">Wachten op {g.opponent.displayName}...</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {outgoing.length > 0 && (
        <section>
          <h2 className="font-extrabold mb-2 text-slate-700 dark:text-slate-200">Verstuurd, nog geen reactie</h2>
          <div className="flex flex-col gap-2">
            {outgoing.map((g) => (
              <div key={g.id} className="card !py-3 text-slate-500 dark:text-slate-400">
                Wachten op {g.opponent.displayName}
              </div>
            ))}
          </div>
        </section>
      )}

      {finished.length > 0 && (
        <section>
          <h2 className="font-extrabold mb-2 text-slate-700 dark:text-slate-200">Afgerond</h2>
          <div className="flex flex-col gap-2">
            {finished.map((g) => (
              <div key={g.id} className="card !py-3 text-sm dark:text-slate-200">
                {g.status === "DECLINED" ? (
                  <span className="text-slate-400 dark:text-slate-500">Tegen {g.opponent.displayName} — geweigerd</span>
                ) : (
                  <span>
                    Tegen {g.opponent.displayName}: {g.myScore} - {g.opponentScore}{" "}
                    <strong
                      className={
                        g.tied
                          ? "text-slate-500 dark:text-slate-400"
                          : g.won
                            ? "text-gold-600 dark:text-gold-400"
                            : "text-slate-400 dark:text-slate-500"
                      }
                    >
                      {g.tied ? "gelijkspel" : g.won ? "🎉 gewonnen" : "verloren"}
                    </strong>
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {incoming.length === 0 && outgoing.length === 0 && active.length === 0 && finished.length === 0 && (
        <p className="text-slate-400 dark:text-slate-500 text-center">Nog geen woordspellen — nodig hierboven een vriend uit!</p>
      )}
    </div>
  );
}
