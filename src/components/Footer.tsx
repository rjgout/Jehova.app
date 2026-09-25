"use client";

import Link from "next/link";
import { useT } from "@/components/I18nProvider";

export default function Footer() {
  const t = useT();
  return (
    <footer className="mt-16 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-400 dark:text-slate-500">
      <div className="mx-auto max-w-5xl px-4 py-8 flex flex-col gap-3">
        <p>
          {t("footer.disclaimer")}
        </p>
        <div className="flex gap-4 flex-wrap">
          <Link href="/privacy" className="hover:text-brand-600 dark:hover:text-brand-300 underline">
            {t("footer.privacy")}
          </Link>
          <Link href="/cookies" className="hover:text-brand-600 dark:hover:text-brand-300 underline">
            {t("footer.cookies")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
