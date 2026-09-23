"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatTag } from "@/lib/handle";
import { enableBrowserPush, isPushSupported } from "@/lib/pushClient";
import { isStandalone } from "@/lib/pwaInstall";
import InstallAppCard from "@/components/InstallAppCard";

interface OnboardingClientProps {
  email: string;
  searchableByEmail: boolean;
  shareOnlineStatus: boolean;
  pushNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  notifyDailyText: boolean;
  dailyTextTime: string;
  emailConfigured: boolean;
}

type StepId = "kennis" | "webapp" | "uitleg" | "vrienden" | "online-status" | "notificaties";

const ALL_STEPS: StepId[] = ["kennis", "webapp", "uitleg", "vrienden", "online-status", "notificaties"];

/**
 * Vierstaps onboarding: webapp-installatie (overgeslagen als de app al
 * standalone draait) → reeks/XP/hints-uitleg → vrienden zoeken →
 * notificaties. "Overslaan" beëindigt de hele flow (niet alleen de huidige
 * stap) en markeert 'm — via /api/onboarding/complete — als gezien, zodat
 * dashboard/page.tsx 'm niet opnieuw automatisch toont. Handmatig herstarten
 * kan altijd via de knop op het profiel (die gewoon naar deze pagina linkt).
 */
export default function OnboardingClient({
  email,
  searchableByEmail,
  shareOnlineStatus,
  pushNotificationsEnabled,
  emailNotificationsEnabled,
  notifyDailyText,
  dailyTextTime,
  emailConfigured,
}: OnboardingClientProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [steps, setSteps] = useState<StepId[]>(ALL_STEPS);
  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    setSteps(isStandalone() ? ALL_STEPS.filter((s) => s !== "webapp") : ALL_STEPS);
    setReady(true);
  }, []);

  async function finish() {
    setFinishing(true);
    await fetch("/api/onboarding/complete", { method: "POST" }).catch(() => {});
    router.push("/dashboard");
    router.refresh();
  }

  function next() {
    if (index + 1 >= steps.length) finish();
    else setIndex(index + 1);
  }

  if (!ready) return <p className="text-slate-400 dark:text-slate-500 text-center py-12">Laden...</p>;

  const step = steps[index];

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6 py-6">
      <div className="flex items-center gap-1.5 justify-center">
        {steps.map((s, i) => (
          <span
            key={s}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-8 bg-brand-500" : "w-4 bg-slate-200 dark:bg-slate-700"
            }`}
          />
        ))}
      </div>

      {step === "kennis" && <KennisStep onNext={next} />}
      {step === "webapp" && <WebappStep onNext={next} />}
      {step === "uitleg" && <UitlegStep onNext={next} />}
      {step === "vrienden" && <VriendenStep email={email} initialSearchable={searchableByEmail} onNext={next} />}
      {step === "online-status" && <OnlineStatusStep initialShareOnlineStatus={shareOnlineStatus} onNext={next} />}
      {step === "notificaties" && (
        <NotificatiesStep
          emailConfigured={emailConfigured}
          initialPush={pushNotificationsEnabled}
          initialEmail={emailNotificationsEnabled}
          initialDailyText={notifyDailyText}
          initialDailyTextTime={dailyTextTime}
          onNext={next}
          finishing={finishing}
        />
      )}

      <button className="text-sm text-slate-400 dark:text-slate-500 underline self-center" onClick={finish} disabled={finishing}>
        Overslaan
      </button>
    </div>
  );
}

const KNOWLEDGE_OPTIONS: { level: "NEVER" | "SOME" | "READ_BEFORE" | "UNSURE"; label: string }[] = [
  { level: "NEVER", label: "Nog nooit" },
  { level: "SOME", label: "Een paar stukjes" },
  { level: "READ_BEFORE", label: "Ik heb het al eens gelezen" },
  { level: "UNSURE", label: "Ik weet het eigenlijk niet meer" },
];

function KennisStep({ onNext }: { onNext: () => void }) {
  const [saving, setSaving] = useState(false);

  async function choose(level: (typeof KNOWLEDGE_OPTIONS)[number]["level"]) {
    setSaving(true);
    await fetch("/api/onboarding/knowledge-level", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level }),
    }).catch(() => {});
    setSaving(false);
    onNext();
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-extrabold text-brand-800 dark:text-brand-300 text-center">Welkom!</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
        Heb je het Boek van Mormon al eens gelezen? Voorkennis is niet nodig — dit bepaalt alleen wat we je als eerste
        laten zien.
      </p>
      <div className="flex flex-col gap-2">
        {KNOWLEDGE_OPTIONS.map((opt) => (
          <button
            key={opt.level}
            className="card text-left hover:!border-brand-300 !border-2 !border-transparent dark:text-slate-100"
            disabled={saving}
            onClick={() => choose(opt.level)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function WebappStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-extrabold text-brand-800 dark:text-brand-300 text-center">Welkom! Eerst dit...</h1>
      <InstallAppCard />
      <button className="btn-primary self-center" onClick={onNext}>
        Volgende
      </button>
    </div>
  );
}

function UitlegStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-extrabold text-brand-800 dark:text-brand-300 text-center">Zo werkt het</h1>
      <div className="card text-left flex flex-col gap-4">
        <div className="flex gap-3 items-start">
          <span className="text-2xl">🔥</span>
          <div>
            <h3 className="font-extrabold dark:text-slate-100">Reeks</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Oefen elke dag een beetje om je reeks op te bouwen. Een dag gemist? Dan springt automatisch een
              verdiende streak freeze bij — op zijn je freezes op, dan breekt je reeks alsnog.
            </p>
          </div>
        </div>
        <div className="flex gap-3 items-start">
          <span className="text-2xl">⭐</span>
          <div>
            <h3 className="font-extrabold dark:text-slate-100">XP</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Voor elke les, oefening en spelletje verdien je XP. Daarmee klim je ook in de wekelijkse
              divisiecompetitie tegen andere spelers.
            </p>
          </div>
        </div>
        <div className="flex gap-3 items-start">
          <span className="text-2xl">💡</span>
          <div>
            <h3 className="font-extrabold dark:text-slate-100">Hints</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Kom je er niet uit bij een oefening? Koop een hint met je XP.</p>
          </div>
        </div>
      </div>
      <button className="btn-primary self-center" onClick={onNext}>
        Volgende
      </button>
    </div>
  );
}

interface SearchResult {
  id: string;
  handle: string;
  discriminator: string;
}

function VriendenStep({ email, initialSearchable, onNext }: { email: string; initialSearchable: boolean; onNext: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [searchable, setSearchable] = useState(initialSearchable);
  const [savingSearchable, setSavingSearchable] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => setResults(d.results));
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  async function sendRequest(target: SearchResult) {
    setMessage(null);
    const res = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: target.id }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(body.error ?? "Er ging iets mis.");
    } else {
      setSentTo((prev) => new Set(prev).add(target.id));
      setMessage(`Verzoek naar ${formatTag(target.handle, target.discriminator)} verstuurd!`);
    }
  }

  async function toggleSearchable() {
    const next = !searchable;
    setSearchable(next);
    setSavingSearchable(true);
    await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ searchableByEmail: next }),
    }).catch(() => {});
    setSavingSearchable(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-extrabold text-brand-800 dark:text-brand-300 text-center">Zoek je vrienden op</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
        Meestal ken je hier al mensen die meedoen — zoek ze gelijk even op, dan kan je straks samen spelen.
      </p>

      <div className="card flex flex-col gap-3">
        <input
          className="input"
          placeholder="Zoek op gebruikersnaam (Naam#42) of e-mailadres"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {results && results.length === 0 && query.trim().length >= 2 && (
          <p className="text-sm text-slate-400 dark:text-slate-500">Niemand gevonden.</p>
        )}
        {results && results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map((r) => (
              <div key={r.id} className="flex items-center justify-between !py-2">
                <span className="dark:text-slate-100">{formatTag(r.handle, r.discriminator)}</span>
                <button className="btn-secondary !px-3 !py-1.5" disabled={sentTo.has(r.id)} onClick={() => sendRequest(r)}>
                  {sentTo.has(r.id) ? "Verstuurd" : "Toevoegen"}
                </button>
              </div>
            ))}
          </div>
        )}
        {message && <p className="text-sm font-semibold text-brand-600 dark:text-brand-300">{message}</p>}
      </div>

      <label className="card flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 accent-brand-500"
          checked={searchable}
          onChange={toggleSearchable}
          disabled={savingSearchable}
        />
        <span className="text-sm dark:text-slate-200">
          Vindbaar via e-mailadres ({email}) bij het toevoegen van vrienden.
          <br />
          <span className="text-slate-400 dark:text-slate-500">
            Handig als vrienden je willen vinden via mond-tot-mondreclame. Staat standaard uit.
          </span>
        </span>
      </label>

      <button className="btn-primary self-center" onClick={onNext}>
        Volgende
      </button>
    </div>
  );
}

function OnlineStatusStep({
  initialShareOnlineStatus,
  onNext,
}: {
  initialShareOnlineStatus: boolean;
  onNext: () => void;
}) {
  const [shareOnlineStatus, setShareOnlineStatus] = useState(initialShareOnlineStatus);
  const [saving, setSaving] = useState(false);

  async function saveAndContinue() {
    setSaving(true);
    await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shareOnlineStatus }),
    }).catch(() => {});
    setSaving(false);
    onNext();
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-extrabold text-brand-800 dark:text-brand-300 text-center">Online status</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
        Kies of je vrienden mogen zien wanneer je online bent. Deze keuze staat ook later altijd in je profiel.
      </p>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          className={`card text-left !border-2 ${shareOnlineStatus ? "!border-brand-500 !bg-brand-50 dark:!bg-slate-800" : "!border-transparent"}`}
          onClick={() => setShareOnlineStatus(true)}
          disabled={saving}
          aria-pressed={shareOnlineStatus}
        >
          <div className="font-extrabold dark:text-slate-100">🟢 Ja, deel mijn online status</div>
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Vrienden kunnen zien of je online bent en, als je dat toestaat, wat je aan het doen bent.
          </div>
        </button>

        <button
          type="button"
          className={`card text-left !border-2 ${!shareOnlineStatus ? "!border-brand-500 !bg-brand-50 dark:!bg-slate-800" : "!border-transparent"}`}
          onClick={() => setShareOnlineStatus(false)}
          disabled={saving}
          aria-pressed={!shareOnlineStatus}
        >
          <div className="font-extrabold dark:text-slate-100">🙈 Nee, liever niet</div>
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Je bent onzichtbaar voor vrienden — en om het eerlijk te houden kun je dan ook hun online status niet zien.
          </div>
        </button>
      </div>

      <button className="btn-primary self-center" onClick={saveAndContinue} disabled={saving}>
        {saving ? "Opslaan..." : "Volgende"}
      </button>
    </div>
  );
}

function NotificatiesStep({
  emailConfigured,
  initialPush,
  initialEmail,
  initialDailyText,
  initialDailyTextTime,
  onNext,
  finishing,
}: {
  emailConfigured: boolean;
  initialPush: boolean;
  initialEmail: boolean;
  initialDailyText: boolean;
  initialDailyTextTime: string;
  onNext: () => void;
  finishing: boolean;
}) {
  const [push, setPush] = useState(initialPush);
  const [email, setEmail] = useState(initialEmail);
  const [dailyText, setDailyText] = useState(initialDailyText);
  const [dailyTextTime, setDailyTextTime] = useState(initialDailyTextTime);
  const [pushError, setPushError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pushSupported = isPushSupported();

  async function enablePush() {
    setPushError(null);
    setBusy(true);
    try {
      await enableBrowserPush();
      setPush(true);
      await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pushNotificationsEnabled: true }),
      });
    } catch (e) {
      setPushError(e instanceof Error ? e.message : "Kon pushmeldingen niet aanzetten.");
    }
    setBusy(false);
  }

  async function toggleEmail() {
    const next = !email;
    setEmail(next);
    await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailNotificationsEnabled: next }),
    }).catch(() => {});
  }

  async function saveDailyText(patch: { notifyDailyText?: boolean; dailyTextTime?: string }) {
    await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => {});
  }

  function toggleDailyText() {
    const next = !dailyText;
    setDailyText(next);
    saveDailyText({ notifyDailyText: next });
  }

  function changeDailyTextTime(value: string) {
    setDailyTextTime(value);
    saveDailyText({ dailyTextTime: value });
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-extrabold text-brand-800 dark:text-brand-300 text-center">Mis niks</h1>

      <div className="card text-left flex flex-col gap-3">
        <h3 className="font-extrabold dark:text-slate-100">🔔 Pushmeldingen (aanbevolen)</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Voor je dagelijkse herinnering, vriendschapsverzoeken en de wekelijkse competitie-uitslag.
          {!pushSupported && " Werkt in deze browser niet — zet 'm aan zodra je de app op je scherm hebt staan."}
        </p>
        {push ? (
          <p className="text-sm font-semibold text-brand-600 dark:text-brand-300">Pushmeldingen staan aan ✓</p>
        ) : (
          <button className="btn-primary self-start" onClick={enablePush} disabled={busy || !pushSupported}>
            {busy ? "Bezig..." : "Pushmeldingen aanzetten"}
          </button>
        )}
        {pushError && <p className="text-sm text-red-600 dark:text-red-400">{pushError}</p>}
      </div>

      {emailConfigured && (
        <label className="card text-left flex items-start gap-3 cursor-pointer">
          <input type="checkbox" className="mt-1 h-5 w-5 accent-brand-500" checked={email} onChange={toggleEmail} />
          <span className="text-sm dark:text-slate-200">
            E-mailnotificaties (optioneel)
            <br />
            <span className="text-slate-400 dark:text-slate-500">Push heeft de voorkeur — dit is een extra, geen vervanging.</span>
          </span>
        </label>
      )}

      <div className="card text-left flex flex-col gap-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" className="mt-1 h-5 w-5 accent-brand-500" checked={dailyText} onChange={toggleDailyText} />
          <span className="text-sm dark:text-slate-200">
            📖 Tekst van de dag (optioneel)
            <br />
            <span className="text-slate-400 dark:text-slate-500">
              Elke dag één vers als melding, via push{emailConfigured ? " of e-mail" : ""}. Je kunt dit altijd uitzetten in je profiel.
            </span>
          </span>
        </label>
        {dailyText && (
          <label className="flex items-center gap-2 text-sm dark:text-slate-200 pl-8">
            Tijdstip
            <input
              type="time"
              className="input !w-auto !py-1"
              value={dailyTextTime}
              onChange={(e) => e.target.value && changeDailyTextTime(e.target.value)}
            />
          </label>
        )}
      </div>

      <button className="btn-primary self-center" onClick={onNext} disabled={finishing}>
        {finishing ? "Bezig..." : "Klaar, aan de slag!"}
      </button>
    </div>
  );
}
