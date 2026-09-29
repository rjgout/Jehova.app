"use client";

import { useState } from "react";
import type { LanguageCode } from "@/lib/languages";

const choices: { code: LanguageCode; label: string; flag: string }[] = [
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

export default function PublicLanguageSwitcher({ language }: { language: LanguageCode }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const current = choices.find((choice) => choice.code === language) ?? choices[0];

  async function choose(code: LanguageCode) {
    if (code === language || saving) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/public-language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: code }),
      });
      if (response.ok) window.location.reload();
    } finally {
      setSaving(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative z-30">
      <button type="button" aria-label={"Taal: " + current.label} aria-expanded={open} aria-haspopup="menu"
        disabled={saving} onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800">
        <span aria-hidden className="text-lg leading-none">{current.flag}</span>
        <svg aria-hidden="true" viewBox="0 0 12 12" className={"h-3 w-3 transition-transform " + (open ? "rotate-180" : "")} fill="currentColor">
          <path d="M2 4.25 6 8l4-3.75H2Z" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 min-w-40 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 shadow-lg">
          {choices.map((choice) => (
            <button key={choice.code} type="button" role="menuitem"
              aria-current={choice.code === language ? "true" : undefined}
              onClick={() => choose(choice.code)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
              <span aria-hidden>{choice.flag}</span><span>{choice.label}</span>
              {choice.code === language && <span className="ml-auto" aria-hidden>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
