"use client";

import { useEffect, useState } from "react";

interface BookCourseView {
  id: string;
  type: string;
  name: string;
  totalChapters: number;
  unitPlural?: string;
}

export default function PerBookClient() {
  const [courses, setCourses] = useState<BookCourseView[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  useEffect(() => {
    // De catalogus (niet de volledige /api/courses) — dit is de "kies een
    // NIEUW boek toe te voegen"-pagina, een al toegevoegd boek staat al op
    // /courses zelf.
    fetch("/api/courses/catalog")
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          throw new Error(data?.error ?? `Er ging iets mis (${r.status}).`);
        }
        return data;
      })
      .then((d) => setCourses((d.courses ?? []).filter((c: BookCourseView) => c.type === "BY_BOOK")))
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Er ging iets mis."));
  }, []);

  async function activate(courseId: string) {
    setActivatingId(courseId);
    const res = await fetch(`/api/courses/${courseId}/activate`, { method: "POST" });
    if (res.ok) {
      // Zelfde reden als in CoursesClient: harde navigatie i.p.v.
      // router.push, om altijd verse serverdata te krijgen.
      window.location.href = `/courses/${courseId}`;
      return;
    }
    setActivatingId(null);
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

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">Per boek</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Kies een boek om aan je cursussenlijst toe te voegen en daar hoofdstuk voor hoofdstuk doorheen te gaan.
        </p>
      </div>

      {courses.length === 0 ? (
        <p className="text-center text-slate-400 dark:text-slate-500">
          Je hebt inmiddels elk boek al aan je lijst toegevoegd.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {courses.map((course) => (
            <div key={course.id} className="card flex items-center justify-between gap-3">
              <div>
                <h2 className="font-extrabold text-lg dark:text-slate-100">{course.name}</h2>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500">
                  {course.totalChapters} {course.unitPlural ?? "hoofdstukken"}
                </p>
              </div>
              <button
                className="btn-primary self-start"
                disabled={activatingId === course.id}
                onClick={() => activate(course.id)}
              >
                {activatingId === course.id ? "Bezig..." : "Toevoegen"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
