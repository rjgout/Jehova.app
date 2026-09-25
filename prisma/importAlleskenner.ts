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

/**
 * Zet vertalingen van onderdelen in de database (zie prisma/alleskennerTranslate.ts).
 * Per taal is de lijst compleet: een vertaling die niet meer gemaakt wordt
 * (bv. omdat het onderdeel in die taal niet meer past) verdwijnt, zodat het
 * spel dat onderdeel in die taal niet meer kiest. Draait na importAlleskennerItems.
 */
export async function importAlleskennerTranslations(
  client: PrismaClient,
  seeds: { itemId: string; language: string; data: unknown }[],
  log: (msg: string) => void = console.log
): Promise<void> {
  const languages = [...new Set(seeds.map((s) => s.language))];
  const known = new Set(
    (await client.alleskennerItem.findMany({ where: { id: { in: seeds.map((s) => s.itemId) } }, select: { id: true } })).map((r) => r.id)
  );
  const wanted = new Map(seeds.filter((s) => known.has(s.itemId)).map((s) => [`${s.itemId}|${s.language}`, s]));
  const existing = await client.alleskennerItemTranslation.findMany({
    where: { language: { in: languages } },
    select: { itemId: true, language: true, data: true },
  });
  const existingByKey = new Map(existing.map((row) => [`${row.itemId}|${row.language}`, row]));

  const stale = existing.filter((row) => !wanted.has(`${row.itemId}|${row.language}`));
  for (const row of stale) {
    await client.alleskennerItemTranslation.delete({ where: { itemId_language: { itemId: row.itemId, language: row.language } } });
  }
  const toCreate = [...wanted.values()].filter((s) => !existingByKey.has(`${s.itemId}|${s.language}`));
  if (toCreate.length > 0) {
    await client.alleskennerItemTranslation.createMany({
      data: toCreate.map((s) => ({ itemId: s.itemId, language: s.language, data: JSON.stringify(s.data) })),
      skipDuplicates: true,
    });
  }
  const toUpdate = [...wanted.values()].filter((s) => {
    const row = existingByKey.get(`${s.itemId}|${s.language}`);
    return row && row.data !== JSON.stringify(s.data);
  });
  for (const s of toUpdate) {
    await client.alleskennerItemTranslation.update({
      where: { itemId_language: { itemId: s.itemId, language: s.language } },
      data: { data: JSON.stringify(s.data) },
    });
  }
  log(`Alleskenner-vertalingen (${languages.join(", ")}): ${toCreate.length} nieuw, ${toUpdate.length} bijgewerkt, ${stale.length} verwijderd.`);
}
