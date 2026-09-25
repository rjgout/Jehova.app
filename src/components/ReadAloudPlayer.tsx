"use client";

import { useT } from "@/components/I18nProvider";
import { useReadAloudPlayer, type ReadAloudSource, type ReadAloudVerse } from "@/lib/readAloudPlayerContext";

interface Props {
  sourceId: string;
  title: string;
  verses: ReadAloudVerse[];
  audio?: ReadAloudSource["audio"];
  startVerse?: number;
  subtitle?: string;
  /** Taal van de tekst, voor de computerstem (zie ReadAloudSource). */
  language?: string;
}

export default function ReadAloudPlayer({ sourceId, title, verses, audio, startVerse = 0, subtitle, language }: Props) {
  const t = useT();
  const { source, start } = useReadAloudPlayer();

  if (source?.id === sourceId) return null;

  return (
    <button
      onClick={() => start({ id: sourceId, title, verses, audio, language }, startVerse)}
      className="w-full rounded-2xl bg-brand-50 dark:bg-slate-800 border border-brand-100 dark:border-slate-700 px-4 py-3 flex items-center gap-3 text-left"
    >
      <span className="shrink-0 w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center text-lg" aria-hidden>
        ▶
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-brand-700 dark:text-brand-300">{t("player.readAloud")}</span>
        <span className="block text-xs text-slate-400 dark:text-slate-500">{subtitle ?? t("player.listenChapter")}</span>
      </span>
    </button>
  );
}
