"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socketClient";

/**
 * Meldt aan de server welke herkenbare activiteit deze gebruiker nu doet
 * (zie src/lib/presence.ts) — alleen zichtbaar voor vrienden die dat zelf
 * hebben aangezet. Nooit een technisch ID doorgeven, altijd al hier een
 * leesbaar label samenstellen (bv. "Leest Alma 32"). Meldt bij unmount
 * automatisch weer "geen activiteit" — anders zou een verlaten scherm
 * eeuwig als "actief" blijven staan.
 */
export function useActivityStatus(icon: string, label: string | null): void {
  useEffect(() => {
    if (!label) return;
    const socket = getSocket();
    const send = () => socket.emit("activity_update", { icon, label });
    send();
    // Na een herverbinding (telefoon even in slaap, netwerk weg) opnieuw
    // melden: de server wist de activiteit zodra de laatste verbinding wegvalt.
    socket.on("connect", send);
    return () => {
      socket.off("connect", send);
      socket.emit("activity_update", null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [icon, label]);
}
