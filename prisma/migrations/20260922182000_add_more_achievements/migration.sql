-- Voeg nieuwe prestaties toe. Bestaande prestaties blijven ongewijzigd.
INSERT INTO "Achievement" ("id", "slug", "name", "description", "icon")
VALUES
  ('achievement-streak-3', 'streak-3', 'Drie dagen volgehouden', 'Hield 3 dagen op rij een streak vol.', '🔥'),
  ('achievement-streak-100', 'streak-100', 'Honderd dagen sterk', 'Hield 100 dagen op rij een streak vol.', '💯'),
  ('achievement-chapters-5', 'chapters-5', 'Op dreef', 'Rondde 5 hoofdstukken af.', '📚'),
  ('achievement-chapters-10', 'chapters-10', 'Tien hoofdstukken', 'Rondde 10 hoofdstukken af.', '📚'),
  ('achievement-chapters-25', 'chapters-25', 'Vijfentwintig hoofdstukken', 'Rondde 25 hoofdstukken af.', '🏅'),
  ('achievement-chapters-50', 'chapters-50', 'Halve honderd', 'Rondde 50 hoofdstukken af.', '🏆'),
  ('achievement-perfect-chapter', 'perfect-chapter', 'Volmaakt', 'Rondde een hoofdstuk af met 100%.', '💯'),
  ('achievement-perfect-10', 'perfect-10', 'Tien keer raak', 'Rondde 10 hoofdstukken af met 100%.', '🎯'),
  ('achievement-xp-5000', 'xp-5000', '5000 XP', 'Verdiende in totaal 5000 XP.', '🌟'),
  ('achievement-xp-10000', 'xp-10000', '10.000 XP', 'Verdiende in totaal 10.000 XP.', '🏆'),
  ('achievement-friends-5', 'friends-5', 'Vriendenkring', 'Heeft 5 vrienden.', '👨‍👩‍👧‍👦'),
  ('achievement-duels-10-won', 'duels-10-won', 'Duelmeester', 'Won 10 live Schriftduels.', '🏅'),
  ('achievement-word-game-first-win', 'word-game-first-win', 'Woordkunstenaar', 'Raadde het woord van de dag voor het eerst goed.', '🔤'),
  ('achievement-word-game-7-wins', 'word-game-7-wins', 'Woordmeester', 'Raadde 7 keer het woord van de dag goed.', '🧠'),
  ('achievement-podcast-first-lesson', 'podcast-first-lesson', 'Eerste podcastles', 'Rondde je eerste podcastles af.', '🎧'),
  ('achievement-podcast-10-lessons', 'podcast-10-lessons', 'Podcastluisteraar', 'Rondde 10 podcastlessen af.', '🎙️'),
  ('achievement-kids-first-story', 'kids-first-story', 'Eerste kinderles', 'Rondde je eerste verhaal uit de kindercursus af.', '🌟'),
  ('achievement-kids-10-stories', 'kids-10-stories', 'Verhalenverteller', 'Rondde 10 verhalen uit de kindercursus af.', '📚'),
  ('achievement-intro-first-lesson', 'intro-first-lesson', 'Op ontdekking', 'Rondde je eerste introductieles af.', '🧭'),
  ('achievement-intro-all-lessons', 'intro-all-lessons', 'Helemaal op weg', 'Rondde alle introductielessen af.', '🎓')
ON CONFLICT ("slug") DO NOTHING;
