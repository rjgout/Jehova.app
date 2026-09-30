// Scores van Samen studeren. Puur rekenwerk zonder database, zodat de
// socketserver en tests precies hetzelfde uitrekenen.
//
// Per stap: goed beantwoord telt het zwaarst (percentage goed, 0-100), en wie
// als eerste, tweede of derde alles beantwoord heeft krijgt een kleine
// bonus. Zo wint snel-maar-slordig het nooit van rustig-en-goed, maar beslist
// snelheid wel bij een gelijke stand. Wie in een stap niets beantwoordde,
// telt voor die stap niet mee (dus ook niet mee in het gemiddelde).

export const FINISH_BONUS = [10, 5, 2] as const;

export interface StudyAnswerRow {
  userId: string;
  index: number;
  correct: boolean;
  answeredAt: Date;
}

export interface StudyRoundResult {
  userId: string;
  correct: number;
  answered: number;
  total: number;
  finished: boolean;
  /** Milliseconden vanaf de start tot het laatste antwoord; alleen als alles beantwoord is. */
  timeMs: number | null;
  /** 1 = als eerste klaar. */
  finishPosition: number | null;
  points: number;
  rank: number;
}

export function scoreRound(total: number, startedAt: Date, answers: StudyAnswerRow[]): StudyRoundResult[] {
  const byUser = new Map<string, StudyAnswerRow[]>();
  for (const answer of answers) {
    const list = byUser.get(answer.userId) ?? [];
    list.push(answer);
    byUser.set(answer.userId, list);
  }

  const rows = [...byUser.entries()].map(([userId, list]) => {
    const correct = list.filter((a) => a.correct).length;
    const finished = total > 0 && list.length >= total;
    const last = Math.max(...list.map((a) => a.answeredAt.getTime()));
    return {
      userId,
      correct,
      answered: list.length,
      total,
      finished,
      timeMs: finished ? Math.max(0, last - startedAt.getTime()) : null,
      finishPosition: null as number | null,
      points: 0,
      rank: 0,
    };
  });

  const finishers = rows.filter((r) => r.finished).sort((a, b) => (a.timeMs ?? 0) - (b.timeMs ?? 0));
  finishers.forEach((r, i) => {
    r.finishPosition = i + 1;
  });

  for (const r of rows) {
    const accuracy = total > 0 ? Math.round((r.correct / total) * 100) : 0;
    const bonus = r.finishPosition !== null ? (FINISH_BONUS[r.finishPosition - 1] ?? 0) : 0;
    r.points = accuracy + bonus;
  }

  rows.sort(
    (a, b) =>
      b.points - a.points ||
      (a.timeMs ?? Number.MAX_SAFE_INTEGER) - (b.timeMs ?? Number.MAX_SAFE_INTEGER) ||
      b.correct - a.correct
  );
  rows.forEach((r, i) => {
    // Gelijke punten en tijd: gedeelde plaats.
    const prev = rows[i - 1];
    r.rank = prev && prev.points === r.points && prev.timeMs === r.timeMs ? prev.rank : i + 1;
  });
  return rows;
}

export interface StudyStanding {
  userId: string;
  rounds: number;
  totalPoints: number;
  /** Gemiddelde punten per gespeelde stap, afgerond. */
  average: number;
  correct: number;
  questions: number;
  wins: number;
  rank: number;
}

/** De totaalranglijst over alle gespeelde stappen: op gemiddelde, bij gelijkspel wie meer stappen deed. */
export function buildStandings(rounds: StudyRoundResult[][]): StudyStanding[] {
  const byUser = new Map<string, StudyStanding>();
  for (const results of rounds) {
    for (const r of results) {
      const s = byUser.get(r.userId) ?? { userId: r.userId, rounds: 0, totalPoints: 0, average: 0, correct: 0, questions: 0, wins: 0, rank: 0 };
      s.rounds += 1;
      s.totalPoints += r.points;
      s.correct += r.correct;
      s.questions += r.total;
      if (r.rank === 1 && results.length > 1) s.wins += 1;
      byUser.set(r.userId, s);
    }
  }
  const list = [...byUser.values()];
  for (const s of list) s.average = s.rounds > 0 ? Math.round(s.totalPoints / s.rounds) : 0;
  list.sort((a, b) => b.average - a.average || b.rounds - a.rounds || b.totalPoints - a.totalPoints);
  list.forEach((s, i) => {
    const prev = list[i - 1];
    s.rank = prev && prev.average === s.average && prev.rounds === s.rounds ? prev.rank : i + 1;
  });
  return list;
}
