"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { secondaryButton } from "@/components/versado/styles";

/** Ingang naar Samen studeren op een cursuspagina: maakt de sessie aan en opent de lobby. */
export default function StudyTogetherButton({ courseId }: { courseId: string }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function start() {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/study/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || typeof data?.code !== "string") throw new Error();
      router.push(`/live/${data.code}`);
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" className={secondaryButton} onClick={start} disabled={busy}>
        <Users className="h-4 w-4" aria-hidden />
        {busy ? t("study.creating") : t("study.startButton")}
      </button>
      {error && <p className="text-xs font-semibold text-vs-danger">{t("study.createFailed")}</p>}
    </div>
  );
}
