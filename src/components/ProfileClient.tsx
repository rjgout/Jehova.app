"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LeagueTier } from "@prisma/client";
import { TIER_LABELS, TIER_ICONS } from "@/lib/leagues";
import { formatTag, firstGrapheme, isSingleEmoji } from "@/lib/handle";
import { enableBrowserPush, disableBrowserPush, isPushSupported } from "@/lib/pushClient";
import { getSocket } from "@/lib/socketClient";
import ThemeToggle from "@/components/ThemeToggle";

interface AchievementView {
  slug: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string | null;
}

interface ProfileData {
  displayName: string;
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
  notifyDailyReminder: boolean;
  notifySocial: boolean;
  notifyAchievements: boolean;
  notifyWordGame: boolean;
  changelogEnabled: boolean;
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
  const [data, setData] = useState<ProfileData | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [testingPush, setTestingPush] = useState(false);
  const [pushTestMessage, setPushTestMessage] = useState<string | null>(null);
  const [editingHandle, setEditingHandle] = useState(false);
  const [handleInput, setHandleInput] = useState("");
  const [savingHandle, setSavingHandle] = useState(false);
  const [handleError, setHandleError] = useState<string | null>(null);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [avatarInput, setAvatarInput] = useState("");
  const [savingAvatarEmoji, setSavingAvatarEmoji] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const router = useRouter();

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
      setPushError(e instanceof Error ? e.message : "Kon pushnotificaties niet in-/uitschakelen.");
    }
    setSavingNotifications(false);
  }

  async function sendTestPush() {
    setTestingPush(true);
    setPushTestMessage(null);
    const res = await fetch("/api/push/test", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setTestingPush(false);
    setPushTestMessage(
      res.ok
        ? "Testmelding verstuurd — komt 'm niet aan? Wacht een minuutje en check of je telefoon niet in een stille/focus-modus staat."
        : (body.error ?? "Kon geen testmelding versturen.")
    );
  }

  async function changeReminderTime(time: string) {
    if (!data) return;
    setData({ ...data, dailyReminderTime: time });
    await saveAccountPatch({ dailyReminderTime: time });
  }

  async function toggleCategory(
    field: "notifyDailyReminder" | "notifySocial" | "notifyAchievements" | "notifyWordGame" | "changelogEnabled"
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
      setHandleError(body.error ?? "Kon de gebruikersnaam niet opslaan.");
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
      setAvatarError(body.error ?? "Kon de emoji niet opslaan.");
      return;
    }
    setData({ ...data, avatarEmoji: emoji });
    setAvatarPickerOpen(false);
    setAvatarInput("");
  }

  function saveCustomAvatarEmoji() {
    if (!isSingleEmoji(avatarInput)) {
      setAvatarError("Kies precies één emoji.");
      return;
    }
    saveAvatarEmoji(avatarInput.trim());
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

  if (!data) return <p className="text-slate-400">Laden...</p>;

  const earnedCount = data.achievements.filter((a) => a.earnedAt).length;
  const initial = firstGrapheme(data.displayName).toUpperCase() || "?";

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      <Link href="/feedback" className="btn-secondary self-start">
        💬 Feedback geven
      </Link>

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
                title="Avatar wijzigen"
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
                      title="Gebruikersnaam wijzigen"
                      aria-label="Gebruikersnaam wijzigen"
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
                      {savingHandle ? "Bezig..." : "Opslaan"}
                    </button>
                    <button className="btn-secondary !px-3 !py-1 !text-xs" onClick={() => setEditingHandle(false)}>
                      Annuleren
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
                <p className="text-sm font-bold">Kies een avatar-emoji</p>
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
                  <input
                    className="input !w-auto flex-1 !py-1.5"
                    placeholder="Eigen emoji"
                    value={avatarInput}
                    onChange={(e) => setAvatarInput(e.target.value)}
                    maxLength={8}
                  />
                  <button
                    className="btn-primary !px-3 !py-1.5 !text-xs shrink-0"
                    disabled={savingAvatarEmoji || !avatarInput}
                    onClick={saveCustomAvatarEmoji}
                  >
                    Opslaan
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
                      Verwijderen
                    </button>
                  )}
                  <button className="text-xs text-slate-400 hover:underline ml-auto" onClick={() => setAvatarPickerOpen(false)}>
                    Sluiten
                  </button>
                </div>
              </div>
            </div>
          )}
          {data.tier && (
            <span className="text-sm font-bold bg-black/15 rounded-full px-3.5 py-1.5 text-gold-400 shrink-0">
              {TIER_ICONS[data.tier]} {TIER_LABELS[data.tier]}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <HeroStat value={`🔥 ${data.currentStreak}`} label="Reeks" href="/streak" />
          <HeroStat value={`⭐ ${data.xpTotal}`} label="XP" href="/xp" />
          <HeroStat value={`🧊 ${data.freezeCount}`} label="Freezes" />
          <HeroStat value={`📖 ${data.chaptersCompleted}`} label="Hoofdstukken" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center text-sm text-brand-100 border-t border-white/15 pt-4">
          <Stat value={data.longestStreak.toString()} label="Langste reeks" small light />
          <Stat value={`${data.duelsWon}/${data.duelsPlayed}`} label="Duels gewonnen" small light />
          <Stat value={earnedCount.toString()} label="Achievements" small light />
        </div>
      </div>

      <div className="card !py-4 !bg-gold-50 dark:!bg-slate-800 !border-gold-400/30 dark:!border-slate-700 flex flex-col gap-4">
        <h2 className="font-extrabold text-lg dark:text-slate-100">Competitie</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/70 dark:bg-slate-700/70 !py-3 flex flex-col items-center gap-0.5">
            <Link href="/competition" className="block text-center hover:opacity-75">
              <div className="text-lg font-extrabold text-gold-600 dark:text-gold-400">
                {data.tier ? `${TIER_ICONS[data.tier]} ${data.groupPosition ? `#${data.groupPosition}` : "—"}` : "—"}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">Deze week</div>
            </Link>
          </div>
          <div className="rounded-2xl bg-white/70 dark:bg-slate-700/70 !py-3 flex flex-col items-center gap-0.5">
            <div className="text-lg font-extrabold text-gold-600 dark:text-gold-400">
              {data.bestTierEver ? `${TIER_ICONS[data.bestTierEver]} ${TIER_LABELS[data.bestTierEver]}` : "—"}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">Beste divisie ooit</div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-sm text-slate-500 dark:text-slate-400">
          <Stat value={data.lifetimePromotions.toString()} label="Promoties" small />
          <Stat value={data.lifetimeDemotions.toString()} label="Degradaties" small />
          <Stat value={data.competitionsWon.toString()} label="Competities" small />
          <Stat value={data.bestNationalRank ? `#${data.bestNationalRank}` : "—"} label="NL-rang" small />
        </div>
      </div>

      {data.seasons.length > 0 && (
        <section>
          <h2 className="font-extrabold text-lg mb-3 dark:text-slate-100">Seizoenen</h2>
          <div className="card flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
            {data.seasons.map((s) => (
              <div key={s.seasonIndex} className="flex items-center justify-between py-2.5">
                <span className="font-bold dark:text-slate-100">Seizoen {s.seasonIndex}</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {TIER_ICONS[s.finalTier]} {TIER_LABELS[s.finalTier]}
                  {s.finalGroupPosition ? ` — #${s.finalGroupPosition}` : ""}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-extrabold text-lg dark:text-slate-100">Achievements</h2>
          <span className="text-sm font-bold text-slate-400 dark:text-slate-500">
            {earnedCount}/{data.achievements.length}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {data.achievements.map((a) => (
            <div
              key={a.slug}
              title={a.description}
              className={`card !p-4 flex flex-col items-center text-center gap-1 ${
                a.earnedAt ? "!bg-gold-50 dark:!bg-slate-700" : "opacity-40 grayscale"
              }`}
            >
              <span className="text-3xl">{a.icon}</span>
              <span className="text-xs font-bold dark:text-slate-200">{a.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="font-extrabold text-lg dark:text-slate-100">Account</h2>

        <div className="flex items-center gap-3">
          <span className="text-sm dark:text-slate-200">Weergave (licht/donker)</span>
          <ThemeToggle />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Link href="/change-password" className="btn-secondary self-start">
            Wachtwoord wijzigen
          </Link>
          <Link href="/onboarding" className="btn-secondary self-start">
            Rondleiding opnieuw bekijken
          </Link>
        </div>
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="font-extrabold text-lg dark:text-slate-100">Notificaties</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Voor: dagelijkse herinnering, vriendschapsverzoeken, prestaties, wekelijkse competitie-uitslag,
          uitdagingen en het woord van de dag. E-mail en push staan standaard allebei uit — zet aan wat je wil
          ontvangen, en kies hieronder voor welke soorten meldingen dat dan geldt.
        </p>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 accent-brand-500"
            checked={data.emailNotificationsEnabled}
            onChange={toggleEmailNotifications}
            disabled={savingNotifications}
          />
          <span className="text-sm dark:text-slate-200">E-mailnotificaties naar {data.email}</span>
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
            Pushnotificaties via de browser
            {!isPushSupported() && (
              <>
                <br />
                <span className="text-slate-400 dark:text-slate-500">Niet ondersteund in deze browser.</span>
              </>
            )}
          </span>
        </label>
        {pushError && <p className="text-sm text-red-600 dark:text-red-400">{pushError}</p>}

        {data.pushNotificationsEnabled && (
          <div className="flex flex-col gap-1 items-start">
            <button className="btn-secondary !px-3 !py-1.5" disabled={testingPush} onClick={sendTestPush}>
              {testingPush ? "Bezig..." : "Stuur testmelding"}
            </button>
            {pushTestMessage && <p className="text-xs text-slate-500 dark:text-slate-400">{pushTestMessage}</p>}
          </div>
        )}

        <label className="flex items-center gap-3">
          <span className="text-sm dark:text-slate-200">Dagelijkse herinnering rond</span>
          <input
            type="time"
            className="input !w-auto"
            value={data.dailyReminderTime}
            onChange={(e) => changeReminderTime(e.target.value)}
          />
        </label>

        <div className="border-t border-slate-100 dark:border-slate-700 pt-3 mt-1 flex flex-col gap-2">
          <p className="text-sm font-semibold dark:text-slate-200">Waarover wil je meldingen ontvangen?</p>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-brand-500"
              checked={data.notifyDailyReminder}
              onChange={() => toggleCategory("notifyDailyReminder")}
              disabled={savingNotifications}
            />
            <span className="text-sm dark:text-slate-200">Dagelijkse herinnering om te oefenen</span>
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
              Sociaal — vriendschapsverzoeken, uitdagingen en woordspel-uitnodigingen
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
            <span className="text-sm dark:text-slate-200">Prestaties en wekelijkse competitie-uitslag</span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-brand-500"
              checked={data.notifyWordGame}
              onChange={() => toggleCategory("notifyWordGame")}
              disabled={savingNotifications}
            />
            <span className="text-sm dark:text-slate-200">Woord van de dag — elke dag om 18:00 uur</span>
          </label>
        </div>
      </section>

      <ChangelogSection
        enabled={data.changelogEnabled}
        saving={savingNotifications}
        onToggle={() => toggleCategory("changelogEnabled")}
      />

      <section className="card flex flex-col gap-3">
        <h2 className="font-extrabold text-lg dark:text-slate-100">Privacy</h2>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 accent-brand-500"
            checked={data.searchableByEmail}
            onChange={toggleSearchableByEmail}
            disabled={savingPrivacy}
          />
          <span className="text-sm dark:text-slate-200">
            Vindbaar via e-mailadres ({data.email}) bij het toevoegen van vrienden.
            <br />
            <span className="text-slate-400 dark:text-slate-500">
              Staat standaard uit — je bent altijd vindbaar via je gebruikersnaam{" "}
              {formatTag(data.handle, data.discriminator)}, ongeacht deze instelling.
            </span>
          </span>
        </label>
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="font-extrabold text-lg dark:text-slate-100">Online & activiteit</h2>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 accent-brand-500"
            checked={data.shareOnlineStatus}
            onChange={toggleShareOnlineStatus}
            disabled={savingPresence}
          />
          <span className="text-sm dark:text-slate-200">
            Online status delen met vrienden.
            <br />
            <span className="text-slate-400 dark:text-slate-500">
              Staat standaard uit. Aan → vrienden zien of je online bent, en anders &ldquo;laatst actief X geleden&rdquo;.
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
              Ook mijn huidige activiteit delen (bv. &ldquo;📖 Leest Alma 32&rdquo;) i.p.v. alleen dat ik online ben.
            </span>
          </label>
        )}

        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-2">
          <p className="text-sm dark:text-slate-200">🔒 Tijdelijk onzichtbaar voor vrienden</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Gebruikt de app zonder dat vrienden je status zien, zonder de instellingen hierboven te wijzigen. Zet
            zichzelf automatisch weer uit.
          </p>
          {data.incognitoActive ? (
            <button className="btn-secondary self-start !px-4 !py-2" onClick={deactivateIncognito} disabled={savingPresence}>
              Zet onzichtbaar-modus nu uit
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
                  {hours} uur
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="font-extrabold text-lg dark:text-slate-100">Account verwijderen</h2>
        {!confirmingDelete ? (
          <button className="btn-secondary self-start !text-red-500 !border-red-200" onClick={() => setConfirmingDelete(true)}>
            Account verwijderen
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-red-600 dark:text-red-400">
              Dit verwijdert je account en alle bijbehorende gegevens (voortgang, vrienden, quizresultaten)
              definitief. Dit kan niet ongedaan worden gemaakt.
            </p>
            <div className="flex gap-2">
              <button className="btn-primary !bg-red-500 !shadow-[0_4px_0_0_theme(colors.red.700)]" disabled={deleting} onClick={deleteAccount}>
                {deleting ? "Bezig..." : "Ja, definitief verwijderen"}
              </button>
              <button className="btn-secondary" onClick={() => setConfirmingDelete(false)}>
                Annuleren
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <button className="btn-secondary self-start" onClick={logout}>
          Uitloggen
        </button>
      </section>
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

  async function handleToggleOpen(e: SyntheticEvent<HTMLDetailsElement>) {
    if (!e.currentTarget.open || entries) return;
    const res = await fetch("/api/changelog");
    if (res.ok) setEntries((await res.json()).entries);
    fetch("/api/changelog/seen", { method: "POST" }).catch(() => {});
  }

  return (
    <details className="group card flex flex-col gap-3" onToggle={handleToggleOpen}>
      <summary className="font-extrabold text-lg dark:text-slate-100 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden flex items-center justify-between">
        Wat is er nieuw?
        <span className="text-slate-400 transition-transform group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>

      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" className="mt-1 h-5 w-5 accent-brand-500" checked={enabled} onChange={onToggle} disabled={saving} />
        <span className="text-sm dark:text-slate-200">
          Toon een melding bij het inloggen zodra er iets nieuws is.
          <br />
          <span className="text-slate-400 dark:text-slate-500">
            Ook uitgeschakeld kun je de changelog hieronder altijd terugvinden.
          </span>
        </span>
      </label>

      <div className="border-t border-slate-100 dark:border-slate-700 pt-3 flex flex-col gap-3">
        {!entries ? (
          <p className="text-slate-400 dark:text-slate-500 text-sm">Laden...</p>
        ) : entries.length === 0 ? (
          <p className="text-slate-400 dark:text-slate-500 text-sm">Nog geen changelog-items.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id}>
              <p className="font-bold text-sm dark:text-slate-100">{entry.title}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">
                {new Date(entry.createdAt).toLocaleDateString("nl-NL")}
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
