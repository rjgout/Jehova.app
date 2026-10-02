"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/components/I18nProvider";
import { safeReturnPath, takeReturnTo } from "@/lib/returnTo";

/**
 * Verder na het bevestigen: naar waar de registratie begon (bv. een
 * groepslink). De server geeft dat mee; op hetzelfde apparaat onthield de
 * registratie het ook in de browser.
 */
export default function ContinueAfterVerify({ next }: { next: string | null }) {
  const router = useRouter();
  const t = useT();
  function go() {
    const remembered = takeReturnTo();
    router.push(safeReturnPath(next) ?? remembered ?? "/dashboard");
    router.refresh();
  }
  return (
    <button type="button" className="btn-primary self-center" onClick={go}>
      {t("verify.continue")}
    </button>
  );
}
