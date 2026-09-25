import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { BOM_COLLECTION_ID, DC_COLLECTION_ID, getContentContext, type ContentCollectionView } from "@/lib/contentCollections";
import { DICTIONARY_COLLECTION_IDS } from "@/lib/dictionary";
import { getT } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n/core";

interface Tool {
  href: string;
  titleKey: MessageKey;
  textKey: MessageKey;
  icon: string;
  /** Alleen bij deze uitgaven tonen (inhoud die per taal apart bestaat). */
  collectionIds?: string[];
  /** Alleen bij deze werken tonen, in elke taal (zie ContentCollection.work). */
  works?: string[];
}

function toolFits(tool: Tool, collection: ContentCollectionView): boolean {
  if (tool.collectionIds && !tool.collectionIds.includes(collection.id)) return false;
  if (tool.works && !(collection.work && tool.works.includes(collection.work))) return false;
  return true;
}

// Woordenboek, bladwijzers en personages halen hun inhoud uit schriftverzen;
// bij andere content (podcasts, leerplan) slaan ze nergens op. Bladwijzers
// werken bij elk schrift in elke taal (per werk). Woordenboek en personages
// bestaan per uitgave: een woordenlijst en beschrijvingen zijn taalgebonden,
// dus die tonen we alleen waar ze echt voor gemaakt zijn.
const TOOLS: Tool[] = [
  {
    href: "/tools/dictionary",
    titleKey: "pages.dictionary",
    textKey: "tools.dictionaryText",
    icon: "📚",
    collectionIds: DICTIONARY_COLLECTION_IDS,
  },
  {
    href: "/bookmarks",
    titleKey: "pages.bookmarks",
    textKey: "tools.bookmarksText",
    icon: "🔖",
    works: ["bofm", "dc-testament", "pgp"],
  },
  {
    href: "/tools/xp-guide",
    titleKey: "pages.xpGuide",
    textKey: "tools.xpGuideText",
    icon: "⭐",
  },
  {
    href: "/tools/persons",
    titleKey: "pages.persons",
    textKey: "tools.personsText",
    icon: "👤",
    collectionIds: [BOM_COLLECTION_ID, DC_COLLECTION_ID],
  },
];

export default async function ToolsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = getT(user.uiLanguage);

  const { active, collections } = await getContentContext(user.id);
  const visible = TOOLS.filter((tool) => toolFits(tool, active));
  // Waar de rest te vinden is, maar alleen content die deze gebruiker ook echt
  // kan kiezen (verborgen collecties niet noemen).
  const elsewhere = collections.filter(
    (collection) =>
      collection.id !== active.id && TOOLS.some((tool) => (tool.collectionIds || tool.works) && toolFits(tool, collection))
  );

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-800 dark:text-brand-300">{t("pages.tools")}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">{t("tools.subtitle")}</p>
      </div>

      <div className="flex flex-col gap-3">
        {visible.map((tool) => (
          <Link key={tool.href} href={tool.href} className="card flex items-center justify-between gap-3 hover:ring-2 hover:ring-brand-400">
            <div>
              <h2 className="font-extrabold text-lg dark:text-slate-100">{t(tool.titleKey)}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t(tool.textKey)}</p>
            </div>
            <span className="text-2xl" aria-hidden>
              {tool.icon}
            </span>
          </Link>
        ))}
      </div>

      {visible.length < TOOLS.length && elsewhere.length > 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
          {t("tools.moreElsewhere", { names: elsewhere.map((collection) => collection.name).join(` ${t("akGame.listAnd")} `) })}
        </p>
      )}
    </div>
  );
}
