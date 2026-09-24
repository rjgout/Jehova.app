"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socketClient";

/** Een specifieke activiteit (hoofdstuk lezen, oefenen) gaat voor de algemene
 * paginamelding van ActivityTracker. */
export const ACTIVITY_PRIORITY = { page: 0, specific: 1 } as const;

interface Entry {
  id: number;
  icon: string;
  label: string;
  priority: number;
}

// Alle componenten die nu een activiteit melden. Vroeger stuurde elke
// component zelf "geen activiteit" bij het verdwijnen, ook als een andere
// component nog iets meldde: de activiteit was dan weg voor vrienden tot er
// toevallig een nieuwe startte. Nu stuurt alleen deze module, en alleen de
// belangrijkste die nog loopt.
const entries: Entry[] = [];
let nextId = 0;
let lastSentKey: string | null = null;
let flushScheduled = false;
let connectHandlerBound = false;

function currentEntry(): Entry | null {
  let best: Entry | null = null;
  for (const entry of entries) {
    // Bij gelijke prioriteit wint de laatst gemelde.
    if (!best || entry.priority > best.priority || (entry.priority === best.priority && entry.id > best.id)) {
      best = entry;
    }
  }
  return best;
}

function flush() {
  flushScheduled = false;
  const entry = currentEntry();
  const key = entry ? `${entry.icon}\u0000${entry.label}` : "";
  if (key === lastSentKey) return;
  lastSentKey = key;
  getSocket().emit("activity_update", entry ? { icon: entry.icon, label: entry.label } : null);
}

// Uitgesteld tot na de huidige React-commit: bij een paginawissel ruimt de ene
// component op en meldt de volgende zich in dezelfde ronde. Zonder uitstel zag
// een vriend steeds heel even "geen activiteit" voorbijkomen.
function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  setTimeout(flush, 0);
}

function bindConnectHandler() {
  if (connectHandlerBound) return;
  connectHandlerBound = true;
  // Na een herverbinding (telefoon even in slaap, netwerk weg) opnieuw
  // melden: de server wist de activiteit zodra de laatste verbinding wegvalt.
  getSocket().on("connect", () => {
    lastSentKey = null;
    scheduleFlush();
  });
}

/**
 * Meldt aan de server welke herkenbare activiteit deze gebruiker nu doet
 * (zie src/lib/presence.ts) — alleen zichtbaar voor vrienden die dat zelf
 * hebben aangezet. Nooit een technisch ID doorgeven, altijd al hier een
 * leesbaar label samenstellen (bv. "Leest Alma 32"). Verdwijnt vanzelf bij
 * unmount; blijft er dan een andere activiteit over, dan wordt die getoond.
 */
export function useActivityStatus(
  icon: string,
  label: string | null,
  priority: number = ACTIVITY_PRIORITY.specific
): void {
  useEffect(() => {
    if (!label) return;
    bindConnectHandler();
    const entry: Entry = { id: nextId++, icon, label, priority };
    entries.push(entry);
    scheduleFlush();
    return () => {
      const index = entries.indexOf(entry);
      if (index !== -1) entries.splice(index, 1);
      scheduleFlush();
    };
  }, [icon, label, priority]);
}
