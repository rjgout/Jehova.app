"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import Link from "next/link";
import CollapsibleCard from "@/components/CollapsibleCard";
import LanguageSettings from "@/components/LanguageSettings";
import { useRouter } from "next/navigation";
import type { LeagueTier } from "@prisma/client";
import { TIER_ICONS } from "@/lib/leagues";
import { formatTag, firstGrapheme, isSingleEmoji } from "@/lib/handle";
import { enableBrowserPush, disableBrowserPush, isPushSupported } from "@/lib/pushClient";
import { getSocket } from "@/lib/socketClient";
import ThemeToggle from "@/components/ThemeToggle";
import TwoFactorSettings from "@/components/TwoFactorSettings";
import { getDutchVoices, saveSelectedDutchVoice } from "@/lib/readAloud";
import { useT, useUiLanguage } from "@/components/I18nProvider";
import { getLanguage } from "@/lib/languages";
import { translateOr } from "@/lib/i18n/core";

interface AchievementView {
  slug: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string | null;
}

interface ProfileData {
  displayName: string;
  isAdmin: boolean;
  handle: string;
  discriminator: string;
  avatarEmoji: string | null;
  email: string;
  searchableByEmail: boolean;
  shareOnlineStatus: boolean;
  shareCurrentActivity: boolean;
  incognitoActive: boolean;
  emailNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  dailyReminderTime: string;
  dailyTextTime: string;
  notifyDailyText: boolean;
  notifyDailyReminder: boolean;
  notifySocial: boolean;
  notifyAchievements: boolean;
  notifyWordGame: boolean;
  notifyFriendOnline: boolean;
  changelogEnabled: boolean;
  uiLanguage: string;
  xpTotal: number;
  currentStreak: number;
  longestStreak: number;
  freezeCount: number;
  chaptersCompleted: number;
  chaptersStarted: number;
  duelsPlayed: number;
  duelsWon: number;
  tier: LeagueTier | null;
  groupPosition: number | null;
  bestTierEver: LeagueTier | null;
  lifetimePromotions: number;
  lifetimeDemotions: number;
  competitionsWon: number;
  seasonCount: number;
  bestNationalRank: number | null;
  seasons: { seasonIndex: number; highestTier: LeagueTier; finalTier: LeagueTier; finalGroupPosition: number | null }[];
  achievements: AchievementView[];
}

// Kleine, willekeurige greep uit veelgebruikte emoji — puur een handig
// startpunt, geen uitputtende lijst; het invoerveld ernaast accepteert
// elke andere emoji (behalve de geweerde, zie isSingleEmoji/containsForbiddenEmoji).
const AVATAR_EMOJI_OPTIONS = [
  "😀", "😎", "🤓", "🥳", "😇", "🙂", "🚀", "⭐", "🔥", "💪",
  "🎉", "🎮", "📖", "🐶", "🐱", "🦁", "🐸", "🦄", "🌈", "⚡",
  "🍕", "⚽", "🎸", "🌻", "🌊", "🏔️",
];

export default function ProfileClient() {
  const t = useT();
  const tier = (value: LeagueTier) => t(`tiers.${value}`);
  const [data, setData] = useState<ProfileData | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resettingReadingProgress, setResettingReadingProgress] = useState(false);
  const [resetReadingMessage, setResetReadingMessage] = useState<string | null>(null);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [testingPush, setTestingPush] = useState(false);
  const [pushTestMessage, setPushTestMessage] = useState<string | null>(null);
  const [pushCountdown, setPushCountdown] = useState<number | null>(null);
  const [editingHandle, setEditingHandle] = useState(false);
  const [handleInput, setHandleInput] = useState("");
  const [savingHandle, setSavingHandle] = useState(false);
  const [handleError, setHandleError] = useState<string | null>(null);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [avatarInput, setAvatarInput] = useState("");
  const [savingAvatarEmoji, setSavingAvatarEmoji] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [readAloudVoices, setReadAloudVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedReadAloudVoice, setSelectedReadAloudVoice] = useState("");
  const [testingReadAloudVoice, setTestingReadAloudVoice] = useState(false);
  const [readAloudSpeed, setReadAloudSpeed] = useState(1);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      setReadAloudVoices(getDutchVoices());
      setSelectedReadAloudVoice(window.localStorage.getItem("jehovaapp-read-aloud-voice") ?? "");
    };

    loadVoices();
    const savedSpeed = window.localStorage.getItem("jehovaapp-read-aloud-speed");
    if (savedSpeed) setReadAloudSpeed(Number(savedSpeed));
    window.speechSynthesis.addEventListener?.("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", loadVoices);
    };
  }, []);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(setData);
  }, []);

  async function toggleSearchableByEmail() {
    if (!data) return;
    const next = !data.searchableByEmail;
    setData({ ...data, searchableByEmail: next });
    setSavingPrivacy(true);
    await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ searchableByEmail: next }),
    }).catch(() => {});
    setSavingPrivacy(false);
  }

  async function saveAccountPatch(patch: Record<string, boolean | string | number | null>) {
    await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => {});
  }

  const [savingPresence, setSavingPresence] = useState(false);

  // De routehandler zelf kan vrienden niet live laten meekrijgen van een
  // wijziging (zie de toelichting bij /api/account/route.ts) — dit signaal
  // over de al bestaande socketverbinding bereikt wél de instantie die de
  // echte Socket.io-server draait.
  function notifyPresenceSettingsChanged() {
    getSocket().emit("presence_settings_changed");
  }

  async function toggleShareOnlineStatus() {
    if (!data) return;
    const next = !data.shareOnlineStatus;
    // Activiteit delen zonder online-status delen is zinloos (je ziet
    // toch nooit de groene stip) — dus gelijk meenemen als je online-status
    // uitzet, zodat de instellingen nooit tegenstrijdig blijven staan.
    setData({ ...data, shareOnlineStatus: next, shareCurrentActivity: next ? data.shareCurrentActivity : false });
    setSavingPresence(true);
    await saveAccountPatch(next ? { shareOnlineStatus: next } : { shareOnlineStatus: next, shareCurrentActivity: false });
    setSavingPresence(false);
    notifyPresenceSettingsChanged();
  }

  async function toggleShareCurrentActivity() {
    if (!data || !data.shareOnlineStatus) return;
    const next = !data.shareCurrentActivity;
    setData({ ...data, shareCurrentActivity: next });
    setSavingPresence(true);
    await saveAccountPatch({ shareCurrentActivity: next });
    setSavingPresence(false);
    notifyPresenceSettingsChanged();
  }

  async function activateIncognito(hours: 1 | 4 | 12 | 24) {
    if (!data) return;
    setData({ ...data, incognitoActive: true });
    setSavingPresence(true);
    await saveAccountPatch({ incognitoHours: hours });
    setSavingPresence(false);
    notifyPresenceSettingsChanged();
  }

  async function deactivateIncognito() {
    if (!data) return;
    setData({ ...data, incognitoActive: false });
    setSavingPresence(true);
    await saveAccountPatch({ incognitoHours: null });
    setSavingPresence(false);
    notifyPresenceSettingsChanged();
  }

  async function toggleEmailNotifications() {
    if (!data) return;
    const next = !data.emailNotificationsEnabled;
    setData({ ...data, emailNotificationsEnabled: next });
    setSavingNotifications(true);
    await saveAccountPatch({ emailNotificationsEnabled: next });
    setSavingNotifications(false);
  }

  async function togglePushNotifications() {
    if (!data) return;
    setPushError(null);
    const next = !data.pushNotificationsEnabled;
    setSavingNotifications(true);
    try {
      if (next) {
        await enableBrowserPush();
      } else {
        await disableBrowserPush();
      }
      setData({ ...data, pushNotificationsEnabled: next });
      await saveAccountPatch({ pushNotificationsEnabled: next });
    } catch (e) {
      setPushError(e instanceof Error ? e.message : t("profile.pushToggleFailed"));
    }
    setSavingNotifications(false);
  }

  async function sendTestPush() {
    setTestingPush(true);
    setPushTestMessage(null);
    const res = await fetch("/api/push/test", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setTestingPush(false);
      setPushTestMessage(body.error ?? t("profile.testPushFailed"));
      return;
    }

    // Aftellen tot de server de melding verstuurt; sluit de app in de
    // tussentijd om ook de badge op het app-icoon te kunnen zien.
    let remaining: number = body.delaySeconds ?? 5;
    setPushCountdown(remaining);
    const timer = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setPushCountdown(remaining);
        return;
      }
      clearInterval(timer);
      setPushCountdown(null);
      setTestingPush(false);
      setPushTestMessage(
        t("profile.testPushSent")
      );
    }, 1000);
  }

  async function changeReminderTime(time: string) {
    if (!data) return;
    setData({ ...data, dailyReminderTime: time });
    await saveAccountPatch({ dailyReminderTime: time });
  }

  async function toggleCategory(
    field:
      | "notifyDailyReminder"
      | "notifyDailyText"
      | "notifySocial"
      | "notifyAchievements"
      | "notifyWordGame"
      | "notifyFriendOnline"
      | "changelogEnabled"
  ) {
    if (!data) return;
    const next = !data[field];
    setData({ ...data, [field]: next });
    setSavingNotifications(true);
    await saveAccountPatch({ [field]: next });
    setSavingNotifications(false);
  }

  function startEditingHandle() {
    if (!data) return;
    setHandleInput(data.handle);
    setHandleError(null);
    setEditingHandle(true);
  }

  async function saveHandle() {
    if (!data) return;
    setSavingHandle(true);
    setHandleError(null);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle: handleInput }),
    });
    const body = await res.json().catch(() => ({}));
    setSavingHandle(false);
    if (!res.ok) {
      setHandleError(body.error ?? t("profile.handleSaveFailed"));
      return;
    }
    // Het nummer erachter kies je niet zelf — het systeem behoudt je huidige
    // nummer waar mogelijk, of loot een nieuwe bij een botsing (zie
    // /api/account). Hier gewoon overnemen wat de server teruggeeft.
    setData({ ...data, handle: body.handle, discriminator: body.discriminator });
    setEditingHandle(false);
  }

  async function saveAvatarEmoji(emoji: string | null) {
    if (!data) return;
    setSavingAvatarEmoji(true);
    setAvatarError(null);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarEmoji: emoji }),
    });
    const body = await res.json().catch(() => ({}));
    setSavingAvatarEmoji(false);
    if (!res.ok) {
      setAvatarError(body.error ?? t("profile.emojiSaveFailed"));
      return;
    }
    setData({ ...data, avatarEmoji: emoji });
    setAvatarPickerOpen(false);
    setAvatarInput("");
  }

  function saveCustomAvatarEmoji() {
    if (!isSingleEmoji(avatarInput)) {
      setAvatarError(t("profile.oneEmoji"));
      return;
    }
    saveAvatarEmoji(avatarInput.trim());
  }

  function changeReadAloudSpeed(nextSpeed: number) {
    setReadAloudSpeed(nextSpeed);
    window.localStorage.setItem("jehovaapp-read-aloud-speed", String(nextSpeed));
  }

  function changeReadAloudVoice(voiceUri: string) {
    setSelectedReadAloudVoice(voiceUri);
    saveSelectedDutchVoice(voiceUri || null);
  }

  function testReadAloudVoice() {
    if (!("speechSynthesis" in window) || readAloudVoices.length === 0) return;

    const synth = window.speechSynthesis;

    const voice = readAloudVoices.find((item) => item.voiceURI === selectedReadAloudVoice) ?? readAloudVoices[0];
    const utterance = new SpeechSynthesisUtterance(
      t("profile.voiceSample")
    );
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = readAloudSpeed;
    utterance.onstart = () => setTestingReadAloudVoice(true);
    utterance.onend = () => setTestingReadAloudVoice(false);
    utterance.onerror = () => setTestingReadAloudVoice(false);

    setTestingReadAloudVoice(true);
    synth.speak(utterance);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  async function deleteAccount() {
    setDeleting(true);
    const res = await fetch("/api/account", { method: "DELETE" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setDeleting(false);
    }
  }

  if (!data) return <p className="text-slate-400">{t("common.loading")}</p>;

  const earnedCount = data.achievements.filter((a) => a.earnedAt).length;
  const initial = firstGrapheme(data.displayName).toUpperCase() || "?";

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8">
      {data?.isAdmin && (
        <Link href="/adminbackend" className="btn btn-primary w-full justify-center">
          {t("profile.toAdmin")}
        </Link>
      )}
      <div className="flex items-center justify-between gap-4 pr-4">
        <Link href="/feedback" className="btn-secondary">
          {t("profile.giveFeedback")}
        </Link>
        <ThemeToggle />
      </div>

      <div className="card bg-gradient-to-br from-brand-500 to-brand-700 dark:from-brand-600 dark:to-brand-900 text-white flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setAvatarError(null);
                  setAvatarInput("");
                  setAvatarPickerOpen(true);
                }}
                className="h-14 w-14 rounded-full bg-black/15 flex items-center justify-center text-2xl font-extrabold text-gold-400 hover:opacity-80"
                title={t("profile.changeAvatar")}
              >
                {data.avatarEmoji || initial}
              </button>
              {/* Wijzig-icoontje overlay, puur decoratief — de hele knop erachter is al klikbaar. */}
              <span
                className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white dark:bg-slate-700 text-[10px] flex items-center justify-center shadow"
                aria-hidden
              >
                ✏️
              </span>
            </div>
            <div>
              {!editingHandle ? (
                <>
                  <h1 className="text-xl font-extrabold flex items-center gap-1.5">
                    {data.displayName}
                    <button
                      type="button"
                      onClick={startEditingHandle}
                      className="text-sm opacity-80 hover:opacity-100"
                      title={t("profile.changeHandle")}
                      aria-label={t("profile.changeHandle")}
                    >
                      ✏️
                    </button>
                  </h1>
                  <p className="text-brand-100 text-sm">{formatTag(data.handle, data.discriminator)}</p>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 flex-wrap">
                    <input
                      className="input !w-auto !py-1 !text-sm"
                      value={handleInput}
                      onChange={(e) => setHandleInput(e.target.value)}
                      maxLength={24}
                      autoFocus
                    />
                    <span className="text-brand-100 text-sm">#{data.discriminator}</span>
                  </label>
                  {handleError && <p className="text-xs text-red-100">{handleError}</p>}
                  <div className="flex gap-2">
                    <button className="btn-primary !px-3 !py-1 !text-xs" disabled={savingHandle} onClick={saveHandle}>
                      {savingHandle ? t("courses.busy") : t("profile.save")}
                    </button>
                    <button className="btn-secondary !px-3 !py-1 !text-xs" onClick={() => setEditingHandle(false)}>
                      {t("activeGames.cancel")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {avatarPickerOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
              onClick={() => setAvatarPickerOpen(false)}
            >
              <div
                className="card !p-4 w-full max-w-xs flex flex-col gap-3 text-slate-800 dark:text-slate-100 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-sm font-bold">{t("profile.chooseAvatar")}</p>
                <div className="grid grid-cols-6 gap-1.5">
                  {AVATAR_EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="h-9 w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-xl flex items-center justify-center"
                      disabled={savingAvatarEmoji}
                      onClick={() => saveAvatarEmoji(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {/* Vaste, kleine breedte i.p.v. flex-1: er past toch maar één
                      emoji in, en een brede invoer duwde de knop tot vlak
                      tegen de afgeronde hoek van deze kaart (rounded-3xl) aan,
                      waardoor die er optisch doorheen leek te steken. */}
                  <input
                    className="input !w-16 !py-1.5 text-center text-xl"
                    placeholder="🙂"
                    value={avatarInput}
                    onChange={(e) => setAvatarInput(e.target.value)}
                    maxLength={8}
                  />
                  <button
                    className="btn-primary !px-3 !py-1.5 !text-xs shrink-0"
                    disabled={savingAvatarEmoji || !avatarInput}
                    onClick={saveCustomAvatarEmoji}
                  >
                    {t("profile.save")}
                  </button>
                </div>
                {avatarError && <p className="text-xs text-red-600 dark:text-red-400">{avatarError}</p>}
                <div className="flex items-center gap-3 border-t border-slate-100 dark:border-slate-700 pt-2">
                  {data.avatarEmoji && (
                    <button
                      className="text-xs text-red-500 hover:underline"
                      disabled={savingAvatarEmoji}
                      onClick={() => saveAvatarEmoji(null)}
                    >
                      {t("season.remove")}
                    </button>
                  )}
                  <button className="text-xs text-slate-400 hover:underline ml-auto" onClick={() => setAvatarPickerOpen(false)}>
                    {t("common.close")}
                  </button>
                </div>
              </div>
            </div>
          )}
          {data.tier && (
            <span className="text-sm font-bold bg-black/15 rounded-full px-3.5 py-1.5 text-gold-400 shrink-0">
              {TIER_ICONS[data.tier]} {tier(data.tier)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <HeroStat value={`🔥 ${data.currentStreak}`} label={t("profile.streak")} href="/streak" />
          <HeroStat value={`⭐ ${data.xpTotal}`} label="XP" href="/xp" />
          <HeroStat value={`🧊 ${data.freezeCount}`} label={t("lesson.freezes")} />
          <HeroStat value={`📖 ${data.chaptersCompleted}`} label={t("profile.chapters")} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center text-sm text-brand-100 border-t border-white/15 pt-4">
          <Stat value={data.longestStreak.toString()} label={t("profile.longestStreak")} small light />
          <Stat value={`${data.duelsWon}/${data.duelsPlayed}`} label={t("profile.duelsWon")} small light />
          <Stat value={earnedCount.toString()} label={t("profile.achievements")} small light />
        </div>
      </div>

      <CollapsibleCard title={t("nav.competition")} defaultOpen className="!bg-gold-50 dark:!bg-slate-800 !border-gold-400/30 dark:!border-slate-700">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/70 dark:bg-slate-700/70 !py-3 flex flex-col items-center gap-0.5">
            <Link href="/competition" className="block text-center hover:opacity-75">
              <div className="text-lg font-extrabold text-gold-600 dark:text-gold-400">
                {data.tier ? `${TIER_ICONS[data.tier]} ${data.groupPosition ? `#${data.groupPosition}` : "—"}` : "—"}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">{t("profile.thisWeek")}</div>
            </Link>
          </div>
          <div className="rounded-2xl bg-white/70 dark:bg-slate-700/70 !py-3 flex flex-col items-center gap-0.5">
            <div className="text-lg font-extrabold text-gold-600 dark:text-gold-400">
              {data.bestTierEver ? `${TIER_ICONS[data.bestTierEver]} ${tier(data.bestTierEver)}` : "—"}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">{t("profile.bestTier")}</div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-sm text-slate-500 dark:text-slate-400">
          <Stat value={data.lifetimePromotions.toString()} label={t("profile.promotions")} small />
          <Stat value={data.lifetimeDemotions.toString()} label={t("profile.demotions")} small />
          <Stat value={data.competitionsWon.toString()} label={t("profile.competitions")} small />
          <Stat value={data.bestNationalRank ? `#${data.bestNationalRank}` : "—"} label={t("profile.nationalRank")} small />
        </div>
      </CollapsibleCard>

      {data.seasons.length > 0 && (
        <CollapsibleCard title={t("pages.seasons")}>
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
            {data.seasons.map((s) => (
              <div key={s.seasonIndex} className="flex items-center justify-between py-2.5">
                <span className="font-bold dark:text-slate-100">{t("profile.seasonN", { n: s.seasonIndex })}</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {TIER_ICONS[s.finalTier]} {tier(s.finalTier)}
                  {s.finalGroupPosition ? ` — #${s.finalGroupPosition}` : ""}
                </span>
              </div>
            ))}
          </div>
        </CollapsibleCard>
      )}

      <CollapsibleCard
        title={t("profile.achievements")}
        extra={
          <span className="text-sm font-bold text-slate-400 dark:text-slate-500">
            {earnedCount}/{data.achievements.length}
          </span>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {data.achievements.map((a) => (
            <div
              key={a.slug}
              title={translateOr(t, `achievements.${a.slug}.description`, a.description)}
              className={`rounded-2xl border p-4 flex flex-col items-center text-center gap-1 ${
                a.earnedAt
                  ? "bg-gold-50 dark:bg-slate-700 border-gold-400/30 dark:border-slate-600"
                  : "border-slate-100 dark:border-slate-700 opacity-40 grayscale"
              }`}
            >
              <span className="text-3xl">{a.icon}</span>
              <span className="text-xs font-bold dark:text-slate-200">{translateOr(t, `achievements.${a.slug}.name`, a.name)}</span>
            </div>
          ))}
        </div>
      </CollapsibleCard>

      <CollapsibleCard title={t("profile.readingProgress")}>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("profile.readingResetText")}
        </p>
        {!resetReadingMessage ? (
          <button
            className="btn-secondary self-start !border-red-300 !text-red-600 dark:!border-red-700 dark:!text-red-400"
            disabled={resettingReadingProgress}
            onClick={async () => {
              if (
                !window.confirm(
                  t("profile.readingResetConfirm")
                )
              ) {
                return;
              }
              setResettingReadingProgress(true);
              const res = await fetch("/api/progress/reset-reading", { method: "POST" });
              setResettingReadingProgress(false);
              if (res.ok) {
                setResetReadingMessage(t("profile.readingResetDone"));
                router.refresh();
              }
            }}
          >
            {resettingReadingProgress ? t("courses.busy") : t("profile.readingReset")}
          </button>
        ) : (
          <p className="text-sm font-bold text-brand-600 dark:text-brand-300">{resetReadingMessage}</p>
        )}
      </CollapsibleCard>

      <CollapsibleCard title={t("profile.tour")}>

        <div className="flex gap-2 flex-wrap">
          <Link href="/onboarding" className="btn-secondary self-start">
            {t("profile.tourAgain")}
          </Link>
        </div>
      </CollapsibleCard>

      <LanguageSettings uiLanguage={data.uiLanguage} isAdmin={data.isAdmin} />

      <CollapsibleCard title={t("profile.readAloud")}>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("profile.readAloudText")}
        </p>

        {readAloudVoices.length > 0 ? (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold dark:text-slate-200">{t("profile.dutchVoice")}</span>
              <select
                className="input"
                value={selectedReadAloudVoice}
                onChange={(e) => changeReadAloudVoice(e.target.value)}
              >
                <option value="">{t("profile.automatic")}</option>
                {readAloudVoices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3">
                <span className="text-sm font-semibold dark:text-slate-200">{t("profile.readAloudSpeed")}</span>
                <select
                  className="input !w-auto"
                  value={readAloudSpeed}
                  onChange={(e) => changeReadAloudSpeed(Number(e.target.value))}
                >
                  {[0.75, 1, 1.25, 1.5, 2].map((value) => (
                    <option key={value} value={value}>
                      {value}×
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-3">
              <button
                className="btn-secondary !px-3 !py-1.5"
                disabled={testingReadAloudVoice}
                onClick={testReadAloudVoice}
              >
                {testingReadAloudVoice ? t("profile.samplePlaying") : t("profile.listenVoice")}
              </button>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {t("profile.savedOnDevice")}
              </span>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {t("profile.noVoices")}
          </p>
        )}
      </CollapsibleCard>

      <CollapsibleCard title={t("profile.notifications")}>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("profile.notificationsText")}
        </p>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 accent-brand-500"
            checked={data.emailNotificationsEnabled}
            onChange={toggleEmailNotifications}
            disabled={savingNotifications}
          />
          <span className="text-sm dark:text-slate-200">{t("profile.emailNotifications", { email: data.email })}</span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 accent-brand-500"
            checked={data.pushNotificationsEnabled}
            onChange={togglePushNotifications}
            disabled={savingNotifications || !isPushSupported()}
          />
          <span className="text-sm dark:text-slate-200">
            {t("profile.pushNotifications")}
            {!isPushSupported() && (
              <>
                <br />
                <span className="text-slate-400 dark:text-slate-500">{t("profile.pushUnsupported")}</span>
              </>
            )}
          </span>
        </label>
        {pushError && <p className="text-sm text-red-600 dark:text-red-400">{pushError}</p>}

        {data.pushNotificationsEnabled && (
          <div className="flex flex-col gap-1 items-start">
            <button className="btn-secondary !px-3 !py-1.5" disabled={testingPush} onClick={sendTestPush}>
              {pushCountdown !== null
                ? t("profile.pushIn", { n: pushCountdown })
                : testingPush
                  ? t("courses.busy")
                  : t("profile.sendTestPush")}
            </button>
            {pushCountdown !== null && (
              <p className="text-xs font-semibold text-brand-600 dark:text-brand-300">
                {t("profile.closeAppForBadge")}
              </p>
            )}
            {pushTestMessage && <p className="text-xs text-slate-500 dark:text-slate-400">{pushTestMessage}</p>}
          </div>
        )}

        <div className="border-t border-slate-100 dark:border-slate-700 pt-3 mt-1 flex flex-col gap-3">
          <p className="text-sm font-semibold dark:text-slate-200">{t("profile.dailyText")}</p>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-brand-500"
              checked={data.notifyDailyText}
              onChange={() => toggleCategory("notifyDailyText")}
              disabled={savingNotifications}
            />
            <span className="text-sm dark:text-slate-200">{t("profile.sendDailyText")}</span>
          </label>
          <label className="flex items-center gap-3">
            <span className="text-sm dark:text-slate-200">{t("profile.sendAround")}</span>
            <input
              type="time"
              className="input !w-auto"
              value={data.dailyTextTime}
              onChange={(e) => saveAccountPatch({ dailyTextTime: e.target.value }).then(() => setData((current) => current ? { ...current, dailyTextTime: e.target.value } : current))}
            />
          </label>
          <p className="text-xs text-slate-400 dark:text-slate-500">{t("profile.dailyTextHint")}</p>
        </div>

        <label className="flex items-center gap-3">
          <span className="text-sm dark:text-slate-200">{t("profile.reminderAround")}</span>
          <input
            type="time"
            className="input !w-auto"
            value={data.dailyReminderTime}
            onChange={(e) => changeReminderTime(e.target.value)}
          />
        </label>

        <div className="border-t border-slate-100 dark:border-slate-700 pt-3 mt-1 flex flex-col gap-2">
          <p className="text-sm font-semibold dark:text-slate-200">{t("profile.whichNotifications")}</p>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-brand-500"
              checked={data.notifyDailyReminder}
              onChange={() => toggleCategory("notifyDailyReminder")}
              disabled={savingNotifications}
            />
            <span className="text-sm dark:text-slate-200">{t("profile.notifyReminder")}</span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-brand-500"
              checked={data.notifySocial}
              onChange={() => toggleCategory("notifySocial")}
              disabled={savingNotifications}
            />
            <span className="text-sm dark:text-slate-200">
              {t("profile.notifySocial")}
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-brand-500"
              checked={data.notifyAchievements}
              onChange={() => toggleCategory("notifyAchievements")}
              disabled={savingNotifications}
            />
            <span className="text-sm dark:text-slate-200">{t("profile.notifyAchievements")}</span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-brand-500"
              checked={data.notifyWordGame}
              onChange={() => toggleCategory("notifyWordGame")}
              disabled={savingNotifications}
            />
            <span className="text-sm dark:text-slate-200">{t("profile.notifyWordGame")}</span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-brand-500"
              checked={data.notifyFriendOnline}
              onChange={() => toggleCategory("notifyFriendOnline")}
              disabled={savingNotifications}
            />
            <span className="text-sm dark:text-slate-200">
              {t("profile.notifyFriendOnline")}
            </span>
          </label>
        </div>
      </CollapsibleCard>

      <ChangelogSection
        enabled={data.changelogEnabled}
        saving={savingNotifications}
        onToggle={() => toggleCategory("changelogEnabled")}
      />

      <CollapsibleCard title={t("profile.privacy")}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 accent-brand-500"
            checked={data.searchableByEmail}
            onChange={toggleSearchableByEmail}
            disabled={savingPrivacy}
          />
          <span className="text-sm dark:text-slate-200">
            {t("profile.searchableByEmail", { email: data.email })}
            <br />
            <span className="text-slate-400 dark:text-slate-500">
              {t("profile.searchableHint", { tag: formatTag(data.handle, data.discriminator) })}
            </span>
          </span>
        </label>
      </CollapsibleCard>

      <CollapsibleCard title={t("profile.onlineActivity")}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 accent-brand-500"
            checked={data.shareOnlineStatus}
            onChange={toggleShareOnlineStatus}
            disabled={savingPresence}
          />
          <span className="text-sm dark:text-slate-200">
            {t("profile.shareOnline")}
            <br />
            <span className="text-slate-400 dark:text-slate-500">
              {t("profile.shareOnlineHint")}
            </span>
          </span>
        </label>

        {data.shareOnlineStatus && (
          <label className="flex items-start gap-3 cursor-pointer pl-8">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-brand-500"
              checked={data.shareCurrentActivity}
              onChange={toggleShareCurrentActivity}
              disabled={savingPresence}
            />
            <span className="text-sm dark:text-slate-200">
              {t("profile.shareActivity")}
            </span>
          </label>
        )}

        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-2">
          <p className="text-sm dark:text-slate-200">{t("profile.incognito")}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {t("profile.incognitoHint")}
          </p>
          {data.incognitoActive ? (
            <button className="btn-secondary self-start !px-4 !py-2" onClick={deactivateIncognito} disabled={savingPresence}>
              {t("profile.incognitoOff")}
            </button>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {([1, 4, 12, 24] as const).map((hours) => (
                <button
                  key={hours}
                  className="btn-secondary !px-3 !py-1.5 !text-xs"
                  onClick={() => activateIncognito(hours)}
                  disabled={savingPresence}
                >
                  {t("profile.hoursN", { n: hours })}
                </button>
              ))}
            </div>
          )}
        </div>
      </CollapsibleCard>

      <CollapsibleCard title={t("profile.deleteAccount")}>
        {!confirmingDelete ? (
          <button className="btn-secondary self-start !text-red-500 !border-red-200" onClick={() => setConfirmingDelete(true)}>
            {t("profile.deleteAccount")}
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-red-600 dark:text-red-400">
              {t("profile.deleteWarning")}
            </p>
            <div className="flex gap-2">
              <button className="btn-primary !bg-red-500 !shadow-[0_4px_0_0_theme(colors.red.700)]" disabled={deleting} onClick={deleteAccount}>
                {deleting ? t("courses.busy") : t("profile.deleteConfirm")}
              </button>
              <button className="btn-secondary" onClick={() => setConfirmingDelete(false)}>
                {t("activeGames.cancel")}
              </button>
            </div>
          </div>
        )}
      </CollapsibleCard>

      <CollapsibleCard title={t("profile.account")} defaultOpen>

        <div>
          <h3 className="font-extrabold text-base dark:text-slate-100 mb-2">{t("profile.twoFactor")}</h3>
          <TwoFactorSettings isAdmin={data.isAdmin} />
        </div>

        <div className="border-t border-slate-100 dark:border-slate-700 pt-4 mt-1">
          <Link href="/change-password" className="btn-secondary self-start">
            {t("profile.changePassword")}
          </Link>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-700 pt-4 mt-1">
          {!confirmingLogout ? (
            <button className="btn-secondary self-start" onClick={() => setConfirmingLogout(true)}>
              {t("profile.logout")}
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm dark:text-slate-200">{t("profile.logoutConfirm")}</p>
              <div className="flex gap-2 flex-wrap">
                <button className="btn-primary self-start" onClick={logout}>
                  {t("profile.logoutYes")}
                </button>
                <button className="btn-secondary self-start" onClick={() => setConfirmingLogout(false)}>
                  {t("activeGames.cancel")}
                </button>
              </div>
            </div>
          )}
        </div>
      </CollapsibleCard>
    </div>
  );
}

interface ChangelogEntryView {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

// Inklapbaar (kan een lange geschiedenis worden) en dubbel doel: de aan/uit-
// schakelaar staat er samen met de volledige lijst in, zodat je 'm ook kan
// terugvinden als je 'm hebt uitgezet. De lijst wordt pas opgehaald zodra dit
// echt wordt opengeklapt (geen extra verzoek bij elk profielbezoek); dat
// openklappen markeert de changelog meteen als gezien, net als de "Gelezen"-
// knop in de pop-up (ChangelogPopup.tsx) dat doet.
function ChangelogSection({ enabled, saving, onToggle }: { enabled: boolean; saving: boolean; onToggle: () => void }) {
  const [entries, setEntries] = useState<ChangelogEntryView[] | null>(null);
  const t = useT();
  const intlLocale = getLanguage(useUiLanguage()).intlLocale;

  async function handleToggleOpen(e: SyntheticEvent<HTMLDetailsElement>) {
    if (!e.currentTarget.open || entries) return;
    const res = await fetch("/api/changelog");
    if (res.ok) setEntries((await res.json()).entries);
    fetch("/api/changelog/seen", { method: "POST" }).catch(() => {});
  }

  return (
    <details className="group card flex flex-col gap-3" onToggle={handleToggleOpen}>
      <summary className="font-extrabold text-lg dark:text-slate-100 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden flex items-center justify-between">
        {t("profile.whatsNew")}
        <span className="text-slate-400 transition-transform group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>

      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" className="mt-1 h-5 w-5 accent-brand-500" checked={enabled} onChange={onToggle} disabled={saving} />
        <span className="text-sm dark:text-slate-200">
          {t("profile.changelogToggle")}
          <br />
          <span className="text-slate-400 dark:text-slate-500">
            {t("profile.changelogHint")}
          </span>
        </span>
      </label>

      <div className="border-t border-slate-100 dark:border-slate-700 pt-3 flex flex-col gap-3">
        {!entries ? (
          <p className="text-slate-400 dark:text-slate-500 text-sm">{t("common.loading")}</p>
        ) : entries.length === 0 ? (
          <p className="text-slate-400 dark:text-slate-500 text-sm">{t("profile.noChangelog")}</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id}>
              <p className="font-bold text-sm dark:text-slate-100">{entry.title}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">
                {new Date(entry.createdAt).toLocaleDateString(intlLocale)}
              </p>
              <p className="text-sm whitespace-pre-wrap dark:text-slate-200">{entry.body}</p>
            </div>
          ))
        )}
      </div>
    </details>
  );
}

function Stat({
  value,
  label,
  small,
  href,
  light,
}: {
  value: string;
  label: string;
  small?: boolean;
  href?: string;
  light?: boolean;
}) {
  const content = (
    <>
      <div className={`${small ? "font-extrabold" : "text-xl font-extrabold"} ${light ? "text-white" : "dark:text-slate-100"}`}>
        {value}
      </div>
      <div className={`text-xs font-bold uppercase ${light ? "text-brand-100" : "text-slate-400 dark:text-slate-500"}`}>
        {label}
      </div>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="block hover:opacity-75">
        {content}
      </Link>
    );
  }
  return <div>{content}</div>;
}

// Pil-vormige variant voor de statsrij in de gradient-hero — zelfde
// waarde/label-inhoud als Stat, maar met een eigen donkere achtergrond zodat
// de tegels zichtbaar blijven op de blauwe hero i.p.v. enkel platte tekst.
function HeroStat({ value, label, href }: { value: string; label: string; href?: string }) {
  const content = (
    <div className="rounded-2xl bg-black/15 py-2.5 flex flex-col items-center gap-0.5 hover:bg-black/25 transition-colors">
      <div className="font-extrabold text-white">{value}</div>
      <div className="text-[10px] text-brand-100 font-bold uppercase">{label}</div>
    </div>
  );
  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
