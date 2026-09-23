-- Sinds 2026-09-21 begon een nieuwe reeks na een onderbreking op 0 in
-- plaats van op 1, waardoor de studiedag zelf niet meetelde. Dat is
-- teruggedraaid; deze backfill zet de teller goed voor wie daar last van had.
--
-- Een reeks = aaneengesloten dagen in StreakDay (STUDIED of FROZEN), waarvan
-- alleen STUDIED-dagen meetellen. Alleen reeksen die op of na 2026-09-21
-- begonnen worden herberekend: die staan gegarandeerd volledig in StreakDay
-- (de kalender bestaat pas sinds 2026-09-14, oudere reeksen dus niet). Voor
-- gebruikers bij wie niets misging levert dit exact dezelfde waarde op.
WITH days AS (
  SELECT "userId", "dayKey"::date AS d, "status"
  FROM "StreakDay"
),
grouped AS (
  SELECT "userId", d, "status",
         d - (ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY d))::int AS grp
  FROM days
),
runs AS (
  SELECT "userId",
         MIN(d) AS start_day,
         MAX(d) AS end_day,
         COUNT(*) FILTER (WHERE "status" = 'STUDIED')::int AS studied
  FROM grouped
  GROUP BY "userId", grp
)
UPDATE "User" u
SET "currentStreak" = r.studied,
    "longestStreak" = GREATEST(u."longestStreak", r.studied)
FROM runs r
WHERE r."userId" = u."id"
  AND u."lastStudyDate" IS NOT NULL
  AND r.end_day = u."lastStudyDate"::date
  AND r.start_day >= DATE '2026-09-21'
  AND u."currentStreak" <> r.studied;
