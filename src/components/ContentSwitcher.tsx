"use client";

import { useEffect, useRef, useState } from "react";

interface Collection {
  id: string;
  slug: string;
  name: string;
  icon: string;
  order: number;
}

export default function ContentSwitcher({
  enabled,
  active,
  collections,
}: {
  enabled: boolean;
  active: Collection;
  collections: Collection[];
}) {
  const router = useRouter();
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

    setBusy(true);
    try {
      const response = await fetch("/api/content-context", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentCollectionId: collection.id }),
      });
      if (!response.ok) return;
      setOpen(false);
      // Een volledige reload zorgt dat ook client components hun content opnieuw ophalen.
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  const ordered = [active, ...collections.filter((collection) => collection.id !== active.id)];

  return (
    <div ref={ref} className="absolute left-1/2 top-0 h-full -translate-x-1/2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={"Actieve content: " + active.name + ". Klik om te wisselen."}
        className="h-full inline-flex items-center justify-center gap-1.5 px-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-300"
      >
        <span aria-hidden>{active.icon}</span>
        <span className="hidden md:inline max-w-[15rem] truncate">{active.name}</span>
        <span className="text-[10px] leading-none" aria-hidden>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-screen max-w-5xl overflow-hidden rounded-b-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 z-50">
          <div className="mx-auto max-w-2xl px-4 py-2" role="listbox" aria-label="Beschikbare content">
            {ordered.map((collection, index) => {
              const selected = collection.id === active.id;
              return (
                <button
                  key={collection.id}
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
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
