"use client";

import { useEffect, useState } from "react";
import UserTag from "@/components/UserTag";

interface Gift {
  id: string;
  sender: { handle: string; discriminator: string; avatarEmoji: string | null } | null;
}

export default function FreezeGiftPopup() {
  const [gifts, setGifts] = useState<Gift[]>([]);

  useEffect(() => {
    fetch("/api/freezes/received")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { gifts: Gift[] } | null) => {
        if (data?.gifts?.length) setGifts(data.gifts);
      })
      .catch(() => {});
  }, []);

  if (gifts.length === 0) return null;

  async function dismiss() {
    await fetch("/api/freezes/received", { method: "POST" }).catch(() => {});
    setGifts([]);
  }

  const first = gifts[0];
  const sender = first.sender ? (
    <UserTag handle={first.sender.handle} discriminator={first.sender.discriminator} className="font-bold" />
  ) : (
    "Een vriend"
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="card !p-6 max-w-sm w-full shadow-xl animate-pop flex flex-col items-center text-center gap-4">
        <div className="text-6xl" aria-hidden>🧊</div>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-extrabold dark:text-slate-100">Je hebt een streak freeze gekregen!</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {sender} heeft je een streak freeze cadeau gedaan.
          </p>
          {gifts.length > 1 && (
            <p className="text-xs font-bold text-brand-600 dark:text-brand-300">
              Je hebt {gifts.length} nieuwe freezes gekregen.
            </p>
          )}
        </div>
        <button className="btn-primary w-full" onClick={dismiss}>Mooi, bedankt!</button>
      </div>
    </div>
  );
}
