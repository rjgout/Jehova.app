"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
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
        setError(data.error ?? "De verificatiecode klopt niet.");
        return;
      }
      router.push("/dashboard");
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
      setError(data.error ?? "Er ging iets mis.");
      return;
    }
    if (data.requiresTwoFactor) {
      setChallengeToken(data.challengeToken);
      setTwoFactorCode("");
      return;
    }
    router.push(data.mustSetupTwoFactor ? "/profile" : "/dashboard");
    router.refresh();
  }

  return (
    <div className="max-w-md mx-auto card">
      <h1 className="text-2xl font-extrabold mb-6 text-brand-800 dark:text-brand-300">Inloggen</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {challengeToken ? (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Open je authenticator-app en voer de 6-cijferige code in. Je kunt ook een herstelcode gebruiken.
            </p>
            <input
              className="input"
              // Geen numeriek toetsenbord: herstelcodes bevatten letters (A–F).
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="one-time-code"
              placeholder="2FA-code of herstelcode"
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
          placeholder="E-mailadres of gebruikersnaam#00"
          required
          value={form.identifier}
          onChange={(e) => setForm({ ...form, identifier: e.target.value })}
        />
        <input
          className="input"
          placeholder="Wachtwoord"
          type="password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
          </>
        )}
        {error && <p className="text-red-600 dark:text-red-400 text-sm font-semibold">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? "Bezig..." : "Inloggen"}
        </button>
      </form>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
        <Link href="/forgot-password" className="text-brand-600 font-bold">
          Wachtwoord vergeten?
        </Link>
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
        Nog geen account?{" "}
        <Link href="/register" className="text-brand-600 font-bold">
          Maak er een aan
        </Link>
      </p>
    </div>
  );
}
