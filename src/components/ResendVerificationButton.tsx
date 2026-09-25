"use client";

import { useState } from "react";
import { useT } from "@/components/I18nProvider";

export default function ResendVerificationButton() {
  const t = useT();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setStatus("sending");
    setError(null);
    const res = await fetch("/api/auth/verify-email/resend", { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? t("wordOfTheDay.somethingWrong"));
      setStatus("error");
      return;
    }
    setStatus("sent");
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button className="btn-secondary self-center" onClick={resend} disabled={status === "sending" || status === "sent"}>
        {status === "sending" ? t("courses.busy") : status === "sent" ? t("friends.sentExcl") : t("verify.resend")}
      </button>
      {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
    </div>
  );
}
