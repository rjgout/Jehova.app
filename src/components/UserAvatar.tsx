"use client";

import { useEffect, useState } from "react";

// Puur decoratief: elke gebruiker krijgt een stabiele (niet-willekeurige,
// dus niet bij elke render andere) avatarkleur uit het bestaande
// merkkleurenpalet, afgeleid van zijn id. Zo heeft iemand overal in de app
// dezelfde kleur.
const AVATAR_COLORS = ["bg-brand-500", "bg-brand-600", "bg-ice-500", "bg-gold-500"];
function avatarColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// Array.from in plaats van slice: een naam die met een emoji begint, wordt
// anders midden in de emoji doorgeknipt.
function initialsFor(handle: string): string {
  return Array.from(handle.trim()).slice(0, 2).join("").toUpperCase();
}

// Eigen avatar-emoji's worden per pagina één keer opgehaald, voor alle
// avatars die tegelijk in beeld komen in één verzoek (zie
// /api/users/avatars). Schermen die de emoji al in hun eigen data hebben,
// geven hem mee als prop en slaan dit over.
const cache = new Map<string, string | null>();
const waiting = new Set<string>();
const listeners = new Set<() => void>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function requestAvatar(id: string) {
  if (cache.has(id) || waiting.has(id)) return;
  waiting.add(id);
  if (flushTimer) return;
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    const ids = [...waiting];
    waiting.clear();
    try {
      const res = await fetch(`/api/users/avatars?ids=${encodeURIComponent(ids.join(","))}`);
      const data = res.ok ? ((await res.json()) as { avatars: Record<string, string | null> }) : { avatars: {} };
      for (const id of ids) cache.set(id, data.avatars[id] ?? null);
    } catch {
      for (const id of ids) cache.set(id, null);
    }
    for (const listener of listeners) listener();
  }, 30);
}

function useAvatarEmoji(id: string, known: string | null | undefined): string | null {
  const [, rerender] = useState(0);
  useEffect(() => {
    if (known !== undefined || !id) return;
    const listener = () => rerender((n) => n + 1);
    listeners.add(listener);
    requestAvatar(id);
    return () => {
      listeners.delete(listener);
    };
  }, [id, known]);
  return known !== undefined ? known : (cache.get(id) ?? null);
}

const SIZES = {
  xs: "w-7 h-7",
  sm: "w-9 h-9",
  md: "w-11 h-11",
} as const;
// Twee letters moeten klein om in het rondje te passen; één emoji juist
// groot, anders is hij nauwelijks te zien.
const TEXT_SIZES = {
  xs: { letters: "text-[11px]", emoji: "text-base" },
  sm: { letters: "text-xs", emoji: "text-xl" },
  md: { letters: "text-sm", emoji: "text-2xl" },
} as const;

/**
 * Avatar-rondje van een gebruiker: zijn eigen emoji, anders de eerste twee
 * letters van zijn naam. `avatarEmoji` weglaten = zelf ophalen; `null` =
 * bekend dat hij er geen heeft.
 */
export default function UserAvatar({
  id,
  handle,
  avatarEmoji,
  size = "sm",
  className = "",
}: {
  id: string;
  handle: string;
  avatarEmoji?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const emoji = useAvatarEmoji(id, avatarEmoji);
  return (
    <span
      className={`shrink-0 ${SIZES[size]} ${emoji ? TEXT_SIZES[size].emoji : TEXT_SIZES[size].letters} rounded-full ${avatarColorFor(id)} text-white font-extrabold flex items-center justify-center leading-none ${className}`}
      aria-hidden
    >
      {emoji || initialsFor(handle)}
    </span>
  );
}
