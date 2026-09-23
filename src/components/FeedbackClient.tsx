"use client";

import { useEffect, useRef, useState } from "react";

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
}

const MAX_DIMENSION = 1400;
const JPEG_QUALITY = 0.8;

export default function FeedbackClient() {
  const [reports, setReports] = useState<ReportView[] | null>(null);
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch("/api/feedback");
    if (res.ok) setReports((await res.json()).reports);
  }

  useEffect(() => {
    load();
  }, []);

  function processFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const scale = MAX_DIMENSION / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        setScreenshot(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function onPaste(e: React.ClipboardEvent) {
    const item = [...e.clipboardData.items].find((i) => i.type.startsWith("image/"));
    const file = item?.getAsFile();
    if (file) processFile(file);
  }

  async function submit() {
    if (!message.trim()) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim(), screenshot: screenshot ?? undefined }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Kon de melding niet versturen.");
      return;
    }
    setSuccessMsg("Bedankt! Je melding is verstuurd.");
    setMessage("");
    setScreenshot(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    load();
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">Feedback</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Werkt iets niet, of heb je een idee? Laat het weten — een screenshot helpt enorm.
        </p>
      </div>

      <div className="card flex flex-col gap-3" onPaste={onPaste}>
        <textarea
          className="input min-h-[120px]"
          placeholder="Beschrijf wat je bent tegengekomen of wat je zou willen zien..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" className="btn-secondary !px-3 !py-1.5" onClick={() => fileInputRef.current?.click()}>
            📎 Screenshot toevoegen
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          <span className="text-xs text-slate-400 dark:text-slate-500">of plak 'm hierboven (Ctrl+V)</span>
        </div>
        {screenshot && (
          <div className="relative self-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={screenshot} alt="Screenshot" className="max-h-40 rounded-lg border border-slate-200 dark:border-slate-700" />
            <button
              type="button"
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
              onClick={() => setScreenshot(null)}
            >
              ✕
            </button>
          </div>
        )}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {successMsg && <p className="text-sm font-semibold text-brand-600 dark:text-brand-300">{successMsg}</p>}
        <button className="btn-primary self-start" disabled={submitting || !message.trim()} onClick={submit}>
          {submitting ? "Bezig..." : "Versturen"}
        </button>
      </div>

      <section>
        <h2 className="font-extrabold mb-2 text-slate-700 dark:text-slate-200">Jouw meldingen</h2>
        {!reports ? (
          <p className="text-slate-400 dark:text-slate-500">Laden...</p>
        ) : reports.length === 0 ? (
          <p className="text-slate-400 dark:text-slate-500">Nog geen meldingen verstuurd.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {reports.map((r) => (
              <div key={r.id} className="card flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm whitespace-pre-wrap dark:text-slate-200">{r.message}</p>
                  <span
                    className={`text-xs font-bold uppercase rounded-full px-2 py-1 shrink-0 ${STATUS_CLASSES[r.status] ?? STATUS_CLASSES.NEW}`}
                  >
                    {STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </div>
                {r.screenshot && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.screenshot}
                    alt="Screenshot"
                    className="max-h-32 rounded-lg border border-slate-200 dark:border-slate-700 self-start"
                  />
                )}
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {new Date(r.createdAt).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
