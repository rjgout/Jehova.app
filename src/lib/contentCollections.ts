import { prisma } from "@/lib/db";

export interface ContentCollectionView {
  id: string;
  slug: string;
  name: string;
  icon: string;
  order: number;
}

export interface ContentContext {
  switcherEnabled: boolean;
  active: ContentCollectionView;
  collections: ContentCollectionView[];
  gameKeys: string[];
}

const DEFAULT_COLLECTION: ContentCollectionView = {
  id: "content_bom",
  slug: "boek-van-mormon",
  name: "Boek van Mormon",
  icon: "📖",
  order: 0,
};

export async function getContentSwitcherSettings(): Promise<{ enabled: boolean }> {
  const row = await prisma.contentSwitcherSettings.findUnique({ where: { id: "singleton" } });
  return { enabled: row?.enabled ?? false };
}

export async function getContentContext(userId: string): Promise<ContentContext> {
  const [settings, collections, user] = await Promise.all([
    getContentSwitcherSettings(),
    prisma.contentCollection.findMany({
      where: { enabled: true },
      orderBy: { order: "asc" },
      select: { id: true, slug: true, name: true, icon: true, order: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { activeContentCollectionId: true },
    }),
  ]);

  const available = collections.length > 0 ? collections : [DEFAULT_COLLECTION];
  const selected = available.find((collection) => collection.id === user?.activeContentCollectionId) ?? available[0];

  const gameScopes = await prisma.gameContentScope.findMany({
    where: { contentCollectionId: selected.id },
    select: { gameKey: true },
  });

  return {
    switcherEnabled: settings.enabled && available.length > 0,
    active: selected,
    collections: available,
    gameKeys: gameScopes.map((scope) => scope.gameKey),
  };
}

export async function setActiveContentCollection(userId: string, contentCollectionId: string): Promise<ContentCollectionView> {
  const collection = await prisma.contentCollection.findFirst({
    where: { id: contentCollectionId, enabled: true },
    select: { id: true, slug: true, name: true, icon: true, order: true },
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
