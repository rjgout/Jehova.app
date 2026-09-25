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

export default function ReadingCourseView({ courseId, courseName, today, chapters, unitPlural = "hoofdstukken" }: Props) {
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

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">{courseName}</h1>

        {chapters.length > 0 && (
          <div className="card flex flex-col gap-2">
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
          <div className="card bg-gradient-to-br from-brand-500 to-brand-600 text-white flex flex-col gap-3">
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

      <div className="flex flex-col gap-3">
        {books.map((book) => {
          const doneCount = book.chapters.filter((chapter) => chapter.completedLessons === chapter.lessonCount).length;
          const containsToday = book.chapters.some((chapter) => !chapter.locked);
          return (
            <details key={book.name} className="group card" open={containsToday}>
              <summary className="font-extrabold text-lg dark:text-slate-100 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden flex items-center justify-between">
                <span>{doneCount === book.chapters.length ? "✓ " : ""}{book.name}</span>
                <span className="flex items-center gap-2 text-sm font-normal text-slate-400 dark:text-slate-500">
                  {doneCount}/{book.chapters.length}
                  <span className="transition-transform group-open:rotate-180" aria-hidden>▾</span>
                </span>
              </summary>
              <div className="flex flex-col gap-4 pt-4">
                {book.chapters.map((chapter) => (
                  <Link
                    key={chapter.id}
                    href={chapter.locked ? "#" : `/courses/${courseId}/chapter/${chapter.id}`}
                    aria-disabled={chapter.locked}
                    className={`card flex items-center gap-4 transition max-w-sm ${chapter.locked ? "opacity-50 pointer-events-none" : "hover:shadow-md hover:-translate-y-0.5"}`}
                  >
                    <div
                      className={`h-12 w-12 shrink-0 rounded-full flex items-center justify-center text-xl font-extrabold ${
                        chapter.completedLessons === chapter.lessonCount
                          ? "bg-brand-500 text-white"
                          : chapter.locked
                            ? "bg-slate-100 dark:bg-slate-700 text-slate-400"
                            : "bg-gold-400 text-white"
                      }`}
                    >
                      {chapter.completedLessons === chapter.lessonCount ? "✓" : chapter.locked ? "🔒" : chapter.number}
                    </div>
                    <div>
                      <div className="font-extrabold dark:text-slate-100">{chapter.bookName} {chapter.number}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        {t("courseView.stepsDone", { done: chapter.completedLessons, total: chapter.lessonCount })}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
