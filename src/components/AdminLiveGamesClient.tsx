"use client";

import { useEffect, useState } from "react";
import { useT, useUiLanguage } from "@/components/I18nProvider";
import { getLanguage } from "@/lib/languages";

interface GameView {
  id: string;
  code: string;
  status: "LOBBY" | "IN_PROGRESS";
  hostLabel: string;
  label: string;
  playerCount: number;
  createdAt: string;
}

export default function AdminLiveGamesClient() {
  const t = useT();
  const intlLocale = getLanguage(useUiLanguage()).intlLocale;
  const [games, setGames] = useState<GameView[] | null>(null);
  const [endingId, setEndingId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/live-games");
    if (res.ok) setGames((await res.json()).games);
  }

  useEffect(() => {
    load();
  }, []);

  async function endGame(id: string, code: string) {
    if (!window.confirm(t("adminLive.confirmEnd", { code }))) return;
    setEndingId(id);
    await fetch(`/api/admin/live-games/${id}`, { method: "DELETE" }).catch(() => {});
    await load();
    setEndingId(null);
  }

  return (
    <details className="group card flex flex-col gap-4">
      <summary className="font-extrabold text-lg dark:text-slate-100 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden flex items-center justify-between">
        {t("adminLive.title")}
        <span className="text-slate-400 transition-transform group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t("adminLive.intro")}
      </p>

      {!games ? (
        <p className="text-slate-400 dark:text-slate-500">{t("common.loading")}</p>
      ) : games.length === 0 ? (
        <p className="text-slate-400 dark:text-slate-500">{t("adminLive.none")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {games.map((g) => (
            <div
              key={g.id}
              className="border border-slate-100 dark:border-slate-700 rounded-xl p-3 flex items-center justify-between gap-2 flex-wrap"
            >
              <div>
                <p className="font-bold text-sm dark:text-slate-100">
                  {g.label}{" "}
                  <span className="font-normal text-slate-400 dark:text-slate-500">
                    ({t(g.playerCount === 1 ? "adminLive.playersOne" : "adminLive.playersMany", { status: t(`adminLive.status.${g.status}`), n: g.playerCount })})
                  </span>
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {t("adminLive.meta", { code: g.code, host: g.hostLabel, when: new Date(g.createdAt).toLocaleString(intlLocale) })}
                </p>
              </div>
              <button
                className="text-xs font-semibold text-red-500 dark:text-red-400 hover:underline shrink-0"
                disabled={endingId === g.id}
                onClick={() => endGame(g.id, g.code)}
              >
                {t("adminLive.end")}
              </button>
            </div>
          ))}
        </div>
      )}
    </details>
  );
}
