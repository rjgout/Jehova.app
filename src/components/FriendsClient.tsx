"use client";

import { useEffect, useState } from "react";
import { formatTag } from "@/lib/handle";
import { getSocket } from "@/lib/socketClient";
import UserTag from "@/components/UserTag";
import UserAvatar from "@/components/UserAvatar";
import FriendInviteCard from "@/components/FriendInviteCard";
import { useT } from "@/components/I18nProvider";
import { translateServerText } from "@/lib/i18n/serverTexts";
import { rich } from "@/lib/i18n/rich";

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

export default function FriendsClient({ appName }: { appName: string }) {
  const t = useT();
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
    if (!res.ok) return;
    setData(await res.json());
    // /api/friends kent de huidige activiteit van vrienden niet (die leeft
    // alleen in de socketserver); die vult hem via friend_status_update aan.
    getSocket().emit("friend_statuses_request");
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
      setMessage(body.error ?? t("wordOfTheDay.somethingWrong"));
    } else {
      setMessage(t("friends.requestSent", { tag: formatTag(target.handle, target.discriminator) }));
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

  async function removeFriendship(friendshipId: string, kind: "request" | "friendship") {
    if (!window.confirm(t(kind === "request" ? "friends.confirmRemoveRequest" : "friends.confirmRemoveFriendship"))) return;
    const res = await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setMessage(body.error ?? t("friends.removeFailed")); return; }
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
      setMessage(body.error ?? t("friends.freezeFailed"));
    } else {
      setGiftedTo(toUserId);
      setMessage(t("friends.freezeSent"));
      setTimeout(() => setGiftedTo(null), 2000);
    }
  }

  if (!data) return <p className="text-slate-400 dark:text-slate-500">{t("common.loading")}</p>;

  const onlineCount = Object.values(data.statusByUserId).filter((s) => s.online).length;

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300 flex items-center gap-2">
          <span aria-hidden>👥</span> {t("nav.friends")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("friends.intro")}
        </p>
      </div>

      {data.friends.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card !py-4 flex flex-col items-center gap-0.5">
            <div className="text-xl font-extrabold text-brand-600 dark:text-brand-300">👥 {data.friends.length}</div>
            <div className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">{t("nav.friends")}</div>
          </div>
          <div className="card !py-4 flex flex-col items-center gap-0.5">
            <div className="text-xl font-extrabold text-green-600 dark:text-green-400">🟢 {onlineCount}</div>
            <div className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">{t("friendPicker.onlineNow")}</div>
          </div>
        </div>
      )}

      <div className="card flex flex-col gap-3">
        <p className="font-bold text-sm dark:text-slate-100 flex items-center gap-2">
          <span aria-hidden>➕</span> {t("friends.addFriend")}
        </p>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <input
            className="input flex-1"
            placeholder={t("friends.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {results && results.length === 0 && query.trim().length >= 2 && (
          <p className="text-sm text-slate-400 dark:text-slate-500">{t("friends.nobodyFound")}</p>
        )}
        {results && results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl px-2 !py-2 hover:bg-brand-50 dark:hover:bg-slate-700"
              >
                <span className="flex items-center gap-2 dark:text-slate-100">
                  <UserAvatar id={r.id} handle={r.handle} size="sm" />
                  <UserTag handle={r.handle} discriminator={r.discriminator} />
                </span>
                <button
                  className="btn-secondary !px-3 !py-1.5"
                  disabled={sentTo.has(r.id) || r.friendshipStatus === "PENDING" || r.friendshipStatus === "ACCEPTED"}
                  onClick={() => sendRequest(r)}
                  aria-label={
                    r.friendshipStatus === "ACCEPTED"
                      ? t("friends.alreadyFriends")
                      : r.friendshipStatus === "PENDING"
                        ? t("friends.requestPending")
                        : undefined
                  }
                >
                  {r.friendshipStatus === "ACCEPTED"
                    ? "✅"
                    : r.friendshipStatus === "PENDING"
                      ? "⏳"
                      : sentTo.has(r.id)
                        ? t("friends.sent")
                        : t("courses.add")}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {message && <p className="text-sm font-semibold text-brand-600">{message}</p>}

      <FriendInviteCard appName={appName} />

      {data.incoming.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            {t("friends.requests")}
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
                  <UserAvatar id={from.id} handle={from.handle} avatarEmoji={from.avatarEmoji} size="md" />
                  <UserTag handle={from.handle} discriminator={from.discriminator} />
                </span>
                <div className="flex gap-2">
                  <button className="btn-primary !px-3 !py-1.5" onClick={() => respond(friendshipId, "accept", from.id)}>
                    {t("challenges.accept")}
                  </button>
                  <button className="btn-secondary !px-3 !py-1.5" onClick={() => respond(friendshipId, "decline", from.id)}>
                    {t("challenges.decline")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.outgoing.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-extrabold text-slate-700 dark:text-slate-200">{t("friends.sentRequests")}</h2>
          <div className="flex flex-col gap-2">
            {data.outgoing.map(({ friendshipId, to }) => (
              <div key={friendshipId} className="card flex items-center gap-3 !py-3 text-slate-500 dark:text-slate-400">
                <UserAvatar id={to.id} handle={to.handle} avatarEmoji={to.avatarEmoji} size="sm" />
                <span aria-hidden>⏳</span>
                <span className="min-w-0 flex-1">
                  {rich(t("friends.waitingFor"), { tag: <UserTag handle={to.handle} discriminator={to.discriminator} /> })}
                </span>
                <button className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={() => removeFriendship(friendshipId, "request")}>{t("activeGames.cancel")}</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-extrabold text-slate-700 dark:text-slate-200">
          {t("friends.yourFriends")}
        </h2>
        {data.friends.length === 0 && <p className="text-slate-400 dark:text-slate-500">{t("friends.none")}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.friends.map(({ friendshipId, user: f }) => {
            const status = data.statusByUserId[f.id];
            return (
              <div key={f.id} className="card flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`shrink-0 rounded-full ${status?.online ? "ring-2 ring-green-400 ring-offset-2 dark:ring-offset-slate-800" : ""}`}
                  >
                    <UserAvatar id={f.id} handle={f.handle} avatarEmoji={f.avatarEmoji} size="md" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold flex items-center gap-1.5 dark:text-slate-100">
                      <UserTag handle={f.handle} discriminator={f.discriminator} className="truncate" />
                      {status?.online && (
                        <span className="text-[10px] font-bold uppercase text-green-600 dark:text-green-400 shrink-0">{t("friendPicker.online")}</span>
                      )}
                    </div>
                    {status?.activity ? (
                      <div className="text-xs text-brand-600 dark:text-brand-300 font-semibold truncate">
                        {status.activity.icon} {translateServerText(status.activity.label, t)}
                      </div>
                    ) : status && !status.online && status.lastSeenLabel ? (
                      <div className="text-xs text-slate-400 dark:text-slate-500 truncate">{t("friends.lastActive", { when: translateServerText(status.lastSeenLabel, t) })}</div>
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
                    {giftedTo === f.id ? t("friends.sentExcl") : t("friends.giveFreeze")}
                  </button>
                  <button className="btn-secondary !px-3 !py-2 !text-xs" onClick={() => removeFriendship(friendshipId, "friendship")}>
                    {t("friends.unfriend")}
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
              {t("friends.freezeTitle")}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {rich(t("friends.freezeConfirm"), {
                tag: <UserTag handle={pendingFreeze.handle} discriminator={pendingFreeze.discriminator} className="font-bold" />,
              })}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-secondary !px-3 !py-2" onClick={() => setPendingFreeze(null)}>
                {t("activeGames.cancel")}
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
                {confirmingFreeze ? t("friends.sending") : t("friends.yesGiveFreeze")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
