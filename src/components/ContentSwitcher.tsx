"use client";

import { useEffect, useRef, useState } from "react";
import { getLanguage } from "@/lib/languages";

interface Collection {
  id: string;
  slug: string;
  name: string;
  icon: string;
  order: number;
  visibleToUsers: boolean;
  work: string | null;
  language: string;
}

// Eén regel per werk (Boek van Mormon, Leer en Verbonden, ...), niet per
// uitgave: anders staat elk werk er in elke taal apart in. De taal kies je
// eronder, met knoppen voor de talen waarin het actieve werk bestaat.
export default function ContentSwitcher({
  enabled,
  active,
  works,
  activeEditions,
  showLanguage,
}: {
  enabled: boolean;
  active: Collection;
  works: { work: string; edition: Collection }[];
  activeEditions: Collection[];
  /** Er is meer dan één contenttaal te kiezen: toon dan overal de taal. */
  showLanguage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  if (!enabled) return null;

  async function selectCollection(collection: Collection) {
    if (collection.id === active.id) {
      setOpen(false);
      return;
    }
    await save({ contentCollectionId: collection.id });
  }

  // Een taalknop wisselt de contenttaal zelf (ook voor de andere werken), niet
  // alleen deze ene uitgave.
  async function selectLanguage(edition: Collection) {
    if (edition.id === active.id) return;
    await save({ contentLanguage: edition.language });
  }

  async function save(body: { contentCollectionId: string } | { contentLanguage: string }) {
    setBusy(true);
    try {
      const response = await fetch("/api/content-context", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) return;
      setOpen(false);
      // Een volledige reload zorgt dat ook client components hun content opnieuw ophalen.
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  const activeWork = active.work ?? active.id;
  const ordered = [
    ...works.filter((option) => option.work === activeWork),
    ...works.filter((option) => option.work !== activeWork),
  ];
  const badge = getLanguage(active.language).badge;

  return (
    <div ref={ref} className="absolute left-1/2 top-0 h-full -translate-x-1/2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={
          "Actieve content: " + active.name + (showLanguage ? ` (${getLanguage(active.language).nativeName})` : "") + ". Klik om te wisselen."
        }
        className="h-full inline-flex items-center justify-center gap-1.5 px-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-300"
      >
        <span aria-hidden>{active.icon}</span>
        <span className="hidden md:inline max-w-[15rem] truncate">{active.name}</span>
        {showLanguage && (
          <span className="text-[10px] font-extrabold leading-none rounded-full bg-slate-100 dark:bg-slate-700 px-1.5 py-1">{badge}</span>
        )}
        <span className="text-[10px] leading-none" aria-hidden>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-screen max-w-5xl overflow-hidden rounded-b-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 z-50">
          <div className="mx-auto max-w-2xl px-4 py-2" role="listbox" aria-label="Beschikbare content">
            {ordered.map(({ work, edition: collection }, index) => {
              const selected = work === activeWork;
              return (
                <button
                  key={work}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={busy}
                  onClick={() => selectCollection(collection)}
                  className={[
                    "w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition",
                    selected
                      ? "bg-brand-50 text-brand-800 dark:!bg-brand-900 dark:!text-brand-100"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800",
                    index === 0 ? "font-extrabold" : "font-semibold",
                  ].join(" ")}
                >
                  <span className="w-7 shrink-0 text-center" aria-hidden>{selected ? "✓" : ""}</span>
                  <span className="text-xl shrink-0" aria-hidden>{collection.icon}</span>
                  <span className="min-w-0 truncate">{collection.name}</span>
                  {showLanguage && (
                    <span className="shrink-0 text-[10px] font-extrabold text-slate-400 dark:text-slate-500">
                      {getLanguage(collection.language).badge}
                    </span>
                  )}
                  {/* Alleen beheerders krijgen verborgen content in dit menu. */}
                  {!collection.visibleToUsers && (
                    <span className="ml-auto shrink-0 text-[10px] font-bold uppercase text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 rounded-full px-2 py-0.5">
                      Verborgen
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {activeEditions.length > 1 && (
            <div className="mx-auto max-w-2xl px-4 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 pt-2 pb-1.5">
                Taal van de tekst
              </p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Taal van de tekst">
                {activeEditions.map((edition) => {
                  const language = getLanguage(edition.language);
                  const selected = edition.id === active.id;
                  return (
                    <button
                      key={edition.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={busy}
                      onClick={() => selectLanguage(edition)}
                      title={edition.visibleToUsers ? undefined : "Verborgen voor gebruikers"}
                      className={[
                        "rounded-full px-3 py-1.5 text-sm font-bold border-2 transition",
                        selected
                          ? "border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-900 dark:text-brand-100"
                          : "border-slate-200 text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:text-slate-300",
                        edition.visibleToUsers ? "" : "border-dashed",
                      ].join(" ")}
                    >
                      {language.nativeName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
