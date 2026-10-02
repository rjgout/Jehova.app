"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import MascotSlot from "@/components/versado/MascotSlot";
import { DEFAULT_PERSONAL_MASCOT, type MascotState, type MascotTarget, type PersonalMascotCharacter } from "@/lib/mascots";

// De persoonlijke gids (User.companion) voor de hele app. Een feature kiest
// alleen de reactie, deze laag bepaalt wie hem uitvoert:
//
//   feature → <PersonalMascot state="success" /> → gekozen gids →
//   <MascotSlot character state /> → geregistreerde asset (nu WebP, later Rive)
//
// MascotSlot zelf blijft generiek; contextueel beeld van één bepaald
// personage of de familie gebruikt MascotSlot direct.

interface CompanionValue {
  character: PersonalMascotCharacter;
  /** Na een geslaagde wijziging (profiel, onboarding): meteen overal de nieuwe gids, zonder te herladen. */
  setCharacter: (character: PersonalMascotCharacter) => void;
}

// Zonder provider (bv. een los getoond component) gewoon Novi.
const CompanionContext = createContext<CompanionValue>({ character: DEFAULT_PERSONAL_MASCOT, setCharacter: () => {} });

export function CompanionProvider({ character, children }: { character: PersonalMascotCharacter; children: ReactNode }) {
  const [current, setCurrent] = useState(character);
  // De layout blijft bij navigeren staan; een nieuwe waarde van de server
  // (bv. na router.refresh of inloggen als iemand anders) gaat wel voor.
  useEffect(() => setCurrent(character), [character]);
  const value = useMemo(() => ({ character: current, setCharacter: setCurrent }), [current]);
  return <CompanionContext.Provider value={value}>{children}</CompanionContext.Provider>;
}

export function useCompanion(): CompanionValue {
  return useContext(CompanionContext);
}

interface PersonalMascotProps {
  state: MascotState;
  size?: number;
  fill?: boolean;
  className?: string;
}

/** De gekozen gids in deze state. Decoratief, zoals elke mascotte: de betekenis staat altijd ook als tekst in beeld. */
export default function PersonalMascot({ state, ...rest }: PersonalMascotProps) {
  const { character } = useCompanion();
  // Novi, Varo en Vera hebben exact dezelfde states (zie PERSONAL_MASCOTS), dus elke combinatie is geldig.
  const target = { character, state } as MascotTarget;
  return <MascotSlot {...target} {...rest} />;
}
