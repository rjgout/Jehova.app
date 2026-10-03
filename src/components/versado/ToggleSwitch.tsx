"use client";

type ToggleSwitchProps = {
  checked: boolean;
  disabled?: boolean;
  busy?: boolean;
  compact?: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
  ariaDescribedBy?: string;
};

/**
 * Centrale Versado-schakelaar voor een echte aan/uit-instelling. De native
 * checkbox blijft beschikbaar voor toetsenbord en schermlezer; de track is
 * uitsluitend de consistente visuele weergave.
 */
export default function ToggleSwitch({
  checked,
  disabled = false,
  busy = false,
  compact = false,
  onChange,
  ariaLabel,
  ariaDescribedBy,
}: ToggleSwitchProps) {
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center ${compact ? "h-9 w-10" : "h-11 w-12"}`}>
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => {
          if (!busy) onChange(event.target.checked);
        }}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-busy={busy || undefined}
      />
      <span
        aria-hidden
        className={`relative shrink-0 rounded-full bg-vs-line-strong transition-colors after:absolute after:left-0.5 after:top-0.5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-vs-accent peer-focus-visible:ring-2 peer-focus-visible:ring-vs-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-vs-surface peer-disabled:opacity-50 motion-reduce:after:transition-none ${
          compact
            ? "h-5 w-9 after:h-4 after:w-4 peer-checked:after:translate-x-4"
            : "h-6 w-11 after:h-5 after:w-5 peer-checked:after:translate-x-5"
        }`}
      />
    </span>
  );
}
