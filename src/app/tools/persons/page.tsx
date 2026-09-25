import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { BOM_COLLECTION_ID, DC_COLLECTION_ID, getContentContext } from "@/lib/contentCollections";
import PersonsSearch from "./persons-search";

// Collecties met eigen personages, met de naam zoals die midden in een zin
// staat (lidwoord erbij). Bij andere content vallen we terug op het Boek van
// Mormon, zodat een oude link nooit een lege pagina geeft.
const PERSON_COLLECTIONS: Record<string, string> = {
  [BOM_COLLECTION_ID]: "het Boek van Mormon",
  [DC_COLLECTION_ID]: "de Leer en Verbonden",
};

export default async function PersonsToolPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

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
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">👤 Personages</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Alle {persons.length} personen uit {PERSON_COLLECTIONS[collectionId]}. Zoeken op naam of beschrijving.
        </p>
      </div>

      <PersonsSearch persons={persons} />


    </div>
  );
}
