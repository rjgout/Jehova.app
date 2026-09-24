"use client";

import { useEffect, useState } from "react";

interface Collection {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  visibleToUsers: boolean;
}

interface Snapshot {
  enabled: boolean;
  collections: Collection[];
}

export default function AdminContentSwitcherClient() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/content-switcher")
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => body && setData({ enabled: body.enabled === true, collections: body.collections ?? [] }));
  }, []);

  async function save(body: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/content-switcher", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? "Opslaan mislukt.");
        return;
      }
      setData({ enabled: result.enabled === true, collections: result.collections ?? [] });
    } catch {
      setError("Opslaan mislukt.");
    } finally {
      setSaving(false);
    }
  }

  // Alleen collecties die intern aan staan kunnen in het menu komen; de rest
  // tonen heeft geen zin, want getContentContext slaat ze toch over.
  const collections = data?.collections.filter((collection) => collection.enabled) ?? [];
  const visibleCount = collections.filter((collection) => collection.visibleToUsers).length;

  return (
    <details className="group card flex flex-col gap-4">
      <summary className="font-extrabold text-lg dark:text-slate-100 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden flex items-center justify-between">
        Content
        <span className="text-slate-400 transition-transform group-open:rotate-180" aria-hidden>▾</span>
      </summary>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Zet de contentswitcher voor gebruikers aan of uit, en kies welke content gebruikers daarin
        te zien krijgen.
      </p>

      {!data ? (
        <p className="text-slate-400 dark:text-slate-500">Laden...</p>
      ) : (
        <>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="h-5 w-5 accent-brand-500"
              checked={data.enabled}
              onChange={() => save({ enabled: !data.enabled })}
              disabled={saving}
            />
            <span className="text-sm dark:text-slate-200">Contentswitcher beschikbaar voor gebruikers</span>
            {!data.enabled && (
              <span className="text-xs font-bold uppercase text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-300 rounded-full px-2 py-0.5">
                Uitgeschakeld
              </span>
            )}
          </label>

          <div className="mt-2 flex flex-col gap-2">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Zichtbaar voor gebruikers</h3>
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700 rounded-xl border border-slate-100 dark:border-slate-700">
              {collections.map((collection) => {
                const lastVisible = collection.visibleToUsers && visibleCount === 1;
                return (
                  <label
                    key={collection.id}
                    className={`flex items-center gap-3 px-3 py-2.5 ${lastVisible ? "cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-brand-500"
                      checked={collection.visibleToUsers}
                      onChange={() =>
                        save({ contentCollectionId: collection.id, visibleToUsers: !collection.visibleToUsers })
                      }
                      disabled={saving || lastVisible}
                    />
                    <span className="text-xl shrink-0" aria-hidden>{collection.icon}</span>
                    <span className="min-w-0 flex-1 text-sm font-semibold dark:text-slate-200">{collection.name}</span>
                    {!collection.visibleToUsers && (
                      <span className="shrink-0 text-xs font-bold uppercase text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-300 rounded-full px-2 py-0.5">
                        Verborgen
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Beheerders zien altijd alle content, ook verborgen content, zodat je die eerst kunt
              bekijken. Minstens één content blijft zichtbaar. Wie verborgen content open had, gaat
              terug naar de eerste zichtbare. Met één zichtbare content toont de switcher zich niet
              voor gebruikers.
            </p>
          </div>

          {error && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}
        </>
      )}
    </details>
  );
}
