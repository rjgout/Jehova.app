"use client";

import { useEffect } from "react";

/**
 * Houdt de badge gelijk met het feitelijke app-bezoek. De server zet de
 * persistente teller op nul; de Badging API wist daarna direct het icoon.
 */
export default function NotificationBadgeClear() {
  useEffect(() => {
    let active = true;

    async function clearBadge() {
      try {
        const response = await fetch("/api/notifications/badge", { method: "POST" });
        if (!response.ok || !active) return;
      } catch {
        // Een tijdelijke netwerkfout mag de serverbadge niet verloren laten gaan.
        return;
      }

      if ("clearAppBadge" in navigator) {
        await navigator.clearAppBadge().catch(() => {});
      }
    }

    clearBadge();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") clearBadge();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Een push terwijl de app al open is: de service worker zet dan geen
    // badge maar seint hier, zodat ook de teller op de server weer nul is.
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "jehova:badge-seen") clearBadge();
    };
    navigator.serviceWorker?.addEventListener("message", handleMessage);

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", handleVisibility);
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
    };
  }, []);

  return null;
}
