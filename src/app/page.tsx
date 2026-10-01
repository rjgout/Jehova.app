import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { getBranding } from "@/lib/branding";
import { resolveAppName } from "@/lib/brand";
import Footer from "@/components/Footer";
import MascotSlot from "@/components/versado/MascotSlot";
import HomeIntroSections from "@/components/HomeIntroSections";
import { getT } from "@/lib/i18n";
import { anonymousLanguage } from "@/lib/requestLanguage";

// Namen worden niet vertaald; de eigenschappen wel (home.mascots.*).
const MASCOTS = [
  { key: "varo", name: "Varo" },
  { key: "vera", name: "Vera" },
  { key: "novi", name: "Novi" },
] as const;

// Zolang je ingelogd bent sla je deze pagina altijd over (rechtstreeks naar
// het dashboard) — pas na uitloggen zie je 'm weer. Installatie van de app
// wordt hier bewust niet meer gevraagd: die nudge hoort nu bij het inloggen
// zelf (de onboarding-stap) en de terugkerende hint in de header
// (HeaderInstallHint.tsx), niet bij dit eerste, drempelvrije kennismakings-
// scherm — vandaar altijd twee even prominente knoppen, ook op mobiel.
export default async function HomePage() {
  const [user, { appName }] = await Promise.all([getCurrentUser(), getBranding()]);
  if (user) redirect("/dashboard");
  const displayName = resolveAppName(appName);
  const t = getT(await anonymousLanguage());

  return (
    <>
    <div className="flex flex-col items-center text-center gap-10 py-8 sm:py-12">
      {/* De mascottefamilie stelt zich voor (family/welcome). Het beeld is
          decoratief: wie wie is staat als gewone tekst eronder, zodat een
          schermlezer het niet dubbel hoort. Vervangt het logo van het
          welkomscherm; family-celebrate is iets anders (alleen mijlpalen). */}
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <MascotSlot character="family" state="welcome" size={448} className="w-full" />
        <p className="max-w-sm text-slate-600 dark:text-slate-300">{t("home.mascotsIntro")}</p>
        <ul className="grid w-full grid-cols-3 gap-3 text-sm">
          {MASCOTS.map((m) => (
            <li key={m.key} className="flex min-w-0 flex-col gap-0.5 break-words">
              <span className="font-extrabold text-brand-800 dark:text-brand-300">{m.name}</span>
              {/* Eén eigenschap per regel: in smalle kolommen breekt "a · b · c"
                  anders midden in de opsomming, met een punt aan het begin. */}
              {t(`home.mascots.${m.key}`).split(" · ").map((trait) => (
                <span key={trait} className="text-xs leading-snug text-slate-500 dark:text-slate-400">{trait}</span>
              ))}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col items-center gap-3">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-brand-800 dark:text-brand-300 leading-tight">
          {t("home.heroLine1")}
          <br />
          {t("home.heroLine2")}
        </h1>
        <p className="max-w-xl text-slate-500 dark:text-slate-400 text-lg">
          {t("home.heroText")}
        </p>
      </div>

      <div className="flex gap-3 w-full max-w-sm sm:w-auto">
        <Link href="/register" className="btn-primary flex-1 sm:flex-none sm:!px-8">
          {t("home.signUp")}
        </Link>
        <Link href="/login" className="btn-secondary flex-1 sm:flex-none sm:!px-8">
          {t("auth.login")}
        </Link>
      </div>

      <HomeIntroSections displayName={displayName} />
    </div>
    <Footer />
    </>
  );
}
