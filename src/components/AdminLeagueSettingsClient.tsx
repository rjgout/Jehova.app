"use client";

import { useState, FormEvent } from "react";
import { useT } from "@/components/I18nProvider";

interface LeagueSettingsView {
  groupSize: number;
  promoteCount: number;
  demoteCount: number;
  minGroupSizeForMovement?: number; // niet meer gebruikt: kleinere groepen gaan naar verhouding
  seasonWeekCount: number;
  localeCode: string;
  activityRules: string; // pretty-printed JSON
}

export default function AdminLeagueSettingsClient({ initial }: { initial: LeagueSettingsView }) {
  const t = useT();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/admin/league-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        groupSize: Number(form.groupSize),
        promoteCount: Number(form.promoteCount),
        demoteCount: Number(form.demoteCount),
        seasonWeekCount: Number(form.seasonWeekCount),
      }),
    });
    setSaving(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage({ type: "error", text: data.error ?? t("adminCommon.error") });
      return;
    }
    setMessage({ type: "ok", text: t("adminCommon.saved") });
  }

  return (
    <details className="group card flex flex-col gap-4">
      <summary className="font-extrabold cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden flex items-center justify-between">
        {t("adminLeague.title")}
        <span className="text-slate-400 transition-transform group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t("adminLeague.intro1")}
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t("adminLeague.intro2")}
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-sm font-bold dark:text-slate-200">
            {t("adminLeague.groupSize")}
            <input
              type="number"
              className="input"
              min={2}
              value={form.groupSize}
              onChange={(e) => setForm({ ...form, groupSize: Number(e.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold dark:text-slate-200">
            {t("adminLeague.promote")}
            <input
              type="number"
              className="input"
              min={0}
              value={form.promoteCount}
              onChange={(e) => setForm({ ...form, promoteCount: Number(e.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold dark:text-slate-200">
            {t("adminLeague.demote")}
            <input
              type="number"
              className="input"
              min={0}
              value={form.demoteCount}
              onChange={(e) => setForm({ ...form, demoteCount: Number(e.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold dark:text-slate-200">
            {t("adminLeague.seasonWeeks")}
            <input
              type="number"
              className="input"
              min={1}
              value={form.seasonWeekCount}
              onChange={(e) => setForm({ ...form, seasonWeekCount: Number(e.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold dark:text-slate-200">
            {t("adminLeague.localeCode")}
            <input
              type="text"
              className="input"
              value={form.localeCode}
              onChange={(e) => setForm({ ...form, localeCode: e.target.value })}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm font-bold dark:text-slate-200">
          {t("adminLeague.rules")}
          <textarea
            className="input font-mono text-xs !h-48"
            value={form.activityRules}
            onChange={(e) => setForm({ ...form, activityRules: e.target.value })}
          />
        </label>

        <button className="btn-primary self-start" disabled={saving} type="submit">
          {saving ? t("adminCommon.busy") : t("adminCommon.save")}
        </button>
        {message && (
          <p className={`text-sm font-semibold ${message.type === "ok" ? "text-brand-600 dark:text-brand-300" : "text-red-600 dark:text-red-400"}`}>
            {message.text}
          </p>
        )}
      </form>
    </details>
  );
}
