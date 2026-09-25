"use client";

import { useState } from "react";
import { useT, useUiLanguage } from "@/components/I18nProvider";
import { getLanguage } from "@/lib/languages";
import { rich } from "@/lib/i18n/rich";

const STATUSES = ["NEW", "IN_PROGRESS", "DONE", "WONT_DO"] as const;

interface Props {
  token: string;
  submitterName: string;
  submitterEmail: string;
  message: string;
  screenshot: string | null;
  initialStatus: string;
  createdAt: string;
}

export default function FeedbackRespondClient({
  token,
  submitterName,
  submitterEmail,
  message,
  screenshot,
  initialStatus,
  createdAt,
}: Props) {
  const t = useT();
  const intlLocale = getLanguage(useUiLanguage()).intlLocale;
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setNewStatus(next: "IN_PROGRESS" | "DONE" | "WONT_DO") {
    setBusy(next);
    setError(null);
    const res = await fetch(`/api/feedback/respond/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(body.error ?? t("feedbackRespond.updateFailed"));
      return;
    }
    setStatus(next);
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">{t("feedbackRespond.title")}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          {t("feedbackRespond.from", {
            name: submitterName,
            email: submitterEmail,
            date: new Date(createdAt).toLocaleDateString(intlLocale, { day: "numeric", month: "long", year: "numeric" }),
          })}
        </p>
      </div>

      <div className="card flex flex-col gap-3">
        <p className="text-sm whitespace-pre-wrap dark:text-slate-200">{message}</p>
        {screenshot && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={screenshot} alt={t("feedback.screenshot")} className="rounded-lg border border-slate-200 dark:border-slate-700 self-start max-w-full" />
        )}
      </div>

      <div className="card flex flex-col gap-3">
        <p className="text-sm dark:text-slate-200">
          {rich(t("feedbackRespond.current"), {
            status: (
              <strong>
                {(STATUSES as readonly string[]).includes(status)
                  ? t(`feedback.status.${status as (typeof STATUSES)[number]}`)
                  : status}
              </strong>
            ),
          })}
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary !px-3 !py-1.5" disabled={busy !== null} onClick={() => setNewStatus("IN_PROGRESS")}>
            {busy === "IN_PROGRESS" ? t("adminCommon.busy") : t("feedbackRespond.working")}
          </button>
          <button className="btn-primary !px-3 !py-1.5" disabled={busy !== null} onClick={() => setNewStatus("DONE")}>
            {busy === "DONE" ? t("adminCommon.busy") : t("feedbackRespond.done")}
          </button>
          <button
            className="btn-secondary !px-3 !py-1.5 !text-red-500 !border-red-200"
            disabled={busy !== null}
            onClick={() => setNewStatus("WONT_DO")}
          >
            {busy === "WONT_DO" ? t("adminCommon.busy") : t("feedbackRespond.wontDo")}
          </button>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}
