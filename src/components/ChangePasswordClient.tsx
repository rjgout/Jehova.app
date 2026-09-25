"use client";

import { useState, FormEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { useRouter } from "next/navigation";

export default function ChangePasswordClient({ forced }: { forced: boolean }) {
  const router = useRouter();
  const t = useT();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.newPassword !== form.confirmPassword) {
      setError(t("password.newMismatch"));
      return;
    }
    setLoading(true);
    const res = await fetch("/api/account", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? t("wordOfTheDay.somethingWrong"));
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="max-w-md mx-auto card">
      <h1 className="text-2xl font-extrabold mb-2 text-brand-800 dark:text-brand-300">{t("profile.changePassword")}</h1>
      {forced && (
        <p className="text-sm bg-gold-50 dark:bg-slate-700 text-gold-700 dark:text-gold-400 rounded-xl px-3 py-2 mb-4">
          {t("password.forcedReset")}
        </p>
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input
          className="input"
          placeholder={forced ? t("password.temporary") : t("password.current")}
          type="password"
          required
          value={form.currentPassword}
          onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
        />
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
        {error && <p className="text-red-600 dark:text-red-400 text-sm font-semibold">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? t("courses.busy") : t("password.save")}
        </button>
      </form>
    </div>
  );
}
