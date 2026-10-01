// De zichtbare status van een stuk inhoud voor één gebruiker, afgeleid uit
// de opgeslagen voortgang (ContentProgress) en de oefenset (N). Puur, zodat
// elke weergave (cursuslijst, stappen, lezer) precies hetzelfde laat zien.

import { withLegacy } from "@/lib/learning/rewards";

export type ReadStatus = "UNREAD" | "READING" | "READ";

/** De velden van ContentProgress die de status bepalen. */
export interface StoredContentProgress {
  readStatus: "READING" | "READ" | null;
  readVerse: number;
  exerciseAnswered: number;
  rewardCorrect: number;
  rewardBonusAt: Date | null;
  legacyScore: number | null;
  legacyXp: number;
  legacyCompleted: boolean;
}

export interface ContentState {
  read: ReadStatus;
  /** Tot welk vers het lezen al gekomen is (Stap voor stap). */
  readVerse: number;
  exercisesAnswered: number;
  exercisesTotal: number;
  /** Alle vragen van de oefenset zijn gemaakt (of er zijn geen vragen). */
  exercisesComplete: boolean;
  /** Percentage goed van de volledige set, zodra die gemaakt is. */
  exerciseScore: number | null;
  perfect: boolean;
  /** Gelezen én geoefend: dit telt als afgerond hoofdstuk. */
  done: boolean;
}

export function resolveContentState(stored: StoredContentProgress | null, total: number): ContentState {
  const reward = withLegacy(
    {
      answered: stored?.exerciseAnswered ?? 0,
      rewardCorrect: stored?.rewardCorrect ?? 0,
      bonusAwarded: stored?.rewardBonusAt != null,
    },
    { legacyXp: stored?.legacyXp ?? 0, legacyCompleted: stored?.legacyCompleted ?? false },
    total
  );
  const answered = Math.min(total, reward.answered);
  const exercisesComplete = total === 0 || answered >= total;
  const computedScore = total > 0 && exercisesComplete ? Math.round((Math.min(total, reward.rewardCorrect) / total) * 100) : null;
  const read: ReadStatus = stored?.readStatus === "READ" ? "READ" : stored?.readStatus === "READING" ? "READING" : "UNREAD";
  return {
    read,
    readVerse: stored?.readVerse ?? 0,
    exercisesAnswered: answered,
    exercisesTotal: total,
    exercisesComplete,
    // Een oude score (van minder vragen) blijft zichtbaar zolang die hoger is.
    exerciseScore: computedScore === null ? null : Math.max(computedScore, stored?.legacyScore ?? 0),
    perfect: total > 0 && reward.rewardCorrect >= total,
    done: read === "READ" && exercisesComplete,
  };
}
