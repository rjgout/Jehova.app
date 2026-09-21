"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
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
      aria-label={isDark ? "Zet lichte modus aan" : "Zet donkere modus aan"}
      title={isDark ? "Lichte modus" : "Donkere modus"}
      className="text-2xl leading-none hover:scale-110 transition"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
