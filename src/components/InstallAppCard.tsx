"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { hasInstallPrompt, onInstallPromptChange, promptInstall, isStandalone, isIOS } from "@/lib/pwaInstall";

/**
 * Stap 0 van de onboarding (ná registratie) — de enige plek waar deze volle
 * kaart nog gebruikt wordt. Zie HeaderInstallHint.tsx voor de kleinere,
 * terugkerende herinnering die daarna in de header verschijnt zolang de app
 * nog niet geïnstalleerd is.
 */
export default function InstallAppCard() {
  const t = useT();
  const [standalone, setStandalone] = useState(false);
  const [promptAvailable, setPromptAvailable] = useState(false);
  const [ios, setIos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dismissedResult, setDismissedResult] = useState(false);

  useEffect(() => {
    setStandalone(isStandalone());
    setPromptAvailable(hasInstallPrompt());
    setIos(isIOS());
    return onInstallPromptChange(setPromptAvailable);
  }, []);

  if (standalone) {
    return (
      <div className="card text-left">
        <div className="text-3xl mb-2">✅</div>
        <h3 className="font-extrabold mb-1 dark:text-slate-100">{t("installApp.alreadyInstalled")}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("installApp.alreadyText")}</p>
      </div>
    );
  }

  async function onInstallClick() {
    setBusy(true);
    const outcome = await promptInstall();
    setBusy(false);
    if (outcome !== "unavailable") setDismissedResult(true);
  }

  return (
    <div className="card text-left">
      <div className="text-3xl mb-2">📲</div>
      <h3 className="font-extrabold mb-1 dark:text-slate-100">
        {ios ? t("installApp.titleIos") : t("installApp.title")}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
        {t("installApp.why")}
      </p>

      {promptAvailable && (
        <button className="btn-primary" onClick={onInstallClick} disabled={busy}>
          {busy ? t("courses.busy") : t("installApp.install")}
        </button>
      )}

      {!promptAvailable && dismissedResult && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("installApp.later")}</p>
      )}

      {!promptAvailable && !dismissedResult && ios && (
        <ol className="text-sm text-slate-500 dark:text-slate-400 list-decimal list-inside flex flex-col gap-1">
          <li>{t("installApp.ios1")}</li>
          <li>{t("installApp.ios2")}</li>
          <li>{t("installApp.ios3")}</li>
        </ol>
      )}

      {!promptAvailable && !dismissedResult && !ios && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("installApp.other")}
        </p>
      )}
    </div>
  );
}
