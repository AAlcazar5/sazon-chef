// backend/src/utils/unitConversion.ts
// Canonical unit normalization for smart ingredient merging

export interface CanonicalResult {
  amount: number;
  canonicalUnit: 'ml' | 'g' | 'count' | string;
}

/** Conversion factors to canonical unit */
const VOLUME_TO_ML: Record<string, number> = {
  tsp: 4.92892,
  tbsp: 14.7868,
  cup: 236.588,
  ml: 1,
};

const WEIGHT_TO_G: Record<string, number> = {
  oz: 28.3495,
  lb: 453.592,
  g: 1,
};

const COUNT_UNITS = new Set(['count', 'piece', 'pieces', 'item', 'items', 'each', 'whole']);

/**
 * Normalize amount+unit to a canonical unit for merging.
 *
 * Conversions:
 *   tsp  → ml  ×4.93
 *   tbsp → ml  ×14.79
 *   cup  → ml  ×236.59
 *   oz   → g   ×28.35
 *   lb   → g   ×453.59
 *   ml, g, count → pass through
 *   unknown → pass through with canonicalUnit = unit
 */
export function normalizeToCanonical(amount: number, unit: string): CanonicalResult {
  const u = unit.toLowerCase().trim();

  if (VOLUME_TO_ML[u] !== undefined) {
    return { amount: amount * VOLUME_TO_ML[u], canonicalUnit: 'ml' };
  }

  if (WEIGHT_TO_G[u] !== undefined) {
    return { amount: amount * WEIGHT_TO_G[u], canonicalUnit: 'g' };
  }

  if (COUNT_UNITS.has(u)) {
    return { amount, canonicalUnit: 'count' };
  }

  // Unknown unit — fall through unchanged
  return { amount, canonicalUnit: unit };
}

/** Convert canonical amount back to display unit */
export function canonicalToUnit(canonicalAmount: number, targetUnit: string): number {
  const u = targetUnit.toLowerCase().trim();
  if (VOLUME_TO_ML[u] !== undefined) {
    return canonicalAmount / VOLUME_TO_ML[u];
  }
  if (WEIGHT_TO_G[u] !== undefined) {
    return canonicalAmount / WEIGHT_TO_G[u];
  }
  return canonicalAmount;
}

/** Determine canonical dimension for a unit: 'volume' | 'weight' | 'count' | 'unknown' */
export function unitDimension(unit: string): 'volume' | 'weight' | 'count' | 'unknown' {
  const u = unit.toLowerCase().trim();
  if (VOLUME_TO_ML[u] !== undefined) return 'volume';
  if (WEIGHT_TO_G[u] !== undefined) return 'weight';
  if (COUNT_UNITS.has(u)) return 'count';
  return 'unknown';
}
