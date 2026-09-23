"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROUNDS = [
  { icon: "3️⃣", title: "3-6-9", text: "Vijftien vragen. Goed = je mag door. Bij vraag 3, 6, 9, 12 en 15 verdien je 10 seconden.", full: false },
  { icon: "🚪", title: "Open Deur", text: "Kies een onderwerp en noem vier antwoorden. Elk antwoord levert 20 seconden op.", full: true },
  { icon: "🧩", title: "Puzzel", text: "Twaalf omschrijvingen, drie groepen van vier. Elk verbindend woord levert 30 seconden op.", full: false },
  { icon: "🖼️", title: "Galerij", text: "Acht citaten of illustraties: noem het boek of het verhaal. 15 seconden per goed antwoord.", full: true },
  { icon: "📖", title: "Collectief Geheugen", text: "Lees een passage, daarna vijf antwoorden. Elk volgend antwoord is meer waard: 10 tot 50 seconden.", full: true },
  { icon: "🏁", title: "Finale", text: "De twee met de meeste seconden. Elk goed antwoord kost je tegenstander 20 seconden.", full: false },
];

export default function AlleskennerSetupClient() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/live/create-alleskenner", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      setError(data.error ?? "Kon geen spel maken.");
      return;
    }
    router.push(`/live/${data.code}`);
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="card !bg-gradient-to-br from-brand-600 to-brand-800 text-white flex flex-col gap-3 !border-0">
        <p className="text-4xl" aria-hidden>
          🧠
        </p>
        <h1 className="text-3xl font-extrabold">De Alleskenner</h1>
        <p className="text-brand-100">
          Een quizavond voor als je bij elkaar bent. Iedereen speelt op zijn eigen telefoon; seconden zijn de enige
          score. Wie in de finale de ander op nul zet, is de Alleskenner.
        </p>
        <button className="btn-primary !bg-gold-500 !text-brand-900 self-start mt-1" onClick={create} disabled={busy}>
          {busy ? "Bezig..." : "Nieuw spel maken"}
        </button>
        {error && <p className="text-sm font-semibold text-red-200">{error}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {ROUNDS.map((round) => (
          <div key={round.title} className="card flex flex-col gap-1">
            <p className="text-2xl" aria-hidden>
              {round.icon}
            </p>
            <h2 className="font-extrabold dark:text-slate-100">{round.title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{round.text}</p>
            <p className="mt-auto pt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {round.full ? "Alleen volledig spel" : "Kort en volledig spel"}
            </p>
          </div>
        ))}
      </div>

      <div className="card flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300">
        <h2 className="font-extrabold text-base dark:text-slate-100">Met of zonder quizmaster</h2>
        <p>
          <strong>Met quizmaster:</strong> je antwoordt hardop en de quizmaster (standaard de maker van het spel) keurt
          je antwoord goed of fout op zijn eigen scherm. Hij speelt zelf niet mee.
        </p>
        <p>
          <strong>Zonder quizmaster:</strong> iedereen tikt zijn antwoord op zijn eigen telefoon. Handig met twee of drie
          spelers.
        </p>
        <p>
          <strong>Teams:</strong> vanaf zes spelers kun je in teams spelen. Alleen het antwoord van de teamleider telt voor
          het team; de anderen kiezen stil mee voor hun persoonlijke punten.
        </p>
        <p>Wie niet meespeelt, kan meekijken als toeschouwer.</p>
      </div>
    </div>
  );
}
