import Link from "next/link";
import { getT, type MessageKey } from "@/lib/i18n";
import type { LanguageCode } from "@/lib/languages";

const items: { href: string; label: MessageKey; icon: string }[] = [
  { href: "/courses", label: "nav.courses", icon: "📖" },
  { href: "/friends", label: "nav.friends", icon: "👥" },
  { href: "/competition", label: "nav.competition", icon: "🏆" },
  { href: "/live", label: "nav.play", icon: "🎮" },
  { href: "/shop", label: "nav.shop", icon: "🛒" },
  { href: "/profile", label: "nav.profile", icon: "🙂" },
];

// Dezelfde navigatie blijft op elk scherm onderaan staan, zodat de app niet
// van navigatiepatroon wisselt zodra er meer ruimte beschikbaar is.
export default function BottomNav({ language }: { language: LanguageCode }) {
  const t = getT(language);
  return (
    <nav
      // pb-[...] i.p.v. py-1 voor de onderkant: telt de homeindicator-ruimte
      // van een geïnstalleerde iOS-PWA (env(safe-area-inset-bottom), zie ook
      // viewportFit: "cover" in layout.tsx) op bij de gewone 0.25rem padding,
      // zodat de navigatie daar nooit onder valt. In een gewone browsertab
      // is die env()-waarde 0, dus daar verandert niets.
      className="fixed bottom-0 inset-x-0 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur border-t border-slate-100 dark:border-slate-700 shadow-[0_-2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_-2px_12px_rgba(0,0,0,0.2)]"
      // data-main-nav voor de CSS in globals.css: het aria-label is vertaald.
      data-main-nav
      aria-label={t("nav.main")}
    >
      <div className="mx-auto flex w-full max-w-3xl justify-around pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))]">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-slate-500 dark:text-slate-300 text-xs font-bold min-w-[3.5rem]"
        >
          <span className="text-xl" aria-hidden>
            {item.icon}
          </span>
          {t(item.label)}
        </Link>
      ))}
      </div>
    </nav>
  );
}
