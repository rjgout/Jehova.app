import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { focusRing } from "@/components/versado/styles";

export default function SectionHeader({ id, title, href, linkLabel, count }: { id: string; title: string; href?: string; linkLabel?: string; count?: number }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 id={id} className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-vs-fg sm:text-xl">
        {title}
        {count !== undefined && count > 0 && (
          <span className="rounded-full bg-vs-accent px-2 py-0.5 text-xs font-extrabold tabular-nums text-vs-on-accent">{count}</span>
        )}
      </h2>
      {href && linkLabel && (
        <Link href={href} className={`-mr-1 flex min-h-[40px] shrink-0 items-center gap-0.5 rounded-full px-2 text-sm font-bold text-vs-accent hover:underline ${focusRing}`}>
          {linkLabel}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}
