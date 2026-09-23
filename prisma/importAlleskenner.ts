import type { PrismaClient } from "@prisma/client";
import type { AlleskennerSeedItem } from "../src/lib/alleskenner/content";

// Zet onderdelen uit alleskennerContent.ts (en de automatisch samengestelde
// uit alleskennerGenerated.ts) in de database. Een onderdeel dat in
// /adminbackend is aangepast (editedByAdmin) wordt nooit overschreven, en in-
// of uitgeschakeld blijft zoals de beheerder het liet. Onderdelen die uit het
// bestand verdwijnen, blijven bestaan: "al gezien" verwijst ernaar.
//
// In bulk (één keer alles ophalen, nieuwe in één createMany): met ruim duizend
// onderdelen is één query per onderdeel merkbaar traag, en dit draait ook bij
// de eerste spelstart na een update (zie ensureAlleskennerContent).
export async function importAlleskennerItems(
  client: PrismaClient,
  items: AlleskennerSeedItem[],
  log: (msg: string) => void = console.log
): Promise<void> {
  const existing = new Map(
    (
      await client.alleskennerItem.findMany({
        where: { id: { in: items.map((i) => i.id) } },
        select: { id: true, editedByAdmin: true, data: true },
      })
    ).map((row) => [row.id, row])
  );

  const toCreate = items.filter((item) => !existing.has(item.id));
  const toUpdate = items.filter((item) => {
    const row = existing.get(item.id);
    return row && !row.editedByAdmin && row.data !== JSON.stringify(item.data);
  });
  const kept = items.filter((item) => existing.get(item.id)?.editedByAdmin).length;

  if (toCreate.length > 0) {
    await client.alleskennerItem.createMany({
      data: toCreate.map((item) => ({ id: item.id, kind: item.kind, data: JSON.stringify(item.data) })),
      skipDuplicates: true,
    });
  }
  for (const item of toUpdate) {
    await client.alleskennerItem.update({ where: { id: item.id }, data: { kind: item.kind, data: JSON.stringify(item.data) } });
  }

  log(`Alleskenner: ${toCreate.length} nieuw, ${toUpdate.length} bijgewerkt, ${kept} door beheer aangepast (ongemoeid).`);
}
