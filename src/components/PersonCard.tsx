"use client";

import { useState } from "react";
import { useT } from "@/components/I18nProvider";

interface PersonInfo {
  slug: string;
  name: string;
  description: string | null;
  father: { slug: string; name: string } | null;
  children: { slug: string; name: string }[];
}

/**
 * "Tik op een naam"-kaartje — leest live uit de Person-tabel via
 * /api/persons/[slug] (dus altijd in sync, nooit een gekopieerde
 * beschrijving in de lescontent zelf). Gebruikt <details>/<summary>, net als
 * andere uitklapbare kaartjes elders in de app (bv. PodcastCourseView) —
 * geen nieuwe tooltip-library nodig, en werkt vanzelf ook met toetsenbord/
 * schermlezers.
 *
 * Vader/kinderen tonen we bewust ook als (geneste) PersonCard's, in plaats
 * van een link naar een aparte pagina: dit kaartje verschijnt altijd middenin
 * een les, en wegnavigeren zou je voortgang in die les (welk contentblok je
 * al gezien had) kwijtraken — dat is client-only React-state die niet
 * overleeft bij het opnieuw laden van de lespagina, ook niet via de
 * "terug"-knop van de browser. Helemaal niet wegnavigeren lost dat in de
 * kern op i.p.v. het te symptoombestrijden.
 */
export default function PersonCard({ slug, name }: { slug: string; name: string }) {
  const t = useT();
  const [info, setInfo] = useState<PersonInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [opened, setOpened] = useState(false);

  function onToggle(e: React.SyntheticEvent<HTMLDetailsElement>) {
    const isOpen = e.currentTarget.open;
    if (isOpen && !opened) {
      setOpened(true);
      setLoading(true);
      fetch(`/api/persons/${slug}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setInfo(data))
        .finally(() => setLoading(false));
    }
  }

  return (
    <details
      className="group inline-block align-baseline"
      onToggle={onToggle}
    >
      <summary className="cursor-pointer select-none list-none font-extrabold text-brand-700 dark:text-brand-300 underline decoration-dotted underline-offset-4">
        {name}
      </summary>
      <div className="mt-2 card !p-4 max-w-xs text-sm flex flex-col gap-2 animate-pop">
        {loading && <p className="text-slate-400 dark:text-slate-500">{t("common.loading")}</p>}
        {!loading && info && (
          <>
            <p className="font-extrabold dark:text-slate-100">{info.name}</p>
            {info.description && <p className="text-slate-600 dark:text-slate-300">{info.description}</p>}
            {info.father && (
              <p className="text-slate-500 dark:text-slate-400">
                {t("persons.father")} <PersonCard slug={info.father.slug} name={info.father.name} />
              </p>
            )}
            {info.children.length > 0 && (
              <p className="text-slate-500 dark:text-slate-400">
                {t("persons.children")}{" "}
                {info.children.map((c, i) => (
                  <span key={c.slug}>
                    <PersonCard slug={c.slug} name={c.name} />
                    {i < info.children.length - 1 ? ", " : ""}
                  </span>
                ))}
              </p>
            )}
          </>
        )}
        {!loading && !info && <p className="text-slate-400 dark:text-slate-500">{t("persons.notFound")}</p>}
      </div>
    </details>
  );
}
