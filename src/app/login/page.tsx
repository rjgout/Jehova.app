"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/components/I18nProvider";

// Terug naar waar je vandaan kwam (bv. een uitnodigingslink). Alleen een pad
// binnen de app: "//" of "/\\" zou de browser als ander domein lezen, en dan
// kan een link je na het inloggen naar een nagemaakte site sturen.
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/dashboard";
  return next;
}

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (challengeToken) {
      const res = await fetch("/api/auth/login/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeToken, code: twoFactorCode }),
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);
      if (!res.ok) {
        setError(data.error ?? t("auth.codeWrong"));
        return;
      }
      router.push(nextPath());
      router.refresh();
      return;
    }

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? t("wordOfTheDay.somethingWrong"));
      return;
    }
    if (data.requiresTwoFactor) {
      setChallengeToken(data.challengeToken);
      setTwoFactorCode("");
      return;
    }
    router.push(data.mustSetupTwoFactor ? "/profile" : nextPath());
    router.refresh();
  }

  return (
    <div className="max-w-md mx-auto card">
      <h1 className="text-2xl font-extrabold mb-6 text-brand-800 dark:text-brand-300">{t("auth.login")}</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {challengeToken ? (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t("auth.twoFactorPrompt")}
            </p>
            <input
              className="input"
              // Geen numeriek toetsenbord: herstelcodes bevatten letters (A–F).
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="one-time-code"
              placeholder={t("auth.twoFactorPlaceholder")}
              required
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.slice(0, 16))}
              autoFocus
            />
          </>
        ) : (
          <>
        <input
          className="input"
          placeholder={t("auth.identifierPlaceholder")}
          required
          value={form.identifier}
          onChange={(e) => setForm({ ...form, identifier: e.target.value })}
        />
        <input
          className="input"
          placeholder={t("auth.password")}
          type="password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
          </>
        )}
        {error && <p className="text-red-600 dark:text-red-400 text-sm font-semibold">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? t("courses.busy") : t("auth.login")}
        </button>
      </form>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
        <Link href="/forgot-password" className="text-brand-600 font-bold">
          {t("auth.forgotPassword")}
        </Link>
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
        {t("auth.noAccount")}{" "}
        <Link href="/register" className="text-brand-600 font-bold">
          {t("auth.createOne")}
        </Link>
      </p>
    </div>
  );
}
