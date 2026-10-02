// De enige manier om een Versado-mascotte te tonen. Een pagina vraagt om een
// personage en een functionele state, nooit om een bestand:
//
//   <MascotSlot character="novi" state="greeting" />
//   <MascotSlot character="family" state="welcome" />
//
// Welke states bij een personage horen staat in het register; een combinatie
// als family + greeting is daardoor al een typefout.
//
// Welke afbeelding (of later animatie) daarbij hoort, bepaalt deze component
// via het register in src/lib/mascots.ts. Ontbreekt de asset, dan rendert
// dit niets: geen emoji, geen ander personage, geen placeholder.
//
// Renderers, zodat de pagina's nooit hoeven te veranderen:
// - nu: StaticMascot (een transparante WebP uit public/mascots/static/);
// - later eventueel: een Rive-renderer (state machine) hier achter dezelfde
//   props. De statische WebP blijft dan de terugval bij
//   prefers-reduced-motion, tijdens het laden, bij een fout en op plekken
//   waar beweging niets toevoegt. Zie docs/VERSADO-DESIGN.md ("Mascottes").
//
// Afspraken: mascottes communiceren vooral visueel; tekst (labelKey) altijd
// via i18n, nooit in de asset; beweging valt onder vs-motion, zodat die bij
// prefers-reduced-motion stilstaat.

import type { MessageKey } from "@/lib/i18n/core";
import { staticMascotAsset, type MascotTarget, type StaticMascotAsset } from "@/lib/mascots";

export type { MascotCharacter, MascotState, FamilyState } from "@/lib/mascots";

type MascotSlotProps = MascotTarget & {
  /**
   * Breedte in px; de hoogte volgt uit de asset. Een breedte-klasse in
   * className (bv. w-full max-w-md) gaat voor, voor een vloeiende maat.
   */
  size?: number;
  /** Vult een door de feature gereserveerd kader; handig bij wisselende states zonder layout shift. */
  fill?: boolean;
  className?: string;
  /** Tekstuele betekenis als de mascotte iets uitdrukt; weglaten = decoratief. */
  labelKey?: MessageKey;
};

export default function MascotSlot({ size = 72, fill = false, className = "", ...target }: MascotSlotProps) {
  const asset = staticMascotAsset(target.character, target.state);
  if (!asset) return null;
  return <StaticMascot asset={asset} size={size} fill={fill} className={className} />;
}

function StaticMascot({ asset, size, fill, className }: { asset: StaticMascotAsset; size: number; fill: boolean; className: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset.src}
      width={fill ? asset.width : size}
      height={fill ? asset.height : Math.round((asset.height / asset.width) * size)}
      alt=""
      aria-hidden
      decoding="async"
      // object-contain bewaart de verhouding ook in een door de feature
      // gereserveerd kader; zonder kader volgt de hoogte vloeiend de breedte.
      className={`vs-motion object-contain ${fill ? "h-full w-full" : "h-auto max-w-full"} ${className}`}
    />
  );
}
