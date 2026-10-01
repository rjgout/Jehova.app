"use client";

import Link from "next/link";
import { Lock, Play } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import SystemIcon from "@/components/versado/SystemIcon";

const WORDS_PER_MINUTE = 130; // rustig lees-/nadenktempo

interface ChapterView {
  id: string;
  number: number;
  bookName: string;
  verseCount: number;
  exerciseCount: number;
  wordCount: number;
  completed: boolean;
  bestScore: number | null;
}

interface Props {
  /** Ingang naar Samen studeren, naast de titel (zie StudyTogetherButton). */
  studyAction?: React.ReactNode;
  courseId: string;
  courseName: string;
  currentChapterId: string | null;
  chapters: ChapterView[];
  // Van voor naar achter volgt een vaste volgorde (elk hoofdstuk
  // vergrendeld tot het vorige is afgerond); Vrije keuze is expliciet
  // bedoeld om in elke volgorde te doen, dus daar mag nooit iets op slot.
  sequential?: boolean;
  /** "hoofdstukken", of "afdelingen" bij Leer en Verbonden (zie src/lib/chapterTerm.ts). */
  unitPlural?: string;
}

// Gedeelde weergave voor elk cursustype dat simpelweg een lijst hoofdstukken
// is (van-voor-naar-achter, vrije keuze, per boek) — een chapter-afronding
// zelf blijft altijd gedeeld over cursussen heen (zie ChapterProgress), dit
// component bepaalt alleen welke hoofdstukken in DEZE cursus getoond worden
// en in welke volgorde/vergrendeling. Bij meerdere boeken (van-voor-naar-
// achter, vrije keuze) wordt elk boek een inklapbare sectie — anders werd dit
// bij het hele Boek van Mormon in één keer een erg lange pagina.
export default function ChapterListCourseView({ courseId, courseName, currentChapterId, chapters, sequential = true, unitPlural = "hoofdstukken", studyAction }: Props) {
  const t = useT();
  const allDone = chapters.length > 0 && chapters.every((c) => c.completed);
  const todayChapter =
    (currentChapterId && chapters.find((c) => c.id === currentChapterId)) ||
    chapters.find((c) => !c.completed) ||
    chapters[chapters.length - 1];
  const estimatedMinutes = todayChapter ? Math.max(1, Math.round(todayChapter.wordCount / WORDS_PER_MINUTE)) : 0;
  const xpAvailable = Math.min(todayChapter?.exerciseCount ?? 0, 7) * 10 + (todayChapter?.exerciseCount ? 20 : 0);
  const currentIndex = todayChapter ? chapters.findIndex((chapter) => chapter.id === todayChapter.id) : -1;
  const progressPosition = currentIndex >= 0 ? currentIndex + 1 : chapters.length;
  const progressPercent = chapters.length > 0 ? Math.round((progressPosition / chapters.length) * 100) : 0;

  // Groepeer per boek, in de volgorde waarin ze in `chapters` voorkomen —
  // bij Leer en Verbonden is dat er sowieso maar één.
  const books: { name: string; chapters: ChapterView[] }[] = [];
  for (const chapter of chapters) {
    const last = books[books.length - 1];
    if (last && last.name === chapter.bookName) last.chapters.push(chapter);
    else books.push({ name: chapter.bookName, chapters: [chapter] });
  }
  const singleBook = books.length <= 1;

  // Vooraf per hoofdstuk bepalen, niet tijdens het renderen van de kaarten:
  // React kan een component opnieuw renderen (hydratie in de browser), en
  // een teller die per kaart meeloopt, raakt dan uit de pas.
  const lockedById = new Map<string, boolean>();
  let previousCompleted = true;
  for (const chapter of chapters) {
    lockedById.set(chapter.id, sequential && !previousCompleted);
    previousCompleted = chapter.completed;
  }
  function ChapterCard({ chapter }: { chapter: ChapterView }) {
    const locked = lockedById.get(chapter.id) ?? false;
    const current = chapter.id === currentChapterId;
    const rowClass = `flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 transition motion-reduce:transition-none ${
      locked
        ? "text-slate-600 dark:text-slate-300"
        : current
          ? "bg-brand-50 ring-1 ring-brand-200 dark:bg-slate-800 dark:ring-brand-700"
          : "hover:bg-slate-50 dark:hover:bg-slate-800/70"
    }`;
    const rowContent = (
      <>
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
            chapter.completed
              ? "bg-brand-500 text-white"
              : locked
                ? "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                : current
                  ? "bg-gold-400 text-white"
                  : "border-2 border-gold-400 text-gold-600 dark:text-gold-300"
          }`}
        >
          {chapter.completed ? "✓" : locked ? <Lock className="h-4 w-4" strokeWidth={2.25} aria-hidden /> : current ? <Play className="h-4 w-4 fill-current" strokeWidth={2.25} aria-hidden /> : chapter.number}
        </div>
        <div className="min-w-0">
          <div className={`truncate font-extrabold ${locked ? "text-slate-600 dark:text-slate-300" : "dark:text-slate-100"}`}>
            {chapter.bookName} {chapter.number}
          </div>
          <div className={`text-xs ${locked ? "text-slate-500 dark:text-slate-400" : "text-slate-400 dark:text-slate-500"}`}>
            {t("courseView.verseCount", { n: chapter.verseCount })}
            {chapter.bestScore !== null ? t("courseView.bestScore", { n: chapter.bestScore }) : ""}
          </div>
        </div>
      </>
    );

    return locked ? (
      <div aria-disabled="true" className={rowClass}>
        {rowContent}
      </div>
    ) : (
      <Link href={`/lesson/${chapter.id}?cursus=${courseId}`} className={rowClass}>
        {rowContent}
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">{courseName}</h1>
          {studyAction}
        </div>

        {chapters.length > 0 && (
          <div className="flex flex-col gap-2 border-y border-slate-200/80 py-3 dark:border-slate-700/80">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
              <span>{t("courseView.progress")}</span>
              <span>{t("courseView.progressCount", { pos: progressPosition, total: chapters.length, unit: unitPlural, pct: progressPercent })}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full bg-brand-500 transition-all" style={{ width: progressPercent + "%" }} />
            </div>
          </div>
        )}

        {todayChapter && !allDone ? (
          <div className="card bg-gradient-to-br from-brand-500 to-brand-600 text-white flex flex-col gap-2.5">
            <p className="text-brand-100 font-bold uppercase text-xs tracking-wide">{t("courseView.today")}</p>
            <h2 className="text-2xl font-extrabold">
              📖 {todayChapter.bookName} {todayChapter.number}
            </h2>
            <p className="flex items-center gap-1 text-brand-100"><SystemIcon kind="xp" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden />{t("courseView.estimate", { minutes: estimatedMinutes, xp: xpAvailable })}</p>
            <Link
              href={`/lesson/${todayChapter.id}?cursus=${courseId}`}
              className="btn-primary self-start !bg-white !text-brand-700 !shadow-[0_4px_0_0_theme(colors.brand.800)] hover:!bg-brand-50"
            >
              {t("courseView.readMore")}
            </Link>
          </div>
        ) : (
          allDone && (
            <div className="card text-center">
              <p className="font-extrabold text-lg dark:text-slate-100">{t("courseView.allDone")}</p>
            </div>
          )
        )}
      </div>

      {singleBook ? (
        <div className="flex flex-col gap-1">
          {chapters.map((chapter) => (
            <ChapterCard key={chapter.id} chapter={chapter} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {books.map((book) => {
            const doneCount = book.chapters.filter((c) => c.completed).length;
            const containsToday = book.chapters.some((c) => c.id === todayChapter?.id);
            return (
              <details key={book.name} className="group border-b border-slate-200/80 pb-3 last:border-b-0 dark:border-slate-700/80" open={containsToday}>
                <summary className="flex min-h-12 cursor-pointer select-none list-none items-center justify-between gap-3 rounded-xl px-2 py-2 font-extrabold text-lg transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-slate-100 dark:hover:bg-slate-800/70 [&::-webkit-details-marker]:hidden">
                  <span>
                    {doneCount === book.chapters.length ? "✓ " : ""}
                    {book.name}
                  </span>
                  <span className="flex items-center gap-2 text-sm font-normal text-slate-400 dark:text-slate-500">
                    {doneCount}/{book.chapters.length}
                    <span className="transition-transform group-open:rotate-180" aria-hidden>
                      ▾
                    </span>
                  </span>
                </summary>
                <div className="flex flex-col gap-1 px-1 pt-2 sm:px-2">
                  {book.chapters.map((chapter) => (
                    <ChapterCard key={chapter.id} chapter={chapter} />
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
