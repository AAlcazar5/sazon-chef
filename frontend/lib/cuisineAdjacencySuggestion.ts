// frontend/lib/cuisineAdjacencySuggestion.ts
// ROADMAP 4.0 Tier J11 — Cuisine adjacency suggestion (frontend).
//
// Lightweight, dependency-free adjacency table for the first-of-day greeting.
// Mirrors a subset of `backend/src/utils/cuisineAdjacency.ts`. Returns a
// neighbor cuisine for the input, or null when no neighbor is known.

const ADJACENCY: Record<string, string[]> = {
  persian: ['lebanese', 'turkish', 'moroccan'],
  lebanese: ['persian', 'turkish', 'greek'],
  turkish: ['lebanese', 'persian', 'greek'],
  greek: ['turkish', 'italian', 'lebanese'],
  italian: ['greek', 'spanish', 'french'],
  spanish: ['portuguese', 'italian', 'mexican'],
  portuguese: ['spanish', 'brazilian', 'italian'],
  french: ['italian', 'belgian', 'spanish'],
  moroccan: ['persian', 'tunisian', 'lebanese'],
  tunisian: ['moroccan', 'lebanese', 'algerian'],
  ethiopian: ['eritrean', 'yemeni', 'somali'],
  thai: ['vietnamese', 'cambodian', 'laotian'],
  vietnamese: ['thai', 'cambodian', 'chinese'],
  chinese: ['taiwanese', 'vietnamese', 'korean'],
  korean: ['japanese', 'chinese', 'taiwanese'],
  japanese: ['korean', 'taiwanese', 'okinawan'],
  okinawan: ['japanese', 'taiwanese'],
  filipino: ['malaysian', 'indonesian', 'taiwanese'],
  indonesian: ['malaysian', 'thai', 'filipino'],
  malaysian: ['indonesian', 'thai', 'singaporean'],
  indian: ['pakistani', 'sri-lankan', 'nepali'],
  pakistani: ['indian', 'afghan', 'persian'],
  mexican: ['salvadorean', 'guatemalan', 'spanish'],
  salvadorean: ['mexican', 'guatemalan', 'honduran'],
  guatemalan: ['salvadorean', 'mexican', 'honduran'],
  peruvian: ['bolivian', 'chilean', 'ecuadorian'],
  brazilian: ['portuguese', 'argentine', 'peruvian'],
  argentine: ['uruguayan', 'chilean', 'brazilian'],
  cajun: ['creole', 'caribbean', 'mexican'],
  creole: ['cajun', 'caribbean', 'french'],
};

const norm = (s: string): string =>
  (s ?? '').trim().toLowerCase().replace(/\s+/g, '-');

const titleCase = (s: string): string =>
  s
    .split('-')
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');

/**
 * Returns one suggested neighbor cuisine for `cuisine`, or null when no
 * adjacency is known. Deterministic: picks the first entry. If you want
 * variety, pass a `seed` (e.g., day-of-year) and we'll rotate.
 */
export const suggestAdjacentCuisine = (
  cuisine: string,
  seed?: number,
): string | null => {
  const key = norm(cuisine);
  const neighbors = ADJACENCY[key];
  if (!neighbors || neighbors.length === 0) return null;
  const idx = typeof seed === 'number' ? seed % neighbors.length : 0;
  return titleCase(neighbors[idx]);
};
