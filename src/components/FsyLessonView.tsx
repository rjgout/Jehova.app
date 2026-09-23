import Link from "next/link";
import FsyContentBlocks from "@/components/FsyContentBlocks";
import type { FsyContentBlock } from "@/lib/fsyContent";

interface Props {
  title: string;
  month: number;
  year: number;
  category: string;
  blocks: FsyContentBlock[];
  sourceUrl: string;
}

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

export default function FsyLessonView({ title, month, year, category, blocks, sourceUrl }: Props) {
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <Link href="/courses" className="text-sm font-bold text-brand-600 dark:text-brand-300 hover:underline">
        ← Terug naar cursussen
      </Link>

      <div>
        <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {CATEGORY_LABELS[category] ?? "Les"} · {month}/{year}
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-800 dark:text-brand-300 mt-1">{title}</h1>
      </div>

      <article className="card">
        <FsyContentBlocks blocks={blocks} />
      </article>

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Bron:{" "}
        <a href={sourceUrl} target="_blank" rel="noreferrer" className="underline">
          officiële website
        </a>
      </p>
    </div>
  );
}
