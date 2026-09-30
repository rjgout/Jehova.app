// Register van beeld per sleutel (zie docs/VERSADO-DESIGN.md, "Upcoming
// design assets"). De definitieve Versado-artwork wordt later aangeleverd;
// tot die tijd is dit register leeg en tonen MediaArtwork en MascotSlot een
// neutrale plek of niets. Nieuwe artwork komt hier (of later uit de
// database) bij, per sleutel, zonder dat een pagina verandert.
//
// Sleutels: "<soort>:<id>", bv. "course:FRONT_TO_BACK", "game:jigsaw",
// "podcast:<podcastId>", "daily:text". Bewust niet de emoji uit de database
// (Achievement.icon, ContentCollection.icon) als bron.

export type ArtworkKind = "course" | "podcast" | "game" | "daily" | "reading" | "quiz" | "social";

export interface ArtworkAsset {
  src: string;
  /** Leeg voor puur decoratief beeld. */
  alt?: string;
  /** Hoe het beeld in een kader met een andere verhouding valt. */
  fit?: "cover" | "contain";
  /** Brandpunt bij bijsnijden, bv. "50% 30%". */
  position?: string;
}

const ARTWORK: Record<string, ArtworkAsset> = {};

export function artworkFor(key: string | null | undefined): ArtworkAsset | null {
  return key ? ARTWORK[key] ?? null : null;
}
