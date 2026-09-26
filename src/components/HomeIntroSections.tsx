"use client";

import { useT } from "@/components/I18nProvider";
import { APP_NAME } from "@/lib/brand";

// Het kennismakingsdeel van de homepage, onder de aanmeldknoppen. Ook
// gebruikt op de uitnodigingspagina (/uitnodiging/<code>), zodat wie via een
// link van een vriend binnenkomt net zo goed ziet wat de app is.

// "Boek van Mormon" mag hier met opzet expliciet genoemd worden: dit
// beschrijft wat je vandaag daadwerkelijk krijgt (zie CLAUDE.md), niet een
// aanname dat de app daar voorgoed aan gebonden is — de architectuur staat
// een latere tweede cursus/contentcollectie nog steeds toe.
const FEATURES = [
  { icon: "📚", key: "lessons" },
  { icon: "✍️", key: "exercises" },
  { icon: "🎙️", key: "podcast" },
  { icon: "🔥", key: "streaks" },
  { icon: "🤝", key: "friends" },
  { icon: "💎", key: "divisions" },
  { icon: "⚡", key: "liveQuiz" },
] as const;

export default function HomeIntroSections({ displayName }: { displayName: string }) {
  const t = useT();
  return (
    <>
      {/* Uitleg van de standaardnaam; niet bij een eigen naam uit Huisstijl. */}
      {displayName === APP_NAME && (
        <div className="card !bg-gold-50 dark:!bg-slate-800 !border-gold-400/30 dark:!border-slate-700 max-w-xl text-left flex flex-col gap-2">
          <h2 className="font-extrabold text-lg text-brand-800 dark:text-brand-300">{t("home.whyTitle")}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t("home.why1")}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t("home.why2")}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">{t("home.why3")}</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl">
        {FEATURES.map((f) => (
          <div key={f.key} className="card text-left">
            <div className="text-3xl mb-2">{f.icon}</div>
            <h3 className="font-extrabold mb-1 dark:text-slate-100">{t(`home.features.${f.key}.title`)}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t(`home.features.${f.key}.description`)}</p>
          </div>
        ))}
      </div>
    </>
  );
}
