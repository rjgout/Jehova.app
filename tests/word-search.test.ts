import assert from "node:assert/strict";
import test from "node:test";
import {
  generateWordSearch,
  lineCoordinates,
  selectionMatches,
  type WordSearchCandidate,
} from "../src/lib/wordSearch/generator";

const candidates: WordSearchCandidate[] = [
  "NEPHI", "LEHI", "ALMA", "MORONI", "MOSIAH", "LAMAN", "LEMUËL", "AMMON", "MORMON", "ABINADI", "ZARAHEMLA", "HELAMAN", "KORIHOR", "PAHORAN",
].map((word) => ({ display: word, normalized: word }));

test("rechte lijnen herkennen horizontaal, verticaal, diagonaal en achterstevoren", () => {
  const grid = [
    ["N", "E", "P", "H", "I"],
    ["X", "E", "X", "X", "X"],
    ["X", "X", "P", "X", "X"],
    ["X", "X", "X", "H", "X"],
    ["I", "H", "P", "E", "N"],
  ];
  const words = [
    { display: "NEPHI", normalized: "NEPHI", start: { row: 0, col: 0 }, end: { row: 0, col: 4 } },
    { display: "NEPHI", normalized: "NEPHI", start: { row: 4, col: 4 }, end: { row: 4, col: 0 } },
  ];
  assert.equal(selectionMatches(grid, words, { row: 0, col: 0 }, { row: 0, col: 4 })?.normalized, "NEPHI");
  assert.equal(selectionMatches(grid, words, { row: 4, col: 4 }, { row: 4, col: 0 }, true)?.normalized, "NEPHI");
  assert.deepEqual(lineCoordinates({ row: 0, col: 0 }, { row: 4, col: 4 }, 5)?.length, 5);
  assert.equal(lineCoordinates({ row: 0, col: 0 }, { row: 1, col: 3 }, 5), null);
});

test("generator blijft binnen het raster en is reproduceerbaar per seed", () => {
  const first = generateWordSearch(candidates, "HARD", 12345);
  const second = generateWordSearch(candidates, "HARD", 12345);
  assert.deepEqual(first, second);
  assert.notDeepEqual(first, generateWordSearch(candidates, "HARD", 12346));
  for (const word of first.words) {
    const positions = lineCoordinates(word.start, word.end, first.size);
    assert.ok(positions);
    assert.equal(positions?.map(({ row, col }) => first.grid[row][col]).join(""), word.normalized);
    assert.ok(positions?.every(({ row, col }) => row >= 0 && row < first.size && col >= 0 && col < first.size));
  }
  assert.equal(first.words.filter((word) => word.start.row !== word.end.row && word.start.col !== word.end.col).length >= 4, true);
});

test("moeilijkheidsgraden verschillen in raster, lengtevariatie en overlap", () => {
  const easy = generateWordSearch(candidates, "EASY", 7);
  const medium = generateWordSearch(candidates, "MEDIUM", 7);
  const hard = generateWordSearch(candidates, "HARD", 7);
  assert.ok(easy.size < medium.size && medium.size < hard.size);
  for (const puzzle of [easy, medium, hard]) {
    const lengths = new Set(puzzle.words.map((word) => word.normalized.length));
    assert.ok(lengths.size >= 2);
    const usedCells = new Set<string>();
    for (const word of puzzle.words) {
      lineCoordinates(word.start, word.end, puzzle.size)?.forEach((cell) => usedCells.add(`${cell.row}:${cell.col}`));
    }
    assert.ok(usedCells.size < puzzle.size * puzzle.size);
  }
  assert.ok(medium.words.some((word) => word.start.row !== word.end.row && word.start.col !== word.end.col));
  assert.ok(hard.words.some((word) => word.start.row !== word.end.row && word.start.col !== word.end.col));
});

test("woorden die niet passen worden overgeslagen zonder oneindige lus", () => {
  const result = generateWordSearch(
    [...candidates, { display: "DITWOORDPASTNIET", normalized: "DITWOORDPASTNIET" }],
    "EASY",
    99
  );
  assert.equal(result.words.length, 5);
  assert.ok(!result.words.some((word) => word.normalized === "DITWOORDPASTNIET"));
});
