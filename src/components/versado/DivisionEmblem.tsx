import type { LeagueTier } from "@prisma/client";
import { TIER_EMBLEMS } from "@/lib/leagues";

// Het officiële embleem van een divisie. De paden staan alleen in
// TIER_EMBLEMS (src/lib/leagues.ts); de maat komt uit className, de
// verhouding blijft altijd die van het (vierkante) embleem.
//
// Met `label` draagt het beeld zelf betekenis (bv. in een rij zonder
// divisienaam ernaast); zonder label is het decoratief, zodat een
// schermlezer de naam die er al naast staat niet dubbel voorleest.
export default function DivisionEmblem({ tier, className = "", label }: { tier: LeagueTier; className?: string; label?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={TIER_EMBLEMS[tier]}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      draggable={false}
      decoding="async"
      width={384}
      height={384}
      className={`inline-block shrink-0 object-contain ${className}`}
    />
  );
}
