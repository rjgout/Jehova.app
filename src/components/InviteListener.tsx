"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSocket } from "@/lib/socketClient";

interface Invite {
  code: string;
  fromDisplayName: string;
  gameLabel?: string;
}

type Notice =
  | ({ kind: "invite" } & Invite)
  // Vrienden die (vrijwel) tegelijk online kwamen, in één melding.
  | { kind: "online"; friends: { userId: string; name: string }[] };

function joinNames(names: string[]): string {
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} en ${names[names.length - 1]}` : (names[0] ?? "");
}

const AUTO_HIDE_MS = 8000;
const DISMISS_DISTANCE_PX = 40;
const TAP_TOLERANCE_PX = 6;

/**
 * Melding binnen de app in de stijl van een systeemmelding: schuift van boven
 * in, omhoog vegen = negeren, tikken = openen. Voor een live-uitnodiging
 * (tikken = meedoen; negeren is niet weigeren: de uitnodiging blijft bij
 * Spelen staan tot de host start of annuleert, en is de app dicht dan komt
 * hij als pushmelding binnen) en voor een vriend die online komt (zie
 * announceCameOnline in src/lib/presence.ts; bewust zonder pushmelding). Een
 * uitnodiging gaat altijd voor: die wordt nooit door een onlinemelding
 * vervangen.
 */
export default function InviteListener() {
  const router = useRouter();
  const pathname = usePathname();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [offsetY, setOffsetY] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const drag = useRef<{ startY: number; moved: number } | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = null;
  };

  const dismiss = useCallback(() => {
    clearHideTimer();
    setLeaving(true);
    setTimeout(() => {
      setNotice(null);
      setLeaving(false);
      setOffsetY(0);
    }, 250);
  }, []);

  const startHideTimer = useCallback(() => {
    clearHideTimer();
    hideTimer.current = setTimeout(dismiss, AUTO_HIDE_MS);
  }, [dismiss]);

  useEffect(() => {
    const socket = getSocket();
    function onInvite(data: Invite) {
      setLeaving(false);
      setOffsetY(0);
      setNotice({ kind: "invite", ...data });
    }
    function onRevoked({ code }: { code: string }) {
      setNotice((current) => (current?.kind === "invite" && current.code === code ? null : current));
    }
    function onFriendOnline(friend: { userId: string; name: string }) {
      setNotice((current) => {
        if (current?.kind === "invite") return current;
        const others = current?.kind === "online" ? current.friends.filter((f) => f.userId !== friend.userId) : [];
        return { kind: "online", friends: [...others, friend] };
      });
      setLeaving(false);
      setOffsetY(0);
    }
    socket.on("game_invite", onInvite);
    socket.on("game_invite_revoked", onRevoked);
    socket.on("friend_online", onFriendOnline);
    return () => {
      socket.off("game_invite", onInvite);
      socket.off("game_invite_revoked", onRevoked);
      socket.off("friend_online", onFriendOnline);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    startHideTimer();
    return clearHideTimer;
  }, [notice, startHideTimer]);

  if (!notice || (notice.kind === "invite" && pathname === `/live/${notice.code}`)) return null;

  function open() {
    if (!notice) return;
    clearHideTimer();
    setNotice(null);
    router.push(notice.kind === "invite" ? `/live/${notice.code}` : "/friends");
  }

  const names = notice.kind === "online" ? joinNames(notice.friends.map((f) => f.name)) : "";
  const content =
    notice.kind === "invite"
      ? {
          icon: "🎮",
          iconClass: "from-brand-500 to-brand-700",
          title: "Uitnodiging voor een live spel",
          text: `${notice.fromDisplayName} nodigt je uit${notice.gameLabel ? ` voor ${notice.gameLabel}` : ""}. Tik om mee te doen.`,
          label: `${notice.fromDisplayName} nodigt je uit voor een live spel. Tik om mee te doen, veeg omhoog om te negeren.`,
        }
      : {
          icon: "👋",
          iconClass: "from-green-500 to-green-700",
          title: notice.friends.length > 1 ? "Vrienden online" : "Vriend online",
          text: `${names} ${notice.friends.length > 1 ? "zijn" : "is"} nu online. Tik om naar je vrienden te gaan.`,
          label: `${names} ${notice.friends.length > 1 ? "zijn" : "is"} nu online. Tik om naar je vrienden te gaan, veeg omhoog om te negeren.`,
        };

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, moved: 0 };
    clearHideTimer();
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const dy = e.clientY - drag.current.startY;
    drag.current.moved = Math.max(drag.current.moved, Math.abs(dy));
    // Omhoog volgt de vinger één op één, omlaag alleen met veel weerstand.
    setOffsetY(dy < 0 ? dy : dy * 0.2);
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const dy = e.clientY - drag.current.startY;
    const moved = drag.current.moved;
    drag.current = null;
    if (dy < -DISMISS_DISTANCE_PX) {
      dismiss();
    } else if (moved <= TAP_TOLERANCE_PX) {
      open();
    } else {
      setOffsetY(0);
      startHideTimer();
    }
  }

  const translate = leaving ? "translateY(-150%)" : `translateY(${offsetY}px)`;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] flex justify-center px-2 pointer-events-none"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}
    >
      <div className="w-full max-w-md animate-slide-down">
        <div
          role="button"
          tabIndex={0}
          aria-label={content.label}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            drag.current = null;
            setOffsetY(0);
            startHideTimer();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") open();
            if (e.key === "Escape") dismiss();
          }}
          className="pointer-events-auto select-none touch-none cursor-pointer rounded-[1.75rem] bg-white/85 dark:bg-slate-800/85 backdrop-blur-xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 px-3.5 pt-3 pb-2"
          style={{
            transform: translate,
            opacity: leaving ? 0 : 1,
            transition: drag.current ? "none" : "transform 0.25s ease-out, opacity 0.25s ease-out",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className={`h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br ${content.iconClass} flex items-center justify-center text-xl shadow-sm`}
            >
              {content.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">{content.title}</p>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">nu</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-snug">{content.text}</p>
            </div>
          </div>
          <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden />
        </div>
      </div>
    </div>
  );
}
