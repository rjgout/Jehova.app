// Geschatte leestijd, afgeleid van het aantal woorden van de tekst zelf.
// Geen handmatige lijst met lange hoofdstukken: zo geldt het vanzelf voor
// elk boek en elke taal.

/** Rustig lees- en nadenktempo voor schriftteksten. */
export const WORDS_PER_MINUTE = 130;

/**
 * Vanaf deze leestijd raden we Stap voor stap aan. Bij het Boek van Mormon
 * is dat ongeveer het langste twintigste deel van de hoofdstukken (het
 * gemiddelde ligt rond 8 minuten), dus het blijft bij de echte uitschieters.
 */
export const LONG_CHAPTER_MINUTES = 15;

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

export function estimateReadingMinutes(words: number): number {
  return words <= 0 ? 0 : Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function isLongChapter(minutes: number): boolean {
  return minutes >= LONG_CHAPTER_MINUTES;
}
