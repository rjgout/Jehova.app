// Welke inhoud is "hetzelfde", los van cursus, route of taal.
//
// Voortgang en beloningen horen bij de inhoud, niet bij de cursus (zie
// docs/LEERVOORTGANG.md). Een hoofdstuk is dezelfde inhoud in elke
// leesroute en in elke taaleditie: Book.key ("bofm/alma") plus het
// hoofdstuknummer is overal gelijk. Content zonder vaste bron (Book.key
// null, bv. een eigen import) valt terug op het hoofdstuk-id zelf.
//
// Let op: de migratie 20261002150000_learning_progress berekent dezelfde
// sleutel in SQL. Verander je het formaat, pas dan ook daar de backfill aan.

export interface ChapterIdentity {
  id: string;
  number: number;
  bookKey: string | null;
}

export function contentKeyForChapter(chapter: ChapterIdentity): string {
  return chapter.bookKey ? `${chapter.bookKey}#${chapter.number}` : `chapter:${chapter.id}`;
}
