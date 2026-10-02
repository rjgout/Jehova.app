import { mascotVariantCount } from "@/lib/mascots";

// Bij elke paginalading de volgende welkomstafbeelding van de familie
// (1, 2, 3, 1, ...). Bewust een teller op de server en niets bij de
// bezoeker: geen extra cookie of browseropslag (zie het cookiebeleid, dat
// alleen de inlogsessie noemt). Bij meerdere bezoekers tegelijk lopen hun
// beurten door elkaar; elke lading toont dan nog steeds de volgende. Op
// globalThis, zodat de homepagina en de uitnodigingspagina (elk een eigen
// routebundel) dezelfde teller delen.
const store = globalThis as unknown as { __versadoFamilyWelcomeTurn?: number };

export function nextFamilyWelcomeVariant(): number {
  const count = Math.max(1, mascotVariantCount("family", "welcome"));
  const turn = ((store.__versadoFamilyWelcomeTurn ?? -1) + 1) % count;
  store.__versadoFamilyWelcomeTurn = turn;
  return turn + 1;
}
