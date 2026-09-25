import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import QuickPracticeFlow from "@/components/QuickPracticeFlow";
import { getT } from "@/lib/i18n";

const PRACTICE_SIZE = 5;

export default async function PracticePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = getT(user.uiLanguage);

  const completedChapters = await prisma.chapterProgress.findMany({
    where: { userId: user.id, completed: true },
    select: { chapterId: true },
  });
  const chapterIds = completedChapters.map((c) => c.chapterId);

  if (chapterIds.length === 0) {
    return (
      <div className="max-w-md mx-auto card text-center flex flex-col gap-4">
        <div className="text-5xl">⚡</div>
        <h1 className="text-xl font-extrabold text-brand-800 dark:text-brand-300">{t("misc.practiceEmptyTitle")}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          {t("misc.practiceEmptyText")}
        </p>
        <Link href="/dashboard" className="btn-primary self-center">
          {t("misc.toLessons")}
        </Link>
      </div>
    );
  }

  const pool = await prisma.exercise.findMany({
    where: { chapterId: { in: chapterIds }, status: "APPROVED" },
    include: { options: { orderBy: { order: "asc" } } },
  });

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, Math.min(PRACTICE_SIZE, shuffled.length));

  const exercises = picked.map((e) => ({
    id: e.id,
    type: e.type as "FILL_BLANK" | "WORD_BANK" | "TRUE_FALSE" | "MULTIPLE_CHOICE" | "SEQUENCE",
    verseRef: e.verseRef,
    prompt: e.prompt,
    hint: e.hint ?? undefined,
    blanks: (JSON.parse(e.answers) as string[]).length,
    wordBank: e.wordBank ? (JSON.parse(e.wordBank) as string[]) : undefined,
    options: e.options.length > 0 ? e.options.map((o) => o.label) : undefined,
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300 text-center">{t("misc.practiceTitle")}</h1>
      <QuickPracticeFlow exercises={exercises} />
    </div>
  );
}
