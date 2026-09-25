"use client";

import { useEffect, useSyncExternalStore } from "react";

// De terugbalk (SubpageBackBar) kijkt alleen naar het adres. Een les weet
// zelf uit welke cursus hij komt; die geeft de pagina hier door, zodat
// "terug" naar die cursus gaat in plaats van naar de cursussenlijst.

export interface BackTargetOverride {
  pathname: string;
  href: string;
  parent: string;
}

let current: BackTargetOverride | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSetBackTarget(pathname: string, href: string, parent: string): void {
  useEffect(() => {
    const target = { pathname, href, parent };
    current = target;
    emit();
    return () => {
      if (current === target) {
        current = null;
        emit();
      }
    };
  }, [pathname, href, parent]);
}

/** Alleen de doorgegeven cursus van déze pagina: bij het wisselen van pagina geldt die niet meer. */
export function useBackTargetOverride(pathname: string): BackTargetOverride | null {
  const target = useSyncExternalStore(subscribe, () => current, () => null);
  return target && target.pathname === pathname ? target : null;
}
