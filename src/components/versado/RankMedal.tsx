// Plek 1, 2 of 3 als medaille (goud, zilver, brons): een gekleurde munt met
// het cijfer, bewust geen emoji. Gebruikt in het klassement en bij de
// medailletelling op het profiel.

const STYLES: Record<1 | 2 | 3, string> = {
  1: "bg-gold-400 text-amber-950 ring-gold-600/50",
  2: "bg-slate-300 text-slate-800 ring-slate-500/40 dark:bg-slate-300",
  3: "bg-amber-600 text-white ring-amber-800/40",
};

export default function RankMedal({ rank, label, className = "h-7 w-7 text-sm" }: { rank: 1 | 2 | 3; label?: string; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-extrabold ring-2 ring-inset ${STYLES[rank]} ${className}`}
      aria-label={label}
      role={label ? "img" : undefined}
      aria-hidden={label ? undefined : true}
    >
      {rank}
    </span>
  );
}
