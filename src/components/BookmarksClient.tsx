"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/I18nProvider";

interface BookmarkItem {
  verseId: string;
  bookName: string;
  chapterNumber: number;
  chapterId: string;
  verseNumber: number;
  text: string;
}

export default function BookmarksClient() {
  const t = useT();
  const [items, setItems] = useState<BookmarkItem[] | null>(null);

  useEffect(() => {
    fetch("/api/bookmarks")
      .then((r) => r.json())
      .then(setItems);
  }, []);

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">{t("pages.bookmarks")}</h1>

      {!items && <p className="text-slate-400">{t("common.loading")}</p>}


      {items && items.length === 0 && (
        <p className="text-slate-400">
          {t("bookmarks.empty")}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {items?.map((b) => (
          <Link
            key={b.verseId}
            href={`/lesson/${b.chapterId}`}
            className="card !py-4 hover:shadow-md transition flex flex-col gap-1"
          >
            <span className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">
              {b.bookName} {b.chapterNumber}:{b.verseNumber}
            </span>
            <span className="text-slate-700 dark:text-slate-200">{b.text}</span>
          </Link>
        ))}
      </div>


    </div>
  );
}
