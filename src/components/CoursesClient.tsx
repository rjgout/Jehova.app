"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useT } from "@/components/I18nProvider";
import type { MessageKey } from "@/lib/i18n/core";
import { SortableList, DragHandle, type DragHandleProps } from "@/components/SortableList";
import { applyPersonalOrder, fetchListOrder, saveListOrder } from "@/lib/listOrder";
import { useConfirm } from "@/components/ConfirmProvider";

interface CourseView {
  id: string;
  slug: string;
  type: "FRONT_TO_BACK" | "FREE_CHOICE" | "BY_BOOK" | "PODCAST" | "KIDS" | "INTRO" | "READING_LESSONS" | "FSY";
  name: string;
  description: string | null;
  totalChapters: number;
  unitPlural?: string;
  completedCount: number;
  xpAvailable: number;
  isActive: boolean;
  currentChapter: { id: string; bookName: string; number: number } | null;
}

interface CatalogCourseView {
  id: string;
  slug: string;
  type: CourseView["type"];
  name: string;
  description: string | null;
  totalChapters: number;
}

const TYPE_LABELS: Record<CourseView["type"], MessageKey> = {
  INTRO: "courses.types.intro",
  READING_LESSONS: "courses.types.readingLessons",
  FRONT_TO_BACK: "courses.types.frontToBack",
  FREE_CHOICE: "courses.types.freeChoice",
  BY_BOOK: "courses.types.byBook",
  PODCAST: "courses.types.podcast",
  KIDS: "courses.types.kids",
  FSY: "courses.types.fsy",
};

const COURSE_ICONS: Record<CourseView["type"], string> = {
  INTRO: "✨",
  READING_LESSONS: "📖",
  FRONT_TO_BACK: "🧭",
  FREE_CHOICE: "🗺️",
  BY_BOOK: "📚",
  PODCAST: "🎧",
  KIDS: "🌈",
  FSY: "🌱",
};

function CourseArtwork({ course, large = false }: { course: CourseView; large?: boolean }) {
  if (course.type === "KIDS") {
    // De kindercursus is de enige cursus waarvoor in de repository passende
    // vaste artwork staat; andere afbeeldingen zouden een verkeerde inhoud
    // bij de cursus suggereren.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/kids/images/story-1-0.jpg"
        alt=""
        className={`w-full object-cover ${large ? "aspect-[16/9] lg:aspect-auto lg:h-full" : "aspect-[16/9]"}`}
      />
    );
  }

  return (
    <div
      className={`flex w-full items-center justify-center bg-gradient-to-br from-brand-100 via-sky-100 to-gold-100 text-brand-700 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700 dark:text-brand-300 ${large ? "aspect-[16/9] lg:aspect-auto lg:min-h-64" : "aspect-[16/9]"}`}
      aria-hidden
    >
      <span className={`${large ? "text-7xl" : "text-5xl"} drop-shadow-sm`}>{COURSE_ICONS[course.type]}</span>
    </div>
  );
}

export default function CoursesClient() {
  const t = useT();
  const confirm = useConfirm();
  const [courses, setCourses] = useState<CourseView[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalog, setCatalog] = useState<CatalogCourseView[] | null>(null);

  function loadCourses() {
    Promise.all([
      fetch("/api/courses").then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.error ?? t("courses.errorStatus", { status: r.status }));
        return data;
      }),
      fetchListOrder("courses"),
    ])
      .then(([d, order]) => setCourses(applyPersonalOrder(d.courses ?? [], order)))
      .catch((e) => setLoadError(e instanceof Error ? e.message : t("courses.error")));
  }

  useEffect(loadCourses, []);

  function reorder(newCourses: CourseView[]) {
    setCourses(newCourses);
    saveListOrder(
      "courses",
      newCourses.map((c) => c.id)
    );
  }

  async function loadCatalog() {
    const res = await fetch("/api/courses/catalog");
    if (res.ok) setCatalog((await res.json()).courses);
  }

  function openCatalog() {
    setShowCatalog(true);
    if (!catalog) loadCatalog();
  }

  async function activate(courseId: string) {
    setActivatingId(courseId);
    const res = await fetch(`/api/courses/${courseId}/activate`, { method: "POST" });
    if (res.ok) {
      // Bewust een volledige paginanavigatie i.p.v. router.push+refresh: die
      // combinatie liet de vorige pagina soms nog de vorige actieve cursus
      // tonen totdat je nog een keer heen-en-weer navigeerde (client-side
      // router-cache). Een harde navigatie haalt de server-data altijd vers op.
      window.location.href = `/courses/${courseId}`;
      return;
    }
    setActivatingId(null);
  }

  async function remove(courseId: string) {
    if (
      !(await confirm(
        t("courses.removeConfirm")
      ))
    ) {
      return;
    }
    setRemovingId(courseId);
    const res = await fetch(`/api/courses/${courseId}/unsubscribe`, { method: "POST" });
    if (res.ok) {
      setCourses((cur) => cur?.filter((c) => c.id !== courseId) ?? null);
      // De net verwijderde cursus hoort nu weer in de catalogus — als die al
      // openstond, meteen verversen i.p.v. wachten tot een volgende keer
      // openklappen.
      setCatalog(null);
      if (showCatalog) loadCatalog();
    }
    setRemovingId(null);
  }

  if (loadError) {
    return (
      <div className="max-w-md mx-auto card text-center flex flex-col gap-3">
        <p className="text-red-600 dark:text-red-400 font-semibold">{loadError}</p>
        <button className="btn-secondary self-center" onClick={() => window.location.reload()}>
          {t("courses.retry")}
        </button>
      </div>
    );
  }

  if (!courses) {
    return <p className="text-center text-slate-400 dark:text-slate-500">{t("courses.loading")}</p>;
  }

  const otherCatalogCourses = catalog ?? [];
  const activeCourse = courses.find((course) => course.isActive) ?? null;

  function progressPercent(course: CourseView): number {
    return course.totalChapters > 0 ? Math.min(100, Math.round((course.completedCount / course.totalChapters) * 100)) : 0;
  }

  function CourseCard({ course, handle }: { course: CourseView; handle: DragHandleProps }) {
    const pct = progressPercent(course);
    const complete = course.totalChapters > 0 && course.completedCount >= course.totalChapters;
    return course.isActive ? (
      <article className="card !p-0 overflow-hidden !border-2 !border-brand-300 dark:!border-brand-600">
        <div className="grid lg:grid-cols-[minmax(260px,0.85fr)_1.15fr]">
          <CourseArtwork course={course} large />
          <div className="flex min-w-0 flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-extrabold uppercase tracking-wide text-brand-600 dark:text-brand-300">{t("courses.currentJourney")}</p>
              <div className="flex items-center gap-2 shrink-0">
                <DragHandle {...handle} />
                <button
                  type="button"
                  className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-red-500 hover:border-red-200 dark:hover:border-red-900 flex items-center justify-center text-lg leading-none transition-colors"
                  disabled={removingId === course.id}
                  onClick={() => remove(course.id)}
                  aria-label={t("courses.removeAria", { name: course.name })}
                  title={t("courses.removeTitle")}
                >
                  ×
                </button>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-extrabold leading-tight text-brand-900 dark:text-slate-100">{course.name}</h2>
              {course.description && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{course.description}</p>}
            </div>
            {course.currentChapter && (
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {t("courses.next", { chapter: `${course.currentChapter.bookName} ${course.currentChapter.number}` }).replace(/^ — /, "")}
              </p>
            )}
            {course.totalChapters > 0 && (
              <div className="flex flex-col gap-2" aria-label={t("courses.progress", { done: course.completedCount, total: course.totalChapters, unit: course.unitPlural ?? t("terms.chapter.plural") })}>
                <div className="flex items-center justify-between gap-3 text-sm font-bold dark:text-slate-100">
                  <span>{t("courses.progressLabel")}</span>
                  <span className="text-slate-500 dark:text-slate-400">{pct}%</span>
                </div>
                <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full rounded-full bg-gold-400 transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {t("courses.progress", { done: course.completedCount, total: course.totalChapters, unit: course.unitPlural ?? t("terms.chapter.plural") })}
                </p>
              </div>
            )}
            <Link href={`/courses/${course.id}`} className="btn-primary self-start">
              {t("courses.continue")}
            </Link>
          </div>
        </div>
      </article>
    ) : (
      <article className="card !p-0 overflow-hidden flex h-full flex-col transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none">
        <CourseArtwork course={course} />
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500">{t(TYPE_LABELS[course.type])}</p>
              <h2 className="mt-1 font-extrabold leading-tight dark:text-slate-100">{course.name}</h2>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <DragHandle {...handle} />
              <button
                type="button"
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-red-500 hover:border-red-200 dark:hover:border-red-900 flex items-center justify-center text-lg leading-none transition-colors"
                disabled={removingId === course.id}
                onClick={() => remove(course.id)}
                aria-label={t("courses.removeAria", { name: course.name })}
                title={t("courses.removeTitle")}
              >
                ×
              </button>
            </div>
          </div>
          {course.description && <p className="text-sm text-slate-500 dark:text-slate-400">{course.description}</p>}
          {course.totalChapters > 0 && (
            <div className="mt-auto flex flex-col gap-1 pt-2">
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
                <div className="h-full rounded-full bg-gold-400" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {complete ? t("courses.completed") : t("courses.progress", { done: course.completedCount, total: course.totalChapters, unit: course.unitPlural ?? t("terms.chapter.plural") })}
              </p>
            </div>
          )}
          <button className="btn-secondary self-start mt-1" disabled={activatingId === course.id} onClick={() => activate(course.id)}>
            {activatingId === course.id ? t("courses.busy") : t("courses.choose")}
          </button>
        </div>
      </article>
    );
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">{t("pages.courses")}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">{t("courses.intro")}</p>
      </div>

      {courses.length === 0 && (
        <div className="card text-center flex flex-col gap-2">
          <p className="font-bold dark:text-slate-100">{t("courses.noneTitle")}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("courses.noneHint")}</p>
        </div>
      )}

      {!activeCourse && courses.length > 0 && <p className="text-sm text-slate-500 dark:text-slate-400">{t("courses.noActive")}</p>}
      <SortableList
        dndId="courses-list"
        items={courses}
        onReorder={reorder}
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        getItemClassName={(course) => (course.isActive ? "col-span-full order-first" : undefined)}
        renderBeforeItem={(course, index) => {
          const firstOtherIndex = courses.findIndex((item) => !item.isActive);
          if (course.isActive) {
            return <h2 key={`${course.id}-heading`} className="col-span-full order-first text-xl font-extrabold text-brand-800 dark:text-brand-300">{t("courses.currentJourney")}</h2>;
          }
          if (index === (activeCourse ? firstOtherIndex : 0)) {
            return <h2 key="discover-courses-heading" className="col-span-full text-xl font-extrabold text-brand-800 dark:text-brand-300">{t("courses.discoverMore")}</h2>;
          }
          return null;
        }}
        renderItem={(course, handle) => <CourseCard course={course} handle={handle} />}
      />

      {!showCatalog ? (
        <button
          className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 font-extrabold text-sm py-3 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-300 transition-colors"
          onClick={openCatalog}
        >
          ➕ {t("courses.addNew")}
        </button>
      ) : (
        <div className="card flex flex-col gap-3">
          <h2 className="font-extrabold dark:text-slate-100">{t("courses.addNew")}</h2>
          {!catalog ? (
            <p className="text-slate-400 dark:text-slate-500">{t("courses.loading")}</p>
          ) : catalog.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("courses.allAdded")}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {otherCatalogCourses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between gap-3 border border-slate-100 dark:border-slate-700 rounded-xl p-3"
                >
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">
                      {t(TYPE_LABELS[course.type])}
                    </p>
                    <p className="font-bold dark:text-slate-100">{course.name}</p>
                    {course.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{course.description}</p>
                    )}
                  </div>
                  <button
                    className="btn-secondary !px-3 !py-1.5 shrink-0"
                    disabled={activatingId === course.id}
                    onClick={() => activate(course.id)}
                  >
                    {activatingId === course.id ? t("courses.busy") : t("courses.add")}
                  </button>
                </div>
              ))}
            </div>
          )}
          <button className="text-sm text-slate-400 dark:text-slate-500 hover:underline self-start" onClick={() => setShowCatalog(false)}>
            {t("common.close")}
          </button>
        </div>
      )}

      <Link href="/tools" className="btn-secondary w-full justify-center">
        🧰 {t("pages.tools")}
      </Link>
    </div>
  );
}
