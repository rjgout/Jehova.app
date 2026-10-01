// Het mascotteregister: welke personages en states er zijn, en welke
// statische afbeelding bij een personage + state hoort. De enige plek die
// paden naar mascotte-assets kent; pagina's gebruiken alleen
// <MascotSlot character="novi" state="greeting" /> (zie
// src/components/versado/MascotSlot.tsx en public/mascots/README.md).

/**
 * Functionele toestanden van één personage in Versado, geen willekeurige
 * emoties. Elke state heeft precies één naam; geen synoniemen toevoegen. Een
 * nieuwe state is een bewuste ontwerpkeuze (docs/VERSADO-DESIGN.md, "Mascottes").
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

/**
 * States van de drie samen ("family"). Bewust een eigen, kleine lijst: de
 * familie is geen vierde personage dat overal kan reageren. "welcome" is de
 * algemene introductie; "celebrate" is gereserveerd voor betekenisvolle
 * mijlpalen en heeft nog geen asset.
 */
export const FAMILY_STATES = ["welcome", "celebrate"] as const;

export type FamilyState = (typeof FAMILY_STATES)[number];

/** Welke states bij welk personage horen; zo is bv. family + greeting geen geldige combinatie. */
interface MascotStatesByCharacter {
  novi: MascotState;
  vera: MascotState;
  varo: MascotState;
  family: FamilyState;
}

/** De Versado-mascottes, plus "family" voor composities van de drie samen. */
export type MascotCharacter = keyof MascotStatesByCharacter;

export type MascotStateOf<C extends MascotCharacter> = MascotStatesByCharacter[C];

/** Elke geldige combinatie van personage en state, als één union. */
export type MascotTarget = { [C in MascotCharacter]: { character: C; state: MascotStateOf<C> } }[MascotCharacter];

const STATES_BY_CHARACTER: { [C in MascotCharacter]: readonly MascotStateOf<C>[] } = {
  novi: MASCOT_STATES,
  vera: MASCOT_STATES,
  varo: MASCOT_STATES,
  family: FAMILY_STATES,
};

export const MASCOT_CHARACTERS = Object.keys(STATES_BY_CHARACTER) as MascotCharacter[];

/** De toegestane states voor dit personage. */
export function mascotStates<C extends MascotCharacter>(character: C): readonly MascotStateOf<C>[] {
  return STATES_BY_CHARACTER[character];
}

export interface StaticMascotAsset {
  src: string;
  width: number;
  height: number;
}

/** Vaste naamconventie: public/mascots/static/<character>/<character>-<state>.webp */
export function staticMascotPath<C extends MascotCharacter>(character: C, state: MascotStateOf<C>): string {
  return `/mascots/static/${character}/${character}-${state}.webp`;
}

// Alleen states waarvan het bestand echt in public/mascots/static/ staat,
// met de afmetingen van dat bestand (voor een vaste verhouding zonder
// verspringen). Een nieuw bestand toevoegen = één regel hier, bv.
//   greeting: { width: 512, height: 512 },
// tests/mascots.test.ts controleert dat elk geregistreerd bestand bestaat,
// dat de afmetingen kloppen en dat elk bestand in de map een geldige naam heeft.
const STATIC_ASSETS: { [C in MascotCharacter]: Partial<Record<MascotStateOf<C>, { width: number; height: number }>> } = {
  // Alle Novi-poses komen van hetzelfde canvas (1312x1199, verkleind naar
  // 512 px breed), zodat Novi in elke state even groot is. Nog zonder
  // transparante versie, dus bewust niet geregistreerd: idle, thinking,
  // discovery, reading, celebrate, sleep.
  novi: {
    greeting: { width: 512, height: 468 },
    playing: { width: 512, height: 468 },
    success: { width: 512, height: 468 },
    encourage: { width: 512, height: 468 },
  },
  // Losse VARO- en VERA-afbeeldingen komen in een latere fase.
  vera: {},
  varo: {},
  family: {
    welcome: { width: 1200, height: 800 },
  },
};

/** De statische afbeelding voor dit personage in deze state, of null als die er (nog) niet is. */
export function staticMascotAsset<C extends MascotCharacter>(character: C, state: MascotStateOf<C>): StaticMascotAsset | null {
  const assets: Partial<Record<MascotStateOf<C>, { width: number; height: number }>> = STATIC_ASSETS[character];
  const size = assets[state];
  return size ? { src: staticMascotPath(character, state), ...size } : null;
}

/** Alle geregistreerde statische assets (voor de controle in de tests). */
export function registeredStaticMascots(): (MascotTarget & { asset: StaticMascotAsset })[] {
  return MASCOT_CHARACTERS.flatMap((character) =>
    mascotStates(character).flatMap((state) => {
      const target = { character, state } as MascotTarget;
      const asset = staticMascotAsset(target.character, target.state);
      return asset ? [{ ...target, asset }] : [];
    })
  );
}
