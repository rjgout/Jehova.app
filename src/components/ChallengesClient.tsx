"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";

interface ChallengeView {
  id: string;
  status: "PENDING" | "DECLINED" | "ACCEPTED" | "FINISHED";
  isSender: boolean;
  bookName: string;
  chapterNumber: number;
  chapterId: string;
  opponent: { id: string; displayName: string };
  myScore: number | null;
  opponentScore: number | null;
  hasPlayed: boolean;
  won: boolean | null;
  tied: boolean | null;
  createdAt: string;
}

interface FriendOption {
  id: string;
  handle: string;
}

interface ChapterOption {
  id: string;
  label: string;
  exerciseCount: number;
}

export default function ChallengesClient() {
  const [challenges, setChallenges] = useState<ChallengeView[] | null>(null);
  const [friends, setFriends] = useState<FriendOption[] | null>(null);
  const [chapters, setChapters] = useState<ChapterOption[] | null>(null);
  const [selectedFriend, setSelectedFriend] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function load() {
    const res = await fetch("/api/challenges");
    if (res.ok) setChallenges((await res.json()).challenges);
  }

  useEffect(() => {
    load();
    fetch("/api/friends")
      .then((r) => r.json())
      .then((d) => setFriends(d.friends ?? []));
    fetch("/api/chapters")
      .then((r) => r.json())
      .then((d) => setChapters(Array.isArray(d) ? d.filter((c: ChapterOption) => c.exerciseCount > 0) : []));

    // Vanaf de Vrienden-pagina kan je "Daag uit" bij een specifieke vriend
    // klikken — die komt dan hier als voorinvulling binnen.
    const friendParam = searchParams.get("friend");
    if (friendParam) setSelectedFriend(friendParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createChallenge() {
    if (!selectedFriend || !selectedChapter) return;
    setCreating(true);
    setMessage(null);
    const res = await fetch("/api/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendUserId: selectedFriend, chapterId: selectedChapter }),
    });
    const body = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setMessage(body.error ?? "Kon de uitdaging niet versturen.");
      return;
    }
    setMessage("Uitdaging verstuurd! ⚔️");
    setSelectedFriend("");
    setSelectedChapter("");
    load();
  }

  async function respond(id: string, action: "accept" | "decline") {
    await fetch(`/api/challenges/${id}/${action}`, { method: "POST" });
    load();
  }

  function play(c: ChallengeView) {
    router.push(`/lesson/${c.chapterId}?challengeId=${c.id}`);
  }

  async function forfeit(id: string) {
    if (!window.confirm("Weet je zeker dat je wil opgeven? Je tegenstander wordt dan automatisch winnaar.")) return;
    await fetch(`/api/challenges/${id}/forfeit`, { method: "POST" });
    load();
  }

  if (!challenges || !friends || !chapters) return <p className="text-slate-400 dark:text-slate-500">Laden...</p>;

  const incoming = challenges.filter((c) => c.status === "PENDING" && !c.isSender);
  const outgoing = challenges.filter((c) => c.status === "PENDING" && c.isSender);
  const active = challenges.filter((c) => c.status === "ACCEPTED");
  const finished = challenges.filter((c) => c.status === "FINISHED" || c.status === "DECLINED");

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">Uitdagingen</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Daag een vriend uit op een hoofdstuk: jullie spelen allebei wanneer het uitkomt, en zien daarna wie beter
          scoorde.
        </p>
      </div>

      <div className="card flex flex-col gap-3">
        <h2 className="font-extrabold dark:text-slate-100">Nieuwe uitdaging</h2>
        {friends.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Je hebt nog geen vrienden om uit te dagen — voeg er eerst een toe bij Vrienden.
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
            <select className="input" value={selectedChapter} onChange={(e) => setSelectedChapter(e.target.value)}>
              <option value="">Kies een hoofdstuk...</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <button
              className="btn-primary self-start"
              disabled={!selectedFriend || !selectedChapter || creating}
              onClick={createChallenge}
            >
              {creating ? "Bezig..." : "Uitdagen"}
            </button>
          </>
        )}
        {message && <p className="text-sm font-semibold text-brand-600 dark:text-brand-300">{message}</p>}
      </div>

      {incoming.length > 0 && (
        <section>
          <h2 className="font-extrabold mb-2 text-slate-700 dark:text-slate-200">Nieuwe uitdagingen</h2>
          <div className="flex flex-col gap-2">
            {incoming.map((c) => (
              <div
                key={c.id}
                className="card !bg-gold-50 dark:!bg-slate-800 !border-gold-400/30 dark:!border-slate-700 flex items-center justify-between !py-3 flex-wrap gap-2"
              >
                <span className="flex items-center gap-2 dark:text-slate-100">
                  <UserAvatar id={c.opponent.id} handle={c.opponent.displayName} size="xs" />
                  <span>
                    <strong>{c.opponent.displayName}</strong> daagt je uit op {c.bookName} {c.chapterNumber}
                  </span>
                </span>
                <div className="flex gap-2">
                  <button className="btn-primary !px-3 !py-1.5" onClick={() => respond(c.id, "accept")}>
                    Accepteren
                  </button>
                  <button className="btn-secondary !px-3 !py-1.5" onClick={() => respond(c.id, "decline")}>
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
            {active.map((c) => (
              <div key={c.id} className="card flex items-center justify-between !py-3 flex-wrap gap-2">
                <span className="flex items-center gap-2 dark:text-slate-100">
                  <UserAvatar id={c.opponent.id} handle={c.opponent.displayName} size="xs" />
                  <span>
                    Tegen <strong>{c.opponent.displayName}</strong> op {c.bookName} {c.chapterNumber}
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  {c.hasPlayed ? (
                    <span className="text-sm text-slate-400 dark:text-slate-500">Wachten op tegenstander...</span>
                  ) : (
                    <button className="btn-primary !px-3 !py-1.5" onClick={() => play(c)}>
                      Speel je beurt
                    </button>
                  )}
                  <button className="btn-secondary !px-3 !py-1.5 !text-red-500 !border-red-200" onClick={() => forfeit(c.id)}>
                    Opgeven
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {outgoing.length > 0 && (
        <section>
          <h2 className="font-extrabold mb-2 text-slate-700 dark:text-slate-200">Verstuurd, nog geen reactie</h2>
          <div className="flex flex-col gap-2">
            {outgoing.map((c) => (
              <div key={c.id} className="card !py-3 text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <UserAvatar id={c.opponent.id} handle={c.opponent.displayName} size="xs" />
                <span>
                  Wachten op {c.opponent.displayName} — {c.bookName} {c.chapterNumber}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {finished.length > 0 && (
        <section>
          <h2 className="font-extrabold mb-2 text-slate-700 dark:text-slate-200">Afgerond</h2>
          <div className="flex flex-col gap-2">
            {finished.map((c) => (
              <div key={c.id} className="card !py-3 text-sm dark:text-slate-200 flex items-center gap-2">
                <UserAvatar id={c.opponent.id} handle={c.opponent.displayName} size="xs" />
                {c.status === "DECLINED" ? (
                  <span className="text-slate-400 dark:text-slate-500">
                    {c.bookName} {c.chapterNumber} tegen {c.opponent.displayName} — geweigerd
                  </span>
                ) : (
                  <span>
                    {c.bookName} {c.chapterNumber} tegen {c.opponent.displayName}: jij {c.myScore ?? "–"}% —{" "}
                    {c.opponent.displayName} {c.opponentScore ?? "–"}%{" "}
                    <strong
                      className={
                        c.tied
                          ? "text-slate-500 dark:text-slate-400"
                          : c.won
                            ? "text-gold-600 dark:text-gold-400"
                            : "text-slate-400 dark:text-slate-500"
                      }
                    >
                      {c.tied ? "gelijkspel" : c.won ? "🎉 gewonnen" : "verloren"}
                    </strong>
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {incoming.length === 0 && outgoing.length === 0 && active.length === 0 && finished.length === 0 && (
        <p className="text-slate-400 dark:text-slate-500 text-center">Nog geen uitdagingen — daag hierboven een vriend uit!</p>
      )}
    </div>
  );
}
