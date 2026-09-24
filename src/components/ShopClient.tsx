"use client";

import { useEffect, useState } from "react";
import { announceXpChanged } from "@/lib/xpBroadcast";

interface ShopData {
  xpTotal: number;
  hintBalance: number;
  hintPriceXp: number;
  freezeCount: number;
  freezePriceXp: number;
}

export default function ShopClient() {
  const [data, setData] = useState<ShopData | null>(null);
  const [hintQuantity, setHintQuantity] = useState(1);
  const [buyingHints, setBuyingHints] = useState(false);
  const [hintMessage, setHintMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [freezeQuantity, setFreezeQuantity] = useState(1);
  const [buyingFreezes, setBuyingFreezes] = useState(false);
  const [freezeMessage, setFreezeMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  function load() {
    fetch("/api/shop")
      .then((r) => r.json())
      .then(setData);
  }

  useEffect(load, []);

  async function buyHints() {
    if (!data) return;
    setBuyingHints(true);
    setHintMessage(null);
    const res = await fetch("/api/shop/hints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: hintQuantity }),
    });
    const body = await res.json().catch(() => ({}));
    setBuyingHints(false);
    if (!res.ok) {
      setHintMessage({ type: "error", text: body.error ?? "Kon de aankoop niet voltooien." });
      return;
    }
    setData({ ...data, xpTotal: body.xpTotal, hintBalance: body.hintBalance });
    setHintMessage({ type: "ok", text: `${hintQuantity} hint${hintQuantity > 1 ? "s" : ""} gekocht! 💡` });
    announceXpChanged();
  }

  async function buyFreezes() {
    if (!data) return;
    setBuyingFreezes(true);
    setFreezeMessage(null);
    const res = await fetch("/api/shop/freezes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: freezeQuantity }),
    });
    const body = await res.json().catch(() => ({}));
    setBuyingFreezes(false);
    if (!res.ok) {
      setFreezeMessage({ type: "error", text: body.error ?? "Kon de aankoop niet voltooien." });
      return;
    }
    setData({ ...data, xpTotal: body.xpTotal, freezeCount: body.freezeCount });
    setFreezeMessage({ type: "ok", text: `${freezeQuantity} freeze${freezeQuantity > 1 ? "s" : ""} gekocht! 🧊` });
    announceXpChanged();
  }

  if (!data) return <p className="text-slate-400 dark:text-slate-500 text-center">Laden...</p>;

  const hintCost = hintQuantity * data.hintPriceXp;
  const canAffordHints = data.xpTotal >= hintCost;
  const freezeCost = freezeQuantity * data.freezePriceXp;
  const canAffordFreezes = data.xpTotal >= freezeCost;

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      <div className="card bg-gradient-to-br from-brand-500 to-brand-700 dark:from-brand-600 dark:to-brand-900 text-white flex flex-col items-center gap-1 !py-8">
        <span className="text-4xl" aria-hidden>
          ⭐
        </span>
        <div className="text-4xl font-extrabold leading-none">{data.xpTotal}</div>
        <div className="text-brand-100 font-bold text-sm mt-1">XP beschikbaar</div>
      </div>

      {/* Een aankoop telt ook in de wekelijkse competitie (zie src/lib/shop.ts):
          dat moet vóór de aankoop duidelijk zijn, niet pas als je gedegradeerd bent. */}
      <div className="card !py-4 flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300">
        <h2 className="font-extrabold text-slate-800 dark:text-slate-100">ℹ️ Goed om te weten</h2>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>Wat je koopt, gaat van je XP af. Ook je plek op de Nederlandse ranglijst zakt daardoor.</li>
          <li>
            Het gaat ook van je XP van deze week in je divisie af. Je weekscore kan daardoor onder nul komen.
          </li>
          <li>
            Koop je iets in een week waarin je nog niet geoefend hebt, dan doe je die week toch mee in je divisie,
            met een negatieve score. Dan kun je degraderen.
          </li>
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="card !py-3 !px-5 !bg-brand-50 dark:!bg-slate-800 !border-brand-100 dark:!border-slate-700">
          <div className="text-xl font-extrabold text-brand-600 dark:text-brand-300">💡 {data.hintBalance}</div>
          <div className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Hints</div>
        </div>
        <div className="card !py-3 !px-5 !bg-ice-50 dark:!bg-slate-800 !border-ice-400/30 dark:!border-slate-700">
          <div className="text-xl font-extrabold text-ice-600 dark:text-ice-400">🧊 {data.freezeCount}</div>
          <div className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Freezes</div>
        </div>
      </div>

      <div className="card flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-extrabold text-lg dark:text-slate-100">💡 Hint</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Highlight bij het Woordspel welke letters op je rek samen een woord kunnen vormen — overal inzetbaar
              waar hints gebruikt kunnen worden, ongeacht hoeveel je er verzamelt.
            </p>
          </div>
          <span className="text-sm font-extrabold text-gold-600 dark:text-gold-400 whitespace-nowrap bg-gold-50 dark:bg-slate-700 rounded-full px-3 py-1">
            {data.hintPriceXp} XP
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-2 text-sm dark:text-slate-200">
            Aantal
            <select
              className="input !w-20 text-center"
              value={hintQuantity}
              onChange={(e) => setHintQuantity(Number(e.target.value))}
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary !px-4 !py-2" disabled={buyingHints || !canAffordHints} onClick={buyHints}>
            {buyingHints ? "Bezig..." : `Koop voor ${hintCost} XP`}
          </button>
        </div>
        {!canAffordHints && <p className="text-xs text-red-500 dark:text-red-400">Je hebt niet genoeg XP.</p>}
        {hintMessage && (
          <p
            className={`text-sm font-semibold ${
              hintMessage.type === "ok" ? "text-brand-600 dark:text-brand-300" : "text-red-600 dark:text-red-400"
            }`}
          >
            {hintMessage.text}
          </p>
        )}
      </div>

      <div className="card flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-extrabold text-lg dark:text-slate-100">🧊 Streak freeze</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Redt je dagstreak automatisch als je een keer geen tijd hebt om te oefenen — net als een freeze die je
              verdient op een mijlpaal of van een vriend krijgt.
            </p>
          </div>
          <span className="text-sm font-extrabold text-gold-600 dark:text-gold-400 whitespace-nowrap bg-gold-50 dark:bg-slate-700 rounded-full px-3 py-1">
            {data.freezePriceXp} XP
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-2 text-sm dark:text-slate-200">
            Aantal
            <select
              className="input !w-20 text-center"
              value={freezeQuantity}
              onChange={(e) => setFreezeQuantity(Number(e.target.value))}
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            className="btn-primary !px-4 !py-2"
            disabled={buyingFreezes || !canAffordFreezes}
            onClick={buyFreezes}
          >
            {buyingFreezes ? "Bezig..." : `Koop voor ${freezeCost} XP`}
          </button>
        </div>
        {!canAffordFreezes && <p className="text-xs text-red-500 dark:text-red-400">Je hebt niet genoeg XP.</p>}
        {freezeMessage && (
          <p
            className={`text-sm font-semibold ${
              freezeMessage.type === "ok" ? "text-brand-600 dark:text-brand-300" : "text-red-600 dark:text-red-400"
            }`}
          >
            {freezeMessage.text}
          </p>
        )}
      </div>
    </div>
  );
}
