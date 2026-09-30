// Plek voor een Versado-mascotte (VARO, VERA, NOVI) of de hele familie.
// De mascottes worden later aangeleverd (zie docs/VERSADO-DESIGN.md); tot
// die tijd is het register leeg en rendert dit niets. Een pagina zet de
// slot al op de juiste plek, met rol en stemming, zodat de mascotte er later
// verschijnt zonder dat de pagina verandert.
//
// Afspraken: de familie ("family") alleen bij betekenisvolle momenten;
// mascottes communiceren vooral visueel; tekst (labelKey) altijd via i18n;
// bij prefers-reduced-motion een stilstaande pose (vs-motion).

import type { MessageKey } from "@/lib/i18n/core";

export type MascotCharacter = "varo" | "vera" | "novi" | "family";
export type MascotMood = "neutral" | "happy" | "cheer" | "thinking" | "calm" | "curious";

interface MascotAsset {
  src: string;
  width: number;
  height: number;
}

// Sleutel "<character>:<mood>". Leeg tot de assets er zijn.
const MASCOTS: Partial<Record<`${MascotCharacter}:${MascotMood}`, MascotAsset>> = {};

export default function MascotSlot({
  character,
  mood = "neutral",
  size = 72,
  className = "",
}: {
  character: MascotCharacter;
  mood?: MascotMood;
  /** Breedte in px; de hoogte volgt uit de asset. */
  size?: number;
  className?: string;
  /** Tekstuele betekenis als de mascotte iets uitdrukt; weglaten = decoratief. */
  labelKey?: MessageKey;
}) {
  const asset = MASCOTS[`${character}:${mood}`];
  if (!asset) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={asset.src} width={size} height={Math.round((asset.height / asset.width) * size)} alt="" aria-hidden className={`vs-motion ${className}`} />
  );
}
