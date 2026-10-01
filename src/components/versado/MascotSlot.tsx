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
  className?: string;
  /** Tekstuele betekenis als de mascotte iets uitdrukt; weglaten = decoratief. */
  labelKey?: MessageKey;
};

export default function MascotSlot({ size = 72, className = "", ...target }: MascotSlotProps) {
  const asset = staticMascotAsset(target.character, target.state);
  if (!asset) return null;
  return <StaticMascot asset={asset} size={size} className={className} />;
}

function StaticMascot({ asset, size, className }: { asset: StaticMascotAsset; size: number; className: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset.src}
      width={size}
      height={Math.round((asset.height / asset.width) * size)}
      alt=""
      aria-hidden
      decoding="async"
      // h-auto + object-contain: de verhouding blijft altijd die van de asset,
      // ook als de breedte via CSS vloeiend is; nooit afsnijden of uitrekken.
      className={`vs-motion h-auto max-w-full object-contain ${className}`}
    />
  );
}
