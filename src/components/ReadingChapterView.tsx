import Link from "next/link";

interface LessonView {
  id: string;
  number: number;
  startVerse: number;
  endVerse: number;
  verseCount: number;
  completed: boolean;
  bestScore: number | null;
  locked: boolean;
}

interface Props {
  courseId: string;
  bookName: string;
  chapterNumber: number;
  lessons: LessonView[];
  /** "dit hoofdstuk" of "deze afdeling" (zie src/lib/chapterTerm.ts). */
  thisOne?: string;
}

export default function ReadingChapterView({ courseId, bookName, chapterNumber, lessons, thisOne = "dit hoofdstuk" }: Props) {
  const completedCount = lessons.filter((lesson) => lesson.completed).length;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {completedCount}/{lessons.length} lessen voltooid
        </p>
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300 mt-1">
          {bookName} {chapterNumber}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Lees {thisOne} in kleine stukken. Je kunt alleen in de juiste volgorde verder.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {lessons.map((lesson) => (
          <Link
            key={lesson.id}
            href={lesson.locked ? "#" : `/reading-lesson/${lesson.id}`}
            aria-disabled={lesson.locked}
            className={`card flex items-center gap-4 transition ${lesson.locked ? "opacity-50 pointer-events-none" : "hover:shadow-md hover:-translate-y-0.5"}`}
          >
            <div
              className={`h-11 w-11 shrink-0 rounded-full flex items-center justify-center font-extrabold ${
                lesson.completed
                  ? "bg-brand-500 text-white"
                  : lesson.locked
                    ? "bg-slate-100 dark:bg-slate-700 text-slate-400"
                    : "bg-gold-400 text-white"
              }`}
            >
              {lesson.completed ? "✓" : lesson.locked ? "🔒" : lesson.number}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold dark:text-slate-100">Les {lesson.number}</div>
              <div className="text-xs text-slate-400 dark:text-slate-500">
                Verzen {lesson.startVerse}–{lesson.endVerse} · {lesson.verseCount} verzen
                {lesson.bestScore !== null ? ` · beste score ${lesson.bestScore}%` : ""}
              </div>
            </div>
            {!lesson.locked && <span className="text-slate-300 dark:text-slate-600">→</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
