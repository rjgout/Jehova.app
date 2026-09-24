"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socketClient";

export default function InviteAcceptButton({
  code,
  inviterId,
  inviterName,
}: {
  code: string;
  inviterId: string;
  inviterName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/invite/${encodeURIComponent(code)}`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      setError(body.error ?? "Er ging iets mis.");
      return;
    }
    // De route kan de socketserver niet bereiken: zelf seinen, zodat een
    // openstaande vriendenpagina van de uitnodiger meteen ververst.
    getSocket().emit("friendship_changed", { otherUserId: inviterId });
    router.push("/friends");
  }

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <button className="btn-primary" disabled={busy} onClick={accept}>
        {busy ? "Bezig..." : `Word vrienden met ${inviterName}`}
      </button>
      {error && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
