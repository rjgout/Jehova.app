"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

interface Verse {
  number: number;
  text: string;
}

// Toont een hoofdstuk bovenop een les, zodat een schriftverwijzing lezen de
// les niet afbreekt. Wie verder wil lezen of oefenen, gaat via de link
// onderaan naar het hoofdstuk in de lezer (bij voorkeur binnen Vrije keuze,
// zodat de terugbalk daarna naar die cursus wijst). Via een portal op body:
// het blok waarin de knop staat animeert met transform, en daarbinnen zou
// "fixed" zich aan dat blok hechten in plaats van aan het scherm.
export default function ChapterPopup({
  chapterId,
  title,
  href,
  linkLabel,
  onClose,
}: {
  chapterId: string;
  title: string;
  href: string;
  linkLabel: string;
  onClose: () => void;
}) {
  const [verses, setVerses] = useState<Verse[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/chapters/${chapterId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { verses: Verse[] }) => setVerses(data.verses))
      .catch(() => setError(true));
  }, [chapterId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    // Achtergrond niet mee laten scrollen terwijl je in de pop-up leest.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="card !p-0 w-full sm:max-w-2xl max-h-[85vh] flex flex-col animate-pop !rounded-b-none sm:!rounded-b-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-extrabold text-lg text-brand-800 dark:text-brand-300">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Sluiten"
            className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {error && <p className="text-slate-500 dark:text-slate-400">Dit hoofdstuk kon niet worden geladen.</p>}
          {!error && !verses && <p className="text-slate-400 dark:text-slate-500">Laden…</p>}
          {verses?.map((v) => (
            <p key={v.number} className="leading-7 dark:text-slate-100">
              <span className="text-xs font-bold text-brand-500 align-super mr-1">{v.number}</span>
              {v.text}
            </p>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-slate-100 dark:border-slate-700">
          <Link href={href} className="text-sm font-bold text-brand-600 dark:text-brand-300 hover:underline">
            {linkLabel}
          </Link>
          <button onClick={onClose} className="btn-primary">
            Terug naar de les
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
