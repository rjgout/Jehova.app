"use client";

import { useEffect, useState } from "react";
import { formatTag } from "@/lib/handle";
import { getSocket } from "@/lib/socketClient";
import UserTag from "@/components/UserTag";

interface FriendUser {
  id: string;
  handle: string;
  discriminator: string;
  xpTotal: number;
  currentStreak: number;
  avatarEmoji: string | null;
}

interface FriendStatus {
  online: boolean;
  activity?: { icon: string; label: string };
  lastSeenLabel?: string;
}

interface FriendsData {
  friends: { friendshipId: string; user: FriendUser }[];
  incoming: { friendshipId: string; from: FriendUser }[];
  outgoing: { friendshipId: string; to: FriendUser }[];
  statusByUserId: Record<string, FriendStatus>;
}

interface SearchResult {
  id: string;
  handle: string;
  discriminator: string;
  friendshipStatus: "PENDING" | "ACCEPTED" | "DECLINED" | null;
}

// Puur decoratief: elke gebruiker krijgt een stabiele (niet-willekeurige,
// dus niet bij elke render andere) avatarkleur uit het bestaande
// merkkleurenpalet, afgeleid van hun id.
const AVATAR_COLORS = ["bg-brand-500", "bg-brand-600", "bg-ice-500", "bg-gold-500"];
function avatarColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
function initialsFor(handle: string): string {
  return handle.slice(0, 2).toUpperCase();
}

function Avatar({
  id,
  handle,
  avatarEmoji,
  size = "md",
}: {
  id: string;
  handle: string;
  avatarEmoji?: string | null;
  size?: "sm" | "md";
}) {
  const dims = size === "sm" ? "w-9 h-9 text-xs" : "w-11 h-11 text-sm";
  return (
    <span
      className={`shrink-0 ${dims} rounded-full ${avatarColorFor(id)} text-white font-extrabold flex items-center justify-center`}
      aria-hidden
    >
      {avatarEmoji || initialsFor(handle)}
    </span>
  );
}

export default function FriendsClient() {
  const [data, setData] = useState<FriendsData | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [giftedTo, setGiftedTo] = useState<string | null>(null);
  const [pendingFreeze, setPendingFreeze] = useState<FriendUser | null>(null);
  const [confirmingFreeze, setConfirmingFreeze] = useState(false);

  async function load() {
    const res = await fetch("/api/friends");
    if (res.ok) setData(await res.json());
  }

  useEffect(() => {
    load();
    // Een iPhone-app die je terughaalt laadt de pagina niet opnieuw; zonder
    // dit bleef bv. "Wachten op ..." staan nadat de ander had geaccepteerd.
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // Live updates: dezelfde altijd-open socketverbinding die ook
  // uitnodigingen binnenkrijgt (zie InviteListener.tsx) — de server pusht
  // hierop al naar `user:${jouwId}` zodra een vriend van status verandert,
  // dus alleen luisteren en de kaart bijwerken hoeft hier verder niets te
  // abonneren/joinen.
  useEffect(() => {
    const socket = getSocket();
    function onStatusUpdate(payload: { userId: string; hidden: boolean } & Partial<FriendStatus>) {
      setData((prev) => {
        if (!prev) return prev;
        const next = { ...prev.statusByUserId };
        if (payload.hidden) {
          delete next[payload.userId];
        } else {
          next[payload.userId] = {
            online: !!payload.online,
            activity: payload.activity,
            lastSeenLabel: payload.lastSeenLabel,
          };
        }
        return { ...prev, statusByUserId: next };
      });
    }
    function onStatusReset() {
      setData((prev) => (prev ? { ...prev, statusByUserId: {} } : prev));
    }
    // Seintje van de server dat de ander een verzoek stuurde of accepteerde
    // (zie "friendship_changed" in gameServer.ts): lijst opnieuw ophalen.
    function onFriendsChanged() {
      load();
    }
    socket.on("friend_status_update", onStatusUpdate);
    socket.on("friend_status_reset", onStatusReset);
    socket.on("friends_changed", onFriendsChanged);
    return () => {
      socket.off("friend_status_update", onStatusUpdate);
      socket.off("friend_status_reset", onStatusReset);
      socket.off("friends_changed", onFriendsChanged);
    };
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => setResults(d.results));
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  async function sendRequest(target: SearchResult) {
    setMessage(null);
    const res = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: target.id }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(body.error ?? "Er ging iets mis.");
    } else {
      setMessage(`Vriendschapsverzoek naar ${formatTag(target.handle, target.discriminator)} verstuurd!`);
      setSentTo((prev) => new Set(prev).add(target.id));
      getSocket().emit("friendship_changed", { otherUserId: target.id });
      load();
    }
  }

  async function respond(friendshipId: string, action: "accept" | "decline", otherUserId: string) {
    const res = await fetch(`/api/friends/${friendshipId}/${action}`, { method: "POST" });
    if (res.ok && action === "accept") getSocket().emit("friendship_changed", { otherUserId });
    load();
  }

  async function removeFriendship(friendshipId: string, label: string) {
    if (!window.confirm(`${label} verwijderen?\n\nWeet je het zeker?`)) return;
    const res = await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setMessage(body.error ?? "Kon dit niet verwijderen."); return; }
    load();
  }

  async function giftFreeze(toUserId: string) {
    setMessage(null);
    const res = await fetch("/api/freezes/gift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(body.error ?? "Kon geen freeze geven.");
    } else {
      setGiftedTo(toUserId);
      setMessage("Streak freeze verstuurd! 🧊");
      setTimeout(() => setGiftedTo(null), 2000);
    }
  }

  if (!data) return <p className="text-slate-400 dark:text-slate-500">Laden...</p>;

  const onlineCount = Object.values(data.statusByUserId).filter((s) => s.online).length;

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300 flex items-center gap-2">
          <span aria-hidden>👥</span> Vrienden
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Verzoeken, wie er online is, en makkelijk een streak-freeze cadeau doen.
        </p>
      </div>

      {data.friends.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card !py-4 flex flex-col items-center gap-0.5">
            <div className="text-xl font-extrabold text-brand-600 dark:text-brand-300">👥 {data.friends.length}</div>
            <div className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Vrienden</div>
          </div>
          <div className="card !py-4 flex flex-col items-center gap-0.5">
            <div className="text-xl font-extrabold text-green-600 dark:text-green-400">🟢 {onlineCount}</div>
            <div className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Nu online</div>
          </div>
        </div>
      )}

      <div className="card flex flex-col gap-3">
        <p className="font-bold text-sm dark:text-slate-100 flex items-center gap-2">
          <span aria-hidden>➕</span> Vriend toevoegen
        </p>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <input
            className="input flex-1"
            placeholder="Zoek op gebruikersnaam (Naam#42) of, als iemand dat heeft aangezet, e-mailadres"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {results && results.length === 0 && query.trim().length >= 2 && (
          <p className="text-sm text-slate-400 dark:text-slate-500">Niemand gevonden.</p>
        )}
        {results && results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl px-2 !py-2 hover:bg-brand-50 dark:hover:bg-slate-700"
              >
                <span className="flex items-center gap-2 dark:text-slate-100">
                  <Avatar id={r.id} handle={r.handle} size="sm" />
                  <UserTag handle={r.handle} discriminator={r.discriminator} />
                </span>
                <button
                  className="btn-secondary !px-3 !py-1.5"
                  disabled={sentTo.has(r.id) || r.friendshipStatus === "PENDING" || r.friendshipStatus === "ACCEPTED"}
                  onClick={() => sendRequest(r)}
                  aria-label={
                    r.friendshipStatus === "ACCEPTED"
                      ? "Al bevriend"
                      : r.friendshipStatus === "PENDING"
                        ? "Vriendschapsverzoek in behandeling"
                        : undefined
                  }
                >
                  {r.friendshipStatus === "ACCEPTED"
                    ? "✅"
                    : r.friendshipStatus === "PENDING"
                      ? "⏳"
                      : sentTo.has(r.id)
                        ? "Verstuurd"
                        : "Toevoegen"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {message && <p className="text-sm font-semibold text-brand-600">{message}</p>}

      {data.incoming.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            Verzoeken
            <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-gold-50 dark:bg-slate-700 text-gold-700 dark:text-gold-400 text-xs font-extrabold">
              {data.incoming.length}
            </span>
          </h2>
          <div className="flex flex-col gap-2">
            {data.incoming.map(({ friendshipId, from }) => (
              <div
                key={friendshipId}
                className="card !py-3 !bg-gold-50 dark:!bg-slate-800 !border-gold-400/30 dark:!border-slate-700 flex items-center justify-between gap-3 flex-wrap"
              >
                <span className="flex items-center gap-2 font-bold dark:text-slate-100">
                  <Avatar id={from.id} handle={from.handle} avatarEmoji={from.avatarEmoji} />
                  <UserTag handle={from.handle} discriminator={from.discriminator} />
                </span>
                <div className="flex gap-2">
                  <button className="btn-primary !px-3 !py-1.5" onClick={() => respond(friendshipId, "accept", from.id)}>
                    Accepteren
                  </button>
                  <button className="btn-secondary !px-3 !py-1.5" onClick={() => respond(friendshipId, "decline", from.id)}>
                    Weigeren
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.outgoing.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-extrabold text-slate-700 dark:text-slate-200">Verstuurde verzoeken</h2>
          <div className="flex flex-col gap-2">
            {data.outgoing.map(({ friendshipId, to }) => (
              <div key={friendshipId} className="card flex items-center gap-3 !py-3 text-slate-500 dark:text-slate-400">
                <Avatar id={to.id} handle={to.handle} avatarEmoji={to.avatarEmoji} size="sm" />
                <span aria-hidden>⏳</span>
                <span className="min-w-0 flex-1">Wachten op <UserTag handle={to.handle} discriminator={to.discriminator} /></span>
                <button className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={() => removeFriendship(friendshipId, "Vriendschapsverzoek")}>Annuleren</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-extrabold text-slate-700 dark:text-slate-200">
          Jouw vrienden
        </h2>
        {data.friends.length === 0 && <p className="text-slate-400 dark:text-slate-500">Nog geen vrienden — zoek iemand hierboven!</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.friends.map(({ friendshipId, user: f }) => {
            const status = data.statusByUserId[f.id];
            return (
              <div key={f.id} className="card flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`shrink-0 rounded-full ${status?.online ? "ring-2 ring-green-400 ring-offset-2 dark:ring-offset-slate-800" : ""}`}
                  >
                    <Avatar id={f.id} handle={f.handle} avatarEmoji={f.avatarEmoji} />
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold flex items-center gap-1.5 dark:text-slate-100">
                      <UserTag handle={f.handle} discriminator={f.discriminator} className="truncate" />
                      {status?.online && (
                        <span className="text-[10px] font-bold uppercase text-green-600 dark:text-green-400 shrink-0">Online</span>
                      )}
                    </div>
                    {status?.activity ? (
                      <div className="text-xs text-brand-600 dark:text-brand-300 font-semibold truncate">
                        {status.activity.icon} {status.activity.label}
                      </div>
                    ) : status && !status.online && status.lastSeenLabel ? (
                      <div className="text-xs text-slate-400 dark:text-slate-500 truncate">💤 Laatst actief {status.lastSeenLabel}</div>
                    ) : null}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className="no-select inline-flex items-center gap-1 rounded-full bg-gold-50 text-gold-700 dark:bg-slate-700 dark:text-gold-400 text-xs font-bold px-2.5 py-1">
                    🔥 {f.currentStreak}
                  </span>
                  <span className="no-select inline-flex items-center gap-1 rounded-full bg-brand-50 text-brand-700 dark:bg-slate-700 dark:text-brand-300 text-xs font-bold px-2.5 py-1">
                    ⭐ {f.xpTotal} XP
                  </span>
                </div>
                <div className="flex gap-2">
                  <button className="btn-ice flex-1 !py-2" onClick={() => setPendingFreeze(f)} disabled={giftedTo === f.id}>
                    {giftedTo === f.id ? "Verstuurd!" : "🧊 Geef freeze"}
                  </button>
                  <button className="btn-secondary !px-3 !py-2 !text-xs" onClick={() => removeFriendship(friendshipId, "Vriendschap")}>
                    Ontvrienden
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      {pendingFreeze && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="freeze-confirm-title"
        >
          <div className="card w-full max-w-sm !p-5 shadow-xl">
            <h2 id="freeze-confirm-title" className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
              Freeze geven?
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Weet je zeker dat je een streak freeze wilt geven aan{" "}
              <UserTag handle={pendingFreeze.handle} discriminator={pendingFreeze.discriminator} className="font-bold" />?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-secondary !px-3 !py-2" onClick={() => setPendingFreeze(null)}>
                Annuleren
              </button>
              <button
                className="btn-ice !px-3 !py-2"
                disabled={confirmingFreeze}
                onClick={async () => {
                  setConfirmingFreeze(true);
                  await giftFreeze(pendingFreeze.id);
                  setConfirmingFreeze(false);
                  setPendingFreeze(null);
                }}
              >
                {confirmingFreeze ? "Versturen..." : "Ja, geef freeze"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
