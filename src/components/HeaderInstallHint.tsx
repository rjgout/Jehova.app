"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { hasInstallPrompt, onInstallPromptChange, promptInstall, isStandalone, isIOS } from "@/lib/pwaInstall";
import { useT } from "@/components/I18nProvider";

const AUTO_HIDE_MS = 30_000;

/**
 * Terugkerende, subtiele herinnering om de app op het scherm te zetten —
 * ná de onboarding (die al een keer de volle InstallAppCard toont), voor
 * wie die stap toen oversloeg. Verschijnt bij elke nieuwe paginalading
 * opnieuw (geen "al gezien"-vlag: bewust géén localStorage-onthouding, want
 * dit moet júist blijven terugkomen zolang de app niet geïnstalleerd is) en
 * verdwijnt vanzelf na 30 seconden als er niet op geklikt wordt.
 */
export default function HeaderInstallHint() {
  const pathname = usePathname();
  const t = useT();
  const [standalone, setStandalone] = useState(true); // pas na mount weten we het zeker; niet vast laten opflitsen
  const [promptAvailable, setPromptAvailable] = useState(false);
  const [ios, setIos] = useState(false);
  const [visible, setVisible] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStandalone(isStandalone());
    setPromptAvailable(hasInstallPrompt());
    setIos(isIOS());
    return onInstallPromptChange((available) => {
      setPromptAvailable(available);
      if (!available) setStandalone(isStandalone()); // "appinstalled" verbergt de hint alsnog meteen
    });
  }, []);

  useEffect(() => {
    if (expanded) return; // actief aan het lezen: niet onder je wegklikken
    const timer = setTimeout(() => setVisible(false), AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [expanded]);

  // Onboarding heeft zijn eigen, volle installatiestap — deze kleine hint
  // zou daar alleen maar verwarrend dubbelop zijn.
  if (standalone || !visible || pathname?.startsWith("/onboarding")) return null;

  async function onClick() {
    if (promptAvailable) {
      setBusy(true);
      await promptInstall();
      setBusy(false);
    } else {
      setExpanded(true);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={onClick}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full bg-gold-50 dark:bg-slate-800 border border-gold-400/40 text-gold-700 dark:text-gold-400 text-xs font-extrabold px-3 py-1.5 animate-pulse hover:animate-none"
      >
        💡 {t("header.installTip")}
      </button>

      {expanded && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-30 w-64 card !p-4 text-left animate-pop">
          <button
            onClick={() => setExpanded(false)}
            className="absolute top-2 right-2 w-6 h-6 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 flex items-center justify-center"
            aria-label={t("common.close")}
          >
            ✕
          </button>
          <p className="font-extrabold text-sm mb-1 dark:text-slate-100">
            {ios ? t("header.installTitleIos") : t("header.installTitle")}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{t("header.installWhy")}</p>
          {ios ? (
            <ol className="text-xs text-slate-500 dark:text-slate-400 list-decimal list-inside flex flex-col gap-1">
              <li>{t("header.installIos1")}</li>
              <li>{t("header.installIos2")}</li>
              <li>{t("header.installIos3")}</li>
            </ol>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("header.installOther")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
