"use client";

import Link from "next/link";
import { useT, useUiLanguage } from "@/components/I18nProvider";
import { getLanguage } from "@/lib/languages";
import { FSY_CATEGORY_KEYS } from "@/components/FsyLessonView";

interface LessonView {
  id: string;
  year: number;
  month: number;
  category: string;
  title: string;
  image: string | null;
}

interface Props {
  courseName: string;
  lessons: LessonView[];
}

// Maandnaam in de taal van de app, met hoofdletter (zoals een kop).
function monthName(year: number, month: number, intlLocale: string): string {
  const name = new Date(year, month - 1, 1).toLocaleDateString(intlLocale, { month: "long" });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export default function FsyCourseView({ courseName, lessons }: Props) {
  const t = useT();
  const intlLocale = getLanguage(useUiLanguage()).intlLocale;
  const grouped = new Map<string, LessonView[]>();

  for (const lesson of lessons) {
    const key = `${lesson.year}-${lesson.month}`;
    const list = grouped.get(key) ?? [];
    list.push(lesson);
    grouped.set(key, list);
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">{courseName}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          {t("courseViews.fsyIntro")}
        </p>
      </div>

      {lessons.length === 0 ? (
        <div className="card text-center text-slate-500 dark:text-slate-400">
          {t("courseViews.fsyEmpty")}
        </div>
      ) : (
        [...grouped.entries()].map(([key, monthLessons]) => {
          const [year, month] = key.split("-").map(Number);
          return (
            <section key={key} className="flex flex-col gap-3">
              <h2 className="text-xl font-extrabold text-brand-800 dark:text-brand-300">
                {monthName(year, month, intlLocale)} {year}
              </h2>

              <div className="flex flex-col gap-3">
                {monthLessons.map((lesson) => (
                  <Link
                    key={lesson.id}
                    href={`/fsy/${lesson.id}`}
                    className="card flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition"
                  >
                    {lesson.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={lesson.image} alt="" className="h-16 w-20 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="h-16 w-20 rounded-xl bg-brand-50 dark:bg-slate-800 flex items-center justify-center shrink-0 text-2xl">📘</div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        {lesson.category in FSY_CATEGORY_KEYS
                          ? t(FSY_CATEGORY_KEYS[lesson.category as keyof typeof FSY_CATEGORY_KEYS])
                          : t("courseViews.fsy.lesson")}
                      </p>
                      <h3 className="font-extrabold dark:text-slate-100">{lesson.title}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
