// Common words we never flag as "difficult", even if long.
const STOPLIST = new Set([
  "because", "between", "through", "although", "however", "different",
  "government", "including", "national", "international", "development",
  "something", "everything", "another", "against", "themselves",
  "together", "yesterday", "tomorrow", "further", "several", "already",
  "continue", "provide", "provided", "example", "possible", "current",
  "currently", "following", "according", "particular", "certain",
]);

/**
 * Picks words worth offering a definition for: long-ish, alphabetic,
 * not in the common-word stoplist. This runs per paragraph so the same
 * word is only flagged once per paragraph to avoid clutter.
 */
export function pickDifficultWords(text: string): Set<string> {
  const words = text.match(/[A-Za-z]+/g) ?? [];
  const picked = new Set<string>();
  for (const w of words) {
    const lower = w.toLowerCase();
    if (w.length >= 9 && !STOPLIST.has(lower)) {
      picked.add(lower);
    }
  }
  return picked;
}
