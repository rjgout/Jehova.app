"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SortableList, DragHandle } from "@/components/SortableList";
import { applyPersonalOrder, fetchListOrder, saveListOrder } from "@/lib/listOrder";

interface CourseView {
  id: string;
  slug: string;
  type: "FRONT_TO_BACK" | "FREE_CHOICE" | "BY_BOOK" | "PODCAST" | "KIDS" | "INTRO" | "READING_LESSONS";
  name: string;
  description: string | null;
  totalChapters: number;
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

const TYPE_LABELS: Record<CourseView["type"], string> = {
  INTRO: "Introductie",
  READING_LESSONS: "Kleine leeslessen",
  FRONT_TO_BACK: "Van voor naar achter",
  FREE_CHOICE: "Vrije keuze",
  BY_BOOK: "Per boek",
  PODCAST: "Podcast",
  KIDS: "Voor kinderen",
};

export default function CoursesClient() {
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
        if (!r.ok) throw new Error(data?.error ?? `Er ging iets mis (${r.status}).`);
        return data;
      }),
      fetchListOrder("courses"),
    ])
      .then(([d, order]) => setCourses(applyPersonalOrder(d.courses ?? [], order)))
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Er ging iets mis."));
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
      !window.confirm(
        "Deze cursus uit je lijst verwijderen? Je voortgang blijft bewaard — je kan 'm later gewoon weer toevoegen."
      )
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
          Opnieuw proberen
        </button>
      </div>
    );
  }

  if (!courses) {
    return <p className="text-center text-slate-400 dark:text-slate-500">Laden...</p>;
  }

  const hasByBookInCatalog = catalog?.some((c) => c.type === "BY_BOOK") ?? false;
  const otherCatalogCourses = (catalog ?? []).filter((c) => c.type !== "BY_BOOK");

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">Cursussen</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Dit zijn jouw cursussen — je voortgang per cursus blijft bewaard als je wisselt. Wil je er nog eentje
          proberen, voeg 'm dan toe met de knop hieronder.
        </p>
      </div>

      {courses.length === 0 && (
        <div className="card text-center flex flex-col gap-2">
          <p className="font-bold dark:text-slate-100">Je hebt nog geen cursussen toegevoegd</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Klik hieronder op "Voeg nieuwe cursus toe" om te beginnen.
          </p>
        </div>
      )}

      <SortableList
        dndId="courses-list"
        items={courses}
        onReorder={reorder}
        className="flex flex-col gap-4"
        renderItem={(course, handle) => {
          const pct = course.totalChapters > 0 ? Math.round((course.completedCount / course.totalChapters) * 100) : 0;
          return (
            <div
              className={`card flex flex-col gap-3 ${
                course.isActive ? "!border-2 !border-brand-400 dark:!border-brand-500" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="pt-0.5">
                  <DragHandle {...handle} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        {TYPE_LABELS[course.type]}
                      </p>
                      <h2 className="font-extrabold text-lg leading-tight dark:text-slate-100">{course.name}</h2>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {course.isActive && (
                        <span className="text-xs font-extrabold uppercase text-brand-600 dark:text-brand-300 bg-brand-50 dark:bg-slate-700 rounded-full px-3 py-1">
                          Actief
                        </span>
                      )}
                      <button
                        type="button"
                        className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-red-500 hover:border-red-200 dark:hover:border-red-900 flex items-center justify-center text-lg leading-none transition-colors"
                        disabled={removingId === course.id}
                        onClick={() => remove(course.id)}
                        aria-label={"Cursus " + course.name + " verwijderen"}
                        title="Cursus verwijderen"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  {course.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{course.description}</p>
                  )}
                </div>
              </div>

              {course.totalChapters > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-gold-400" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {course.completedCount} / {course.totalChapters} hoofdstukken voltooid
                    {course.currentChapter &&
                      ` — volgende: ${course.currentChapter.bookName} ${course.currentChapter.number}`}
                  </p>
                  {course.xpAvailable > 0 && (
                    <p className="text-xs font-bold text-gold-600 dark:text-gold-400">⭐ {course.xpAvailable} XP te verdienen</p>
                  )}
                </div>
              )}

              <div className="flex gap-3 mt-auto pt-1">
                {course.isActive ? (
                  <Link href={`/courses/${course.id}`} className="btn-primary self-start">
                    Ga verder →
                  </Link>
                ) : (
                  <button
                    className="btn-secondary self-start"
                    disabled={activatingId === course.id}
                    onClick={() => activate(course.id)}
                  >
                    {activatingId === course.id ? "Bezig..." : "Kies deze cursus"}
                  </button>
                )}
              </div>
            </div>
          );
        }}
      />

      {!showCatalog ? (
        <button
          className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 font-extrabold text-sm py-3 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-300 transition-colors"
          onClick={openCatalog}
        >
          ➕ Voeg nieuwe cursus toe
        </button>
      ) : (
        <div className="card flex flex-col gap-3">
          <h2 className="font-extrabold dark:text-slate-100">Voeg nieuwe cursus toe</h2>
          {!catalog ? (
            <p className="text-slate-400 dark:text-slate-500">Laden...</p>
          ) : catalog.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Je hebt alles al toegevoegd wat er is — niets meer om te kiezen.
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
                      {TYPE_LABELS[course.type]}
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
                    {activatingId === course.id ? "Bezig..." : "Toevoegen"}
                  </button>
                </div>
              ))}
              {hasByBookInCatalog && (
                <Link
                  href="/courses/per-boek"
                  className="flex items-center justify-between gap-3 border border-slate-100 dark:border-slate-700 rounded-xl p-3 hover:border-brand-300"
                >
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Per boek</p>
                    <p className="font-bold dark:text-slate-100">📚 Kies een boek</p>
                  </div>
                  <span className="text-brand-600 dark:text-brand-300 font-bold">→</span>
                </Link>
              )}
            </div>
          )}
          <button className="text-sm text-slate-400 dark:text-slate-500 hover:underline self-start" onClick={() => setShowCatalog(false)}>
            Sluiten
          </button>
        </div>
      )}

      <Link href="/tools" className="btn-secondary self-center">
        🧰 Hulpmiddelen
      </Link>
    </div>
  );
}
