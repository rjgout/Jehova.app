"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBackTargetOverride } from "@/lib/backTarget";
import { useT } from "@/components/I18nProvider";
import type { MessageKey } from "@/lib/i18n/core";

interface BackTarget {
  href: string; // waar "terug" naartoe gaat
  parent: MessageKey; // naam van die pagina
  title: MessageKey; // de huidige pagina
  icon: string;
}

// De onderliggende pagina's van Hulpmiddelen. Bladwijzers staat bewust op
// /bookmarks (ouder dan de hulpmiddelenpagina), maar hoort daar wel bij.
const TOOL_SUBPAGES: Record<string, { title: MessageKey; icon: string }> = {
  "/tools/dictionary": { title: "pages.dictionary", icon: "📚" },
  "/bookmarks": { title: "pages.bookmarks", icon: "🔖" },
  "/tools/xp-guide": { title: "pages.xpGuide", icon: "⭐" },
  "/tools/persons": { title: "pages.persons", icon: "👤" },
};

// De spellen op Spelen (/live, zie LiveLobbyForm.tsx): de eigen pagina van
// een spel gaat terug naar Spelen. Een lopend spel (/live/<code>) bewust niet:
// daar leidt een terugbalk alleen af.
const GAME_PAGES: Record<string, { title: MessageKey; icon: string }> = {
  "/word-game": { title: "pages.wordOfTheDay", icon: "🟩" },
  "/scrabble": { title: "pages.wordGame", icon: "🔤" },
  "/alleskenner": { title: "pages.alleskenner", icon: "🧠" },
  "/gezinsavond": { title: "pages.familyNight", icon: "🎉" },
  "/chapter-guess": { title: "pages.chapterGuess", icon: "🔎" },
  "/challenges": { title: "pages.challenges", icon: "⚔️" },
};

const LESSON_PAGES: [RegExp, MessageKey, string][] = [
  [/^\/lesson\/[^/]+$/, "pages.lesson", "📖"],
  [/^\/reading-lesson\/[^/]+$/, "pages.step", "📖"],
  [/^\/podcast\/[^/]+\/[^/]+$/, "pages.podcastLesson", "🎙️"],
  [/^\/kids\/[^/]+$/, "pages.kidsStory", "🧒"],
  [/^\/intro\/[^/]+$/, "pages.introLesson", "✨"],
];

function backTargetFor(pathname: string): BackTarget | null {
  const tool = TOOL_SUBPAGES[pathname];
  if (tool) return { href: "/tools", parent: "pages.tools", ...tool };
  if (pathname === "/feedback") return { href: "/profile", parent: "pages.profile", title: "pages.feedback", icon: "💬" };
  const game = GAME_PAGES[pathname];
  if (game) return { href: "/live", parent: "pages.play", ...game };
  if (pathname === "/alleskenner/alleen") return { href: "/alleskenner", parent: "pages.alleskenner", title: "pages.playAlone", icon: "🧠" };
  if (pathname === "/alleskenner/seizoen") return { href: "/alleskenner", parent: "pages.alleskenner", title: "pages.seasons", icon: "📅" };
  if (/^\/alleskenner\/seizoen\/[^/]+$/.test(pathname)) {
    return { href: "/alleskenner/seizoen", parent: "pages.seasons", title: "pages.season", icon: "📅" };
  }
  if (/^\/chapter-guess\/solo\/[^/]+$/.test(pathname)) {
    return { href: "/chapter-guess", parent: "pages.chapterGuess", title: "pages.playAlone", icon: "🔎" };
  }
  if (/^\/scrabble\/[^/]+$/.test(pathname)) return { href: "/scrabble", parent: "pages.wordGames", title: "pages.wordGame", icon: "🔤" };
  if (/^\/fsy\/[^/]+$/.test(pathname)) return { href: "/courses", parent: "pages.courses", title: "pages.lesson", icon: "📘" };
  // Lessen uit een cursus. Weet de pagina uit welke cursus de les komt, dan
  // geeft hij die door (zie CourseBackTarget); anders, bv. vanuit
  // bladwijzers of zoeken, gaat terug naar de cursussenlijst.
  const lesson = LESSON_PAGES.find(([pattern]) => pattern.test(pathname));
  if (lesson) return { href: "/courses", parent: "pages.courses", title: lesson[1], icon: lesson[2] };
  const chapter = /^\/courses\/([^/]+)\/chapter\/[^/]+$/.exec(pathname);
  if (chapter) return { href: `/courses/${chapter[1]}`, parent: "pages.course", title: "pages.chapter", icon: "📖" };
  if (/^\/courses\/[^/]+$/.test(pathname)) return { href: "/courses", parent: "pages.courses", title: "pages.course", icon: "📚" };
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
  const t = useT();
  const override = useBackTargetOverride(pathname);
  const base = backTargetFor(pathname);
  if (!base) return null;
  // Een cursusnaam (override) komt al als tekst uit de database.
  const page = {
    href: override?.href ?? base.href,
    parent: override?.parent ?? t(base.parent),
    title: t(base.title),
    icon: base.icon,
  };

  return (
    <div className="bg-gradient-to-r from-brand-600 to-brand-500 dark:from-brand-800 dark:to-brand-700 text-white shadow-md shadow-brand-900/10">
      <div className="mx-auto max-w-5xl px-4 py-2 flex items-center gap-3">
        <Link
          href={page.href}
          className="group flex shrink-0 items-center gap-2.5 rounded-full pr-2 -ml-1 py-0.5 transition active:scale-95"
          aria-label={t("backBar.backToAria", { name: page.parent })}
        >
          <span className="h-8 w-8 shrink-0 rounded-full bg-white/20 ring-1 ring-white/30 flex items-center justify-center transition group-hover:bg-white/30">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </span>
          <span className="flex flex-col leading-tight min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t("backBar.backTo")}</span>
            {/* Cursusnamen kunnen lang zijn ("Verhalen uit het Boek van Mormon (voor kinderen)"). */}
            <span className="font-extrabold truncate max-w-[55vw] sm:max-w-md">{page.parent}</span>
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
