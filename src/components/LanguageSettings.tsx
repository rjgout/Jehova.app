"use client";

import { useEffect, useState } from "react";
import { LANGUAGES, getLanguage } from "@/lib/languages";
import { useT } from "@/components/I18nProvider";
import AppSelect from "@/components/AppSelect";
import { SettingsField, SettingsSection, SettingsStatus, settingsFieldClass } from "@/components/profile/settings";

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
    <SettingsSection>
      <SettingsField label={t("languageSettings.appLanguage")} description={t("languageSettings.appLanguageHint")}>
        {uiChoices.length > 1 ? (
          <AppSelect
            className={settingsFieldClass}
            value={uiLanguage}
            disabled={saving}
            onChange={(value) => save("/api/account", "PATCH", { uiLanguage: value })}
            ariaLabel={t("languageSettings.appLanguage")}
            options={uiChoices.map((language) => ({ value: language.code, label: `${language.nativeName}${language.uiReady ? "" : ` ${t("languageSettings.inDevelopment")}`}` }))}
          />
        ) : (
          <p className="text-sm text-vs-fg-2">{t("languageSettings.moreFollow", { language: getLanguage(uiLanguage).nativeName })}</p>
        )}
      </SettingsField>

      <SettingsField label={t("languageSettings.textLanguage")} description={t("languageSettings.textLanguageHint")}>
        {contentLanguage === null ? (
          <p className="text-sm text-vs-fg-3">{t("common.loading")}</p>
        ) : contentChoices.length > 1 ? (
          <AppSelect
            className={settingsFieldClass}
            value={contentLanguage}
            disabled={saving}
            onChange={(value) => save("/api/content-context", "PUT", { contentLanguage: value })}
            ariaLabel={t("languageSettings.textLanguage")}
            options={contentChoices.map((language) => ({ value: language.code, label: language.nativeName }))}
          />
        ) : (
          <p className="text-sm text-vs-fg-2">{t("languageSettings.moreFollow", { language: getLanguage(contentLanguage).nativeName })}</p>
        )}
      </SettingsField>

      {error && (
        <div className="px-2 py-3">
          <SettingsStatus kind="error">{error}</SettingsStatus>
        </div>
      )}
    </SettingsSection>
  );
}
