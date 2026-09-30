"use client";

import { Children, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useT } from "@/components/I18nProvider";

// Horizontale rij kaarten om met de vinger door te vegen. Dat er meer is,
// moet meteen zichtbaar zijn: de rij loopt door tot de schermrand (de
// volgende kaart steekt half in beeld), er zijn puntjes voor de positie, en
// op apparaten met een muis pijlknoppen. Scroll-snap zorgt dat een kaart
// netjes uitlijnt; het toetsenbord scrollt de rij gewoon mee.
export default function Carousel({
  label,
  itemClassName = "basis-[82%] sm:basis-[46%] md:basis-[42%] lg:basis-[45%]",
  children,
}: {
  label: string;
  itemClassName?: string;
  children: React.ReactNode;
}) {
  const t = useT();
  const items = Children.toArray(children);
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: items.length <= 1 });
  // Passen alle kaarten al naast elkaar (bv. twee kaarten op desktop), dan
  // zijn puntjes en pijlen overbodig.
  const [scrollable, setScrollable] = useState(items.length > 1);

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const cards = Array.from(el.children) as HTMLElement[];
    const left = el.scrollLeft;
    const distance = (card: HTMLElement) => Math.abs(card.offsetLeft - cards[0].offsetLeft - left);
    const nearest = cards.reduce((best, card, i) => (distance(card) < distance(cards[best]) ? i : best), 0);
    const atEnd = left + el.clientWidth >= el.scrollWidth - 4;
    setScrollable(el.scrollWidth > el.clientWidth + 4);
    setActive(atEnd ? cards.length - 1 : nearest);
    setEdges({ start: left <= 4, end: atEnd });
  }, []);

  useEffect(() => {
    measure();
    const el = scroller.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  function go(index: number) {
    const el = scroller.current;
    const card = el?.children[index] as HTMLElement | undefined;
    if (!el || !card) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const first = el.children[0] as HTMLElement;
    el.scrollTo({ left: card.offsetLeft - first.offsetLeft, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <div className="vs-motion relative" role="region" aria-roledescription="carousel" aria-label={label}>
      <div
        ref={scroller}
        // -mx-4/px-4: de rij loopt door tot de schermrand, zoals in een
        // native app, terwijl de eerste kaart gelijk staat met de pagina.
        className="vs-scroller -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:gap-4"
      >
        {items.map((child, i) => (
          <div key={i} className={`shrink-0 snap-start ${itemClassName}`} aria-roledescription="slide" aria-label={t("today.carouselPosition", { n: i + 1, total: items.length })}>
            {child}
          </div>
        ))}
      </div>
      {scrollable && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => go(Math.max(0, active - 1))}
            disabled={edges.start}
            aria-label={t("today.carouselPrev")}
            className="hidden h-9 w-9 items-center justify-center rounded-full border border-vs-line bg-vs-surface text-vs-fg-2 transition hover:border-vs-line-strong hover:text-vs-fg disabled:opacity-40 [@media(pointer:fine)]:flex"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <div className="flex items-center gap-1.5" aria-hidden>
            {items.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? "w-5 bg-vs-accent" : "w-1.5 bg-vs-line-strong"}`} />
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(Math.min(items.length - 1, active + 1))}
            disabled={edges.end}
            aria-label={t("today.carouselNext")}
            className="hidden h-9 w-9 items-center justify-center rounded-full border border-vs-line bg-vs-surface text-vs-fg-2 transition hover:border-vs-line-strong hover:text-vs-fg disabled:opacity-40 [@media(pointer:fine)]:flex"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
