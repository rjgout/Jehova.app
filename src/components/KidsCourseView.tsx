"use client";

import Link from "next/link";
import { useT } from "@/components/I18nProvider";

interface StoryView {
  id: string;
  number: number;
  title: string;
  image: string | null;
  completed: boolean;
  bestScore: number | null;
}

interface Props {
  courseName: string;
  stories: StoryView[];
}

export default function KidsCourseView({ courseName, stories }: Props) {
  const t = useT();
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">{courseName}</h1>
        <div className="card bg-gradient-to-br from-brand-500 to-brand-600 text-white flex flex-col gap-2">
          <p className="text-brand-100 font-bold uppercase text-xs tracking-wide">{t("courseViews.about")}</p>
          <p>{t("courseViews.kidsAbout")}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {stories.map((story) => (
          <Link
            key={story.id}
            href={`/kids/${story.id}`}
            className="card flex flex-col gap-2 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition"
          >
            {story.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={story.image} alt="" className="rounded-xl w-full h-32 object-cover" />
            )}
            <div className="flex items-start justify-between gap-2">
              <div className="font-extrabold dark:text-slate-100">
                {story.number}. {story.title}
              </div>
              {story.completed && <span className="text-brand-500 text-lg shrink-0">✓</span>}
            </div>
            {story.bestScore !== null && (
              <p className="text-xs text-slate-400 dark:text-slate-500">{t("courseViews.bestScore", { score: story.bestScore })}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
