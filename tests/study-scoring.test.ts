import test from "node:test";
import assert from "node:assert/strict";
import { buildStandings, scoreRound, type StudyAnswerRow } from "../src/lib/study/scoring";

const start = new Date("2026-10-01T12:00:00Z");
const at = (seconds: number) => new Date(start.getTime() + seconds * 1000);
const answers = (userId: string, correct: boolean[], lastSecond: number): StudyAnswerRow[] =>
  correct.map((c, index) => ({ userId, index, correct: c, answeredAt: at(index === correct.length - 1 ? lastSecond : index + 1) }));

test("goed beantwoord weegt zwaarder dan snelheid", () => {
  const results = scoreRound(4, start, [
    ...answers("snel", [true, true, false, false], 20),
    ...answers("goed", [true, true, true, true], 90),
  ]);
  assert.equal(results[0].userId, "goed");
  assert.equal(results[0].points, 100 + 5); // alles goed, tweede klaar
  assert.equal(results[1].points, 50 + 10); // helft goed, eerste klaar
  assert.equal(results[1].finishPosition, 1);
});

test("bij gelijke score beslist wie eerder klaar was", () => {
  const results = scoreRound(2, start, [...answers("a", [true, true], 40), ...answers("b", [true, true], 30)]);
  assert.deepEqual(results.map((r) => [r.userId, r.rank, r.points]), [["b", 1, 110], ["a", 2, 105]]);
});

test("wie niet alles beantwoordde krijgt geen tijd en geen bonus", () => {
  const results = scoreRound(3, start, [...answers("half", [true, true], 10), ...answers("af", [false, false, false], 50)]);
  const half = results.find((r) => r.userId === "half")!;
  assert.equal(half.finished, false);
  assert.equal(half.timeMs, null);
  assert.equal(half.points, 67);
});

test("de totaalstand gaat op gemiddelde over de gespeelde stappen", () => {
  const round1 = scoreRound(2, start, [...answers("a", [true, true], 10), ...answers("b", [false, false], 20)]);
  const round2 = scoreRound(2, start, [...answers("b", [true, true], 10)]);
  const standings = buildStandings([round1, round2]);
  assert.deepEqual(standings.map((s) => [s.userId, s.rounds, s.average]), [["a", 1, 110], ["b", 2, 58]]);
  assert.equal(standings[0].wins, 1);
});
