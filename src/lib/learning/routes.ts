// Hoe elke leesroute dezelfde inhoud aanbiedt. Routes bepalen alleen de
// presentatie (volgorde, wanneer de oefeningen komen, of een lang hoofdstuk
// een tip krijgt), nooit hoeveel de inhoud waard is: dat staat voor elke
// route gelijk in exercisePlan.ts en rewards.ts.
//
// Een nieuwe leesroute voor schriftinhoud krijgt hier een regel; de
// voortgang (contentProgress.ts) en beloning werken dan vanzelf.

export type ReadingRouteType = "FREE_CHOICE" | "FRONT_TO_BACK" | "READING_LESSONS";

export interface RoutePresentation {
  /**
   * - "optional": eerst lezen, oefenen mag daarna (Vrije keuze);
   * - "after-reading": na het lezen volgt de volledige oefenset;
   * - "per-part": per leesgedeelte de vragen van dat deel.
   */
  exercises: "optional" | "after-reading" | "per-part";
  /** Hoofdstukken (of stappen) in een vaste volgorde. */
  sequential: boolean;
  /** Bij een lang hoofdstuk Stap voor stap aanraden. */
  suggestStepsForLongChapters: boolean;
}

export const ROUTE_PRESENTATION: Record<ReadingRouteType, RoutePresentation> = {
  FREE_CHOICE: { exercises: "optional", sequential: false, suggestStepsForLongChapters: true },
  FRONT_TO_BACK: { exercises: "after-reading", sequential: true, suggestStepsForLongChapters: true },
  READING_LESSONS: { exercises: "per-part", sequential: true, suggestStepsForLongChapters: false },
};

export function isReadingRoute(type: string): type is ReadingRouteType {
  return type in ROUTE_PRESENTATION;
}
