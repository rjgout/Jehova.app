"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/I18nProvider";
import { primaryButton, surfaceCard } from "@/components/versado/styles";
import { socialRequest } from "@/components/social/shared";
import { GROUP_NAME_MAX_LENGTH } from "@/lib/social/rules";

/** Groep aanmaken: alleen een naam. Een groep heeft bewust geen type. */
export default function NewGroupClient() {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await socialRequest("/api/groups", { name });
    if (result.ok && typeof result.data.id === "string") {
      router.replace(`/groups/${result.data.id}`);
      return;
    }
    setBusy(false);
    setError(result.error ?? t("together.common.error"));
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <h1 className="text-2xl font-extrabold tracking-tight text-vs-fg">{t("together.pages.newGroup")}</h1>
      <form onSubmit={submit} className={`${surfaceCard} flex flex-col gap-3 p-4 sm:p-5`}>
        <label htmlFor="group-name" className="text-sm font-bold text-vs-fg">
          {t("together.newGroup.nameLabel")}
        </label>
        <input
          id="group-name"
          className="input"
          value={name}
          maxLength={GROUP_NAME_MAX_LENGTH}
          placeholder={t("together.newGroup.namePlaceholder")}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />
        <p className="text-xs text-vs-fg-3">{t("together.newGroup.hint")}</p>
        {error && (
          <p role="alert" className="text-sm font-semibold text-vs-danger">
            {error}
          </p>
        )}
        <button type="submit" className={`${primaryButton} self-start`} disabled={busy || name.trim().length === 0}>
          {busy ? t("together.newGroup.busy") : t("together.newGroup.submit")}
        </button>
      </form>
    </div>
  );
}
