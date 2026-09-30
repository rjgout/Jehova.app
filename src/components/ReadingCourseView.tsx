"use client";

import Link from "next/link";
import { useT } from "@/components/I18nProvider";

interface ChapterView {
  id: string;
  number: number;
  bookName: string;
  lessonCount: number;
  completedLessons: number;
  locked: boolean;
}

interface Props {
  /** Ingang naar Samen studeren, naast de titel (zie StudyTogetherButton). */
  studyAction?: React.ReactNode;
  courseId: string;
  courseName: string;
  today: {
    id: string;
    bookName: string;
    chapterNumber: number;
    lessonNumber: number;
    startVerse: number;
    endVerse: number;
  } | null;
  chapters: ChapterView[];
  /** "hoofdstukken", of "afdelingen" bij Leer en Verbonden (zie src/lib/chapterTerm.ts). */
  unitPlural?: string;
}

export default function ReadingCourseView({ courseId, courseName, today, chapters, unitPlural = "hoofdstukken", studyAction }: Props) {
  const t = useT();
  const allDone = chapters.length > 0 && chapters.every((chapter) => chapter.completedLessons === chapter.lessonCount);
  const currentChapterIndex = today
    ? chapters.findIndex((chapter) => chapter.bookName === today.bookName && chapter.number === today.chapterNumber)
    : -1;
  const progressPosition = currentChapterIndex >= 0 ? currentChapterIndex + 1 : chapters.length;
  const progressPercent = chapters.length > 0 ? Math.round((progressPosition / chapters.length) * 100) : 0;

  const books: { name: string; chapters: ChapterView[] }[] = [];
  for (const chapter of chapters) {
    const last = books[books.length - 1];
    if (last && last.name === chapter.bookName) last.chapters.push(chapter);
    else books.push({ name: chapter.bookName, chapters: [chapter] });
  }

  function ChapterRow({ chapter, current }: { chapter: ChapterView; current: boolean }) {
    const completed = chapter.completedLessons === chapter.lessonCount;
    const rowClass = `flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 transition motion-reduce:transition-none ${
      chapter.locked
        ? "opacity-60"
        : current
          ? "bg-brand-50 ring-1 ring-brand-200 dark:bg-slate-800 dark:ring-brand-700"
          : "hover:bg-slate-50 dark:hover:bg-slate-800/70"
    }`;
    const rowContent = (
      <>
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
            completed
              ? "bg-brand-500 text-white"
              : chapter.locked
                ? "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-300"
                : current
                  ? "bg-gold-400 text-white"
                  : "border-2 border-gold-400 text-gold-600 dark:text-gold-300"
          }`}
        >
          {completed ? "✓" : chapter.locked ? "🔒" : chapter.number}
        </div>
        <div className="min-w-0">
          <div className="truncate font-extrabold dark:text-slate-100">{chapter.bookName} {chapter.number}</div>
          <div className="text-xs text-slate-400 dark:text-slate-500">
            {t("courseView.stepsDone", { done: chapter.completedLessons, total: chapter.lessonCount })}
          </div>
        </div>
      </>
    );

    return chapter.locked ? (
      <div aria-disabled="true" className={rowClass}>
        {rowContent}
      </div>
    ) : (
      <Link href={`/courses/${courseId}/chapter/${chapter.id}`} className={rowClass}>
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

        {today && !allDone ? (
          <div className="card bg-gradient-to-br from-brand-500 to-brand-600 text-white flex flex-col gap-2.5">
            <p className="text-brand-100 font-bold uppercase text-xs tracking-wide">{t("courseView.today")}</p>
            <h2 className="text-2xl font-extrabold">
              📖 {today.bookName} {today.chapterNumber}
            </h2>
            <p className="text-brand-100">
              {t("courseView.todayStep", { n: today.lessonNumber, from: today.startVerse, to: today.endVerse })}
            </p>
            <Link
              href={`/reading-lesson/${today.id}`}
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

      <div className="flex flex-col gap-4">
        {books.map((book) => {
          const doneCount = book.chapters.filter((chapter) => chapter.completedLessons === chapter.lessonCount).length;
          const containsToday = book.chapters.some((chapter) => !chapter.locked);
          return (
            <details key={book.name} className="group border-b border-slate-200/80 pb-3 last:border-b-0 dark:border-slate-700/80" open={containsToday}>
              <summary className="flex min-h-12 cursor-pointer select-none list-none items-center justify-between gap-3 rounded-xl px-2 py-2 font-extrabold text-lg transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-slate-100 dark:hover:bg-slate-800/70 [&::-webkit-details-marker]:hidden">
                <span>{doneCount === book.chapters.length ? "✓ " : ""}{book.name}</span>
                <span className="flex items-center gap-2 text-sm font-normal text-slate-400 dark:text-slate-500">
                  {doneCount}/{book.chapters.length}
                  <span className="transition-transform group-open:rotate-180" aria-hidden>▾</span>
                </span>
              </summary>
                <div className="ml-2 flex flex-col gap-1 border-l-2 border-slate-200 pl-3 pt-2 dark:border-slate-700 sm:ml-4 sm:pl-4">
                  {book.chapters.map((chapter) => (
                    <ChapterRow key={chapter.id} chapter={chapter} current={today?.bookName === chapter.bookName && today.chapterNumber === chapter.number} />
                  ))}
                </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
