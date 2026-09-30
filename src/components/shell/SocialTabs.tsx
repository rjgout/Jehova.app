"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/I18nProvider";
import { SOCIAL_TABS } from "@/lib/navigation";

// Competitie en Activiteit hebben geen eigen plek meer in de onderbalk; ze
// horen bij Vrienden. Deze tabs houden ze met één tik bereikbaar vanaf elk
// van de drie pagina's, zonder die pagina's zelf te veranderen.
export default function SocialTabs() {
  const t = useT();
  const pathname = usePathname();
  const current = SOCIAL_TABS.find((tab) => pathname === tab.href);
  if (!current) return null;
  return (
    <nav aria-label={t("nav.friends")} className="vs-motion mx-auto mb-6 flex w-full max-w-md rounded-full border border-vs-line bg-vs-surface p-1">
      {SOCIAL_TABS.map((tab) => {
        const isActive = tab.href === current.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex h-10 flex-1 items-center justify-center rounded-full text-sm font-bold transition-colors ${
              isActive ? "bg-vs-accent text-vs-on-accent" : "text-vs-fg-2 hover:bg-vs-subtle"
            }`}
          >
            {t(tab.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
