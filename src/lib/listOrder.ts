// Kleine, gedeelde helpers voor de persoonlijke sleepvolgorde van cursussen
// (/courses) en spelletjes (/live) — zie /api/list-order en het
// UserListOrder-model. Bewust geen "use client": applyPersonalOrder wordt ook
// op de server gebruikt (Vandaag), en de fetch-helpers roep je alleen vanuit
// de browser aan.

export type ListKey = "courses" | "games";

/** Past een eerder opgeslagen volgorde toe; nieuwe/onbekende items komen achteraan, in hun oorspronkelijke volgorde. */
export function applyPersonalOrder<T extends { id: string }>(items: T[], order: string[]): T[] {
  if (order.length === 0) return items;
  const byId = new Map(items.map((i) => [i.id, i]));
  const ordered: T[] = [];
  for (const id of order) {
    const item = byId.get(id);
    if (item) {
      ordered.push(item);
      byId.delete(id);
    }
  }
  return [...ordered, ...byId.values()];
}

export async function fetchListOrder(listKey: ListKey): Promise<string[]> {
  const res = await fetch(`/api/list-order?listKey=${listKey}`);
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  return data?.order ?? [];
}

/** Fire-and-forget opslaan — de UI is al direct bijgewerkt (optimistisch), dit hoeft niets terug te geven. */
export function saveListOrder(listKey: ListKey, itemKeys: string[]): void {
  fetch("/api/list-order", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listKey, itemKeys }),
  }).catch(() => {});
}
