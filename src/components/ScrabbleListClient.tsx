"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";
import { getSocket } from "@/lib/socketClient";
import FriendPicker, { type PickerFriend } from "@/components/FriendPicker";

interface GameView {
  id: string;
  status: "PENDING" | "DECLINED" | "ACTIVE" | "FINISHED" | "CANCELLED";
  isSender: boolean;
  opponent: { id: string; displayName: string };
  myScore: number;
  opponentScore: number;
  isMyTurn: boolean;
  won: boolean | null;
  tied: boolean | null;
}

export default function ScrabbleListClient() {
  const [games, setGames] = useState<GameView[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function load() {
    const res = await fetch("/api/scrabble");
    if (res.ok) setGames((await res.json()).games);
  }

  useEffect(() => {
    load();
    // De tegenstander nodigde uit, accepteerde, weigerde of speelde: meteen
    // verversen in plaats van pas bij de volgende keer openen.
    const socket = getSocket();
    const onUpdated = () => load();
    socket.on("scrabble_updated", onUpdated);
    return () => {
      socket.off("scrabble_updated", onUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Uit het vriendenpaneel; een foutmelding blijft in het paneel staan. */
  async function createGame(friend: PickerFriend): Promise<string | null> {
    setMessage(null);
    const res = await fetch("/api/scrabble", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendUserId: friend.id }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return body.error ?? "Kon het spel niet aanmaken.";
    setMessage(`Uitnodiging verstuurd naar ${friend.handle}! 🔤`);
    // De route kan de socketserver niet bereiken: zelf seinen, zodat je
    // vriend de uitnodiging meteen ziet (melding bovenin, lijst ververst).
    if (body.id) getSocket().emit("scrabble_changed", { gameId: body.id });
    load();
    return null;
  }

  async function respond(id: string, action: "accept" | "decline" | "cancel") {
    const res = await fetch(`/api/scrabble/${id}/${action}`, { method: "POST" });
    if (res.ok) getSocket().emit("scrabble_changed", { gameId: id });
    if (res.ok && action === "accept") {
      router.push(`/scrabble/${id}`);
      return;
    }
    load();
  }

  if (!games) return <p className="text-slate-400 dark:text-slate-500">Laden...</p>;

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
        <p className="text-sm text-slate-500 dark:text-slate-400">Kies een vriend; die krijgt meteen je uitnodiging.</p>
        <button className="btn-primary self-start" onClick={() => setPickerOpen(true)}>
          Kies een vriend
        </button>
        {message && <p className="text-sm font-semibold text-brand-600 dark:text-brand-300">{message}</p>}
        <FriendPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          title="Woordspel met..."
          subtitle="Tik op een vriend om uit te nodigen."
          onPick={createGame}
        />
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
                <span className="flex items-center gap-2 dark:text-slate-100">
                  <UserAvatar id={g.opponent.id} handle={g.opponent.displayName} size="xs" />
                  <span>
                    <strong>{g.opponent.displayName}</strong> daagt je uit voor een woordspel
                  </span>
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
                <span className="flex items-center gap-2 dark:text-slate-100">
                  <UserAvatar id={g.opponent.id} handle={g.opponent.displayName} size="xs" />
                  <span>
                    Tegen <strong>{g.opponent.displayName}</strong> — {g.myScore} - {g.opponentScore}
                  </span>
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
              <div
                key={g.id}
                className="card !py-3 text-slate-500 dark:text-slate-400 flex items-center justify-between flex-wrap gap-2"
              >
                <span className="flex items-center gap-2">
                  <UserAvatar id={g.opponent.id} handle={g.opponent.displayName} size="xs" />
                  <span>Wachten op {g.opponent.displayName}</span>
                </span>
                <button className="btn-secondary !px-3 !py-1.5" onClick={() => respond(g.id, "cancel")}>
                  Annuleren
                </button>
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
              <div key={g.id} className="card !py-3 text-sm dark:text-slate-200 flex items-center gap-2">
                <UserAvatar id={g.opponent.id} handle={g.opponent.displayName} size="xs" />
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
