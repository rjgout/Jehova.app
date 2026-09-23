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

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}
