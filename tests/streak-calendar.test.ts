import test from "node:test";
import assert from "node:assert/strict";
import { clampToStreakStartMonth } from "../src/lib/streakCalendar";

test("de reeksmaand stopt bij de maand waarin het account begon", () => {
  const firstMonth = { year: 2025, month: 8 };

  assert.deepEqual(clampToStreakStartMonth({ year: 2025, month: 8 }, firstMonth), firstMonth);
  assert.deepEqual(clampToStreakStartMonth({ year: 2025, month: 7 }, firstMonth), firstMonth);
  assert.deepEqual(clampToStreakStartMonth({ year: 2024, month: 12 }, firstMonth), firstMonth);
  assert.deepEqual(clampToStreakStartMonth({ year: 2025, month: 9 }, firstMonth), { year: 2025, month: 9 });
  assert.deepEqual(clampToStreakStartMonth({ year: 2026, month: 1 }, firstMonth), { year: 2026, month: 1 });
});
