import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getBranding } from "@/lib/branding";
import { resolveAppName } from "@/lib/brand";
import { getGameSettings } from "@/lib/gameSettings";
import Footer from "@/components/Footer";
import HomeContent from "@/components/home/HomeContent";
import { getT } from "@/lib/i18n";
import { anonymousLanguage } from "@/lib/requestLanguage";

// Zolang je ingelogd bent sla je deze pagina altijd over (rechtstreeks naar
// het dashboard) — pas na uitloggen zie je 'm weer. Installatie van de app
// wordt hier bewust niet meer gevraagd: die nudge hoort nu bij het inloggen
// zelf (de onboarding-stap) en de terugkerende hint in de header
// (HeaderInstallHint.tsx), niet bij dit eerste, drempelvrije kennismakings-
// scherm — vandaar altijd twee even prominente knoppen, ook op mobiel.
export default async function HomePage() {
  const [user, { appName }, games] = await Promise.all([getCurrentUser(), getBranding(), getGameSettings()]);
  if (user) redirect("/dashboard");
  const t = getT(await anonymousLanguage());

  return (
    <>
      <HomeContent t={t} displayName={resolveAppName(appName)} games={games} signUpHref="/register" loginHref="/login" />
      <Footer />
    </>
  );
}
