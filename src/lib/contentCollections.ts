import { prisma } from "@/lib/db";

export interface ContentCollectionView {
  id: string;
  slug: string;
  name: string;
  icon: string;
  order: number;
  visibleToUsers: boolean;
}

export interface AdminContentCollection extends ContentCollectionView {
  enabled: boolean;
}

export interface ContentContext {
  switcherEnabled: boolean;
  active: ContentCollectionView;
  collections: ContentCollectionView[];
  gameKeys: string[];
}

// Vaste id uit migratie 20260922120000_content_collections; ook gebruikt om
// onderdelen aan te wijzen die alleen bij het Boek van Mormon horen (zie
// src/app/tools/page.tsx).
export const BOM_COLLECTION_ID = "content_bom";

const DEFAULT_COLLECTION: ContentCollectionView = {
  id: BOM_COLLECTION_ID,
  slug: "boek-van-mormon",
  name: "Boek van Mormon",
  icon: "📖",
  order: 0,
  visibleToUsers: true,
};

const VIEW_SELECT = { id: true, slug: true, name: true, icon: true, order: true, visibleToUsers: true } as const;

/** Welke collecties iemand mag kiezen: beheerders ook de verborgen. */
function selectableWhere(isAdmin: boolean) {
  return isAdmin ? { enabled: true } : { enabled: true, visibleToUsers: true };
}

export async function getContentSwitcherSettings(): Promise<{ enabled: boolean }> {
  const row = await prisma.contentSwitcherSettings.findUnique({ where: { id: "singleton" } });
  return { enabled: row?.enabled ?? false };
}

export async function getContentContext(userId: string): Promise<ContentContext> {
  const [settings, user] = await Promise.all([
    getContentSwitcherSettings(),
    prisma.user.findUnique({
      where: { id: userId },
      select: { activeContentCollectionId: true, isAdmin: true },
    }),
  ]);
  const collections = await prisma.contentCollection.findMany({
    where: selectableWhere(user?.isAdmin ?? false),
    orderBy: { order: "asc" },
    select: VIEW_SELECT,
  });

  const available = collections.length > 0 ? collections : [DEFAULT_COLLECTION];
  const selected = available.find((collection) => collection.id === user?.activeContentCollectionId) ?? available[0];

  const gameScopes = await prisma.gameContentScope.findMany({
    where: { contentCollectionId: selected.id },
    select: { gameKey: true },
  });

  return {
    // Met maar één zichtbare collectie valt er niets te wisselen.
    switcherEnabled: settings.enabled && available.length > 1,
    active: selected,
    collections: available,
    gameKeys: gameScopes.map((scope) => scope.gameKey),
  };
}

export async function setActiveContentCollection(
  userId: string,
  isAdmin: boolean,
  contentCollectionId: string
): Promise<ContentCollectionView> {
  const collection = await prisma.contentCollection.findFirst({
    where: { id: contentCollectionId, ...selectableWhere(isAdmin) },
    select: VIEW_SELECT,
  });
  if (!collection) throw new Error("Contentcollectie niet gevonden.");

  await prisma.user.update({
    where: { id: userId },
    data: { activeContentCollectionId: collection.id },
  });

  return collection;
}

export async function getDefaultContentCollectionId(): Promise<string | null> {
  const collection = await prisma.contentCollection.findFirst({
    where: { enabled: true },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  return collection?.id ?? null;
}


export async function updateContentSwitcherSettings(enabled: boolean): Promise<{ enabled: boolean }> {
  const row = await prisma.contentSwitcherSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", enabled },
    update: { enabled },
  });
  return { enabled: row.enabled };
}

export async function listContentCollectionsForAdmin(): Promise<AdminContentCollection[]> {
  return prisma.contentCollection.findMany({
    orderBy: { order: "asc" },
    select: { ...VIEW_SELECT, enabled: true },
  });
}

/**
 * Minstens één collectie blijft zichtbaar: anders valt getContentContext voor
 * gewone gebruikers terug op een standaardcollectie die de beheerder juist
 * verborg.
 */
export async function setContentCollectionVisibility(
  contentCollectionId: string,
  visibleToUsers: boolean
): Promise<AdminContentCollection[]> {
  if (!visibleToUsers) {
    const othersVisible = await prisma.contentCollection.count({
      where: { enabled: true, visibleToUsers: true, id: { not: contentCollectionId } },
    });
    if (othersVisible === 0) throw new Error("Er moet minstens één content zichtbaar blijven voor gebruikers.");
  }
  await prisma.contentCollection.update({ where: { id: contentCollectionId }, data: { visibleToUsers } });
  return listContentCollectionsForAdmin();
}

/**
 * Voor pagina's die je via een directe link opent (oude melding, bladwijzer):
 * verborgen content blijft dan ook echt verborgen voor gewone gebruikers.
 */
export async function isContentCollectionSelectable(contentCollectionId: string | null, isAdmin: boolean): Promise<boolean> {
  if (!contentCollectionId || isAdmin) return true;
  const count = await prisma.contentCollection.count({
    where: { id: contentCollectionId, ...selectableWhere(false) },
  });
  return count > 0;
}
