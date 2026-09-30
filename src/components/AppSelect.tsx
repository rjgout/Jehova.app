"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export interface AppSelectOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

interface Props {
  value: string;
  options: AppSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

/** App-eigen keuzelijst, zodat selecties niet afhankelijk zijn van browser/OS-opmaak. */
export default function AppSelect({ value, options, onChange, disabled = false, className = "input", ariaLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, options.findIndex((option) => option.value === value)));
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selected = options[selectedIndex];

  useEffect(() => {
    function close(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  useEffect(() => {
    setActiveIndex(selectedIndex);
  }, [selectedIndex]);

  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
  }

  function move(direction: 1 | -1) {
    let index = activeIndex;
    do {
      index = (index + direction + options.length) % options.length;
    } while (options[index]?.disabled && index !== activeIndex);
    setActiveIndex(index);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) setOpen(true);
      move(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      choose(activeIndex);
    }
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        className={`${className} flex items-center justify-between gap-2 text-left`}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((isOpen) => !isOpen)}
        onKeyDown={onKeyDown}
      >
        <span className="min-w-0 truncate">{selected?.label}</span>
        <span className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>▾</span>
      </button>
      {open && (
        // Staat de keuzelijst in een <label> (zo gebruikt op o.a. profiel,
        // winkel en voorlezen), dan stuurt de browser een klik op een optie
        // door naar de eerste knop in dat label: de openklapknop. Het menu
        // ging dan na het kiezen meteen weer open. preventDefault houdt die
        // doorverwijzing tegen; de keuze zelf is dan al verwerkt.
        <div id={listId} role="listbox" aria-label={ariaLabel} onClick={(event) => event.preventDefault()} className="absolute left-0 top-full z-50 mt-1 max-h-64 w-full min-w-max overflow-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              disabled={option.disabled}
              className={`block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                option.value === value ? "bg-brand-50 text-brand-700 dark:bg-slate-700 dark:text-brand-300" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
              } disabled:cursor-not-allowed disabled:opacity-40`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(index)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
