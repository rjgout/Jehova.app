"use client";

import { useState } from "react";
import { Award, Check, Clock3, ShieldCheck } from "lucide-react";
import { useT, useUiLanguage } from "@/components/I18nProvider";
import UserAvatar from "@/components/UserAvatar";
import { primaryButton, surfaceCard } from "@/components/versado/styles";
import { StreakBadge, socialRequest } from "@/components/social/shared";
import { getLanguage } from "@/lib/languages";
import type { MessageKey } from "@/lib/i18n/core";
import type { GroupLinkView, JoinRequestState } from "@/lib/social/joinLinks";

type Preview = Extract<GroupLinkView, { state: "preview" }>;

/**
 * Wat iemand na het scannen ziet: welke groep het is, wie van zijn vrienden
 * al meedoet (of anders de beheerders, alleen naam en avatar), en één
 * duidelijke actie. Geen formulier, geen bericht, geen ledenlijst.
 */
export default function GroupJoinPreview({ token, view }: { token: string; view: Preview }) {
  const t = useT();
  const locale = getLanguage(useUiLanguage()).intlLocale;
  const [request, setRequest] = useState<JoinRequestState>(view.request);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { group, friends, admins } = view;
  const members = group.memberCount === 1 ? t("together.common.membersOne") : t("together.common.membersMany", { n: group.memberCount });

  async function ask() {
    setBusy(true);
    setError(null);
    const result = await socialRequest(`/api/group-links/${token}`);
    setBusy(false);
    if (result.ok && result.data.status === "member" && typeof result.data.groupId === "string") {
      window.location.assign(`/groups/${result.data.groupId}`);
      return;
    }
    if (result.ok) setRequest({ status: "pending" });
    else setError(result.error ?? t("together.common.error"));
  }

  const formatDate = (iso: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(new Date(iso));

  return (
    <div className="vs-motion mx-auto flex w-full max-w-md flex-col gap-4">
      <section className={`${surfaceCard} flex flex-col gap-4 p-5`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-vs-fg-3">{t("together.join.kicker")}</p>
          <h1 className="mt-1 break-words text-2xl font-extrabold tracking-tight text-vs-fg">{group.name}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm font-semibold text-vs-fg-2">
            <StreakBadge days={group.currentStreak} />
            <span>{members}</span>
          </p>
        </div>

        {friends.length > 0 ? (
          <div className="flex flex-col gap-2 border-t border-vs-line pt-4">
            <p className="text-sm font-bold text-vs-fg">
              {friends.length === 1 ? t("together.join.friendsOne") : t("together.join.friendsMany", { n: friends.length })}
            </p>
            <ul className="flex flex-col gap-1.5">
              {friends.slice(0, 6).map((f) => (
                <li key={f.id} className="flex min-w-0 items-center gap-2.5">
                  <UserAvatar id={f.id} handle={f.handle} avatarEmoji={f.avatarEmoji} size="sm" />
                  <span className="truncate text-sm font-semibold text-vs-fg">{f.handle}</span>
                </li>
              ))}
            </ul>
            {friends.length > 6 && <p className="text-xs text-vs-fg-3">+{friends.length - 6}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-2 border-t border-vs-line pt-4">
            <p className="text-sm font-bold text-vs-fg">{t("together.join.noFriends")}</p>
            {admins.length > 0 && (
              <>
                <p className="text-xs font-bold uppercase tracking-wide text-vs-fg-3">{t("together.join.admins")}</p>
                <ul className="flex flex-wrap gap-x-4 gap-y-2">
                  {admins.map((a) => (
                    <li key={a.key} className="flex min-w-0 items-center gap-2">
                      <UserAvatar id={a.key} handle={a.handle} avatarEmoji={a.avatarEmoji} size="sm" />
                      <span className="truncate text-sm font-semibold text-vs-fg">{a.handle}</span>
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-vs-fg-3" aria-hidden />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <div className="border-t border-vs-line pt-4">
          {request.status === "pending" ? (
            <div role="status" className="flex flex-col gap-1">
              <p className="flex items-center gap-2 font-bold text-vs-success">
                <Check className="h-5 w-5" strokeWidth={3} aria-hidden />
                {t("together.join.pending")}
              </p>
              <p className="text-sm text-vs-fg-2">{t("together.join.pendingHint")}</p>
            </div>
          ) : request.status === "cooldown" ? (
            <p className="flex items-start gap-2 text-sm font-semibold text-vs-fg-2">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {t("together.join.cooldown", { date: formatDate(request.until) })}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <button type="button" className={`${primaryButton} h-12 w-full text-base`} onClick={ask} disabled={busy}>
                {busy ? t("together.join.requesting") : t("together.join.request")}
              </button>
              <p className="text-center text-xs text-vs-fg-3">{t("together.join.requestHint")}</p>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm font-semibold text-vs-danger">
              {error}
            </p>
          )}
        </div>
      </section>

      {group.achievements.length > 0 && (
        <section className={`${surfaceCard} flex flex-col gap-2 p-5`}>
          <h2 className="text-sm font-bold uppercase tracking-wide text-vs-fg-3">{t("together.group.achievementsTitle")}</h2>
          <ul className="flex flex-wrap gap-2">
            {group.achievements.map((slug) => (
              <li key={slug} className="inline-flex items-center gap-1.5 rounded-full bg-vs-xp-soft px-2.5 py-1 text-xs font-bold text-vs-xp">
                <Award className="h-3.5 w-3.5" aria-hidden />
                {t(`together.groupAchievements.${slug}.name` as MessageKey)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
