"use client";

import Link from "next/link";
import { useT } from "@/components/I18nProvider";

interface LessonView {
  id: string;
  number: number;
  title: string;
  summary: string | null;
  completed: boolean;
  bestScore: number | null;
}

interface Props {
  courseName: string;
  lessons: LessonView[];
}

// Sequentieel, net als "Van voor naar achter"/"Per boek" (zie
// ChapterListCourseView) — de lessen bouwen bewust op elkaar voort, dus een
// les is pas te openen als de vorige is afgerond.
export default function IntroCourseView({ courseName, lessons }: Props) {
  const t = useT();
  let previousCompleted = true;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">{courseName}</h1>
        <div className="card bg-gradient-to-br from-brand-500 to-brand-600 text-white flex flex-col gap-2">
          <p className="text-brand-100 font-bold uppercase text-xs tracking-wide">{t("courseViews.about")}</p>
          <p>{t("courseViews.introAbout")}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {lessons.map((lesson) => {
          const locked = !previousCompleted;
          previousCompleted = lesson.completed;

          return (
            <Link
              key={lesson.id}
              href={locked ? "#" : `/intro/${lesson.id}`}
              aria-disabled={locked}
              className={`card flex items-center gap-4 transition ${
                locked ? "opacity-50 pointer-events-none" : "hover:shadow-md hover:-translate-y-0.5"
              }`}
            >
              <div
                className={`h-11 w-11 shrink-0 rounded-full flex items-center justify-center text-lg font-extrabold ${
                  lesson.completed
                    ? "bg-brand-500 text-white"
                    : locked
                      ? "bg-slate-100 dark:bg-slate-700 text-slate-400"
                      : "bg-gold-400 text-white"
                }`}
              >
                {lesson.completed ? "✓" : locked ? "🔒" : lesson.number}
              </div>
              <div className="min-w-0">
                <div className="font-extrabold dark:text-slate-100">
                  {t("lessonFlows.lessonNumber", { n: lesson.number })} — {lesson.title}
                </div>
                {lesson.summary && <p className="text-xs text-slate-400 dark:text-slate-500">{lesson.summary}</p>}
                {lesson.bestScore !== null && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">{t("courseViews.bestScore", { score: lesson.bestScore })}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
