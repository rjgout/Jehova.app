"use client";

import { Check, Clock3 } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import UserAvatar from "@/components/UserAvatar";
import UserTag from "@/components/UserTag";
import { primaryButton, secondaryButton, surfaceCard } from "@/components/versado/styles";
import { NudgeButton, SocialHeading, StreakBadge, socialRequest, type Person } from "@/components/social/shared";

export interface FriendStreakItem {
  id: string;
  friend: Person;
  status: "ACTIVE" | "PENDING";
  direction: "sent" | "received" | null;
  currentStreak: number;
  longestStreak: number;
  today: { me: boolean; friend: boolean } | null;
}

export interface FriendStreaksData {
  streaks: FriendStreakItem[];
  activeCount: number;
  limit: number;
}

/**
 * Vriendenreeksen op de vriendenpagina: lopende reeksen met de stand van
 * vandaag, en uitnodigingen. Starten gebeurt bij een vriend in de lijst.
 * Een lopende reeks heeft bewust geen stopknop.
 */
export default function FriendStreaksSection({
  data,
  nudge,
  onChanged,
}: {
  data: FriendStreaksData;
  nudge: { availableAt: Record<string, string>; disabled: string[] };
  onChanged: () => void;
}) {
  const t = useT();
  const received = data.streaks.filter((s) => s.direction === "received");
  const sent = data.streaks.filter((s) => s.direction === "sent");
  const active = data.streaks.filter((s) => s.status === "ACTIVE");

  async function act(id: string, action: "accept" | "decline" | "cancel") {
    await socialRequest(`/api/friend-streaks/${id}`, { action });
    onChanged();
  }

  return (
    <section aria-labelledby="friend-streaks" className="flex flex-col gap-2.5">
      <SocialHeading id="friend-streaks" title={t("together.friendStreaks.title")} count={t("together.friendStreaks.count", { n: data.activeCount, max: data.limit })} />
      <p className="text-sm text-vs-fg-2">{t("together.friendStreaks.intro")}</p>

      {received.map((s) => (
        <div key={s.id} className={`${surfaceCard} flex flex-wrap items-center gap-3 p-3 sm:p-4`}>
          <UserAvatar id={s.friend.id} handle={s.friend.handle} avatarEmoji={s.friend.avatarEmoji} size="md" />
          <p className="min-w-[12rem] flex-1 text-sm font-semibold text-vs-fg">{t("together.friendStreaks.invitedYou", { name: s.friend.handle })}</p>
          <div className="flex gap-2">
            <button type="button" className={primaryButton} onClick={() => act(s.id, "accept")}>
              {t("together.friendStreaks.accept")}
            </button>
            <button type="button" className={secondaryButton} onClick={() => act(s.id, "decline")}>
              {t("together.friendStreaks.decline")}
            </button>
          </div>
        </div>
      ))}

      {active.length === 0 && received.length === 0 && sent.length === 0 && <p className="text-sm text-vs-fg-3">{t("together.friendStreaks.empty")}</p>}

      {active.length > 0 && (
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {active.map((s) => {
            const today = s.today ?? { me: false, friend: false };
            const status = today.me && today.friend
              ? { text: t("together.friendStreaks.todayBoth"), tone: "text-vs-success", icon: <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> }
              : today.friend
                ? { text: t("together.friendStreaks.todayWaitingForMe", { name: s.friend.handle }), tone: "text-vs-streak", icon: null }
                : today.me
                  ? { text: t("together.friendStreaks.todayWaitingForFriend", { name: s.friend.handle }), tone: "text-vs-fg-2", icon: <Clock3 className="h-4 w-4" aria-hidden /> }
                  : { text: t("together.friendStreaks.todayNone"), tone: "text-vs-fg-3", icon: null };
            const canNudge = !today.friend && !nudge.disabled.includes(s.friend.id);
            return (
              <li key={s.id} className={`${surfaceCard} flex min-w-0 items-center gap-3 p-3 sm:p-4`}>
                <UserAvatar id={s.friend.id} handle={s.friend.handle} avatarEmoji={s.friend.avatarEmoji} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <UserTag handle={s.friend.handle} discriminator={s.friend.discriminator} className="truncate font-bold text-vs-fg" />
                    <StreakBadge days={s.currentStreak} />
                  </div>
                  <p className={`mt-1 flex items-center gap-1.5 text-xs font-semibold ${status.tone}`}>
                    {status.icon}
                    <span className="truncate">{status.text}</span>
                  </p>
                </div>
                {canNudge && <NudgeButton recipient={s.friend} context={{ kind: "friend-streak" }} availableAt={nudge.availableAt[s.friend.id] ?? null} compact />}
              </li>
            );
          })}
        </ul>
      )}

      {sent.map((s) => (
        <div key={s.id} className={`${surfaceCard} flex items-center gap-3 p-3 text-vs-fg-2`}>
          <UserAvatar id={s.friend.id} handle={s.friend.handle} avatarEmoji={s.friend.avatarEmoji} size="sm" />
          <Clock3 className="h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-sm">{t("together.friendStreaks.waiting", { name: s.friend.handle })}</span>
          <button type="button" className={`${secondaryButton} !h-9 !px-3 !text-xs`} onClick={() => act(s.id, "cancel")}>
            {t("together.friendStreaks.cancel")}
          </button>
        </div>
      ))}

      {data.activeCount >= data.limit && <p className="text-xs text-vs-fg-3">{t("together.friendStreaks.full")}</p>}
    </section>
  );
}
