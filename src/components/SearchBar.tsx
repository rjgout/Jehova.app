"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/I18nProvider";

interface SearchResult {
  chapterId: string;
  bookName: string;
  chapterNumber: number;
  verseNumber: number;
  text: string;
}

export default function SearchBar() {
  const t = useT();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => setResults(d.results));
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        className="input !py-2.5"
        placeholder={t("misc.searchText")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
      />
      {open && results && results.length > 0 && (
        <div className="absolute z-10 mt-2 w-full card !p-2 max-h-80 overflow-y-auto flex flex-col gap-1">
          {results.map((r, i) => (
            <Link
              key={i}
              href={`/lesson/${r.chapterId}`}
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-2 hover:bg-brand-50 dark:hover:bg-slate-700 flex flex-col"
            >
              <span className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">
                {r.bookName} {r.chapterNumber}:{r.verseNumber}
              </span>
              <span className="text-sm dark:text-slate-200 line-clamp-2">{r.text}</span>
            </Link>
          ))}
        </div>
      )}
      {open && results && results.length === 0 && query.trim().length >= 2 && (
        <div className="absolute z-10 mt-2 w-full card !p-3 text-sm text-slate-400">{t("misc.nothingFound")}</div>
      )}
    </div>
  );
}
