import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getT } from "@/lib/i18n";
import { getLanguage } from "@/lib/languages";
import { clockDuration, relativeTime } from "@/lib/timeFormat";
import Carousel from "@/components/versado/Carousel";
import MediaArtwork from "@/components/versado/MediaArtwork";
import SectionHeader from "@/components/today/SectionHeader";
import { interactiveCard } from "@/components/versado/styles";
import type { ContinueItem } from "@/lib/today";

// Lopende cursussen en half beluisterde podcasts, op laatste activiteit.
// Hergebruikt de voortgang van de cursuslijst (courseSummaries.ts).

function ContinueCard({ item, language }: { item: ContinueItem; language: string }) {
  const t = getT(language);
  const locale = getLanguage(language).intlLocale;
  const percent = item.progress && item.progress.total > 0 ? Math.round((item.progress.done / item.progress.total) * 100) : null;
  const position =
    item.kind === "podcast" && item.positionSeconds !== null
      ? t("today.listenedTo", { time: clockDuration(item.positionSeconds) })
      : item.position;
  return (
    <Link href={item.href} className={`${interactiveCard} flex h-full flex-col overflow-hidden`}>
      <MediaArtwork
        kind={item.kind === "podcast" ? "podcast" : "reading"}
        artworkKey={item.artwork}
        ratio="21/9"
        sizes="(min-width: 1024px) 300px, (min-width: 640px) 46vw, 82vw"
      >
        <span className="absolute left-3 top-3 rounded-full bg-vs-elevated/90 px-2.5 py-1 text-xs font-bold text-vs-fg-2 backdrop-blur">
          {item.kind === "podcast" ? t("today.kind.podcast") : t("today.kind.course")}
        </span>
      </MediaArtwork>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase tracking-wide text-vs-fg-3">{item.context}</p>
          <h3 className="mt-0.5 line-clamp-2 text-base font-extrabold leading-snug text-vs-fg">{item.title}</h3>
          {position && <p className="mt-1 truncate text-sm font-semibold text-vs-fg-2">{position}</p>}
        </div>
        {item.progress && percent !== null && (
          <div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-vs-subtle"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={item.progress.total}
              aria-valuenow={item.progress.done}
              aria-label={t("today.progressOf", { done: item.progress.done, total: item.progress.total, unit: item.progress.unitPlural })}
            >
              <div className="vs-motion h-full rounded-full bg-vs-accent transition-[width] duration-700" style={{ width: `${Math.max(percent, 2)}%` }} />
            </div>
            <p className="mt-1.5 text-xs font-semibold text-vs-fg-3">
              {t("today.progressOf", { done: item.progress.done, total: item.progress.total, unit: item.progress.unitPlural })}
            </p>
          </div>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="text-xs text-vs-fg-3">{relativeTime(item.at, locale)}</span>
          <span className="inline-flex items-center gap-1 text-sm font-bold text-vs-accent">
            {t("today.cta.resume")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function ContinueSection({ items, language }: { items: ContinueItem[]; language: string }) {
  const t = getT(language);
  return (
    <section aria-labelledby="today-continue" className="vs-rise min-w-0">
      <SectionHeader id="today-continue" title={t("today.continueTitle")} href="/courses" linkLabel={t("nav.learn")} />
      {items.length === 1 ? (
        <div className="sm:max-w-md">
          <ContinueCard item={items[0]} language={language} />
        </div>
      ) : (
        <Carousel label={t("today.continueTitle")}>
          {items.map((item) => (
            <ContinueCard key={item.key} item={item} language={language} />
          ))}
        </Carousel>
      )}
    </section>
  );
}
