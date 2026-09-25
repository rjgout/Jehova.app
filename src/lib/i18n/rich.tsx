import { Fragment, type ReactNode } from "react";

/**
 * Zet elementen (bv. een vetgedrukte naam) op de plek van {naam} in een al
 * vertaalde tekst. Zo bepaalt elke taal zelf de woordvolgorde, in plaats van
 * dat de zin in losse stukken rond het element vertaald wordt. Gewone
 * waarden gaan eerst via t(); die laat onbekende {namen} staan.
 */
export function rich(text: string, nodes: Record<string, ReactNode>): ReactNode {
  return text.split(/(\{\w+\})/).map((part, index) => {
    const name = /^\{(\w+)\}$/.exec(part)?.[1];
    return <Fragment key={index}>{name && name in nodes ? nodes[name] : part}</Fragment>;
  });
}
