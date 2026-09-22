import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import PersonsSearch from "./persons-search";

export default async function PersonsToolPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const persons = await prisma.person.findMany({
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
          Alle {persons.length} personen uit het Boek van Mormon. Zoeken op naam of beschrijving.
        </p>
      </div>

      <PersonsSearch persons={persons} />

      <Link href="/tools" className="btn-secondary self-start">
        ← Terug
      </Link>
    </div>
  );
}
