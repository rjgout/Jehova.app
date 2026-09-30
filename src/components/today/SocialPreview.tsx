import Link from "next/link";
import { Activity, ChevronRight, Trophy, UserPlus, Users } from "lucide-react";
import { getT } from "@/lib/i18n";
import UserAvatar from "@/components/UserAvatar";
import SectionHeader from "@/components/today/SectionHeader";
import { focusRing, primaryButton, surfaceCard } from "@/components/versado/styles";
import type { TodayData } from "@/lib/today";

// Korte sociale context, geen tweede vriendenpagina: wie er online is (en
// wat ze doen, alleen als ze dat zelf delen, zie presence.ts), en snelle
// ingangen naar Vrienden, Competitie en Activiteit.
export default function SocialPreview({ social, language }: { social: TodayData["social"]; language: string }) {
  const t = getT(language);
  const links = [
    { href: "/friends", label: t("nav.friends"), icon: Users },
    { href: "/competition", label: t("nav.competition"), icon: Trophy },
    { href: "/activity", label: t("nav.activity"), icon: Activity },
  ];
  const onlineCount = social.online.length;

  return (
    <section aria-labelledby="today-social" className="vs-rise">
      <SectionHeader id="today-social" title={t("today.socialTitle")} />
      <div className={`${surfaceCard} overflow-hidden`}>
        <div className="p-4 sm:p-5">
          {social.friendCount === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-vs-fg-2">{t("today.social.noFriends")}</p>
              <Link href="/friends" className={primaryButton}>
                <UserPlus className="h-4 w-4" aria-hidden />
                {t("today.social.findFriends")}
              </Link>
            </div>
          ) : !social.viewerSharesOnline ? (
            <p className="text-sm text-vs-fg-2">
              {t("today.social.shareOff")}{" "}
              <Link href="/profile" className={`font-bold text-vs-accent hover:underline ${focusRing}`}>
                {t("today.social.shareOffCta")}
              </Link>
            </p>
          ) : onlineCount === 0 ? (
            <p className="text-sm text-vs-fg-2">{t("today.social.noneOnline")}</p>
          ) : (
            <>
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-vs-fg">
                <span className="relative flex h-2.5 w-2.5" aria-hidden>
                  <span className="absolute inline-flex h-full w-full rounded-full bg-vs-success opacity-40 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-vs-success" />
                </span>
                {onlineCount === 1 ? t("today.social.onlineOne") : t("today.social.onlineMany", { n: onlineCount })}
              </p>
              <ul className="flex flex-col gap-2.5">
                {social.online.map((friend) => (
                  <li key={friend.id} className="flex items-center gap-3">
                    <span className="relative">
                      <UserAvatar id={friend.id} handle={friend.handle} avatarEmoji={friend.avatarEmoji} size="sm" />
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-vs-surface bg-vs-success" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-vs-fg">{friend.handle}</p>
                      <p className="truncate text-xs text-vs-fg-3">{friend.activity ?? t("today.social.online")}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <ul className="border-t border-vs-line">
          {links.map(({ href, label, icon: Icon }) => (
            <li key={href} className="border-b border-vs-line last:border-b-0">
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
