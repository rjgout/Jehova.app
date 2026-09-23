import type { PrismaClient } from "@prisma/client";
import type { AlleskennerSeedItem } from "../src/lib/alleskenner/content";

// Zet onderdelen uit alleskennerContent.ts in de database. Een onderdeel dat
// in /adminbackend is aangepast (editedByAdmin) wordt nooit overschreven, en
// in- of uitgeschakeld blijft zoals de beheerder het liet. Onderdelen die uit
// het bestand verdwijnen, blijven bestaan: "al gezien" verwijst ernaar.
export async function importAlleskennerItems(
  client: PrismaClient,
  items: AlleskennerSeedItem[],
  log: (msg: string) => void = console.log
): Promise<void> {
  let created = 0;
  let updated = 0;
  let kept = 0;

  for (const item of items) {
    const data = JSON.stringify(item.data);
    const existing = await client.alleskennerItem.findUnique({
      where: { id: item.id },
      select: { editedByAdmin: true, data: true },
    });
    if (!existing) {
      await client.alleskennerItem.create({ data: { id: item.id, kind: item.kind, data } });
      created++;
    } else if (existing.editedByAdmin) {
      kept++;
    } else if (existing.data !== data) {
      await client.alleskennerItem.update({ where: { id: item.id }, data: { kind: item.kind, data } });
      updated++;
    }
  }

  log(`Alleskenner: ${created} nieuw, ${updated} bijgewerkt, ${kept} door beheer aangepast (ongemoeid).`);
}
