"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Ververst een open dashboard zodra het volgende woord van de dag vrijkomt
 * (18:00 in de tijdzone van de gebruiker). Wanneer dat is, bepaalt de server
 * (nextReleaseAt); de client rekent alleen met de verstreken tijd sinds
 * serverNow, niet met de toestelklok, zodat een verzette klok niets
 * vervroegt of een herlaadlus veroorzaakt. router.refresh() haalt de
 * servergegevens opnieuw op zonder de pagina te herladen.
 */
export default function DailyWordRollover({ nextReleaseAt, serverNow }: { nextReleaseAt: string; serverNow: number }) {
  const router = useRouter();
  const [offset] = useState(() => serverNow - Date.now());
  useEffect(() => {
    const due = Date.parse(nextReleaseAt);
    let done = false;
    const check = () => {
      if (!done && Date.now() + offset >= due) {
        done = true;
        router.refresh();
      }
    };
    check();
    // Halve minuut is ruim nauwkeurig genoeg; bij terugkeer in de app direct.
    const timer = window.setInterval(check, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [nextReleaseAt, offset, router]);

  return null;
}
