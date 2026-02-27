// frontend/lib/shoppingItemParser.ts
// Parses natural language shopping input into structured items.
// "milk, eggs, and a dozen oranges" → 3 items with quantities

export interface ParsedShoppingItem {
  name: string;
  quantity: string;
}

// Compound items that contain "and" — don't split on these
const COMPOUND_ITEMS = new Set([
  'salt and pepper',
  'mac and cheese',
  'macaroni and cheese',
  'bread and butter',
  'peanut butter and jelly',
  'chips and salsa',
  'chips and dip',
  'rice and beans',
  'oil and vinegar',
  'surf and turf',
  'ham and cheese',
  'franks and beans',
  'biscuits and gravy',
  'fish and chips',
  'cream and sugar',
  'half and half',
]);

// Word-to-number mappings
const WORD_QUANTITIES: Record<string, string> = {
  'a dozen': '12',
  'dozen': '12',
  'half a dozen': '6',
  'half dozen': '6',
  'a couple': '2',
  'couple': '2',
  'a few': '3',
  'a pair': '2',
  'a half': '0.5',
};

// Units for quantity matching (longest first to avoid partial matches)
const UNITS = [
  'gallons?', 'quarts?', 'pints?',
  'pounds?', 'ounces?',
  'cups?', 'tablespoons?', 'teaspoons?',
  'tbsp', 'tsp', 'lbs?', 'oz',
  'grams?', 'kilograms?', 'kg', 'g',
  'liters?', 'ml', 'milliliters?',
  'bunche?s?', 'heads?', 'loave?s?', 'loaf',
  'cans?', 'bags?', 'boxe?s?', 'bottles?',
  'packs?', 'packages?', 'containers?',
  'jars?', 'cartons?', 'sticks?',
  'cloves?', 'slices?', 'pieces?',
  'stalks?', 'sprigs?', 'ears?',
  'dozen',
].join('|');

// Regex: number + optional fraction + unit
const QUANTITY_WITH_UNIT = new RegExp(
  `^(\\d+\\.?\\d*(?:\\s*/\\s*\\d+)?(?:\\s*-\\s*\\d+\\.?\\d*)?)\\s+(${UNITS})\\s+(?:of\\s+)?(.+)$`,
  'i'
);

// Regex: bare number + name (e.g., "3 oranges")
const BARE_NUMBER = /^(\d+\.?\d*)\s+(.+)$/;

/**
 * Check if a text segment contains a compound item that shouldn't be split on "and"
 */
function containsCompoundItem(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return Array.from(COMPOUND_ITEMS).some(compound => lower.includes(compound));
}

/**
 * Split input text into individual item strings
 */
function splitItems(text: string): string[] {
  // First, protect compound items by replacing "and" with a placeholder
  let processed = text;
  const placeholders: Array<{ placeholder: string; original: string }> = [];

  for (const compound of COMPOUND_ITEMS) {
    const regex = new RegExp(compound.replace(/ /g, '\\s+'), 'gi');
    const match = processed.match(regex);
    if (match) {
      for (const m of match) {
        const placeholder = `__COMPOUND_${placeholders.length}__`;
        placeholders.push({ placeholder, original: m });
        processed = processed.replace(m, placeholder);
      }
    }
  }

  // Split on: commas, " and ", newlines
  const parts = processed
    .split(/\s*,\s*|\s+and\s+|\n/)
    .map(s => s.trim())
    // Strip leading "and " that can remain after comma-split (e.g., ", and bread" → ", " + "and bread")
    .map(s => s.replace(/^and\s+/i, ''))
    .filter(s => s.length > 0);

  // Restore compound items
  return parts.map(part => {
    let restored = part;
    for (const { placeholder, original } of placeholders) {
      restored = restored.replace(placeholder, original);
    }
    return restored;
  });
}

/**
 * Extract quantity and name from a single item string
 */
function parseQuantity(text: string): ParsedShoppingItem {
  const trimmed = text.trim();

  // Check word quantities first ("a dozen eggs", "a couple bananas")
  const lower = trimmed.toLowerCase();
  for (const [word, num] of Object.entries(WORD_QUANTITIES)) {
    const wordRegex = new RegExp(`^${word}\\s+(?:of\\s+)?(.+)$`, 'i');
    const match = lower.match(wordRegex);
    if (match) {
      return { name: match[1].trim(), quantity: num };
    }
  }

  // Try number + unit + name ("2 lbs chicken breast", "3 cans of tomatoes")
  const unitMatch = trimmed.match(QUANTITY_WITH_UNIT);
  if (unitMatch) {
    const num = unitMatch[1].trim();
    const unit = unitMatch[2].trim();
    const name = unitMatch[3].trim();
    return { name, quantity: `${num} ${unit}` };
  }

  // Try bare number + name ("3 oranges", "12 eggs")
  const bareMatch = trimmed.match(BARE_NUMBER);
  if (bareMatch) {
    return { name: bareMatch[2].trim(), quantity: bareMatch[1] };
  }

  // No quantity detected — default to "1"
  return { name: trimmed, quantity: '1' };
}

/**
 * Parse natural language shopping input into structured items.
 *
 * @example
 * parseShoppingInput("milk, eggs, and a dozen oranges")
 * // => [
 * //   { name: "milk", quantity: "1" },
 * //   { name: "eggs", quantity: "1" },
 * //   { name: "oranges", quantity: "12" }
 * // ]
 *
 * @example
 * parseShoppingInput("2 lbs chicken breast, 3 cans of tomatoes")
 * // => [
 * //   { name: "chicken breast", quantity: "2 lbs" },
 * //   { name: "tomatoes", quantity: "3 cans" }
 * // ]
 */
export function parseShoppingInput(text: string): ParsedShoppingItem[] {
  if (!text || !text.trim()) return [];

  const items = splitItems(text);
  return items.map(parseQuantity);
}

/**
 * Detect if input text likely contains multiple items.
 * Used to show "Multiple items detected" hint in UI.
 */
export function isMultiItemInput(text: string): boolean {
  if (!text || !text.trim()) return false;

  // Check for compound items first — "salt and pepper" is NOT multi-item
  if (containsCompoundItem(text)) {
    // Remove the compound item and check if there's still splitting
    let remaining = text;
    for (const compound of COMPOUND_ITEMS) {
      const regex = new RegExp(compound.replace(/ /g, '\\s+'), 'gi');
      remaining = remaining.replace(regex, '');
    }
    // If nothing meaningful remains after removing compound items, it's single
    if (!remaining.replace(/[,\s]/g, '').length) return false;
    // If there's still content, check that content for multi-item signals
    return /,/.test(remaining) || /\band\b/i.test(remaining);
  }

  return /,/.test(text) || /\band\b/i.test(text);
}

/**
 * Try to extract an embedded quantity from a single item name.
 * Returns separated name and quantity, or null if no quantity found.
 * Used for auto-populating the quantity field in AddItemModal.
 */
export function extractEmbeddedQuantity(
  text: string
): { name: string; quantity: string } | null {
  if (!text || !text.trim()) return null;
  if (isMultiItemInput(text)) return null; // Don't extract from multi-item input

  const parsed = parseQuantity(text.trim());
  // Only return if we actually found a quantity (not the default "1")
  if (parsed.quantity !== '1') {
    return parsed;
  }
  return null;
}
