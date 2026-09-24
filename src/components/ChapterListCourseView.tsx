import Link from "next/link";

const WORDS_PER_MINUTE = 130; // rustig lees-/nadenktempo

interface ChapterView {
  id: string;
  number: number;
  bookName: string;
  verseCount: number;
  exerciseCount: number;
  wordCount: number;
  completed: boolean;
  bestScore: number | null;
}

interface Props {
  courseName: string;
  currentChapterId: string | null;
  chapters: ChapterView[];
  // Van voor naar achter en per-boek volgen een vaste volgorde (elk hoofdstuk
  // vergrendeld tot het vorige is afgerond); Vrije keuze is expliciet
  // bedoeld om in elke volgorde te doen, dus daar mag nooit iets op slot.
  sequential?: boolean;
  /** "hoofdstukken", of "afdelingen" bij Leer en Verbonden (zie src/lib/chapterTerm.ts). */
  unitPlural?: string;
}

// Gedeelde weergave voor elk cursustype dat simpelweg een lijst hoofdstukken
// is (van-voor-naar-achter, vrije keuze, per boek) — een chapter-afronding
// zelf blijft altijd gedeeld over cursussen heen (zie ChapterProgress), dit
// component bepaalt alleen welke hoofdstukken in DEZE cursus getoond worden
// en in welke volgorde/vergrendeling. Bij meerdere boeken (van-voor-naar-
// achter, vrije keuze) wordt elk boek een inklapbare sectie — anders werd dit
// bij het hele Boek van Mormon in één keer een erg lange pagina.
export default function ChapterListCourseView({ courseName, currentChapterId, chapters, sequential = true, unitPlural = "hoofdstukken" }: Props) {
  const allDone = chapters.length > 0 && chapters.every((c) => c.completed);
  const todayChapter =
    (currentChapterId && chapters.find((c) => c.id === currentChapterId)) ||
    chapters.find((c) => !c.completed) ||
    chapters[chapters.length - 1];
  const estimatedMinutes = todayChapter ? Math.max(1, Math.round(todayChapter.wordCount / WORDS_PER_MINUTE)) : 0;
  const xpAvailable = Math.min(todayChapter?.exerciseCount ?? 0, 7) * 10 + (todayChapter?.exerciseCount ? 20 : 0);
  const currentIndex = todayChapter ? chapters.findIndex((chapter) => chapter.id === todayChapter.id) : -1;
  const progressPosition = currentIndex >= 0 ? currentIndex + 1 : chapters.length;
  const progressPercent = chapters.length > 0 ? Math.round((progressPosition / chapters.length) * 100) : 0;

  // Groepeer per boek, in de volgorde waarin ze in `chapters` voorkomen —
  // bij per-boek-cursussen is dat er sowieso maar één.
  const books: { name: string; chapters: ChapterView[] }[] = [];
  for (const chapter of chapters) {
    const last = books[books.length - 1];
    if (last && last.name === chapter.bookName) last.chapters.push(chapter);
    else books.push({ name: chapter.bookName, chapters: [chapter] });
  }
  const singleBook = books.length <= 1;

  let previousCompleted = true;
  function ChapterCard({ chapter }: { chapter: ChapterView }) {
    const locked = sequential && !previousCompleted;
    previousCompleted = chapter.completed;
    return (
      <Link
        href={locked ? "#" : `/lesson/${chapter.id}`}
        aria-disabled={locked}
        className={`card flex items-center gap-4 transition max-w-sm ${
          locked ? "opacity-50 pointer-events-none" : "hover:shadow-md hover:-translate-y-0.5"
        }`}
      >
        <div
          className={`h-12 w-12 shrink-0 rounded-full flex items-center justify-center text-xl font-extrabold ${
            chapter.completed
              ? "bg-brand-500 text-white"
              : locked
                ? "bg-slate-100 dark:bg-slate-700 text-slate-400"
                : "bg-gold-400 text-white"
          }`}
        >
          {chapter.completed ? "✓" : locked ? "🔒" : chapter.number}
        </div>
        <div>
          <div className="font-extrabold dark:text-slate-100">
            {chapter.bookName} {chapter.number}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500">
            {chapter.verseCount} verzen{chapter.bestScore !== null ? ` · beste score ${chapter.bestScore}%` : ""}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">{courseName}</h1>

        {chapters.length > 0 && (
          <div className="card flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
              <span>Voortgang</span>
              <span>{progressPosition} / {chapters.length} {unitPlural} · {progressPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full bg-brand-500 transition-all" style={{ width: progressPercent + "%" }} />
            </div>
          </div>
        )}

        {todayChapter && !allDone ? (
          <div className="card bg-gradient-to-br from-brand-500 to-brand-600 text-white flex flex-col gap-3">
            <p className="text-brand-100 font-bold uppercase text-xs tracking-wide">Vandaag</p>
            <h2 className="text-2xl font-extrabold">
              📖 {todayChapter.bookName} {todayChapter.number}
            </h2>
            <p className="text-brand-100">⏱️ ongeveer {estimatedMinutes} minuten · ⭐ {xpAvailable} XP te verdienen</p>
            <Link
              href={`/lesson/${todayChapter.id}`}
              className="btn-primary self-start !bg-white !text-brand-700 !shadow-[0_4px_0_0_theme(colors.brand.800)] hover:!bg-brand-50"
            >
              Lees verder →
            </Link>
          </div>
        ) : (
          allDone && (
            <div className="card text-center">
              <p className="font-extrabold text-lg dark:text-slate-100">🎉 Je hebt deze cursus helemaal voltooid!</p>
            </div>
          )
        )}
      </div>

      {singleBook ? (
        <div className="flex flex-col gap-8">
          {chapters.map((chapter) => (
            <ChapterCard key={chapter.id} chapter={chapter} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {books.map((book) => {
            const doneCount = book.chapters.filter((c) => c.completed).length;
            const containsToday = book.chapters.some((c) => c.id === todayChapter?.id);
            return (
              <details key={book.name} className="group card" open={containsToday}>
                <summary className="font-extrabold text-lg dark:text-slate-100 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden flex items-center justify-between">
                  <span>
                    {doneCount === book.chapters.length ? "✓ " : ""}
                    {book.name}
                  </span>
                  <span className="flex items-center gap-2 text-sm font-normal text-slate-400 dark:text-slate-500">
                    {doneCount}/{book.chapters.length}
                    <span className="transition-transform group-open:rotate-180" aria-hidden>
                      ▾
                    </span>
                  </span>
                </summary>
                <div className="flex flex-col gap-4 pt-4">
                  {book.chapters.map((chapter) => (
                    <ChapterCard key={chapter.id} chapter={chapter} />
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
