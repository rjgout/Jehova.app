import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { getBranding } from "@/lib/branding";
import { resolveAppName } from "@/lib/brand";
import Footer from "@/components/Footer";

// "Boek van Mormon" mag hier met opzet expliciet genoemd worden: dit
// beschrijft wat je vandaag daadwerkelijk krijgt (zie CLAUDE.md), niet een
// aanname dat de app daar voorgoed aan gebonden is — de architectuur staat
// een latere tweede cursus/contentcollectie nog steeds toe.
const FEATURES = [
  {
    icon: "📚",
    title: "Korte lessen",
    description: "Elke les over het Boek van Mormon past in een paar minuten — precies genoeg voor onderweg.",
  },
  {
    icon: "✍️",
    title: "Invuloefeningen",
    description: "Geen multiple choice: vul zelf ontbrekende woorden in of leg ze in de juiste volgorde.",
  },
  {
    icon: "🎙️",
    title: "Podcast",
    description:
      "Luister naar de podcast “Geloof je dat ook?” en beantwoord kennisvragen over elke aflevering — inclusief de link met het Boek van Mormon.",
  },
  {
    icon: "🔥",
    title: "Dag-streaks & freezes",
    description: "Bouw een reeks op, verdien streak freezes bij mijlpalen — en geef ze weg aan vrienden.",
  },
  {
    icon: "🤝",
    title: "Vrienden",
    description: "Zie elkaars voortgang, daag elkaar uit en vier successen samen.",
  },
  {
    icon: "💎",
    title: "Divisies",
    description: "Strijd wekelijks tegen spelers op jouw niveau en klim naar de volgende divisie.",
  },
  {
    icon: "⚡",
    title: "Live quiz samen",
    description: "Speel live tegen vrienden over een hoofdstuk — wie is het snelst en scherpst?",
  },
];

// Zolang je ingelogd bent sla je deze pagina altijd over (rechtstreeks naar
// het dashboard) — pas na uitloggen zie je 'm weer. Installatie van de app
// wordt hier bewust niet meer gevraagd: die nudge hoort nu bij het inloggen
// zelf (de onboarding-stap) en de terugkerende hint in de header
// (HeaderInstallHint.tsx), niet bij dit eerste, drempelvrije kennismakings-
// scherm — vandaar altijd twee even prominente knoppen, ook op mobiel.
export default async function HomePage() {
  const [user, { appName, heroLogoDataUrl }] = await Promise.all([getCurrentUser(), getBranding()]);
  if (user) redirect("/dashboard");
  const displayName = resolveAppName(appName);

  return (
    <>
    <div className="flex flex-col items-center text-center gap-10 py-8 sm:py-12">
      {heroLogoDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={heroLogoDataUrl} alt={displayName} className="h-10 w-auto" />
      ) : (
        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-brand-600 dark:text-brand-300 bg-brand-50 dark:bg-slate-800 rounded-full px-3.5 py-1.5">
          📖 {displayName}
        </span>
      )}

      <div className="flex flex-col items-center gap-3">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-brand-800 dark:text-brand-300 leading-tight">
          Bestudeer het Boek van Mormon,
          <br />
          op een speelse manier.
        </h1>
        <p className="max-w-xl text-slate-500 dark:text-slate-400 text-lg">
          Korte lessen, invuloefeningen en dag-streaks — samen met vrienden, in divisies, of live tegen elkaar.
        </p>
      </div>

      <div className="flex gap-3 w-full max-w-sm sm:w-auto">
        <Link href="/register" className="btn-primary flex-1 sm:flex-none sm:!px-8">
          Aanmelden
        </Link>
        <Link href="/login" className="btn-secondary flex-1 sm:flex-none sm:!px-8">
          Inloggen
        </Link>
      </div>

      {displayName === "Jehova" && (
        <div className="card !bg-gold-50 dark:!bg-slate-800 !border-gold-400/30 dark:!border-slate-700 max-w-xl text-left flex flex-col gap-2">
          <h2 className="font-extrabold text-lg text-brand-800 dark:text-brand-300">Waarom heet dit Jehova?</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Jehova is een naam voor Jezus Christus vóór Zijn geboorte. Die naam komt ook voor in het Boek van Mormon.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Het Boek van Mormon is &ldquo;een testament van Jezus Christus&rdquo;. Het is bedoeld om te getuigen dat
            Jezus de Christus is.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">Daarom staat Zijn naam centraal in Jehova.app.</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">
        {FEATURES.map((f) => (
          <div key={f.title} className="card text-left">
            <div className="text-3xl mb-2">{f.icon}</div>
            <h3 className="font-extrabold mb-1 dark:text-slate-100">{f.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{f.description}</p>
          </div>
        ))}
      </div>
    </div>
    <Footer />
    </>
  );
}
