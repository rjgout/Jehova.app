import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Blauw uit het jehova.app-wordmerk: 400/600 zijn de exacte kleuren
        // van het logo (".app" resp. "jehova"), de rest van de schaal is
        // daaromheen geïnterpoleerd zodat lichte/donkere varianten (zie
        // bv. "text-brand-800 dark:text-brand-300" door de hele app heen)
        // dezelfde tint blauw blijven i.p.v. toevallige losse kleuren.
        brand: {
          50: "#eef6ff",
          100: "#d9edfe",
          200: "#aed8fc",
          300: "#7cc0fa",
          400: "#4fa3f7",
          500: "#2e86f5",
          600: "#1565c0",
          700: "#0f4a85",
          800: "#0c3a69",
          900: "#0a2e54",
        },
        // Goud uit het logo (de punt na "app"): 500 is de exacte kleur.
        gold: {
          50: "#fdf3e0",
          400: "#f8cd6c",
          500: "#f6b93b",
          600: "#e0992a",
          700: "#b97814",
        },
        ice: {
          50: "#f0f9ff",
          400: "#7dd3fc",
          500: "#38bdf8",
          600: "#0ea5e9",
        },
        // Semantische Versado-tokens (waarden in globals.css, licht en donker):
        // bg-vs-surface, text-vs-fg-2, border-vs-line, enz.
        vs: {
          "app": "rgb(var(--vs-app) / <alpha-value>)",
          "surface": "rgb(var(--vs-surface) / <alpha-value>)",
          "elevated": "rgb(var(--vs-elevated) / <alpha-value>)",
          "subtle": "rgb(var(--vs-subtle) / <alpha-value>)",
          "fg": "rgb(var(--vs-fg) / <alpha-value>)",
          "fg-2": "rgb(var(--vs-fg-2) / <alpha-value>)",
          "fg-3": "rgb(var(--vs-fg-3) / <alpha-value>)",
          "line": "rgb(var(--vs-line) / <alpha-value>)",
          "line-strong": "rgb(var(--vs-line-strong) / <alpha-value>)",
          "accent": "rgb(var(--vs-accent) / <alpha-value>)",
          "accent-soft": "rgb(var(--vs-accent-soft) / <alpha-value>)",
          "on-accent": "rgb(var(--vs-on-accent) / <alpha-value>)",
          "success": "rgb(var(--vs-success) / <alpha-value>)",
          "success-soft": "rgb(var(--vs-success-soft) / <alpha-value>)",
          "warning": "rgb(var(--vs-warning) / <alpha-value>)",
          "warning-soft": "rgb(var(--vs-warning-soft) / <alpha-value>)",
          "danger": "rgb(var(--vs-danger) / <alpha-value>)",
          "danger-soft": "rgb(var(--vs-danger-soft) / <alpha-value>)",
          "xp": "rgb(var(--vs-xp) / <alpha-value>)",
          "xp-fill": "rgb(var(--vs-xp-fill) / <alpha-value>)",
          "xp-soft": "rgb(var(--vs-xp-soft) / <alpha-value>)",
          "streak": "rgb(var(--vs-streak) / <alpha-value>)",
          "streak-soft": "rgb(var(--vs-streak-soft) / <alpha-value>)",
          "league": "rgb(var(--vs-league) / <alpha-value>)",
          "league-soft": "rgb(var(--vs-league-soft) / <alpha-value>)",
          "overlay": "rgb(var(--vs-overlay) / <alpha-value>)",
          "shadow": "rgb(var(--vs-shadow) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["Nunito", "system-ui", "sans-serif"],
      },
      keyframes: {
        pop: {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-6px)" },
          "75%": { transform: "translateX(6px)" },
        },
        // Kloppende gloed rond een openstaande live-uitnodiging (Spelen).
        "invite-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(46, 134, 245, 0.55), 0 0 12px 0 rgba(246, 185, 59, 0.35)" },
          "50%": { boxShadow: "0 0 0 6px rgba(46, 134, 245, 0), 0 0 22px 4px rgba(246, 185, 59, 0.55)" },
        },
        // Laatst gelegde tegels in het woordspel even laten oplichten.
        "tile-flash": {
          "0%, 100%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(246, 185, 59, 0)" },
          "40%": { transform: "scale(1.12)", boxShadow: "0 0 0 3px rgba(246, 185, 59, 0.95), 0 0 14px 4px rgba(246, 185, 59, 0.7)" },
        },
        // Melding die van boven het scherm in schuift, zoals een systeemmelding.
        "slide-down": {
          "0%": { transform: "translateY(-120%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        // Meldingencentrum dat van boven over het scherm zakt.
        "sheet-down": {
          "0%": { transform: "translateY(-6%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        indeterminate: {
          "0%": { transform: "translateX(-60%) scaleX(0.4)" },
          "50%": { transform: "translateX(20%) scaleX(0.6)" },
          "100%": { transform: "translateX(110%) scaleX(0.4)" },
        },
      },
      animation: {
        pop: "pop 0.2s ease-out",
        shake: "shake 0.3s ease-in-out",
        indeterminate: "indeterminate 1.3s ease-in-out infinite",
        "invite-glow": "invite-glow 1.8s ease-in-out infinite",
        "tile-flash": "tile-flash 0.9s ease-in-out 3",
        "slide-down": "slide-down 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2)",
        "sheet-down": "sheet-down 0.25s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
