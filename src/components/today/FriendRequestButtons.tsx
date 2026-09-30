"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { getSocket } from "@/lib/socketClient";
import { iconButton, primaryButton } from "@/components/versado/styles";

// Zelfde endpoints en seintje als de vriendenpagina (FriendsClient): na
// accepteren krijgt de ander het via "friendship_changed" meteen te zien.
export default function FriendRequestButtons({ friendshipId, otherUserId, name }: { friendshipId: string; otherUserId: string; name: string }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function respond(action: "accept" | "decline") {
    setBusy(true);
    const res = await fetch(`/api/friends/${friendshipId}/${action}`, { method: "POST" }).catch(() => null);
    if (res?.ok && action === "accept") getSocket().emit("friendship_changed", { otherUserId });
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-1">
      <button type="button" className={iconButton} disabled={busy} onClick={() => respond("decline")} aria-label={t("today.declineAria", { name })}>
        <X className="h-5 w-5" aria-hidden />
      </button>
      <button type="button" className={primaryButton} disabled={busy} onClick={() => respond("accept")}>
        <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
        {/* Op smalle telefoons alleen het vinkje, zodat de naam leesbaar blijft. */}
        <span className="sr-only min-[400px]:not-sr-only">{t("today.cta.accept")}</span>
      </button>
    </div>
  );
}
