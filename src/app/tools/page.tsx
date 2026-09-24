import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { BOM_COLLECTION_ID, DC_COLLECTION_ID, PGP_COLLECTION_ID, getContentContext } from "@/lib/contentCollections";
import { DICTIONARY_COLLECTION_IDS } from "@/lib/dictionary";

interface Tool {
  href: string;
  title: string;
  description: string;
  icon: string;
  /** Alleen bij deze content tonen; zonder: bij alle content. */
  collectionIds?: string[];
}

// Woordenboek, bladwijzers en personages halen hun inhoud uit schriftverzen;
// bij andere content (podcasts, leerplan) slaan ze nergens op. Woordenboek en
// bladwijzers horen daarom bij de schriftcollecties, de personages (alleen
// uit het Boek van Mormon) net als de spellen bij die ene collectie.
const TOOLS: Tool[] = [
  {
    href: "/tools/dictionary",
    title: "Woordenboek",
    description: "Alle woorden uit de tekst, op letter of op lengte — ook handig bij woordspelletjes.",
    icon: "📚",
    collectionIds: DICTIONARY_COLLECTION_IDS,
  },
  {
    href: "/bookmarks",
    title: "Bladwijzers",
    description: "De verzen die je hebt opgeslagen tijdens het lezen.",
    icon: "🔖",
    collectionIds: [BOM_COLLECTION_ID, DC_COLLECTION_ID, PGP_COLLECTION_ID],
  },
  {
    href: "/tools/xp-guide",
    title: "Wat levert XP op?",
    description: "Een overzicht van elke activiteit en hoeveel XP die oplevert.",
    icon: "⭐",
  },
  {
    href: "/tools/persons",
    title: "Personages",
    description: "Wie is wie in het Boek van Mormon, inclusief familieverbanden.",
    icon: "👤",
    collectionIds: [BOM_COLLECTION_ID],
  },
];

export default async function ToolsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { active, collections } = await getContentContext(user.id);
  const visible = TOOLS.filter((tool) => !tool.collectionIds || tool.collectionIds.includes(active.id));
  // Waar de rest te vinden is, maar alleen content die deze gebruiker ook echt
  // kan kiezen (verborgen collecties niet noemen).
  const elsewhere = collections.filter(
    (collection) =>
      collection.id !== active.id && TOOLS.some((tool) => tool.collectionIds?.includes(collection.id))
  );

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">Hulpmiddelen</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Handige extra&apos;s bij het lezen en spelen.</p>
      </div>

      <div className="flex flex-col gap-3">
        {visible.map((tool) => (
          <Link key={tool.href} href={tool.href} className="card flex items-center justify-between gap-3 hover:ring-2 hover:ring-brand-400">
            <div>
              <h2 className="font-extrabold text-lg dark:text-slate-100">{tool.title}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{tool.description}</p>
            </div>
            <span className="text-2xl" aria-hidden>
              {tool.icon}
            </span>
          </Link>
        ))}
      </div>

      {visible.length < TOOLS.length && elsewhere.length > 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
          Meer hulpmiddelen vind je bij {elsewhere.map((collection) => collection.name).join(" en ")}. Wissel
          bovenaan van content.
        </p>
      )}
    </div>
  );
}
