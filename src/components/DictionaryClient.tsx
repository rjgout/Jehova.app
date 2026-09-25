"use client";

import { useEffect, useMemo, useState } from "react";
import { useT, useUiLanguage } from "@/components/I18nProvider";
import { getLanguage } from "@/lib/languages";

interface DictionaryEntry {
  word: string;
  count: number;
}

interface VerseMatch {
  bookName: string;
  chapterNumber: number;
  verseNumber: number;
  text: string;
}

type FilterMode = "letter" | "length";

export default function DictionaryClient() {
  const t = useT();
  const intlLocale = getLanguage(useUiLanguage()).intlLocale;
  const [entries, setEntries] = useState<DictionaryEntry[] | null>(null);
  const [collectionName, setCollectionName] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<FilterMode>("letter");
  const [letter, setLetter] = useState<string | null>("a");
  const [length, setLength] = useState<number | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [verses, setVerses] = useState<VerseMatch[] | null>(null);
  const [versesError, setVersesError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dictionary")
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.error ?? t("courses.errorStatus", { status: r.status }));
        return data;
      })
      .then((d) => {
        setCollectionName(d.collectionName ?? "");
        setEntries(d.entries ?? []);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : t("courses.error")));
  }, []);

  // Alle beschikbare woordlengtes, aflopend uit de data i.p.v. een geraden
  // vaste reeks — zo klopt de chiprij vanzelf ongeacht welke woorden er in
  // de tekst voorkomen.
  const lengths = useMemo(() => {
    if (!entries) return [];
    return Array.from(new Set(entries.map((e) => e.word.length))).sort((a, b) => a - b);
  }, [entries]);

  // Alleen beginletters waar echt woorden mee beginnen (net als de lengtes
  // hierboven uit de data): een vaste a-z-rij toonde ook q, x en y, die in
  // het Boek van Mormon nergens aan het begin van een woord staan.
  const letters = useMemo(() => {
    if (!entries) return [];
    return Array.from(new Set(entries.map((e) => e.word[0]))).sort((a, b) => a.localeCompare(b, "nl"));
  }, [entries]);

  // Bij typen doorzoek je de hele lijst (het letter-/lengtefilter doet er dan
  // niet toe); zonder zoekterm filter je op beginletter of -lengte, zodat de
  // lijst (8500+ woorden) niet in één keer helemaal gerenderd hoeft te worden.
  const filtered = useMemo(() => {
    if (!entries) return [];
    const q = query.trim().toLowerCase();
    if (q) return entries.filter((e) => e.word.includes(q));
    if (mode === "letter" && letter) return entries.filter((e) => e.word.startsWith(letter));
    if (mode === "length" && length !== null) return entries.filter((e) => e.word.length === length);
    return entries;
  }, [entries, query, mode, letter, length]);

  function selectMode(next: FilterMode) {
    setMode(next);
    setQuery("");
  }

  // Het totaal-aantal (uit de woordenlijst) voor het geselecteerde woord —
  // gebruikt om toe te lichten waarom dat getal kan afwijken van het aantal
  // verzen hieronder (zie de toelichting bij de verzenlijst).
  const selectedTotalCount = useMemo(() => {
    if (!selectedWord || !entries) return null;
    return entries.find((e) => e.word === selectedWord)?.count ?? null;
  }, [selectedWord, entries]);

  // Nogmaals op hetzelfde woord klikken klapt het weer dicht i.p.v. opnieuw
  // te laden — verzen van een woord veranderen toch nooit binnen een sessie.
  async function selectWord(word: string) {
    if (selectedWord === word) {
      setSelectedWord(null);
      setVerses(null);
      setVersesError(null);
      return;
    }
    setSelectedWord(word);
    setVerses(null);
    setVersesError(null);
    try {
      const res = await fetch(`/api/dictionary/${encodeURIComponent(word)}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("courses.errorStatus", { status: res.status }));
      setVerses(data.verses ?? []);
    } catch (e) {
      setVersesError(e instanceof Error ? e.message : t("courses.error"));
    }
  }

  if (loadError) {
    return (
      <div className="max-w-md mx-auto card text-center flex flex-col gap-3">
        <p className="text-red-600 dark:text-red-400 font-semibold">{loadError}</p>
        <button className="btn-secondary self-center" onClick={() => window.location.reload()}>
          {t("courses.retry")}
        </button>
      </div>
    );
  }

  if (!entries) {
    return <p className="text-center text-slate-400 dark:text-slate-500">{t("common.loading")}</p>;
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-4">

      <div>
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">{t("pages.dictionary")}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          {t("dictionary.intro", { n: entries.length.toLocaleString(intlLocale), source: collectionName || t("dictionary.theText") })}
        </p>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("dictionary.search")}
        className="input"
        aria-label={t("dictionary.searchLabel")}
      />

      <div className="flex gap-2 text-xs font-bold uppercase">
        <button
          className={`px-3 py-1.5 rounded-lg ${mode === "letter" ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}
          onClick={() => selectMode("letter")}
        >
          {t("dictionary.byLetter")}
        </button>
        <button
          className={`px-3 py-1.5 rounded-lg ${mode === "length" ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}
          onClick={() => selectMode("length")}
        >
          {t("dictionary.byLength")}
        </button>
      </div>

      {mode === "letter" ? (
        <div className="flex flex-wrap gap-1">
          <button
            className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
              !query && !letter
                ? "bg-brand-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
            }`}
            onClick={() => {
              setQuery("");
              setLetter(null);
            }}
          >
            {t("dictionary.all")}
          </button>
          {letters.map((l) => (
            <button
              key={l}
              className={`w-7 h-7 rounded-lg text-xs font-bold uppercase ${
                !query && letter === l
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              }`}
              onClick={() => {
                setQuery("");
                setLetter(l);
              }}
            >
              {l}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          <button
            className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
              !query && length === null
                ? "bg-brand-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
            }`}
            onClick={() => {
              setQuery("");
              setLength(null);
            }}
          >
            {t("dictionary.all")}
          </button>
          {lengths.map((n) => (
            <button
              key={n}
              className={`w-8 h-7 rounded-lg text-xs font-bold ${
                !query && length === n
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              }`}
              onClick={() => {
                setQuery("");
                setLength(n);
              }}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400 dark:text-slate-500">
        {t(filtered.length === 1 ? "dictionary.wordsOne" : "dictionary.wordsMany", { n: filtered.length.toLocaleString(intlLocale) })}
      </p>

      <div className="card !p-0 overflow-hidden">


        <ul className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map((e) => (
            <li key={e.word}>
              <button
                type="button"
                onClick={() => selectWord(e.word)}
                className={`w-full px-4 py-2 flex items-baseline justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                  selectedWord === e.word ? "bg-brand-50 dark:bg-brand-900/30" : ""
                }`}
              >
                <span className="dark:text-slate-100">{e.word}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">({e.count})</span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">{t("dictionary.noWords")}</li>
          )}
        </ul>
      </div>

      {selectedWord && (
        <div className="flex flex-col gap-1">
          <h2 className="font-extrabold dark:text-slate-100">
            {t("dictionary.whereTitle", { word: selectedWord })}{verses ? ` (${verses.length})` : ""}
          </h2>
          {/* Het getal achter het woord hierboven is het totaal aantal keer dat
              het voorkomt; hier gaat het om het aantal verzen — die twee
              wijken uiteen zodra een woord meer dan eens in hetzelfde vers
              staat (bv. "en"), dus dat hoort geen tegenstrijdigheid te lijken. */}
          {verses && selectedTotalCount !== null && selectedTotalCount !== verses.length && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {t(verses.length === 1 ? "dictionary.spreadOne" : "dictionary.spreadMany", { total: selectedTotalCount, n: verses.length })}
            </p>
          )}
          <div className="flex flex-col gap-3 mt-2">
            {versesError && <p className="text-red-600 dark:text-red-400 text-sm font-semibold">{versesError}</p>}
            {!versesError && !verses && <p className="text-sm text-slate-400 dark:text-slate-500">{t("common.loading")}</p>}
            {verses && verses.length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500">{t("dictionary.noVerses")}</p>
            )}
            {verses && verses.length > 0 && (
              <div className="flex flex-col gap-2">
                {verses.map((v, i) => (
                  <details key={i} className="group card !py-2">
                    <summary className="font-bold text-sm cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden flex items-center justify-between dark:text-slate-100">
                      {v.bookName} {v.chapterNumber}:{v.verseNumber}
                      <span className="text-slate-400 transition-transform group-open:rotate-180" aria-hidden>
                        ▾
                      </span>
                    </summary>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{v.text}</p>
                  </details>
                ))}
              </div>
            )}
          </div>
        </div>
      )}


    </div>
  );
}
