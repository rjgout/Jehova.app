"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface BackTarget {
  href: string; // waar "terug" naartoe gaat
  parent: string; // naam van die pagina
  title: string; // de huidige pagina
  icon: string;
}

// De onderliggende pagina's van Hulpmiddelen. Bladwijzers staat bewust op
// /bookmarks (ouder dan de hulpmiddelenpagina), maar hoort daar wel bij.
const TOOL_SUBPAGES: Record<string, { title: string; icon: string }> = {
  "/tools/dictionary": { title: "Woordenboek", icon: "📚" },
  "/bookmarks": { title: "Bladwijzers", icon: "🔖" },
  "/tools/xp-guide": { title: "Wat levert XP op?", icon: "⭐" },
  "/tools/persons": { title: "Personages", icon: "👤" },
};

function backTargetFor(pathname: string): BackTarget | null {
  const tool = TOOL_SUBPAGES[pathname];
  if (tool) return { href: "/tools", parent: "Hulpmiddelen", ...tool };
  if (pathname === "/feedback") return { href: "/profile", parent: "Profiel", title: "Feedback", icon: "💬" };
  if (/^\/scrabble\/[^/]+$/.test(pathname)) return { href: "/scrabble", parent: "Woordspellen", title: "Woordspel", icon: "🔤" };
  if (/^\/fsy\/[^/]+$/.test(pathname)) return { href: "/courses", parent: "Cursussen", title: "Les", icon: "📘" };
  const chapter = /^\/courses\/([^/]+)\/chapter\/[^/]+$/.exec(pathname);
  if (chapter) return { href: `/courses/${chapter[1]}`, parent: "Cursus", title: "Hoofdstuk", icon: "📖" };
  return null;
}

/**
 * Paginabrede terugbalk voor onderliggende pagina's (Hulpmiddelen, Feedback,
 * een woordspel, een les of hoofdstuk), in plaats van losse "← Terug"-tekst
 * per pagina. Staat in de vaste bovenbalk (StickyHeader in layout.tsx),
 * direct onder de miniplayers: zo plakt hij onder een actieve miniplayer, of
 * anders onder de header, en telt zijn hoogte vanzelf mee in --header-height.
 */
export default function SubpageBackBar() {
  const pathname = usePathname();
  const page = backTargetFor(pathname);
  if (!page) return null;

  return (
    <div className="bg-gradient-to-r from-brand-600 to-brand-500 dark:from-brand-800 dark:to-brand-700 text-white shadow-md shadow-brand-900/10">
      <div className="mx-auto max-w-5xl px-4 py-2 flex items-center gap-3">
        <Link
          href={page.href}
          className="group flex shrink-0 items-center gap-2.5 rounded-full pr-2 -ml-1 py-0.5 transition active:scale-95"
          aria-label={`Terug naar ${page.parent}`}
        >
          <span className="h-8 w-8 shrink-0 rounded-full bg-white/20 ring-1 ring-white/30 flex items-center justify-center transition group-hover:bg-white/30">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </span>
          <span className="flex flex-col leading-tight min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">Terug naar</span>
            <span className="font-extrabold">{page.parent}</span>
          </span>
        </Link>

        <span className="ml-auto flex items-center gap-1.5 min-w-0 rounded-full bg-white/15 px-2.5 py-1 text-sm font-bold">
          <span aria-hidden>{page.icon}</span>
          <span className="truncate">{page.title}</span>
        </span>
      </div>
    </div>
  );
}
