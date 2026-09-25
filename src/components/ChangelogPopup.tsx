"use client";

import { useEffect, useState } from "react";
import { useT, useUiLanguage } from "@/components/I18nProvider";
import { getLanguage } from "@/lib/languages";

interface EntryView {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

// App-breed gemount (naast InviteListener, zie layout.tsx) zodat dit
// verschijnt op welke pagina een gebruiker na inloggen ook als eerste
// bezoekt — niet alleen het dashboard. Toont alleen de items die na de
// laatst-geziene stand zijn toegevoegd (seenAt komt van de server, zie
// /api/changelog); staat changelogEnabled uit, dan is hasUnseen server-side
// altijd false en verschijnt dit nooit.
export default function ChangelogPopup() {
  const t = useT();
  const intlLocale = getLanguage(useUiLanguage()).intlLocale;
  const [newEntries, setNewEntries] = useState<EntryView[] | null>(null);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    fetch("/api/changelog")
      .then((r) => r.json())
      .then((data: { entries: EntryView[]; seenAt: string; hasUnseen: boolean }) => {
        if (!data.hasUnseen) return;
        const seenAt = new Date(data.seenAt).getTime();
        setNewEntries(data.entries.filter((e) => new Date(e.createdAt).getTime() > seenAt));
      })
      .catch(() => {});
  }, []);

  async function dismiss() {
    setDismissing(true);
    await fetch("/api/changelog/seen", { method: "POST" }).catch(() => {});
    setNewEntries(null);
    setDismissing(false);
  }

  if (!newEntries || newEntries.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card !p-5 max-w-md w-full max-h-[80vh] overflow-y-auto flex flex-col gap-4 animate-pop">
        <h2 className="font-extrabold text-lg dark:text-slate-100">{t("misc.whatsNew")}</h2>
        <div className="flex flex-col gap-4">
          {newEntries.map((entry) => (
            <div key={entry.id}>
              <p className="font-bold dark:text-slate-100">{entry.title}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">
                {new Date(entry.createdAt).toLocaleDateString(intlLocale)}
              </p>
              <p className="text-sm whitespace-pre-wrap dark:text-slate-200">{entry.body}</p>
            </div>
          ))}
        </div>
        <button className="btn-primary self-end" disabled={dismissing} onClick={dismiss}>
          {t("misc.read")}
        </button>
      </div>
    </div>
  );
}
