"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/I18nProvider";
import type { MessageKey } from "@/lib/i18n/core";

interface SettingsView {
  wordGameEnabled: boolean;
  scrabbleEnabled: boolean;
  gezinsavondEnabled: boolean;
  chapterGuessEnabled: boolean;
  challengesEnabled: boolean;
  liveExercisesEnabled: boolean;
  alleskennerEnabled: boolean;
}

// Icoon los van de naam: de naam is dezelfde vertaling als elders in de app.
const GAMES: { key: keyof SettingsView; icon: string; labelKey: MessageKey }[] = [
  { key: "wordGameEnabled", icon: "🟩", labelKey: "pages.wordOfTheDay" },
  { key: "scrabbleEnabled", icon: "🔤", labelKey: "pages.wordGame" },
  { key: "gezinsavondEnabled", icon: "🎉", labelKey: "pages.familyNight" },
  { key: "chapterGuessEnabled", icon: "🔎", labelKey: "pages.chapterGuess" },
  { key: "challengesEnabled", icon: "⚔️", labelKey: "pages.challenges" },
  { key: "liveExercisesEnabled", icon: "", labelKey: "adminGames.liveExercises" },
  { key: "alleskennerEnabled", icon: "🧠", labelKey: "pages.alleskenner" },
];

export default function AdminGameSettingsClient() {
  const t = useT();
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
        {t("adminGames.title")}
        <span className="text-slate-400 transition-transform group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t("adminGames.intro")}
      </p>

      {!settings ? (
        <p className="text-slate-400 dark:text-slate-500">{t("common.loading")}</p>
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
              <span className="text-sm dark:text-slate-200">{g.icon ? `${g.icon} ${t(g.labelKey)}` : t(g.labelKey)}</span>
              {!settings[g.key] && (
                <span className="text-xs font-bold uppercase text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded-full px-2 py-0.5">
                  {t("adminContent.disabled")}
                </span>
              )}
            </label>
          ))}
        </div>
      )}
    </details>
  );
}
