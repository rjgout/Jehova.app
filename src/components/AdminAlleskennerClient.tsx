"use client";

import { useEffect, useMemo, useState } from "react";

type Kind = "QUESTION" | "TOPIC" | "PUZZLE" | "GALLERY" | "MEMORY";

interface Item {
  id: string;
  kind: Kind;
  data: Record<string, unknown>;
  enabled: boolean;
  editedByAdmin: boolean;
  inFile: boolean;
}

const KIND_LABEL: Record<Kind, string> = {
  QUESTION: "3-6-9-vraag",
  TOPIC: "Onderwerp",
  PUZZLE: "Puzzel",
  GALLERY: "Galerij",
  MEMORY: "Geheugen",
};

function summary(item: Item): string {
  const d = item.data as Record<string, unknown>;
  if (item.kind === "QUESTION") return String(d.prompt ?? "");
  if (item.kind === "TOPIC") return String(d.subject ?? "");
  if (item.kind === "MEMORY") return `${d.title ?? ""} (${d.passage ?? ""})`;
  if (item.kind === "PUZZLE") return ((d.groups as { answer: string }[]) ?? []).map((g) => g.answer).join(" · ");
  if (item.kind === "GALLERY") return d.variant === "QUOTES" ? "Citaten" : "Illustraties";
  return "";
}

/**
 * Editor voor bestaande onderdelen van De Alleskenner (zie docs/ALLESKENNER.md,
 * "Inhoud"): corrigeren, uitschakelen of terugzetten naar het inhoudsbestand.
 * Nieuwe onderdelen komen bewust niet via hier binnen.
 */
export default function AdminAlleskennerClient() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [kind, setKind] = useState<Kind | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/alleskenner");
    const data = await res.json().catch(() => ({}));
    setItems(data.items ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter(
      (item) =>
        (kind === "ALL" || item.kind === kind) &&
        (!q || item.id.includes(q) || summary(item).toLowerCase().includes(q) || JSON.stringify(item.data).toLowerCase().includes(q))
    );
  }, [items, kind, query]);

  function open(item: Item) {
    if (openId === item.id) {
      setOpenId(null);
      return;
    }
    setOpenId(item.id);
    setDraft(JSON.stringify(item.data, null, 2));
    setErrors([]);
    setMessage(null);
  }

  async function send(id: string, body: unknown, success: string) {
    setBusy(true);
    setErrors([]);
    setMessage(null);
    const res = await fetch(`/api/admin/alleskenner/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErrors(data.errors ?? [data.error ?? "Opslaan mislukt."]);
      return false;
    }
    setMessage(success);
    await load();
    return true;
  }

  async function save(item: Item) {
    let data: unknown;
    try {
      data = JSON.parse(draft);
    } catch {
      setErrors(["Dit is geen geldige JSON (let op komma's en aanhalingstekens)."]);
      return;
    }
    await send(item.id, { data }, "Opgeslagen en gecontroleerd.");
  }

  async function reset(item: Item) {
    if (!window.confirm("Terugzetten naar de versie uit het inhoudsbestand? Je correctie gaat verloren.")) return;
    if (await send(item.id, { reset: true }, "Teruggezet naar het inhoudsbestand.")) {
      const res = await fetch("/api/admin/alleskenner");
      const fresh = (await res.json()).items as Item[];
      const updated = fresh.find((i) => i.id === item.id);
      if (updated) setDraft(JSON.stringify(updated.data, null, 2));
    }
  }

  return (
    <section className="card flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-extrabold dark:text-slate-100">De Alleskenner — inhoud</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Corrigeer of schakel bestaande onderdelen uit. Bij opslaan wordt alles opnieuw gecontroleerd, ook of elk citaat
          letterlijk in het genoemde vers staat. Aangepaste onderdelen worden bij een volgende import niet overschreven.
          Nieuwe vragen komen via het inhoudsbestand.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select className="input !w-auto" value={kind} onChange={(e) => setKind(e.target.value as Kind | "ALL")}>
          <option value="ALL">Alle soorten ({items?.length ?? 0})</option>
          {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]} ({items?.filter((i) => i.kind === k).length ?? 0})
            </option>
          ))}
        </select>
        <input className="input flex-1 min-w-[10rem]" placeholder="Zoeken..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {items === null ? (
        <p className="text-sm text-slate-400">Laden...</p>
      ) : (
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700 max-h-[36rem] overflow-y-auto">
          {visible.map((item) => (
            <li key={item.id} className="py-2">
              <div className="flex items-center gap-2">
                <button className="flex-1 min-w-0 text-left" onClick={() => open(item)}>
                  <span className="text-xs font-mono text-slate-400">{item.id}</span>{" "}
                  <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {KIND_LABEL[item.kind]}
                  </span>
                  {item.editedByAdmin && (
                    <span className="ml-1 rounded-full bg-gold-50 dark:bg-slate-700 px-2 py-0.5 text-[11px] font-bold text-gold-700 dark:text-gold-400">
                      aangepast
                    </span>
                  )}
                  <span className={`block truncate text-sm ${item.enabled ? "dark:text-slate-100" : "text-slate-400 line-through"}`}>
                    {summary(item)}
                  </span>
                </button>
                <label className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 shrink-0">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    disabled={busy}
                    onChange={(e) => send(item.id, { enabled: e.target.checked }, e.target.checked ? "Ingeschakeld." : "Uitgeschakeld.")}
                  />
                  aan
                </label>
              </div>

              {openId === item.id && (
                <div className="mt-2 flex flex-col gap-2">
                  <textarea
                    className="input font-mono !text-xs min-h-[18rem]"
                    value={draft}
                    spellCheck={false}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  {errors.length > 0 && (
                    <ul className="text-sm text-red-600 dark:text-red-400 list-disc pl-5">
                      {errors.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  )}
                  {message && <p className="text-sm font-semibold text-green-600 dark:text-green-400">{message}</p>}
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-primary !py-1.5 !text-sm" disabled={busy} onClick={() => save(item)}>
                      Opslaan
                    </button>
                    {item.editedByAdmin && item.inFile && (
                      <button className="btn-secondary !py-1.5 !text-sm" disabled={busy} onClick={() => reset(item)}>
                        Terugzetten naar bestand
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
