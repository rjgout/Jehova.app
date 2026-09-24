import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { getBranding } from "@/lib/branding";
import { resolveAppName } from "@/lib/brand";
import Footer from "@/components/Footer";
import HomeIntroSections from "@/components/HomeIntroSections";

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

      <HomeIntroSections displayName={displayName} />
    </div>
    <Footer />
    </>
  );
}
