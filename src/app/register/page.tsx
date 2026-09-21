"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", handle: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdTag, setCreatedTag] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Er ging iets mis.");
      return;
    }
    setCreatedTag(data.tag);
  }

  if (createdTag) {
    return (
      <div className="max-w-md mx-auto card text-center flex flex-col items-center gap-4">
        <div className="text-4xl">🎉</div>
        <h1 className="text-xl font-extrabold text-brand-800 dark:text-brand-300">Account aangemaakt!</h1>
        <p className="text-slate-600 dark:text-slate-300">Jouw unieke gebruikersnaam is:</p>
        <p className="text-2xl font-extrabold tracking-wide bg-brand-50 dark:bg-slate-700 text-brand-700 dark:text-brand-300 rounded-2xl px-4 py-2">
          {createdTag}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Bevestig eerst je e-mailadres. Daarna helpen we je stap voor stap op weg.
        </p>
        <button className="btn-primary" onClick={() => { router.push("/verify-email"); router.refresh(); }}>
          E-mailadres bevestigen →
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto card">
      <h1 className="text-2xl font-extrabold mb-6 text-brand-800 dark:text-brand-300">Account maken</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <input className="input" placeholder="Gebruikersnaam" required value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} />
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Je krijgt er automatisch een uniek nummer achter, bv. "{form.handle || "Voorbeeld"}#42" — zo kan iedereen dezelfde gebruikersnaam kiezen en hoef je nooit je e-mailadres te delen om gevonden te worden.
          </p>
        </div>
        <input className="input" placeholder="E-mailadres" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input" placeholder="Wachtwoord (min. 8 tekens)" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="text-red-600 dark:text-red-400 text-sm font-semibold">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary mt-2">{loading ? "Bezig..." : "Account maken"}</button>
      </form>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
        Heb je al een account?{" "}<Link href="/login" className="text-brand-600 font-bold">Log in</Link>
      </p>
    </div>
  );
}
