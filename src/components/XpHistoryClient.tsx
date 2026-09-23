"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type XPReason =
  | "LESSON_COMPLETED"
  | "PERFECT_SCORE"
  | "LIVE_GAME_PLAYED"
  | "LIVE_GAME_WON"
  | "ACHIEVEMENT"
  | "QUICK_PRACTICE"
  | "PODCAST_LESSON_COMPLETED"
  | "KIDS_STORY_COMPLETED"
  | "HINT_PURCHASED"
  | "FREEZE_PURCHASED"
  | "CHAPTER_GUESS_COMPLETED"
  | "WORD_GAME_WON"
  | "INTRO_LESSON_COMPLETED";

interface XpTransaction {
  id: string;
  amount: number;
  reason: XPReason;
  createdAt: string;
}

const REASON_LABELS: Record<XPReason, string> = {
  LESSON_COMPLETED: "Les afgerond",
  PERFECT_SCORE: "Perfecte score",
  LIVE_GAME_PLAYED: "Live quiz gespeeld",
  LIVE_GAME_WON: "Live quiz gewonnen",
  ACHIEVEMENT: "Achievement behaald",
  QUICK_PRACTICE: "Snelle ronde",
  PODCAST_LESSON_COMPLETED: "Podcastles afgerond",
  KIDS_STORY_COMPLETED: "Kinderverhaal afgerond",
  HINT_PURCHASED: "Hint gekocht",
  FREEZE_PURCHASED: "Streak freeze gekocht",
  CHAPTER_GUESS_COMPLETED: "Raad het hoofdstuk",
  WORD_GAME_WON: "Woordspel gewonnen",
  INTRO_LESSON_COMPLETED: "Introductieles afgerond",
};

const REASON_ICONS: Record<XPReason, string> = {
  LESSON_COMPLETED: "📖",
  PERFECT_SCORE: "🎯",
  LIVE_GAME_PLAYED: "⚡",
  LIVE_GAME_WON: "🏆",
  ACHIEVEMENT: "🏅",
  QUICK_PRACTICE: "✍️",
  PODCAST_LESSON_COMPLETED: "🎙️",
  KIDS_STORY_COMPLETED: "🧒",
  HINT_PURCHASED: "💡",
  FREEZE_PURCHASED: "🧊",
  CHAPTER_GUESS_COMPLETED: "🔍",
  WORD_GAME_WON: "🔤",
  INTRO_LESSON_COMPLETED: "🧭",
};

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function mondayOfWeek(d: Date): number {
  const x = new Date(d);
  const day = x.getDay(); // 0 = zondag
  const diff = day === 0 ? 6 : day - 1;
  x.setDate(x.getDate() - diff);
  return startOfDay(x);
}

// Groepeert de (al chronologisch aflopend gesorteerde) transacties in
// vaste, herkenbare emmers — net als bij de reeks-kalender werkt dit
// bewust op de kalenderdag in de tijdzone van de browser, niet op de
// UTC-dagbucket die de server voor streaks gebruikt (hier gaat het puur om
// leesbaarheid, niet om een harde grens zoals bij de streak-logica).
function groupTransactions(transactions: XpTransaction[]): { label: string; items: XpTransaction[] }[] {
  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = todayStart - 86_400_000;
  const weekStart = mondayOfWeek(now);

  function bucketFor(iso: string): string {
    const t = new Date(iso).getTime();
    if (t >= todayStart) return "Vandaag";
    if (t >= yesterdayStart) return "Gisteren";
    if (t >= weekStart) return "Deze week";
    return "Eerder";
  }

  const order = ["Vandaag", "Gisteren", "Deze week", "Eerder"];
  const byLabel = new Map<string, XpTransaction[]>();
  for (const tx of transactions) {
    const label = bucketFor(tx.createdAt);
    if (!byLabel.has(label)) byLabel.set(label, []);
    byLabel.get(label)!.push(tx);
  }
  return order.flatMap((label) => {
    const items = byLabel.get(label);
    return items && items.length > 0 ? [{ label, items }] : [];
  });
}

function formatRowTime(iso: string, bucket: string): string {
  const d = new Date(iso);
  if (bucket === "Vandaag" || bucket === "Gisteren") {
    return new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit" }).format(d);
  }
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
}

export default function XpHistoryClient() {
  const [transactions, setTransactions] = useState<XpTransaction[]>([]);
  const [xpTotal, setXpTotal] = useState<number | null>(null);
  const [xpThisWeek, setXpThisWeek] = useState<number>(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load(skip: number) {
    fetch(`/api/xp-history?skip=${skip}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Kon de XP-geschiedenis niet laden.");
        setXpTotal(data.xpTotal);
        if (typeof data.xpThisWeek === "number") setXpThisWeek(data.xpThisWeek);
        setHasMore(data.hasMore);
        setTransactions((prev) => (skip === 0 ? data.transactions : [...prev, ...data.transactions]));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Er ging iets mis."))
      .finally(() => setLoadingMore(false));
  }

  useEffect(() => {
    load(0);
  }, []);

  function loadMore() {
    setLoadingMore(true);
    load(transactions.length);
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto card text-center flex flex-col gap-3">
        <p className="text-red-600 dark:text-red-400 font-semibold">{error}</p>
        <Link href="/dashboard" className="btn-secondary self-center">
          Terug
        </Link>
      </div>
    );
  }

  if (xpTotal === null) {
    return <p className="text-center text-slate-400 dark:text-slate-500">Laden...</p>;
  }

  const groups = groupTransactions(transactions);

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">⭐ Ervaringspunten</h1>

      <div className="card bg-gradient-to-br from-brand-500 to-brand-700 dark:from-brand-600 dark:to-brand-900 text-white flex flex-col items-center gap-1 !py-8">
        <span className="text-4xl" aria-hidden>
          ⭐
        </span>
        <div className="text-5xl font-extrabold leading-none">{xpTotal}</div>
        <div className="text-brand-100 font-bold text-sm mt-1">XP verzameld</div>
        {xpThisWeek > 0 && (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-black/15 px-3.5 py-1.5 text-xs font-bold text-gold-400">
            🔥 Deze week: +{xpThisWeek} XP
          </span>
        )}
      </div>

      <Link
        href="/tools/xp-guide"
        className="card !py-4 !bg-gold-50 dark:!bg-slate-800 !border-gold-400/30 dark:!border-slate-700 flex items-center gap-3 hover:ring-2 hover:ring-gold-300"
      >
        <span className="text-2xl shrink-0" aria-hidden>
          💡
        </span>
        <div className="min-w-0">
          <p className="font-extrabold text-sm dark:text-slate-100">Wat levert dit op?</p>
          <p className="text-xs text-gold-700 dark:text-gold-400 font-semibold">Bekijk het overzicht van elke activiteit →</p>
        </div>
      </Link>

      <div className="flex flex-col gap-4">
        <h2 className="font-extrabold text-lg dark:text-slate-100">Geschiedenis</h2>
        {groups.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Nog geen XP verdiend.</p>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 px-1">
                {group.label}
              </p>
              <div className="flex flex-col gap-2">
                {group.items.map((tx) => (
                  <div key={tx.id} className="card !py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="text-lg shrink-0 w-10 h-10 rounded-full bg-brand-50 dark:bg-slate-700 flex items-center justify-center"
                        aria-hidden
                      >
                        {REASON_ICONS[tx.reason]}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate dark:text-slate-100">{REASON_LABELS[tx.reason]}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{formatRowTime(tx.createdAt, group.label)}</p>
                      </div>
                    </div>
                    <span
                      className={`font-extrabold shrink-0 ${tx.amount >= 0 ? "text-brand-600 dark:text-brand-300" : "text-red-500 dark:text-red-400"}`}
                    >
                      {tx.amount >= 0 ? "+" : ""}
                      {tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {hasMore && (
          <button className="btn-secondary self-center mt-1" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Bezig..." : "Meer laden"}
          </button>
        )}
      </div>
    </div>
  );
}
