import Link from "next/link";
import { ArrowRight, Check, Quote } from "lucide-react";
import { getT } from "@/lib/i18n";
import MediaArtwork from "@/components/versado/MediaArtwork";
import MascotSlot from "@/components/versado/MascotSlot";
import SectionHeader from "@/components/today/SectionHeader";
import { interactiveCard, secondaryButton, surfaceCard } from "@/components/versado/styles";
import type { DailyGameState, TodayData } from "@/lib/today";
import type { MessageKey } from "@/lib/i18n/core";

// Dagelijkse content: de tekst van de dag, het woord van de dag en De
// Slimste Heilige van de dag. Rustig bij de tekst, iets meer energie bij de
// spellen. Plekken voor artwork en een mascotte staan al klaar.

function DailyGameCard({
  state,
  kind,
  title,
  statusKey,
  language,
}: {
  state: DailyGameState;
  kind: "game" | "quiz";
  title: string;
  statusKey: MessageKey;
  language: string;
}) {
  const t = getT(language);
  const done = state.status === "done";
  return (
    <Link href={state.href} className={`${interactiveCard} flex items-center gap-4 p-3 pr-4`}>
      <MediaArtwork kind={kind} artworkKey={`daily:${kind}`} ratio="1/1" className="w-16 shrink-0 rounded-xl sm:w-[4.5rem]" />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-extrabold text-vs-fg">{title}</h3>
        <p className={`mt-0.5 flex items-center gap-1 text-sm ${done ? "font-semibold text-vs-success" : "text-vs-fg-3"}`}>
          {done && <Check className="h-4 w-4 shrink-0" strokeWidth={3} aria-hidden />}
          <span className="line-clamp-2">{t(statusKey)}</span>
        </p>
      </div>
      <ArrowRight className="h-5 w-5 shrink-0 text-vs-fg-3" aria-hidden />
    </Link>
  );
}

export default function TodaySection({ data, language }: { data: TodayData; language: string }) {
  const t = getT(language);
  const { dailyText, wordGame, dailyQuiz } = data;
  if (!dailyText && !wordGame && !dailyQuiz) return null;
  const wordStatus: MessageKey | null = wordGame
    ? wordGame.status === "todo"
      ? "today.wordGame.todo"
      : wordGame.status === "in-progress"
        ? "today.wordGame.inProgress"
        : wordGame.won
          ? "today.wordGame.won"
          : "today.wordGame.lost"
    : null;
  const quizStatus: MessageKey | null = dailyQuiz
    ? dailyQuiz.status === "todo"
      ? "today.dailyQuiz.todo"
      : dailyQuiz.status === "in-progress"
        ? "today.dailyQuiz.inProgress"
        : "today.dailyQuiz.done"
    : null;

  return (
    <section aria-labelledby="today-daily" className="vs-rise">
      <SectionHeader id="today-daily" title={t("today.dailyTitle")} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {dailyText && (
          <article className={`${surfaceCard} relative min-w-0 overflow-hidden sm:col-span-2`}>
            <MediaArtwork kind="daily" artworkKey="daily:text" ratio="21/9" className="!aspect-auto h-24 sm:h-28">
              <span className="absolute left-4 top-4 rounded-full bg-vs-elevated/90 px-2.5 py-1 text-xs font-bold text-vs-fg-2 backdrop-blur">
                {t("dashboard.dailyText")}
              </span>
            </MediaArtwork>
            <div className="relative p-5 sm:p-6">
              <Quote className="absolute -top-5 right-5 h-10 w-10 rounded-full border border-vs-line bg-vs-surface p-2 text-vs-xp" aria-hidden />
              <blockquote className="line-clamp-6 text-lg font-bold leading-relaxed text-vs-fg sm:line-clamp-5 sm:text-xl">
                {dailyText.text}
              </blockquote>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-vs-fg-3">
                  {dailyText.bookName} {dailyText.chapterNumber}:{dailyText.verseNumber}
                </p>
                <Link href={dailyText.href} className={secondaryButton}>
                  {t("dashboard.readMore")}
                </Link>
              </div>
              {/* VERA hoort bij lezen en verdieping; rendert niets tot de mascottes er zijn. */}
              <MascotSlot character="vera" mood="calm" size={64} className="absolute bottom-4 right-4" />
            </div>
          </article>
        )}
        {wordGame && wordStatus && (
          <DailyGameCard state={wordGame} kind="game" title={t("pages.wordOfTheDay")} statusKey={wordStatus} language={language} />
        )}
        {dailyQuiz && quizStatus && (
          <DailyGameCard state={dailyQuiz} kind="quiz" title={t("today.dailyQuiz.title", { name: t("pages.alleskenner") })} statusKey={quizStatus} language={language} />
        )}
      </div>
    </section>
  );
}
