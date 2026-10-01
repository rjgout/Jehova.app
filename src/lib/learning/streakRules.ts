// Wat telt als leeractiviteit voor de dagelijkse reeks. De enige plek met
// deze regel: elke afrondfunctie (streak.ts, contentProgress.ts) vraagt het
// hier na voordat de reeks wordt bijgewerkt, en geen pagina past de reeks
// zelf aan.
//
// Lezen telt nooit: anders bouw je een reeks op door alleen op knoppen te
// drukken. Een activiteit telt pas als hij is afgerond, met minstens één
// beantwoorde vraag (of zet) en alles wat de activiteit vraagt.

export type LearningActivityKind =
  // Een hoofdstuk lezen, een leesgedeelte doorlopen, als gelezen markeren.
  | "READING"
  // Oefeningen bij inhoud: een oefenset of een stap van een leesroute.
  | "CONTENT_EXERCISES"
  // Een les uit een cursus met eigen vragen (podcast, kinderen, introductie).
  | "COURSE_LESSON"
  // Een korte oefenronde zonder vaste inhoud.
  | "PRACTICE"
  // Een afgerond educatief spel (live quiz, raad het hoofdstuk, woordspel, ...).
  | "GAME";

export interface LearningActivity {
  kind: LearningActivityKind;
  /** Hoeveel vragen, beurten of zetten er echt zijn gedaan. */
  answered: number;
  /** Hoeveel de activiteit er vraagt om als afgerond te tellen. */
  required: number;
}

export function qualifiesForStreak(activity: LearningActivity): boolean {
  if (activity.kind === "READING") return false;
  return activity.answered >= 1 && activity.answered >= activity.required;
}
