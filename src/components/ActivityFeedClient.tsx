"use client";

import { useEffect, useState } from "react";
import UserAvatar from "@/components/UserAvatar";
import { useT, useUiLanguage } from "@/components/I18nProvider";
import { getLanguage } from "@/lib/languages";

const REACTIONS = ["🫶🏻", "❤️", "🎉", "🔥", "🙌"] as const;

interface FeedItem {
  id: string;
  kind: "XP" | "ACHIEVEMENT";
  xpAmount: number;
  achievementIcon: string | null;
  createdAt: string;
  actor: { id: string; handle: string; discriminator: string; avatarEmoji: string | null };
  text: string;
  reactionCounts: Record<string, number>;
  myReaction: string | null;
  canReact: boolean;
}

export default function ActivityFeedClient() {
  const t = useT();
  const uiLanguage = useUiLanguage();
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [openReactions, setOpenReactions] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/activity-feed", { cache: "no-store" });
    if (!response.ok) {
      setError(t("activityFeed.loadFailed"));
      return;
    }
    setItems((await response.json()).items);
  }

  useEffect(() => {
    load();
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  async function react(item: FeedItem, emoji: string) {
    if (!item.canReact) return;
    setOpenReactions(null);
    const response = await fetch(`/api/activity-feed/${encodeURIComponent(item.id)}/reaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (!response.ok) return;
    const { emoji: saved } = await response.json();
    setItems((current) =>
      current?.map((entry) => {
        if (entry.id !== item.id) return entry;
        const counts = { ...entry.reactionCounts };
        if (entry.myReaction) counts[entry.myReaction] = Math.max(0, (counts[entry.myReaction] ?? 1) - 1);
        if (saved) counts[saved] = (counts[saved] ?? 0) + 1;
        return { ...entry, reactionCounts: counts, myReaction: saved };
      }) ?? null
    );
  }

  if (!items) return <p className="text-slate-400 dark:text-slate-500">{error ?? t("common.loading")}</p>;

  const locale = getLanguage(uiLanguage).intlLocale;
  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-4 sm:gap-5">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300 flex items-center gap-1.5">
          <span className="text-base leading-none" aria-hidden>✨</span> {t("pages.activity")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t("activityFeed.intro")}</p>
      </div>

      {items.length === 0 ? (
        <div className="card text-center text-slate-500 dark:text-slate-400">{t("activityFeed.empty")}</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((item) => {
            const reactionEntries = Object.entries(item.reactionCounts).filter(([, count]) => count > 0);
            return (
              <article key={item.id} className="card !bg-vs-subtle dark:!bg-vs-surface flex flex-col gap-2 !p-3 sm:!p-4 sm:gap-2.5">
                <div className="flex items-start gap-3">
                  <UserAvatar id={item.actor.id} handle={item.actor.handle} avatarEmoji={item.actor.avatarEmoji} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm dark:text-slate-100">
                      <span className="font-extrabold">{item.actor.handle}#{item.actor.discriminator}</span>{" "}
                      {item.text}
                    </p>
                    <time className="text-xs text-slate-400 dark:text-slate-500" dateTime={item.createdAt}>
                      {new Date(item.createdAt).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
                    </time>
                  </div>
                  {item.achievementIcon && <span className="text-2xl" aria-hidden>{item.achievementIcon}</span>}
                </div>

                <div className="flex min-h-9 flex-wrap items-center gap-1.5">
                  {reactionEntries.map(([emoji, count]) => (
                    item.canReact ? (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => react(item, emoji)}
                        className={"min-h-9 rounded-full border px-2 py-1 text-sm " + (item.myReaction === emoji ? "border-brand-400 bg-brand-50 dark:bg-slate-700" : "border-slate-200 dark:border-slate-600")}
                        aria-label={t("activityFeed.reactWith", { emoji })}
                      >
                        {emoji} {count}
                      </button>
                    ) : (
                      <span key={emoji} className="rounded-full px-2 py-1 text-sm border border-slate-200 dark:border-slate-600">
                        {emoji} {count}
                      </span>
                    )
                  ))}
                  {item.canReact && (
                    <div className="relative ml-auto">
                      <button
                        type="button"
                        className="btn-secondary !min-h-9 !border !border-vs-line !bg-transparent !px-2.5 !py-1 text-xs !shadow-none text-vs-accent hover:!bg-vs-accent-soft dark:!border-vs-line dark:!bg-transparent dark:text-vs-accent dark:hover:!bg-vs-accent-soft"
                        onClick={() => setOpenReactions(openReactions === item.id ? null : item.id)}
                        aria-expanded={openReactions === item.id}
                      >
                        {item.myReaction ?? "🫶🏻"} {t("activityFeed.react")}
                      </button>
                      {openReactions === item.id && (
                        <div className="absolute right-0 bottom-full mb-2 z-10 flex gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 shadow-lg">
                          {REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              className="h-9 w-9 rounded-lg text-xl hover:bg-slate-100 dark:hover:bg-slate-700"
                              onClick={() => react(item, emoji)}
                              aria-label={t("activityFeed.reactWith", { emoji })}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
