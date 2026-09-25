import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { BOM_COLLECTION_ID, DC_COLLECTION_ID, getContentContext } from "@/lib/contentCollections";
import PersonsSearch from "./persons-search";
import { getT } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n/core";

// Collecties met eigen personages, elk met een eigen inleidende zin (de naam
// van het werk staat midden in de zin, met lidwoord). Bij andere content
// vallen we terug op het Boek van Mormon, zodat een oude link nooit een lege
// pagina geeft.
const PERSON_COLLECTIONS: Record<string, MessageKey> = {
  [BOM_COLLECTION_ID]: "persons.introBofm",
  [DC_COLLECTION_ID]: "persons.introDc",
};

export default async function PersonsToolPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = getT(user.uiLanguage);

  const { active } = await getContentContext(user.id);
  const collectionId = active.id in PERSON_COLLECTIONS ? active.id : BOM_COLLECTION_ID;

  const persons = await prisma.person.findMany({
    where: { contentCollectionId: collectionId },
    orderBy: { name: "asc" },
    include: {
      father: { select: { slug: true, name: true } },
      mother: { select: { slug: true, name: true } },
      children: { select: { slug: true, name: true }, orderBy: { name: "asc" } },
    },
  });

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">

      <div>
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">{t("persons.title")}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          {t(PERSON_COLLECTIONS[collectionId], { n: persons.length })}
        </p>
      </div>

      <PersonsSearch persons={persons} />


    </div>
  );
}
