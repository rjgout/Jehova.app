"use client";

import { useEffect, useState } from "react";
import { useT, useUiLanguage } from "@/components/I18nProvider";
import { getLanguage } from "@/lib/languages";
import { rich } from "@/lib/i18n/rich";
import Link from "next/link";

type StreakDayState = "STUDIED" | "FROZEN" | "NONE" | "FUTURE";

interface StreakDayView {
  dayKey: string;
  day: number;
  weekday: number; // 0 = maandag ... 6 = zondag
  state: StreakDayState;
}

interface StreakMonthView {
  year: number;
  month: number;
  days: StreakDayView[];
  daysStudied: number;
  freezesUsed: number;
}

interface StreakOverview {
  currentStreak: number;
  longestStreak: number;
  freezeCount: number;
  month: StreakMonthView;
}


function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthLabel(year: number, month: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1))
  );
}

function isActive(day: StreakDayView | null): boolean {
  return !!day && (day.state === "STUDIED" || day.state === "FROZEN");
}

export default function StreakClient() {
  const t = useT();
  const intlLocale = getLanguage(useUiLanguage()).intlLocale;
  const [overview, setOverview] = useState<StreakOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load(year?: number, month?: number) {
    const params = new URLSearchParams();
    if (year !== undefined) params.set("year", String(year));
    if (month !== undefined) params.set("month", String(month));
    const qs = params.toString();
    fetch(`/api/streak${qs ? `?${qs}` : ""}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? t("streakPage.loadFailed"));
        setOverview(data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("wordOfTheDay.somethingWrong")));
  }

  useEffect(() => {
    load();
  }, []);

  if (error) {
    return (
      <div className="max-w-md mx-auto card text-center flex flex-col gap-3">
        <p className="text-red-600 dark:text-red-400 font-semibold">{error}</p>
        <Link href="/dashboard" className="btn-secondary self-center">
          {t("wordOfTheDay.back")}
        </Link>
      </div>
    );
  }

  if (!overview) {
    return <p className="text-center text-slate-400 dark:text-slate-500">{t("common.loading")}</p>;
  }

  const { month } = overview;
  const now = new Date();
  const isCurrentMonth = month.year === now.getUTCFullYear() && month.month === now.getUTCMonth() + 1;

  function goToMonth(delta: number) {
    let y = month.year;
    let m = month.month + delta;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    load(y, m);
  }

  // Kalendergrid: eerste week vullen met lege cellen tot aan de weekdag van
  // dag 1, zodat de kolommen (Ma..Zo) kloppen.
  const weeks: (StreakDayView | null)[][] = [];
  let week: (StreakDayView | null)[] = new Array(month.days[0]?.weekday ?? 0).fill(null);
  for (const d of month.days) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const today = todayKey();

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">{t("streakPage.title")}</h1>

      <div className="card bg-gradient-to-br from-orange-400 to-red-500 text-white flex flex-col items-center gap-1 !py-8">
        <span className="text-4xl" aria-hidden>
          🔥
        </span>
        <div className="text-5xl font-extrabold leading-none">{overview.currentStreak}</div>
        <div className="text-orange-50 font-bold text-sm mt-1">{t("streakPage.daysInARow")}</div>
        {overview.longestStreak > 0 && (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-black/15 px-3.5 py-1.5 text-xs font-bold text-white">
            {t("streakPage.longest", { n: overview.longestStreak })}
          </span>
        )}
      </div>

      <div className="card !py-4 !bg-ice-50 dark:!bg-slate-800 !border-ice-400/30 dark:!border-slate-700 flex items-center gap-3">
        <span className="text-2xl shrink-0" aria-hidden>
          🧊
        </span>
        <p className="text-sm text-ice-700 dark:text-ice-400">
          {rich(t("streakPage.explain"), { streak: <span className="font-bold text-orange-500">{t("streakPage.streakWord")}</span> })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card !py-4 flex flex-col items-center gap-0.5">
          <div className="text-xl font-extrabold text-orange-500">🔥 {month.daysStudied}</div>
          <div className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">{t("streakPage.daysThisMonth")}</div>
        </div>
        <div className="card !py-4 flex flex-col items-center gap-0.5">
          <div className="text-xl font-extrabold text-ice-600 dark:text-ice-400">🧊 {overview.freezeCount}</div>
          <div className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">{t("lesson.freezes")}</div>
        </div>
      </div>

      <div className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <button className="btn-secondary !px-3 !py-1.5" onClick={() => goToMonth(-1)} aria-label={t("streakPage.prevMonth")}>
            ‹
          </button>
          <div className="text-center">
            <h2 className="font-extrabold text-lg capitalize dark:text-slate-100">{monthLabel(month.year, month.month, intlLocale)}</h2>
            {month.freezesUsed > 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500">{month.freezesUsed > 1 ? t("streakPage.freezesUsedMany", { n: month.freezesUsed }) : t("streakPage.freezesUsedOne", { n: month.freezesUsed })}</p>
            )}
          </div>
          <button
            className="btn-secondary !px-3 !py-1.5 disabled:opacity-30"
            onClick={() => goToMonth(1)}
            disabled={isCurrentMonth}
            aria-label={t("streakPage.nextMonth")}
          >
            ›
          </button>
        </div>

        <div>
          <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-400 dark:text-slate-500 mb-2">
            {t("streakPage.weekdays").split(",").map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            {weeks.map((w, i) => (
              <div key={i} className="flex h-10">
                {w.map((d, j) => {
                  if (!d) return <div key={j} className="flex-1" />;

                  const active = isActive(d);
                  const prevActive = j > 0 ? isActive(w[j - 1]) : false;
                  const nextActive = j < 6 ? isActive(w[j + 1]) : false;
                  const isToday = d.dayKey === today;

                  if (active) {
                    return (
                      <div key={j} className="flex-1 relative">
                        <div
                          className={`absolute inset-y-0.5 flex items-center justify-center bg-gradient-to-b from-orange-400 to-red-500 text-white font-extrabold text-sm ${
                            prevActive ? "left-0" : "left-1 rounded-l-full"
                          } ${nextActive ? "right-0" : "right-1 rounded-r-full"} ${
                            isToday ? "ring-2 ring-offset-1 ring-orange-300 dark:ring-offset-slate-800" : ""
                          }`}
                        >
                          {d.state === "FROZEN" ? "🧊" : d.day}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={j} className="flex-1 flex items-center justify-center">
                      <div
                        className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                          isToday
                            ? "border-2 border-orange-400 text-orange-500"
                            : d.state === "FUTURE"
                              ? "text-slate-300 dark:text-slate-600"
                              : "text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        {d.day}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
