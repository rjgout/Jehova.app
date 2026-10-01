// Centrale weergavelaag voor Versado-mascottes.
//
// Pagina's vragen om een semantische character + state-combinatie en kennen
// nooit het onderliggende WebP- of toekomstige Rive-bestand. Daardoor kunnen
// statische assets later achter deze component door Rive worden vervangen
// zonder pagina's opnieuw op te bouwen.
//
// De asset- en characterregels staan in public/mascots/README.md en
// docs/VERSADO-DESIGN.md. We starten bewust alleen met NOVI. Voeg Varo, Vera
// en de familie pas toe wanneer hun eigen implementatiefase start.

import type { MessageKey } from "@/lib/i18n/core";

export type MascotCharacter = "novi";

export type MascotState =
  | "idle"
  | "greeting"
  | "thinking"
  | "discovery"
  | "reading"
  | "playing"
  | "success"
  | "encourage"
  | "celebrate"
  | "sleep";

interface MascotAsset {
  src: string;
  width: number;
  height: number;
}

// Sleutel "<character>:<state>".
//
// Voeg hier pas een entry toe nadat het definitieve WebP-bestand daadwerkelijk
// in public/mascots/static/novi/ staat. Geen tijdelijke assets of fallbacks.
// width/height zijn de intrinsieke pixelafmetingen van de export.
const MASCOTS: Partial<Record<`${MascotCharacter}:${MascotState}`, MascotAsset>> = {};

export default function MascotSlot({
  character,
  state = "idle",
  size = 72,
  className = "",
  labelKey,
}: {
  character: MascotCharacter;
  state?: MascotState;
  /** Breedte in px; de hoogte volgt uit de intrinsieke verhouding. */
  size?: number;
  className?: string;
  /**
   * Tekstuele betekenis als de mascotte informatie uitdrukt.
   * De daadwerkelijke vertaalde tekst hoort buiten de asset/component te
   * worden weergegeven. Zonder labelKey is de afbeelding decoratief.
   */
  labelKey?: MessageKey;
}) {
  const asset = MASCOTS[`${character}:${state}`];
  if (!asset) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset.src}
      width={size}
      height={Math.round((asset.height / asset.width) * size)}
      alt=""
      aria-hidden={labelKey ? undefined : true}
      className={`vs-motion ${className}`}
    />
  );
}
