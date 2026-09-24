"use client";

import { useEffect, useState } from "react";
import UserTag from "@/components/UserTag";

const STATUS_OPTIONS = ["NEW", "IN_PROGRESS", "DONE", "WONT_DO"] as const;
const STATUS_LABELS: Record<string, string> = {
  NEW: "Nieuw",
  IN_PROGRESS: "Bezig",
  DONE: "Klaar",
  WONT_DO: "Wordt niet uitgevoerd",
};
const STATUS_CLASSES: Record<string, string> = {
  NEW: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  IN_PROGRESS: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
  DONE: "bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200",
  WONT_DO: "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300",
};

interface ReportView {
  id: string;
  message: string;
  screenshot: string | null;
  status: string;
  createdAt: string;
  user: { email: string; handle: string; discriminator: string };
}

export default function FeedbackAdminClient() {
  const [reports, setReports] = useState<ReportView[] | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/feedback");
    if (res.ok) setReports((await res.json()).reports);
  }

  useEffect(() => {
    load();
  }, []);

  async function changeStatus(id: string, status: string) {
    setUpdatingId(id);
    setReports((cur) => cur?.map((r) => (r.id === id ? { ...r, status } : r)) ?? null);
    await fetch(`/api/admin/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => {});
    setUpdatingId(null);
  }

  return (
    <details className="group card flex flex-col gap-4">
      <summary className="font-extrabold text-lg dark:text-slate-100 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden flex items-center justify-between">
        Feedback
        <span className="text-slate-400 transition-transform group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>

      {!reports ? (
        <p className="text-slate-400 dark:text-slate-500">Laden...</p>
      ) : reports.length === 0 ? (
        <p className="text-slate-400 dark:text-slate-500">Nog geen meldingen.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((r) => (
            <div key={r.id} className="border border-slate-100 dark:border-slate-700 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-bold text-sm dark:text-slate-100">
                    <UserTag handle={r.user.handle} discriminator={r.user.discriminator} />{" "}
                    <span className="font-normal text-slate-400 dark:text-slate-500">({r.user.email})</span>
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {new Date(r.createdAt).toLocaleString("nl-NL")}
                  </p>
                </div>
                <select
                  className={`text-xs font-bold uppercase rounded-full px-2 py-1 border-0 ${STATUS_CLASSES[r.status] ?? STATUS_CLASSES.NEW}`}
                  value={r.status}
                  disabled={updatingId === r.id}
                  onChange={(e) => changeStatus(r.id, e.target.value)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-sm whitespace-pre-wrap dark:text-slate-200">{r.message}</p>
              {r.screenshot && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.screenshot}
                  alt="Screenshot"
                  className="max-h-40 rounded-lg border border-slate-200 dark:border-slate-700 self-start"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </details>
  );
}
