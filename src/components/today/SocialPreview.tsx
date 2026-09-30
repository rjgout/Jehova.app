import Link from "next/link";
import { Activity, ChevronRight, Trophy, Users } from "lucide-react";
import { getT } from "@/lib/i18n";
import SectionHeader from "@/components/today/SectionHeader";
import SocialLive from "@/components/today/SocialLive";
import { focusRing, surfaceCard } from "@/components/versado/styles";
import type { TodayData } from "@/lib/today";

// Korte sociale context, geen tweede vriendenpagina: wie er online is (live,
// en wat ze doen alleen als ze dat zelf delen; zie SocialLive.tsx en
// presence.ts), en snelle ingangen naar Vrienden, Competitie en Activiteit.
export default function SocialPreview({ social, language }: { social: TodayData["social"]; language: string }) {
  const t = getT(language);
  const links = [
    { href: "/friends", label: t("nav.friends"), icon: Users },
    { href: "/competition", label: t("nav.competition"), icon: Trophy },
    { href: "/activity", label: t("nav.activity"), icon: Activity },
  ];

  return (
    <section aria-labelledby="today-social" className="vs-rise">
      <SectionHeader id="today-social" title={t("today.socialTitle")} />
      <div className={`${surfaceCard} overflow-hidden`}>
        <div className="p-4 sm:p-5">
          <SocialLive social={social} />
        </div>
        {/* Op tablet naast elkaar (de kaart is dan zo breed als de pagina), elders onder elkaar. */}
        <ul className="border-t border-vs-line md:grid md:grid-cols-3 lg:block">
          {links.map(({ href, label, icon: Icon }) => (
            <li key={href} className="border-b border-vs-line last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 lg:border-b lg:border-r-0 lg:last:border-b-0">
              <Link href={href} className={`vs-motion flex min-h-[48px] items-center gap-3 px-4 text-sm font-bold text-vs-fg transition-colors hover:bg-vs-subtle sm:px-5 ${focusRing}`}>
                <Icon className="h-[18px] w-[18px] text-vs-fg-3" aria-hidden />
                <span className="flex-1">{label}</span>
                <ChevronRight className="h-4 w-4 text-vs-fg-3" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
