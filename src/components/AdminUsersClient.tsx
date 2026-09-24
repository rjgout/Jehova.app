"use client";

import { Fragment, useState } from "react";
import { formatTag } from "@/lib/handle";
import UserTag from "@/components/UserTag";

interface AdminUser {
  id: string;
  email: string;
  handle: string;
  discriminator: string;
  isAdmin: boolean;
  xpTotal: number;
  currentStreak: number;
  freezeCount: number;
  online: boolean;
  // null als `online` true is — dan is er niets "geleden" te tonen.
  lastSeenLabel: string | null;
  createdAt: string;
}

export default function AdminUsersClient({
  initialUsers,
  currentUserId,
}: {
  initialUsers: AdminUser[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});
  const [emailedResets, setEmailedResets] = useState<Record<string, string>>({});

  async function toggleAdmin(userId: string, nextIsAdmin: boolean) {
    setError(null);
    setBusyId(userId);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAdmin: nextIsAdmin }),
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Er ging iets mis.");
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isAdmin: nextIsAdmin } : u)));
  }

  async function resetPassword(userId: string) {
    if (!confirm("Wachtwoord van deze gebruiker resetten? Het huidige wachtwoord werkt dan niet meer.")) return;
    setError(null);
    setBusyId(userId);
    const res = await fetch(`/api/admin/users/${userId}/reset-password`, { method: "POST" });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Er ging iets mis.");
      return;
    }
    const data = await res.json();
    if (data.emailed) {
      setEmailedResets((prev) => ({ ...prev, [userId]: data.email }));
    } else {
      setRevealedPasswords((prev) => ({ ...prev, [userId]: data.tempPassword }));
    }
  }

  async function deleteUser(u: AdminUser) {
    if (
      !confirm(
        `Weet je zeker dat je ${formatTag(u.handle, u.discriminator)} wil verwijderen? Dit verwijdert ook al hun voortgang, XP en spellen, en kan niet ongedaan worden gemaakt.`
      )
    ) {
      return;
    }
    setError(null);
    setBusyId(u.id);
    const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Er ging iets mis.");
      return;
    }
    setUsers((prev) => prev.filter((x) => x.id !== u.id));
  }

  return (
    <details className="group card overflow-x-auto">
      <summary className="font-extrabold mb-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden flex items-center justify-between">
        Gebruikers ({users.length})
        <span className="text-slate-400 transition-transform group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      {error && <p className="text-red-600 dark:text-red-400 text-sm font-semibold mb-3">{error}</p>}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-bold uppercase text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
            <th className="py-2 pr-3">Gebruikersnaam</th>
            <th className="py-2 pr-3">E-mail</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3">XP</th>
            <th className="py-2 pr-3">Reeks</th>
            <th className="py-2 pr-3">Freezes</th>
            <th className="py-2 pr-3">Admin</th>
            <th className="py-2" colSpan={3} />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <Fragment key={u.id}>
              <tr className="border-b border-slate-50 dark:border-slate-800">
                <td className="py-2 pr-3 font-bold dark:text-slate-100">
                  <UserTag handle={u.handle} discriminator={u.discriminator} />
                  {u.id === currentUserId && <span className="text-brand-500 dark:text-brand-300 font-normal"> (jij)</span>}
                </td>
                <td className="py-2 pr-3 text-slate-500 dark:text-slate-400">{u.email}</td>
                <td className="py-2 pr-3">
                  {u.online ? (
                    <span className="text-brand-600 dark:text-brand-300 font-bold flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-brand-500" aria-hidden />
                      Online
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">{u.lastSeenLabel}</span>
                  )}
                </td>
                <td className="py-2 pr-3 dark:text-slate-200">{u.xpTotal}</td>
                <td className="py-2 pr-3 dark:text-slate-200">🔥 {u.currentStreak}</td>
                <td className="py-2 pr-3 dark:text-slate-200">🧊 {u.freezeCount}</td>
                <td className="py-2 pr-3">
                  {u.isAdmin ? (
                    <span className="text-brand-600 dark:text-brand-300 font-bold">Admin</span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">Gebruiker</span>
                  )}
                </td>
                <td className="py-2 pr-3">
                  {u.id === currentUserId ? (
                    <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                  ) : (
                    <button
                      className="btn-secondary !px-3 !py-1.5 !text-xs"
                      disabled={busyId === u.id}
                      onClick={() => toggleAdmin(u.id, !u.isAdmin)}
                    >
                      {busyId === u.id ? "Bezig..." : u.isAdmin ? "Adminrechten weghalen" : "Maak admin"}
                    </button>
                  )}
                </td>
                <td className="py-2 pr-3">
                  <button
                    className="btn-secondary !px-3 !py-1.5 !text-xs"
                    disabled={busyId === u.id}
                    onClick={() => resetPassword(u.id)}
                  >
                    {busyId === u.id ? "Bezig..." : "Wachtwoord resetten"}
                  </button>
                </td>
                <td className="py-2">
                  {u.id === currentUserId ? (
                    <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                  ) : (
                    <button
                      className="btn-secondary !px-3 !py-1.5 !text-xs !text-red-500 dark:!text-red-400"
                      disabled={busyId === u.id}
                      onClick={() => deleteUser(u)}
                    >
                      {busyId === u.id ? "Bezig..." : "Verwijderen"}
                    </button>
                  )}
                </td>
              </tr>
              {revealedPasswords[u.id] && (
                <tr className="bg-gold-50 dark:bg-slate-700">
                  <td colSpan={10} className="py-2 px-3 text-sm">
                    Tijdelijk wachtwoord voor <strong>{u.handle}</strong>:{" "}
                    <code className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded font-mono">
                      {revealedPasswords[u.id]}
                    </code>{" "}
                    — geef dit zelf door (bv. via chat). De gebruiker moet er bij het inloggen direct een eigen
                    wachtwoord voor kiezen.{" "}
                    <button
                      className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-bold ml-2"
                      onClick={() =>
                        setRevealedPasswords((prev) => {
                          const next = { ...prev };
                          delete next[u.id];
                          return next;
                        })
                      }
                    >
                      Sluiten
                    </button>
                  </td>
                </tr>
              )}
              {emailedResets[u.id] && (
                <tr className="bg-gold-50 dark:bg-slate-700">
                  <td colSpan={10} className="py-2 px-3 text-sm">
                    Reset-e-mail verstuurd naar <strong>{emailedResets[u.id]}</strong> — het huidige wachtwoord werkt
                    niet meer, de gebruiker kiest zelf een nieuw wachtwoord via de link in die e-mail.{" "}
                    <button
                      className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-bold ml-2"
                      onClick={() =>
                        setEmailedResets((prev) => {
                          const next = { ...prev };
                          delete next[u.id];
                          return next;
                        })
                      }
                    >
                      Sluiten
                    </button>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </details>
  );
}
