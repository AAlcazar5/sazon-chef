// backend/src/utils/ingredientNormalizer.ts
// Normalize ingredient names for pantry matching and price lookups

const MODIFIER_TOKENS = [
  'fresh',
  'dried',
  'ground',
  'whole',
  'extra-virgin',
  'extra virgin',
  'raw',
  'cooked',
  'organic',
  'unsalted',
  'salted',
  'low-sodium',
];

// Sorted longest-first so multi-word modifiers are tried before single-word ones
const SORTED_MODIFIERS = [...MODIFIER_TOKENS].sort((a, b) => b.length - a.length);

/**
 * Normalize an ingredient name for matching:
 * - Lowercase
 * - Trim surrounding whitespace
 * - Strip known modifier tokens (word-boundary aware)
 * - Collapse internal whitespace
 *
 * Match rule: FULL normalized-name equality only.
 * "butter" MUST NOT match "peanut butter".
 */
export function normalizeIngredientName(name: string): string {
  let normalized = name.toLowerCase().trim();

  for (const modifier of SORTED_MODIFIERS) {
    // Use word-boundary replacement to avoid partial matches
    // Escape any regex-special chars in the modifier string
    const escaped = modifier.replace(/[-]/g, '\\-');
    const re = new RegExp(`(?:^|\\s)${escaped}(?=\\s|$)`, 'g');
    normalized = normalized.replace(re, ' ');
  }

  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}
