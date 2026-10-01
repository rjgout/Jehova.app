// Het mascotteregister: welke personages en states er zijn, en welke
// statische afbeelding bij een personage + state hoort. De enige plek die
// paden naar mascotte-assets kent; pagina's gebruiken alleen
// <MascotSlot character="novi" state="greeting" /> (zie
// src/components/versado/MascotSlot.tsx en public/mascots/README.md).

/** De Versado-mascottes. Alleen NOVI heeft al assets; VARO en VERA volgen later. */
export type MascotCharacter = "novi" | "vera" | "varo";

/**
 * Functionele toestanden in Versado, geen willekeurige emoties. Elke state
 * heeft precies één naam; geen synoniemen toevoegen. Een nieuwe state is een
 * bewuste ontwerpkeuze (docs/VERSADO-DESIGN.md, "Mascottes").
 */
export const MASCOT_STATES = [
  "idle",
  "greeting",
  "thinking",
  "discovery",
  "reading",
  "playing",
  "success",
  "encourage",
  "celebrate",
  "sleep",
] as const;

export type MascotState = (typeof MASCOT_STATES)[number];

export interface StaticMascotAsset {
  src: string;
  width: number;
  height: number;
}

/** Vaste naamconventie: public/mascots/static/<character>/<character>-<state>.webp */
export function staticMascotPath(character: MascotCharacter, state: MascotState): string {
  return `/mascots/static/${character}/${character}-${state}.webp`;
}

// Alleen states waarvan het bestand echt in public/mascots/static/ staat,
// met de afmetingen van dat bestand (voor een vaste verhouding zonder
// verspringen). Een nieuw bestand toevoegen = één regel hier, bv.
//   greeting: { width: 512, height: 512 },
// tests/mascots.test.ts controleert dat elk geregistreerd bestand bestaat
// en dat elk bestand in de map een geldige naam heeft.
const STATIC_ASSETS: Record<MascotCharacter, Partial<Record<MascotState, { width: number; height: number }>>> = {
  novi: {
    greeting: { width: 512, height: 468 },
  },
  // VARO en VERA bewust nog leeg: hun assets komen in een latere fase.
  vera: {},
  varo: {},
};

/** De statische afbeelding voor dit personage in deze state, of null als die er (nog) niet is. */
export function staticMascotAsset(character: MascotCharacter, state: MascotState): StaticMascotAsset | null {
  const size = STATIC_ASSETS[character][state];
  return size ? { src: staticMascotPath(character, state), ...size } : null;
}

/** Alle geregistreerde statische assets (voor de controle in de tests). */
export function registeredStaticMascots(): { character: MascotCharacter; state: MascotState; asset: StaticMascotAsset }[] {
  return (Object.keys(STATIC_ASSETS) as MascotCharacter[]).flatMap((character) =>
    MASCOT_STATES.flatMap((state) => {
      const asset = staticMascotAsset(character, state);
      return asset ? [{ character, state, asset }] : [];
    })
  );
}
