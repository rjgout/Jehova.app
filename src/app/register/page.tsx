"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useT } from "@/components/I18nProvider";
import { rememberReturnTo, safeReturnPath } from "@/lib/returnTo";

interface Inviter {
  id: string;
  handle: string;
  tag: string;
}

export default function RegisterPage() {
  const t = useT();
  const [form, setForm] = useState({ email: "", handle: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // Via een uitnodigingslink (/uitnodiging/<code>) binnengekomen. Uit de URL
  // gelezen na het laden in plaats van met useSearchParams, dat voor deze
  // statische pagina een Suspense-grens zou vereisen.
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviter, setInviter] = useState<Inviter | null>(null);
  // Binnengekomen via bv. een groepslink (?next=): na registreren en inloggen
  // weer daarheen, ook als de weg via de e-mailbevestiging loopt.
  const [nextPath, setNextPath] = useState<string | null>(null);

  useEffect(() => {
    const next = safeReturnPath(new URLSearchParams(window.location.search).get("next"));
    if (next) {
      setNextPath(next);
      rememberReturnTo(next);
    }
  }, []);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("invite");
    if (!code) return;
    fetch(`/api/invite/${encodeURIComponent(code)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.inviter) return;
        setInviteCode(code);
        setInviter(d.inviter);
      });
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inviteCode ? { ...form, inviteCode } : form),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? t("wordOfTheDay.somethingWrong"));
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto card text-center flex flex-col items-center gap-4">
        <div className="text-4xl">✉️</div>
        <h1 className="text-xl font-extrabold text-brand-800 dark:text-brand-300">{t("auth.registrationSubmittedTitle")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("auth.registrationSubmitted")}
        </p>
        <Link className="btn-primary" href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}>{t("auth.logIn")}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto card">
      <h1 className="text-2xl font-extrabold mb-6 text-brand-800 dark:text-brand-300">{t("auth.createAccount")}</h1>
      {inviter && (
        <p className="text-sm font-semibold bg-brand-50 dark:bg-slate-700 text-brand-700 dark:text-brand-300 rounded-xl px-3 py-2 mb-4">
          {t("auth.invitedBy", { tag: inviter.tag })}
        </p>
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <input className="input" placeholder={t("auth.username")} required value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} />
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            {t("auth.usernameHint", { example: `${form.handle || t("auth.exampleName")}#42` })}
          </p>
        </div>
        <input className="input" placeholder={t("auth.email")} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input" placeholder={t("auth.passwordMin")} type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="text-red-600 dark:text-red-400 text-sm font-semibold">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary mt-2">{loading ? t("courses.busy") : t("auth.createAccount")}</button>
      </form>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
        {t("auth.haveAccount")}{" "}
        <Link
          href={inviteCode ? `/login?next=${encodeURIComponent(`/uitnodiging/${inviteCode}`)}` : nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}
          className="text-brand-600 font-bold"
        >
          {t("auth.logIn")}
        </Link>
      </p>
    </div>
  );
}
