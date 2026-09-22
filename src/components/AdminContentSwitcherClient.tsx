"use client";

import { useEffect, useState } from "react";

export default function AdminContentSwitcherClient() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/content-switcher")
      .then((response) => response.json())
      .then((data) => setEnabled(data.enabled === true))
      .finally(() => setLoading(false));
  }, []);

  async function toggle() {
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    try {
      const response = await fetch("/api/admin/content-switcher", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!response.ok) setEnabled(!next);
    } catch {
      setEnabled(!next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="group card flex flex-col gap-4">
      <summary className="font-extrabold text-lg dark:text-slate-100 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden flex items-center justify-between">
        Content
        <span className="text-slate-400 transition-transform group-open:rotate-180" aria-hidden>▾</span>
      </summary>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Zet de contentswitcher voor gebruikers aan of uit. Hiermee kun je later tussen verschillende
        contentcollecties wisselen, zoals het Boek van Mormon en andere lesboeken.
      </p>

      {loading ? (
        <p className="text-slate-400 dark:text-slate-500">Laden...</p>
      ) : (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="h-5 w-5 accent-brand-500"
            checked={enabled}
            onChange={toggle}
            disabled={saving}
          />
          <span className="text-sm dark:text-slate-200">Contentswitcher beschikbaar voor gebruikers</span>
          {!enabled && (
            <span className="text-xs font-bold uppercase text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 rounded-full px-2 py-0.5">
              Uitgeschakeld
            </span>
          )}
        </label>
      )}
    </details>
  );
}
