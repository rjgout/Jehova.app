"use client";

import { useEffect, useState, type ReactNode, type SyntheticEvent } from "react";
import Link from "next/link";
import LanguageSettings from "@/components/LanguageSettings";
import { useRouter, useSearchParams } from "next/navigation";
import type { LeagueTier } from "@prisma/client";
import { TIER_ICONS } from "@/lib/leagues";
import { formatTag, firstGrapheme, isSingleEmoji } from "@/lib/handle";
import { enableBrowserPush, disableBrowserPush, isPushSupported } from "@/lib/pushClient";
import { getSocket } from "@/lib/socketClient";
import ThemePreference from "@/components/ThemePreference";
import TwoFactorSettings from "@/components/TwoFactorSettings";
import { getDutchVoices, saveSelectedDutchVoice } from "@/lib/readAloud";
import { useT, useUiLanguage } from "@/components/I18nProvider";
import { useConfirm } from "@/components/ConfirmProvider";
import { getLanguage } from "@/lib/languages";
import { translateOr } from "@/lib/i18n/core";
import AppSelect from "@/components/AppSelect";
import SystemIcon from "@/components/versado/SystemIcon";
import { parseProfileView, profileViewHref, PROFILE_VIEWS, type ProfileView } from "@/lib/profileViews";
import {
  Bell,
  BookOpen,
  ChevronRight,
  Globe2,
  KeyRound,
  LockKeyhole,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  SunMoon,
  Trash2,
  Trophy,
  Users,
  Volume2,
  Snowflake,
} from "lucide-react";

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
  totpEnabled: boolean;
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
  const confirm = useConfirm();
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
  // Elk onderdeel heeft een eigen adres (zie src/lib/profileViews.ts); de
  // kop met terugpijl staat in de terugbalk (SubpageBackBar).
  const view = parseProfileView(useSearchParams().get("view"));

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

  const avatarPicker = avatarPickerOpen ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setAvatarPickerOpen(false)}>
      <div className="card flex w-full max-w-xs flex-col gap-3 !p-4 text-slate-800 shadow-xl dark:text-slate-100" onClick={(event) => event.stopPropagation()}>
        <p className="text-sm font-bold">{t("profile.chooseAvatar")}</p>
        <div className="grid grid-cols-6 gap-1.5">
          {AVATAR_EMOJI_OPTIONS.map((emoji) => (
            <button key={emoji} type="button" className="flex h-9 w-9 items-center justify-center rounded-lg text-xl hover:bg-slate-100 dark:hover:bg-slate-700" disabled={savingAvatarEmoji} onClick={() => saveAvatarEmoji(emoji)}>{emoji}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input className="input !w-16 text-center text-xl" placeholder="🙂" value={avatarInput} onChange={(event) => setAvatarInput(event.target.value)} maxLength={8} />
          <button className="btn-primary shrink-0 !px-3 !py-1.5 !text-xs" disabled={savingAvatarEmoji || !avatarInput} onClick={saveCustomAvatarEmoji}>{t("profile.save")}</button>
        </div>
        {avatarError && <p className="text-xs text-red-600 dark:text-red-400">{avatarError}</p>}
        <div className="flex items-center gap-3 border-t border-slate-100 pt-2 dark:border-slate-700">
          {data.avatarEmoji && <button className="text-xs text-red-500 hover:underline" disabled={savingAvatarEmoji} onClick={() => saveAvatarEmoji(null)}>{t("season.remove")}</button>}
          <button className="ml-auto text-xs text-slate-400 hover:underline" onClick={() => setAvatarPickerOpen(false)}>{t("common.close")}</button>
        </div>
      </div>
    </div>
  ) : null;

  // Een gewone pushState in plaats van router.push: Next.js houdt dan
  // useSearchParams bij zonder de pagina opnieuw te laden, zodat het
  // overzicht bij terug meteen (en op dezelfde hoogte) weer klaarstaat.
  function openView(next: ProfileView) {
    window.history.pushState(null, "", profileViewHref(next));
  }

  if (view) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <h1 className="sr-only">{t(PROFILE_VIEWS[view].title)}</h1>
        {view === "competition" && <CompetitionDetail data={data} tier={tier} t={t} />}
        {view === "achievements" && <AchievementDetail data={data} earnedCount={earnedCount} t={t} />}
        {view === "reading" && <ReadingDetail t={t} resetting={resettingReadingProgress} message={resetReadingMessage} onReset={async () => {
          if (!(await confirm(t("profile.readingResetConfirm")))) return;
          setResettingReadingProgress(true);
          const response = await fetch("/api/progress/reset-reading", { method: "POST" });
          setResettingReadingProgress(false);
          if (response.ok) { setResetReadingMessage(t("profile.readingResetDone")); router.refresh(); }
        }} />}
        {view === "language" && <LanguageSettings uiLanguage={data.uiLanguage} isAdmin={data.isAdmin} />}
        {view === "readAloud" && <ReadAloudDetail t={t} voices={readAloudVoices} selectedVoice={selectedReadAloudVoice} speed={readAloudSpeed} testing={testingReadAloudVoice} onVoice={changeReadAloudVoice} onSpeed={changeReadAloudSpeed} onTest={testReadAloudVoice} />}
        {view === "notifications" && <NotificationDetail data={data} t={t} saving={savingNotifications} pushError={pushError} testingPush={testingPush} pushCountdown={pushCountdown} pushTestMessage={pushTestMessage} onEmail={toggleEmailNotifications} onPush={togglePushNotifications} onTest={sendTestPush} onCategory={toggleCategory} onReminder={changeReminderTime} onDailyText={(time) => saveAccountPatch({ dailyTextTime: time }).then(() => setData((current) => current ? { ...current, dailyTextTime: time } : current))} />}
        {view === "privacy" && <PrivacyDetail data={data} t={t} saving={savingPrivacy} onToggle={toggleSearchableByEmail} />}
        {view === "presence" && <PresenceDetail data={data} t={t} saving={savingPresence} onOnline={toggleShareOnlineStatus} onActivity={toggleShareCurrentActivity} onIncognito={activateIncognito} onIncognitoOff={deactivateIncognito} />}
        {view === "about" && <AboutDetail data={data} t={t} saving={savingNotifications} onToggle={() => toggleCategory("changelogEnabled")} />}
        {view === "twoFactor" && <section className="bg-vs-surface rounded-2xl border border-vs-line p-4 sm:p-6"><TwoFactorSettings isAdmin={data.isAdmin} /></section>}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      {data.isAdmin && <Link href="/adminbackend" className="flex items-center gap-2 rounded-xl border border-vs-line bg-vs-surface px-4 py-3 text-sm font-bold text-vs-accent transition hover:bg-vs-subtle"><ShieldCheck className="h-5 w-5" aria-hidden />{t("profile.toAdmin")}</Link>}

      <section className="overflow-hidden rounded-3xl border border-vs-line bg-gradient-to-br from-brand-500 to-brand-700 p-4 text-white shadow-sm dark:from-brand-600 dark:to-brand-900 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => { setAvatarError(null); setAvatarInput(""); setAvatarPickerOpen(true); }} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-black/15 text-2xl font-extrabold text-gold-400 hover:opacity-80" title={t("profile.changeAvatar")}>{data.avatarEmoji || initial}</button>
            <div className="min-w-0">
              {!editingHandle ? <>
                <h1 className="flex min-w-0 items-center gap-1.5 text-xl font-extrabold"><span className="truncate">{data.displayName}</span><button type="button" onClick={startEditingHandle} className="shrink-0 opacity-80 hover:opacity-100" title={t("profile.changeHandle")} aria-label={t("profile.changeHandle")}><Pencil className="h-4 w-4" aria-hidden /></button></h1>
                <p className="truncate text-sm text-brand-100">{formatTag(data.handle, data.discriminator)}</p>
              </> : <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2"><input className="input !w-auto !py-1 !text-sm" value={handleInput} onChange={(event) => setHandleInput(event.target.value)} maxLength={24} autoFocus /><span className="text-sm text-brand-100">#{data.discriminator}</span></label>
                {handleError && <p className="text-xs text-red-100">{handleError}</p>}
                <div className="flex gap-2"><button className="btn-primary !px-3 !py-1 !text-xs" disabled={savingHandle} onClick={saveHandle}>{savingHandle ? t("courses.busy") : t("profile.save")}</button><button className="btn-secondary !px-3 !py-1 !text-xs" onClick={() => setEditingHandle(false)}>{t("activeGames.cancel")}</button></div>
              </div>}
            </div>
          </div>
          {data.tier && <span className="shrink-0 rounded-full bg-black/15 px-3 py-1.5 text-sm font-bold text-gold-400">{TIER_ICONS[data.tier]} {tier(data.tier)}</span>}
        </div>
        <div className="mt-5 grid grid-cols-4 divide-x divide-white/15 rounded-2xl bg-black/10 py-2">
          <CompactHeroStat value={<><SystemIcon kind="streak" className="h-4 w-4" fill="currentColor" aria-hidden /> {data.currentStreak}</>} label={t("profile.streak")} href="/streak" />
          <CompactHeroStat value={<><SystemIcon kind="xp" className="h-4 w-4" fill="currentColor" aria-hidden /> {data.xpTotal}</>} label="XP" href="/xp" />
          <CompactHeroStat value={<><Snowflake className="h-4 w-4" aria-hidden /> {data.freezeCount}</>} label={t("lesson.freezes")} />
          <CompactHeroStat value={<><BookOpen className="h-4 w-4" aria-hidden /> {data.chaptersCompleted}</>} label={t("profile.chapters")} />
        </div>
      </section>
      {avatarPicker}

      {/* Acties direct onder de statistieken. Dit is de enige ingang naar
          de winkel; feedback staat er bewust naast. */}
      <div className="grid grid-cols-2 gap-3">
        <ProfileAction icon={<ShoppingBag className="h-5 w-5 text-vs-xp" aria-hidden />} label={t("nav.shop")} href="/shop" />
        <ProfileAction icon={<MessageSquare className="h-5 w-5 text-vs-accent" aria-hidden />} label={t("pages.feedback")} href="/feedback" />
      </div>

      <section className="bg-vs-surface rounded-2xl border border-vs-line p-4 sm:p-5">
        <SectionHeading icon={<Trophy className="h-5 w-5 text-vs-xp" aria-hidden />} title={t("nav.competition")} />
        {/* Smal scherm: beste divisie onder de huidige, anders breekt de
            huidige divisie af in losse woorden. */}
        <button type="button" onClick={() => openView("competition")} className="mt-3 flex min-h-12 w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-vs-subtle">
          <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <span className="min-w-0"><span className="block font-bold text-vs-fg">{data.tier ? `${TIER_ICONS[data.tier]} ${tier(data.tier)}` : "—"}</span><span className="block text-sm text-vs-fg-2">{data.groupPosition ? `#${data.groupPosition} · ` : ""}{t("profile.thisWeek")}</span></span>
            <span className="text-sm font-bold text-vs-fg-2">{data.bestTierEver ? `${t("profile.bestTier")}: ${tier(data.bestTierEver)}` : "—"}</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-vs-fg-2" aria-hidden />
        </button>
      </section>

      <ProfileSection title={t("profile.progressSection")}>
        <ProfileRow icon={<Trophy className="h-5 w-5 text-vs-xp" aria-hidden />} label={t("profile.achievements")} value={`${earnedCount}/${data.achievements.length}`} onClick={() => openView("achievements")} />
        <ProfileRow icon={<BookOpen className="h-5 w-5 text-vs-accent" aria-hidden />} label={t("profile.readingProgress")} value={`${data.chaptersCompleted} ${t("profile.chapters").toLowerCase()}`} onClick={() => openView("reading")} />
      </ProfileSection>

      <ProfileSection title={t("profile.preferencesSection")}>
        {/* Weergave direct hier te kiezen: één tik, en je ziet meteen wat aan staat. */}
        <div className="flex flex-col gap-2 px-2 py-3 sm:flex-row sm:items-center sm:gap-3">
          <span className="flex min-w-0 flex-1 items-center gap-3"><SunMoon className="h-5 w-5 shrink-0 text-vs-accent" aria-hidden /><span className="truncate font-bold text-vs-fg">{t("theme.appearance")}</span></span>
          <div className="sm:w-80"><ThemePreference /></div>
        </div>
        <ProfileRow icon={<Globe2 className="h-5 w-5 text-vs-accent" aria-hidden />} label={t("languageSettings.title")} value={getLanguage(data.uiLanguage).nativeName} onClick={() => openView("language")} />
        <ProfileRow icon={<Volume2 className="h-5 w-5 text-vs-accent" aria-hidden />} label={t("profile.readAloud")} onClick={() => openView("readAloud")} />
        <ProfileRow icon={<Bell className="h-5 w-5 text-vs-accent" aria-hidden />} label={t("profile.notifications")} onClick={() => openView("notifications")} />
        <ProfileRow icon={<Users className="h-5 w-5 text-vs-accent" aria-hidden />} label={t("profile.onlineActivity")} value={data.shareOnlineStatus ? t("twoFactor.on") : t("twoFactor.off")} onClick={() => openView("presence")} />
        <ProfileRow icon={<LockKeyhole className="h-5 w-5 text-vs-accent" aria-hidden />} label={t("profile.privacy")} onClick={() => openView("privacy")} />
      </ProfileSection>

      <ProfileSection title={t("profile.aboutSection")}>
        <ProfileRow icon={<Sparkles className="h-5 w-5 text-vs-xp" aria-hidden />} label={t("profile.whatsNew")} onClick={() => openView("about")} />
        <ProfileRow icon={<MoreHorizontal className="h-5 w-5 text-vs-fg-2" aria-hidden />} label={t("profile.tour")} href="/onboarding" />
      </ProfileSection>

      <ProfileSection title={t("profile.accountSecuritySection")}>
        <ProfileRow icon={<ShieldCheck className="h-5 w-5 text-vs-accent" aria-hidden />} label={t("profile.twoFactor")} value={data.totpEnabled ? t("twoFactor.on") : t("twoFactor.off")} onClick={() => openView("twoFactor")} />
        <ProfileRow icon={<KeyRound className="h-5 w-5 text-vs-fg-2" aria-hidden />} label={t("profile.changePassword")} href="/change-password" />
        {!confirmingLogout ? <ProfileRow icon={<LogOut className="h-5 w-5 text-vs-fg-2" aria-hidden />} label={t("profile.logout")} onClick={() => setConfirmingLogout(true)} /> : <div className="rounded-xl bg-vs-subtle p-3"><p className="text-sm text-vs-fg">{t("profile.logoutConfirm")}</p><div className="mt-2 flex gap-2"><button className="btn-primary !py-2 !text-sm" onClick={logout}>{t("profile.logoutYes")}</button><button className="btn-secondary !py-2 !text-sm" onClick={() => setConfirmingLogout(false)}>{t("activeGames.cancel")}</button></div></div>}
      </ProfileSection>

      {/* Bewust geen gewone rij: verwijderen hoort niet tussen de dagelijkse
          instellingen te concurreren. */}
      {!confirmingDelete ? (
        <button type="button" onClick={() => setConfirmingDelete(true)} className="inline-flex min-h-11 items-center gap-2 self-center rounded-xl px-3 text-sm font-bold text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:text-red-400 dark:hover:bg-red-950/30"><Trash2 className="h-4 w-4" aria-hidden />{t("profile.deleteAccount")}</button>
      ) : (
        <div className="rounded-2xl border border-red-300/50 bg-red-50 p-4 dark:bg-red-950/30"><p className="text-sm text-red-700 dark:text-red-300">{t("profile.deleteWarning")}</p><div className="mt-3 flex gap-2"><button className="btn-primary !bg-red-500 !shadow-[0_4px_0_0_theme(colors.red.700)] !py-2 !text-sm" disabled={deleting} onClick={deleteAccount}>{deleting ? t("courses.busy") : t("profile.deleteConfirm")}</button><button className="btn-secondary !py-2 !text-sm" onClick={() => setConfirmingDelete(false)}>{t("activeGames.cancel")}</button></div></div>
      )}
    </div>
  );
}


type Translate = ReturnType<typeof useT>;

function SectionHeading({ icon, title }: { icon: ReactNode; title: string }) {
  return <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-vs-fg-2">{icon}{title}</h2>;
}

function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="bg-vs-surface rounded-2xl border border-vs-line p-4 sm:p-5"><h2 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-vs-fg-2">{title}</h2><div className="divide-y divide-vs-line">{children}</div></section>;
}

function ProfileRow({ icon, label, value, href, onClick, destructive = false }: { icon: ReactNode; label: string; value?: string; href?: string; onClick?: () => void; destructive?: boolean }) {
  const className = `flex min-h-14 w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-vs-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vs-accent ${destructive ? "text-red-600 dark:text-red-400" : "text-vs-fg"}`;
  const content = <><span className="shrink-0">{icon}</span><span className="min-w-0 flex-1 truncate font-bold">{label}</span>{value && <span className="max-w-[45%] truncate text-sm text-vs-fg-2">{value}</span>}<ChevronRight className="h-5 w-5 shrink-0 text-vs-fg-3" aria-hidden /></>;
  if (href) return <Link href={href} className={className}>{content}</Link>;
  return <button type="button" onClick={onClick} className={className}>{content}</button>;
}

function ProfileAction({ icon, label, href }: { icon: ReactNode; label: string; href: string }) {
  return <Link href={href} className="bg-vs-surface flex min-h-14 min-w-0 items-center justify-center gap-2 rounded-2xl border border-vs-line px-3 font-bold text-vs-fg transition hover:bg-vs-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vs-accent"><span className="shrink-0">{icon}</span><span className="min-w-0 truncate">{label}</span></Link>;
}

function CompactHeroStat({ value, label, href }: { value: ReactNode; label: string; href?: string }) {
  const content = <div className="flex flex-col items-center gap-0.5 px-1 text-center"><div className="flex items-center gap-1 text-sm font-extrabold text-white">{value}</div><div className="text-[10px] font-bold uppercase text-brand-100">{label}</div></div>;
  return href ? <Link href={href}>{content}</Link> : content;
}

function CompetitionDetail({ data, tier, t }: { data: ProfileData; tier: (value: LeagueTier) => string; t: Translate }) {
  return <div className="flex flex-col gap-4">
    <section className="rounded-2xl border border-gold-400/30 bg-gold-50 p-4 dark:bg-slate-800"><div className="grid grid-cols-2 gap-3"><div><p className="text-2xl font-extrabold text-gold-700 dark:text-gold-300">{data.tier ? `${TIER_ICONS[data.tier]} ${tier(data.tier)}` : "—"}</p><p className="text-xs font-bold uppercase text-vs-fg-2">{data.groupPosition ? `#${data.groupPosition} · ` : ""}{t("profile.thisWeek")}</p></div><div className="text-right"><p className="text-lg font-extrabold text-gold-700 dark:text-gold-300">{data.bestTierEver ? `${TIER_ICONS[data.bestTierEver]} ${tier(data.bestTierEver)}` : "—"}</p><p className="text-xs font-bold uppercase text-vs-fg-2">{t("profile.bestTier")}</p></div></div></section>
    <section className="bg-vs-surface rounded-2xl border border-vs-line p-4"><div className="grid grid-cols-4 gap-2 text-center"><Stat value={data.lifetimePromotions.toString()} label={t("profile.promotions")} small /><Stat value={data.lifetimeDemotions.toString()} label={t("profile.demotions")} small /><Stat value={data.competitionsWon.toString()} label={t("profile.competitions")} small /><Stat value={data.bestNationalRank ? `#${data.bestNationalRank}` : "—"} label={t("profile.nationalRank")} small /></div></section>
    {data.seasons.length > 0 && <section className="bg-vs-surface rounded-2xl border border-vs-line p-4"><h2 className="mb-2 font-extrabold text-vs-fg">{t("pages.seasons")}</h2><div className="divide-y divide-vs-line">{data.seasons.map((season) => <div key={season.seasonIndex} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span className="font-bold text-vs-fg">{t("profile.seasonN", { n: season.seasonIndex })}</span><span className="text-right text-vs-fg-2">{TIER_ICONS[season.finalTier]} {tier(season.finalTier)}{season.finalGroupPosition ? ` — #${season.finalGroupPosition}` : ""}</span></div>)}</div></section>}
  </div>;
}

function AchievementDetail({ data, earnedCount, t }: { data: ProfileData; earnedCount: number; t: Translate }) {
  return <section className="bg-vs-surface rounded-2xl border border-vs-line p-4 sm:p-6"><p className="mb-4 text-sm text-vs-fg-2">{earnedCount}/{data.achievements.length}</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{data.achievements.map((achievement) => <div key={achievement.slug} title={translateOr(t, `achievements.${achievement.slug}.description`, achievement.description)} className={`flex flex-col items-center gap-1 rounded-2xl border p-4 text-center ${achievement.earnedAt ? "border-gold-400/30 bg-gold-50 dark:bg-slate-700" : "border-vs-line opacity-40 grayscale"}`}><span className="text-3xl">{achievement.icon}</span><span className="text-xs font-bold text-vs-fg">{translateOr(t, `achievements.${achievement.slug}.name`, achievement.name)}</span></div>)}</div></section>;
}

function ReadingDetail({ t, resetting, message, onReset }: { t: Translate; resetting: boolean; message: string | null; onReset: () => Promise<void> }) {
  return <section className="bg-vs-surface rounded-2xl border border-vs-line p-4 sm:p-6"><p className="text-sm text-vs-fg-2">{t("profile.readingResetText")}</p>{!message ? <button className="btn-secondary mt-4 self-start !border-red-300 !text-red-600 dark:!border-red-700 dark:!text-red-400" disabled={resetting} onClick={onReset}>{resetting ? t("courses.busy") : t("profile.readingReset")}</button> : <p className="mt-4 text-sm font-bold text-vs-accent">{message}</p>}</section>;
}

function ReadAloudDetail({ t, voices, selectedVoice, speed, testing, onVoice, onSpeed, onTest }: { t: Translate; voices: SpeechSynthesisVoice[]; selectedVoice: string; speed: number; testing: boolean; onVoice: (value: string) => void; onSpeed: (value: number) => void; onTest: () => void }) {
  return <section className="bg-vs-surface flex flex-col gap-5 rounded-2xl border border-vs-line p-4 sm:p-6"><p className="text-sm text-vs-fg-2">{t("profile.readAloudText")}</p>{voices.length > 0 ? <><label className="flex flex-col gap-1.5"><span className="text-sm font-semibold text-vs-fg">{t("profile.dutchVoice")}</span><AppSelect className="input" value={selectedVoice} onChange={onVoice} ariaLabel={t("profile.dutchVoice")} options={[{ value: "", label: t("profile.automatic") }, ...voices.map((voice) => ({ value: voice.voiceURI, label: voice.name }))]} /></label><div className="flex flex-col gap-3"><label className="flex items-center gap-3"><span className="text-sm font-semibold text-vs-fg">{t("profile.readAloudSpeed")}</span><AppSelect className="input !w-auto" value={String(speed)} onChange={(value) => onSpeed(Number(value))} ariaLabel={t("profile.readAloudSpeed")} options={[0.75, 1, 1.25, 1.5, 2].map((value) => ({ value: String(value), label: `${value}×` }))} /></label><div className="flex flex-wrap items-center gap-3"><button className="btn-secondary !px-3 !py-1.5" disabled={testing} onClick={onTest}>{testing ? t("profile.samplePlaying") : t("profile.listenVoice")}</button><span className="text-xs text-vs-fg-3">{t("profile.savedOnDevice")}</span></div></div></> : <p className="text-sm text-vs-fg-3">{t("profile.noVoices")}</p>}</section>;
}

type NotificationCategory = "notifyDailyReminder" | "notifyDailyText" | "notifySocial" | "notifyAchievements" | "notifyWordGame" | "notifyFriendOnline" | "changelogEnabled";
function NotificationDetail({ data, t, saving, pushError, testingPush, pushCountdown, pushTestMessage, onEmail, onPush, onTest, onCategory, onReminder, onDailyText }: { data: ProfileData; t: Translate; saving: boolean; pushError: string | null; testingPush: boolean; pushCountdown: number | null; pushTestMessage: string | null; onEmail: () => void; onPush: () => void; onTest: () => void; onCategory: (field: NotificationCategory) => void; onReminder: (value: string) => void; onDailyText: (value: string) => void }) {
  const check = (field: NotificationCategory, label: string, checked: boolean) => <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5 accent-brand-500" checked={checked} onChange={() => onCategory(field)} disabled={saving} /><span className="text-sm text-vs-fg">{label}</span></label>;
  return <section className="bg-vs-surface flex flex-col gap-4 rounded-2xl border border-vs-line p-4 sm:p-6"><p className="text-sm text-vs-fg-2">{t("profile.notificationsText")}</p><label className="flex items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5 accent-brand-500" checked={data.emailNotificationsEnabled} onChange={onEmail} disabled={saving} /><span className="text-sm text-vs-fg">{t("profile.emailNotifications", { email: data.email })}</span></label><label className="flex items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5 accent-brand-500" checked={data.pushNotificationsEnabled} onChange={onPush} disabled={saving || !isPushSupported()} /><span className="text-sm text-vs-fg">{t("profile.pushNotifications")}{!isPushSupported() && <><br /><span className="text-vs-fg-3">{t("profile.pushUnsupported")}</span></>}</span></label>{pushError && <p className="text-sm text-red-600 dark:text-red-400">{pushError}</p>}{data.pushNotificationsEnabled && <div className="flex flex-col items-start gap-1"><button className="btn-secondary !px-3 !py-1.5" disabled={testingPush} onClick={onTest}>{pushCountdown !== null ? t("profile.pushIn", { n: pushCountdown }) : testingPush ? t("courses.busy") : t("profile.sendTestPush")}</button>{pushTestMessage && <p className="text-xs text-vs-fg-2">{pushTestMessage}</p>}</div>}<div className="mt-1 flex flex-col gap-3 border-t border-vs-line pt-4"><p className="font-semibold text-vs-fg">{t("profile.dailyText")}</p>{check("notifyDailyText", t("profile.sendDailyText"), data.notifyDailyText)}<label className="flex items-center gap-3 text-sm text-vs-fg">{t("profile.sendAround")}<input type="time" className="input !w-auto" value={data.dailyTextTime} onChange={(event) => onDailyText(event.target.value)} /></label><p className="text-xs text-vs-fg-3">{t("profile.dailyTextHint")}</p></div><label className="flex items-center gap-3 text-sm text-vs-fg">{t("profile.reminderAround")}<input type="time" className="input !w-auto" value={data.dailyReminderTime} onChange={(event) => onReminder(event.target.value)} /></label><div className="mt-1 flex flex-col gap-3 border-t border-vs-line pt-4"><p className="font-semibold text-vs-fg">{t("profile.whichNotifications")}</p>{check("notifyDailyReminder", t("profile.notifyReminder"), data.notifyDailyReminder)}{check("notifySocial", t("profile.notifySocial"), data.notifySocial)}{check("notifyAchievements", t("profile.notifyAchievements"), data.notifyAchievements)}{check("notifyWordGame", t("profile.notifyWordGame"), data.notifyWordGame)}{check("notifyFriendOnline", t("profile.notifyFriendOnline"), data.notifyFriendOnline)}</div></section>;
}

function PrivacyDetail({ data, t, saving, onToggle }: { data: ProfileData; t: Translate; saving: boolean; onToggle: () => void }) {
  return <section className="bg-vs-surface rounded-2xl border border-vs-line p-4 sm:p-6"><label className="flex items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5 accent-brand-500" checked={data.searchableByEmail} onChange={onToggle} disabled={saving} /><span className="text-sm text-vs-fg">{t("profile.searchableByEmail", { email: data.email })}<br /><span className="text-vs-fg-2">{t("profile.searchableHint", { tag: formatTag(data.handle, data.discriminator) })}</span></span></label></section>;
}

function PresenceDetail({ data, t, saving, onOnline, onActivity, onIncognito, onIncognitoOff }: { data: ProfileData; t: Translate; saving: boolean; onOnline: () => void; onActivity: () => void; onIncognito: (hours: 1 | 4 | 12 | 24) => void; onIncognitoOff: () => void }) {
  return <section className="bg-vs-surface flex flex-col gap-4 rounded-2xl border border-vs-line p-4 sm:p-6"><label className="flex items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5 accent-brand-500" checked={data.shareOnlineStatus} onChange={onOnline} disabled={saving} /><span className="text-sm text-vs-fg">{t("profile.shareOnline")}<br /><span className="text-vs-fg-2">{t("profile.shareOnlineHint")}</span></span></label>{data.shareOnlineStatus && <label className="flex items-start gap-3 pl-8"><input type="checkbox" className="mt-1 h-5 w-5 accent-brand-500" checked={data.shareCurrentActivity} onChange={onActivity} disabled={saving} /><span className="text-sm text-vs-fg">{t("profile.shareActivity")}</span></label>}<div className="flex flex-col gap-2 border-t border-vs-line pt-4"><p className="text-sm text-vs-fg">{t("profile.incognito")}</p><p className="text-xs text-vs-fg-2">{t("profile.incognitoHint")}</p>{data.incognitoActive ? <button className="btn-secondary self-start !px-4 !py-2" onClick={onIncognitoOff} disabled={saving}>{t("profile.incognitoOff")}</button> : <div className="flex flex-wrap gap-2">{([1, 4, 12, 24] as const).map((hours) => <button key={hours} className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={() => onIncognito(hours)} disabled={saving}>{t("profile.hoursN", { n: hours })}</button>)}</div>}</div></section>;
}

function AboutDetail({ data, t, saving, onToggle }: { data: ProfileData; t: Translate; saving: boolean; onToggle: () => void }) {
  return <div className="flex flex-col gap-4"><section className="bg-vs-surface rounded-2xl border border-vs-line p-4"><ProfileRow icon={<Sparkles className="h-5 w-5 text-vs-xp" aria-hidden />} label={t("profile.whatsNew")} value={data.changelogEnabled ? t("twoFactor.on") : t("twoFactor.off")} onClick={onToggle} /></section><section className="bg-vs-surface rounded-2xl border border-vs-line p-4"><ChangelogSection enabled={data.changelogEnabled} saving={saving} onToggle={onToggle} /></section></div>;
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
}: {
  value: string;
  label: string;
  small?: boolean;
  href?: string;
}) {
  const content = (
    <>
      <div className={`${small ? "font-extrabold" : "text-xl font-extrabold"} text-vs-fg`}>
        {value}
      </div>
      <div className="text-xs font-bold uppercase text-vs-fg-3">
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
