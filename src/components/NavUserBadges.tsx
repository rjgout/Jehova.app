"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onXpChanged } from "@/lib/xpBroadcast";

export default function NavUserBadges({
  streak,
  xp,
}: {
  streak: number;
  xp: number;
}) {
  // De props zijn de server-gerenderde waarde bij laden van de pagina —
  // vanaf dan houdt deze component ze zelf bij, zodat een XP-wijziging
  // ergens anders op dezelfde pagina (zie src/lib/xpBroadcast.ts) meteen
  // zichtbaar is zonder op de volgende paginanavigatie te hoeven wachten.
  const [values, setValues] = useState({ streak, xp });

  useEffect(() => {
    return onXpChanged(() => {
      fetch("/api/user-badges")
        .then((r) => r.json())
        .then((data) => setValues({ streak: data.currentStreak, xp: data.xpTotal }))
        .catch(() => {});
    });
  }, []);

  return (
    <div className="flex items-center gap-3 text-sm font-bold leading-none">
      <Link href="/streak" title="Reeks" className="flex items-center gap-1 text-orange-500">
        🔥 {values.streak}
      </Link>
      <Link href="/xp" title="Ervaringspunten" className="flex items-center gap-1 text-gold-600">
        ⭐ {values.xp}
      </Link>
    </div>
  );
}
