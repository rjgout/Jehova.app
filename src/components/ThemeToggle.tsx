"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/I18nProvider";

export default function ThemeToggle() {
  const t = useT();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("bom-theme", next ? "dark" : "light");
    } catch {
      // localStorage kan geblokkeerd zijn; dan onthouden we de keuze deze sessie niet
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? t("theme.lightOn") : t("theme.darkOn")}
      title={isDark ? t("theme.light") : t("theme.dark")}
      className="h-12 w-12 text-4xl leading-none hover:scale-110 transition flex items-center justify-center"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
