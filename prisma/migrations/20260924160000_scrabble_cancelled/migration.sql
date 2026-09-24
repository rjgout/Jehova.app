-- Een uitdager kan een openstaande woordspel-uitnodiging intrekken. Alleen een
-- nieuwe enumwaarde: bestaande spellen houden hun status, dus geen backfill.
ALTER TYPE "ScrabbleGameStatus" ADD VALUE 'CANCELLED';
