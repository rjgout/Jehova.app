"use client";

import { useEffect, useState } from "react";

interface SettingsView {
  wordGameEnabled: boolean;
  scrabbleEnabled: boolean;
  gezinsavondEnabled: boolean;
  chapterGuessEnabled: boolean;
  challengesEnabled: boolean;
  liveExercisesEnabled: boolean;
  alleskennerEnabled: boolean;
}

const GAMES: { key: keyof SettingsView; label: string }[] = [
  { key: "wordGameEnabled", label: "🟩 Woord van de dag" },
  { key: "scrabbleEnabled", label: "🔤 Woordspel" },
  { key: "gezinsavondEnabled", label: "🎉 Gezinsavond" },
  { key: "chapterGuessEnabled", label: "🔎 Raad het hoofdstuk" },
  { key: "challengesEnabled", label: "⚔️ Uitdagingen" },
  { key: "liveExercisesEnabled", label: "🏁 Nieuw live spel starten (oefeningen-race)" },
  { key: "alleskennerEnabled", label: "🧠 De Alleskenner" },
];

export default function AdminGameSettingsClient() {
  const [settings, setSettings] = useState<SettingsView | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/game-settings")
      .then((r) => r.json())
      .then(setSettings);
  }, []);

  async function toggle(key: keyof SettingsView) {
    if (!settings) return;
    const next = !settings[key];
    setSettings({ ...settings, [key]: next });
    setSaving(true);
    await fetch("/api/admin/game-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: next }),
    }).catch(() => {});
    setSaving(false);
  }

  return (
    <details className="group card flex flex-col gap-4">
      <summary className="font-extrabold text-lg dark:text-slate-100 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden flex items-center justify-between">
        Spelletjes
        <span className="text-slate-400 transition-transform group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Uitgezet spelletjes verdwijnen uit het overzicht (/live) van gewone gebruikers — een rechtstreekse link blijft
        wel werken. Jijzelf blijft, als admin, alles zien.
      </p>

      {!settings ? (
        <p className="text-slate-400 dark:text-slate-500">Laden...</p>
      ) : (
        <div className="flex flex-col gap-2">
          {GAMES.map((g) => (
            <label key={g.key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-5 w-5 accent-brand-500"
                checked={settings[g.key]}
                onChange={() => toggle(g.key)}
                disabled={saving}
              />
              <span className="text-sm dark:text-slate-200">{g.label}</span>
              {!settings[g.key] && (
                <span className="text-xs font-bold uppercase text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded-full px-2 py-0.5">
                  Uitgeschakeld
                </span>
              )}
            </label>
          ))}
        </div>
      )}
    </details>
  );
}
