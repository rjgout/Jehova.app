"use client";

import { useEffect, useState } from "react";
import CollapsibleCard from "@/components/CollapsibleCard";
import { LANGUAGES, getLanguage } from "@/lib/languages";
import { useT } from "@/components/I18nProvider";

// Twee losse keuzes (zie User.uiLanguage / contentLanguage): de taal van de
// app en de taal waarin je de Schriften leest en speelt. Een taal staat
// alleen in de lijst als er echt iets in die taal is: app-teksten die af zijn
// (Language.uiReady; beheerders zien alles, om een vertaling te bekijken), of
// minstens één uitgave die je kunt kiezen.
export default function LanguageSettings({ uiLanguage, isAdmin }: { uiLanguage: string; isAdmin: boolean }) {
  const t = useT();
  const [contentLanguage, setContentLanguage] = useState<string | null>(null);
  const [contentLanguages, setContentLanguages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/content-context")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { contentLanguage: string; contentLanguages: string[] } | null) => {
        if (!data) return;
        setContentLanguage(data.contentLanguage);
        setContentLanguages(data.contentLanguages);
      })
      .catch(() => {});
  }, []);

  const uiChoices = LANGUAGES.filter((language) => language.uiReady || isAdmin || language.code === uiLanguage);
  const contentChoices = LANGUAGES.filter((language) => contentLanguages.includes(language.code));

  // Een volledige herlaadbeurt: menu's, cursussen en teksten komen van de server.
  async function save(url: string, method: "PATCH" | "PUT", body: object) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? t("languageSettings.saveFailed"));
        return;
      }
      window.location.reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <CollapsibleCard title={t("languageSettings.title")}>
      <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold dark:text-slate-200">{t("languageSettings.appLanguage")}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{t("languageSettings.appLanguageHint")}</span>
        {uiChoices.length > 1 ? (
          <select
            className="input"
            value={uiLanguage}
            disabled={saving}
            onChange={(e) => save("/api/account", "PATCH", { uiLanguage: e.target.value })}
          >
            {uiChoices.map((language) => (
              <option key={language.code} value={language.code}>
                {language.nativeName}
                {language.uiReady ? "" : ` ${t("languageSettings.inDevelopment")}`}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-sm dark:text-slate-200">
            {t("languageSettings.moreFollow", { language: getLanguage(uiLanguage).nativeName })}
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold dark:text-slate-200">{t("languageSettings.textLanguage")}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{t("languageSettings.textLanguageHint")}</span>
        {contentLanguage && contentChoices.length > 1 ? (
          <select
            className="input"
            value={contentLanguage}
            disabled={saving}
            onChange={(e) => save("/api/content-context", "PUT", { contentLanguage: e.target.value })}
          >
            {contentChoices.map((language) => (
              <option key={language.code} value={language.code}>
                {language.nativeName}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-sm dark:text-slate-200">
            {t("languageSettings.moreFollow", { language: getLanguage(contentLanguage).nativeName })}
          </span>
        )}
      </label>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </CollapsibleCard>
  );
}
