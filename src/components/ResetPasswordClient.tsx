"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/components/I18nProvider";

export default function ResetPasswordClient({ token }: { token: string | null }) {
  const router = useRouter();
  const t = useT();
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");

  if (!token) {
    return (
      <div className="max-w-md mx-auto card text-center flex flex-col gap-4">
        <h1 className="text-xl font-extrabold text-red-600 dark:text-red-400">{t("password.noLink")}</h1>
        <Link href="/forgot-password" className="btn-secondary self-center">
          {t("password.requestNew")}
        </Link>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.newPassword !== form.confirmPassword) {
      setError(t("password.mismatch"));
      return;
    }
    setLoading(true);
    const res = twoFactorChallenge
      ? await fetch("/api/auth/login/2fa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challengeToken: twoFactorChallenge, code: twoFactorCode }),
        })
      : await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, newPassword: form.newPassword }),
        });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? t("wordOfTheDay.somethingWrong"));
      return;
    }
    if (data.requiresTwoFactor) {
      setTwoFactorChallenge(data.challengeToken);
      setTwoFactorCode("");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="max-w-md mx-auto card">
      <h1 className="text-2xl font-extrabold mb-4 text-brand-800 dark:text-brand-300">{t("password.setNewTitle")}</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {twoFactorChallenge ? (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t("password.changedConfirm2fa")}
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
          placeholder={t("password.new")}
          type="password"
          required
          minLength={8}
          value={form.newPassword}
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
        />
        <input
          className="input"
          placeholder={t("password.confirmNew")}
          type="password"
          required
          minLength={8}
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
        />
        </>
        )}
        {error && <p className="text-red-600 dark:text-red-400 text-sm font-semibold">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? t("courses.busy") : t("password.set")}
        </button>
      </form>
    </div>
  );
}
