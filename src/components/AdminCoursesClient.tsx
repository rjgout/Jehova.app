"use client";

import { useEffect, useState } from "react";

interface CourseView {
  id: string;
  slug: string;
  type: string;
  name: string;
  enabled: boolean;
  collectionName: string;
}

const TYPE_LABELS: Record<string, string> = {
  FRONT_TO_BACK: "Van voor naar achter",
  FREE_CHOICE: "Vrije keuze",
  READING_LESSONS: "Leeslessen",
  PODCAST: "Podcast",
  KIDS: "Voor kinderen",
  INTRO: "Introductie",
  FSY: "Leerplan",
};

function CourseRow({ course, onToggle, saving }: { course: CourseView; onToggle: () => void; saving: boolean }) {
  return (
    <label
      className={`flex items-center gap-3 rounded-xl p-3 border cursor-pointer ${
        course.enabled
          ? "border-slate-100 dark:border-slate-700"
          : "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40"
      }`}
    >
      <input type="checkbox" className="h-5 w-5 accent-brand-500" checked={course.enabled} onChange={onToggle} disabled={saving} />
      <div className="flex-1">
        <p className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">{TYPE_LABELS[course.type] ?? course.type}</p>
        <p className="font-bold dark:text-slate-100">{course.name}</p>
      </div>
      {!course.enabled && (
        <span className="text-xs font-bold uppercase text-red-500 dark:text-red-400 shrink-0">Uitgeschakeld</span>
      )}
    </label>
  );
}

export default function AdminCoursesClient() {
  const [courses, setCourses] = useState<CourseView[] | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/courses")
      .then((r) => r.json())
      .then((d) => setCourses(d.courses ?? []));
  }, []);

  async function toggle(course: CourseView) {
    const next = !course.enabled;
    setSavingId(course.id);
    setCourses((cur) => cur?.map((c) => (c.id === course.id ? { ...c, enabled: next } : c)) ?? null);
    await fetch(`/api/admin/courses/${course.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    }).catch(() => {});
    setSavingId(null);
  }

  return (
    <details className="group card flex flex-col gap-4">
      <summary className="font-extrabold text-lg dark:text-slate-100 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden flex items-center justify-between">
        Cursussen
        <span className="text-slate-400 transition-transform group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Uitgezette cursussen verdwijnen uit ieders cursussenoverzicht en toevoeg-catalogus — bestaande voortgang
        blijft bewaard en een rechtstreekse link blijft werken.
      </p>

      {!courses ? (
        <p className="text-slate-400 dark:text-slate-500">Laden...</p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Per collectie: elke schriftcollectie heeft cursussen met dezelfde naam. */}
          {Array.from(new Set(courses.map((c) => c.collectionName))).map((collectionName) => (
            <div key={collectionName} className="flex flex-col gap-2">
              <h3 className="text-sm font-extrabold text-slate-500 dark:text-slate-400">{collectionName}</h3>
              {courses
                .filter((c) => c.collectionName === collectionName)
                .map((course) => (
                  <CourseRow key={course.id} course={course} saving={savingId === course.id} onToggle={() => toggle(course)} />
                ))}
            </div>
          ))}
        </div>
      )}
    </details>
  );
}
