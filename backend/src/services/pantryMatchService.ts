// backend/src/services/pantryMatchService.ts
// Pantry-match scoring: given a user's pantry and a recipe's ingredients,
// compute % of ingredients already available and list what's missing.
//
// Normalization strategy: strip quantity prefix, then fuzzy-match at the
// token level (same approach as pantryController.consume). Common staples
// (salt, pepper, oil, water) are never considered "missing".

import { cosineSimilarity } from '../utils/vectorMath';

export interface PantryMatchResult {
  matched: string[];
  missing: string[];
  matchPercentage: number; // 0-100, rounded
  canSubstitute: boolean; // true if every missing item has a common pantry swap
}

const QUANTITY_PREFIX =
  /^[\d./½¼¾⅓⅔⅛\s-]+\s*(?:cups?|tbsp|tbsps?|tsp|tsps?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|l|liters?|cloves?|heads?|cans?|medium|large|small|pieces?|slices?|stalks?|sprigs?)?\s*(?:of\s+)?/i;

// Staples that virtually every kitchen has — exclude from "missing" count.
const STAPLES = new Set<string>([
  'salt', 'pepper', 'black pepper', 'water', 'ice', 'ice water',
  'olive oil', 'oil', 'vegetable oil', 'cooking oil', 'canola oil',
  'butter', 'unsalted butter',
]);

// Ingredients that typically have common pantry swaps (greek yogurt for sour
// cream, etc.) — used for canSubstitute heuristic.
const SWAPPABLE = new Set<string>([
  'sour cream', 'heavy cream', 'buttermilk', 'milk', 'whole milk',
  'breadcrumbs', 'panko', 'panko breadcrumbs',
  'lemon juice', 'lime juice', 'white wine', 'red wine',
  'parmesan', 'parmesan cheese', 'cheddar', 'mozzarella',
  'yogurt', 'greek yogurt', 'cornstarch', 'flour', 'all-purpose flour',
  'sugar', 'brown sugar', 'honey', 'maple syrup',
]);

export function normalizeIngredient(text: string): string {
  return text
    .toLowerCase()
    .replace(QUANTITY_PREFIX, '')
    .replace(/[,(].*$/, '') // drop trailing "(minced)", ", chopped", etc.
    .replace(/[^a-z\s-]/g, '')
    .trim();
}

function tokens(text: string): string[] {
  return text.split(/\s+/).filter((t) => t.length > 2);
}

export function isStaple(ingredient: string): boolean {
  const n = normalizeIngredient(ingredient);
  if (STAPLES.has(n)) return true;
  return tokens(n).some((t) => STAPLES.has(t));
}

/**
 * Fuzzy match: pantry item matches a recipe ingredient if normalized forms
 * share any meaningful token (length > 2) in either direction, or the pantry
 * name is a substring of the ingredient or vice versa.
 */
export function matchesPantry(ingredient: string, pantryNames: string[]): boolean {
  const ing = normalizeIngredient(ingredient);
  if (!ing) return false;
  const ingTokens = tokens(ing);

  for (const raw of pantryNames) {
    const pn = normalizeIngredient(raw);
    if (!pn) continue;
    if (pn === ing) return true;
    if (ing.includes(pn) || pn.includes(ing)) return true;
    const pnTokens = tokens(pn);
    if (pnTokens.some((t) => ingTokens.includes(t))) return true;
    if (ingTokens.some((t) => pnTokens.includes(t))) return true;
  }
  return false;
}

export function computePantryMatch(
  recipeIngredients: Array<{ text: string }>,
  pantryNames: string[],
): PantryMatchResult {
  const matched: string[] = [];
  const missing: string[] = [];

  for (const ing of recipeIngredients) {
    const text = ing.text;
    if (isStaple(text)) {
      matched.push(text);
      continue;
    }
    if (matchesPantry(text, pantryNames)) {
      matched.push(text);
    } else {
      missing.push(text);
    }
  }

  const total = matched.length + missing.length;
  const matchPercentage = total === 0 ? 0 : Math.round((matched.length / total) * 100);

  const canSubstitute =
    missing.length > 0 &&
    missing.every((m) => {
      const n = normalizeIngredient(m);
      if (SWAPPABLE.has(n)) return true;
      return tokens(n).some((t) => SWAPPABLE.has(t));
    });

  return { matched, missing, matchPercentage, canSubstitute };
}

// ─── IG7.1 — Semantic pantry match ──────────────────────────────────────────
// Cosine-similarity layer on top of the binary path. Powered by IG1
// embeddings; gracefully falls back to binary when embeddings absent.

const SEMANTIC_THRESHOLD = 0.8;

function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  return cosineSimilarity(a, b);
}

export type SemanticMatchKind = 'exact' | 'semantic' | 'none';

export interface SemanticMatchResult {
  kind: SemanticMatchKind;
  /** 1.0 for exact, 0.7 for semantic, 0 for none — IG7.1 spec. */
  weight: number;
  /** Cosine similarity to the chosen pantry item (semantic kind only). */
  similarity?: number;
  /** Pantry name that triggered the match (for telemetry). */
  matchedPantryItem?: string;
  /**
   * 'binary' when the semantic step couldn't run because the ingredient had
   * no embedding row. Useful for caller telemetry (IG9 source attribution).
   */
  fallback?: 'binary';
}

export interface SemanticMatchOptions {
  threshold?: number;
}

/**
 * Match a recipe ingredient against the user's pantry, with embedding-based
 * soft matching layered on top of the binary fuzzy match. Cold-start
 * (no embedding for the ingredient) falls back to binary so callers always
 * get a useful answer.
 */
export function semanticMatch(
  ingredient: string,
  pantryNames: string[],
  embeddings: ReadonlyMap<string, number[]>,
  options: SemanticMatchOptions = {},
): SemanticMatchResult {
  const ingNorm = normalizeIngredient(ingredient);
  if (!ingNorm) return { kind: 'none', weight: 0 };

  // Step 1: binary exact / fuzzy match — same path the existing 14 tests
  // exercise. If the binary layer says "yes," that's an exact match (1.0).
  if (matchesPantry(ingredient, pantryNames)) {
    const fallback = embeddings.get(ingNorm) ? undefined : ('binary' as const);
    return fallback
      ? { kind: 'exact', weight: 1.0, fallback }
      : { kind: 'exact', weight: 1.0 };
  }

  // Step 2: semantic match — only runs when we have an embedding for the
  // ingredient. Cold-start (no embedding) falls through to "none" but with
  // a fallback marker so callers can distinguish "didn't try semantic" from
  // "tried and failed."
  const ingVec = embeddings.get(ingNorm);
  if (!ingVec) {
    return { kind: 'none', weight: 0, fallback: 'binary' };
  }

  const threshold = options.threshold ?? SEMANTIC_THRESHOLD;
  let best: { name: string; sim: number } | null = null;
  for (const raw of pantryNames) {
    const pn = normalizeIngredient(raw);
    if (!pn) continue;
    const pVec = embeddings.get(pn);
    if (!pVec) continue;
    const sim = cosine(ingVec, pVec);
    if (sim >= threshold && (best == null || sim > best.sim)) {
      best = { name: pn, sim };
    }
  }
  if (best == null) return { kind: 'none', weight: 0 };
  return {
    kind: 'semantic',
    weight: 0.7,
    similarity: best.sim,
    matchedPantryItem: best.name,
  };
}

export interface SemanticPantryMatchInput {
  recipeIngredients: Array<{ text: string; isCritical?: boolean }>;
  pantryNames: string[];
  embeddings: ReadonlyMap<string, number[]>;
  threshold?: number;
}

export interface SemanticPantryMatchResult {
  matchedExact: Array<{ text: string }>;
  matchedSemantic: Array<{ text: string; similarity: number; matchedPantryItem: string }>;
  missing: Array<{ text: string; isCritical: boolean }>;
  missingCritical: Array<{ text: string }>;
  /** matchedExact*1.0 + matchedSemantic*0.7 - missingCritical*0.5 — IG7.1 spec. */
  score: number;
}

/**
 * IG7.1 composer: classify each recipe ingredient as exact / semantic /
 * missing and roll up the IG7.1 score.
 */
export function computeSemanticPantryMatch(
  input: SemanticPantryMatchInput,
): SemanticPantryMatchResult {
  const matchedExact: Array<{ text: string }> = [];
  const matchedSemantic: Array<{
    text: string;
    similarity: number;
    matchedPantryItem: string;
  }> = [];
  const missing: Array<{ text: string; isCritical: boolean }> = [];

  for (const ing of input.recipeIngredients) {
    if (isStaple(ing.text)) {
      matchedExact.push({ text: ing.text });
      continue;
    }
    const result = semanticMatch(
      ing.text,
      input.pantryNames,
      input.embeddings,
      { threshold: input.threshold },
    );
    if (result.kind === 'exact') {
      matchedExact.push({ text: ing.text });
    } else if (result.kind === 'semantic') {
      matchedSemantic.push({
        text: ing.text,
        similarity: result.similarity ?? 0,
        matchedPantryItem: result.matchedPantryItem ?? '',
      });
    } else {
      missing.push({ text: ing.text, isCritical: ing.isCritical === true });
    }
  }

  const missingCritical = missing
    .filter((m) => m.isCritical)
    .map((m) => ({ text: m.text }));
  const score =
    matchedExact.length * 1.0 +
    matchedSemantic.length * 0.7 -
    missingCritical.length * 0.5;

  return {
    matchedExact,
    matchedSemantic,
    missing,
    missingCritical,
    score,
  };
}

export const __INTERNALS = {
  SEMANTIC_THRESHOLD,
  cosine,
} as const;
