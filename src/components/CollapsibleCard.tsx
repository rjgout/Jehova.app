import type { ReactNode, SyntheticEvent } from "react";

/**
 * Uitklapbare kaart in dezelfde stijl als de kaarten in /adminbackend
 * (native <details>, dus geen JavaScript nodig om open/dicht te gaan).
 * `defaultOpen` geldt alleen bij het laden: daarna onthoudt de browser zelf
 * wat de gebruiker open- of dichtklapte, ook als de pagina opnieuw rendert.
 */
export default function CollapsibleCard({
  title,
  defaultOpen = false,
  extra,
  className = "",
  onToggle,
  children,
}: {
  title: ReactNode;
  defaultOpen?: boolean;
  extra?: ReactNode; // bv. een teller rechts naast de titel
  className?: string;
  onToggle?: (event: SyntheticEvent<HTMLDetailsElement>) => void;
  children: ReactNode;
}) {
  return (
    <details className={`group card flex flex-col gap-3 ${className}`} open={defaultOpen} onToggle={onToggle}>
      <summary className="font-extrabold text-lg dark:text-slate-100 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-3">
        <span className="min-w-0">{title}</span>
        <span className="flex shrink-0 items-center gap-2">
          {extra}
          <span className="text-slate-400 transition-transform group-open:rotate-180" aria-hidden>
            ▾
          </span>
        </span>
      </summary>
      {children}
    </details>
  );
}
