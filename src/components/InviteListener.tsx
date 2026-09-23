"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSocket } from "@/lib/socketClient";

interface Invite {
  code: string;
  fromDisplayName: string;
  gameLabel?: string;
}

const AUTO_HIDE_MS = 8000;
const DISMISS_DISTANCE_PX = 40;
const TAP_TOLERANCE_PX = 6;

/**
 * Melding binnen de app voor een live-uitnodiging, in de stijl van een
 * systeemmelding: schuift van boven in, omhoog vegen = negeren, tikken =
 * meedoen. Negeren is niet weigeren: de uitnodiging blijft bij Spelen staan
 * (ActiveGamesBanner) tot de host start of annuleert. Is de app dicht, dan
 * komt dezelfde uitnodiging als pushmelding binnen (zie gameServer.ts).
 */
export default function InviteListener() {
  const router = useRouter();
  const pathname = usePathname();
  const [invite, setInvite] = useState<Invite | null>(null);
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
      setInvite(null);
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
      setInvite(data);
    }
    function onRevoked({ code }: { code: string }) {
      setInvite((current) => (current?.code === code ? null : current));
    }
    socket.on("game_invite", onInvite);
    socket.on("game_invite_revoked", onRevoked);
    return () => {
      socket.off("game_invite", onInvite);
      socket.off("game_invite_revoked", onRevoked);
    };
  }, []);

  useEffect(() => {
    if (!invite) return;
    startHideTimer();
    return clearHideTimer;
  }, [invite, startHideTimer]);

  if (!invite || pathname === `/live/${invite.code}`) return null;

  function open() {
    if (!invite) return;
    clearHideTimer();
    const code = invite.code;
    setInvite(null);
    router.push(`/live/${code}`);
  }

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
          aria-label={`${invite.fromDisplayName} nodigt je uit voor een live spel. Tik om mee te doen, veeg omhoog om te negeren.`}
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
            <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-xl shadow-sm">
              🎮
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">Uitnodiging voor een live spel</p>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">nu</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-snug">
                {invite.fromDisplayName} nodigt je uit{invite.gameLabel ? ` voor ${invite.gameLabel}` : ""}. Tik om mee te doen.
              </p>
            </div>
          </div>
          <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden />
        </div>
      </div>
    </div>
  );
}
