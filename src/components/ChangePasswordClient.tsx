"use client";

import { useId, useState, FormEvent } from "react";
import { useT } from "@/components/I18nProvider";
import { useRouter } from "next/navigation";
import ProfilePage from "@/components/profile/ProfilePage";
import { ProfileCard, SettingsActions, SettingsButton, SettingsField, SettingsStatus, settingsFieldClass } from "@/components/profile/settings";

export default function ChangePasswordClient({ forced }: { forced: boolean }) {
  const router = useRouter();
  const t = useT();
  const id = useId();
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

  // Echte labels en autocomplete: een wachtwoordmanager vult dan het huidige
  // wachtwoord in en stelt bij het nieuwe een sterk wachtwoord voor.
  const fields = [
    { key: "currentPassword", label: forced ? t("password.temporary") : t("password.current"), autoComplete: "current-password", minLength: undefined },
    { key: "newPassword", label: t("password.new"), autoComplete: "new-password", minLength: 8 },
    { key: "confirmPassword", label: t("password.confirmNew"), autoComplete: "new-password", minLength: 8 },
  ] as const;

  return (
    <ProfilePage title={t("profile.changePassword")}>
      {forced && (
        <SettingsStatus kind="warning" boxed>
          {t("password.forcedReset")}
        </SettingsStatus>
      )}
      <ProfileCard>
        <form onSubmit={onSubmit} className="flex flex-col">
          {fields.map((field) => (
            <SettingsField key={field.key} label={field.label} htmlFor={`${id}-${field.key}`}>
              <input
                id={`${id}-${field.key}`}
                className={settingsFieldClass}
                type="password"
                autoComplete={field.autoComplete}
                required
                minLength={field.minLength}
                value={form[field.key]}
                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
              />
            </SettingsField>
          ))}
          {error && (
            <div className="px-2 pt-1">
              <SettingsStatus kind="error">{error}</SettingsStatus>
            </div>
          )}
          <SettingsActions>
            <SettingsButton type="submit" variant="primary" disabled={loading}>
              {loading ? t("courses.busy") : t("password.save")}
            </SettingsButton>
          </SettingsActions>
        </form>
      </ProfileCard>
    </ProfilePage>
  );
}
