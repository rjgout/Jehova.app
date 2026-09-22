import Link from "next/link";

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

const MONTH_NAMES = [
  "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December",
];

const CATEGORY_LABELS: Record<string, string> = {
  INTRO: "Maandintroductie",
  FAST_SUNDAY: "Vastenzondag",
  SECOND_SUNDAY: "Tweede zondag",
  THIRD_SUNDAY: "Derde zondag",
  LAST_SUNDAY_YOUNG_WOMEN: "Laatste zondag · Jongevrouwen",
  LAST_SUNDAY_AARONIC_PRIESTHOOD: "Laatste zondag · Aäronische priesterschapsquorums",
  ACTIVITY: "Jongerenactiviteit",
  OTHER: "Aanvullend",
};

export default function FsyCourseView({ courseName, lessons }: Props) {
  const grouped = new Map<string, LessonView[]>();

  for (const lesson of lessons) {
    const key = `${lesson.year}-${lesson.month}`;
    const list = grouped.get(key) ?? [];
    list.push(lesson);
    grouped.set(key, list);
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">{courseName}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Wekelijkse lessen en aanvullende ideeën uit de officiële bron. Oefeningen worden later toegevoegd.
        </p>
      </div>

      {lessons.length === 0 ? (
        <div className="card text-center text-slate-500 dark:text-slate-400">
          Er is nog geen gepubliceerde FSY-content.
        </div>
      ) : (
        [...grouped.entries()].map(([key, monthLessons]) => {
          const [year, month] = key.split("-").map(Number);
          return (
            <section key={key} className="flex flex-col gap-3">
              <h2 className="text-xl font-extrabold text-brand-800 dark:text-brand-300">
                {MONTH_NAMES[month - 1]} {year}
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
                        {CATEGORY_LABELS[lesson.category] ?? "Les"}
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
