// ROADMAP 4.0 G2.2 — city-cuisine affinity graph service.
//
// Joins the curated city × specialty catalog (`data/cityCuisineCatalog`)
// with the user's per-edge cuisine adjacency weights so two travelers
// landing in the same city see a different ranking. A user with strong
// oaxacan signal who lands in CDMX sees mole + tlayudas at the top; a
// user with strong Italian signal sees al-pastor (Lebanese-Mexican
// fusion) higher.
//
// Dishes whose cuisine matches a top-N user-affinity edge get a per-
// signal boost on top of a uniform base score. Cold-start (no signal)
// returns the catalog order so the surface still works on day one.
//
// Pure(ish): one prisma read for adjacency weights, then in-memory
// scoring + sort. No persistence.

import { prisma } from '@/lib/prisma';
import {
  CITY_CUISINE_CATALOG,
  type CityCuisineEntry,
  type CityDish,
} from '../data/cityCuisineCatalog';

export { CITY_CUISINE_CATALOG };

const MAX_K = 10;
const DEFAULT_K = 5;
const BASE_SCORE = 1.0;
const AFFINITY_WEIGHT_PER_SIGNAL = 0.5;

export interface CityDishRecommendation {
  name: string;
  cuisine: string;
  hook: string;
  emoji?: string;
  score: number;
  /** Cuisine names from the user's signal that boosted this dish. */
  affinityMatched: string[];
}

export interface CityRecommendationResult {
  city: CityCuisineEntry | null;
  dishes: CityDishRecommendation[];
}

// Strip diacritics: "São Paulo" → "sao paulo"
function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalizeCityKey(input: string): string {
  return stripDiacritics(input.trim().toLowerCase());
}

/**
 * Resolve a user-supplied city name (display name, alias, or slug) to a
 * catalog entry. Accent + case insensitive. Returns null when unknown.
 */
export function resolveCity(input: string): CityCuisineEntry | null {
  if (!input) return null;
  const norm = normalizeCityKey(input);
  if (!norm) return null;
  // Exact slug match
  if (CITY_CUISINE_CATALOG[norm]) return CITY_CUISINE_CATALOG[norm];
  // displayName / alias match (also normalized)
  for (const entry of Object.values(CITY_CUISINE_CATALOG)) {
    if (normalizeCityKey(entry.displayName) === norm) return entry;
    for (const alias of entry.aliases) {
      if (normalizeCityKey(alias) === norm) return entry;
    }
  }
  return null;
}

interface AdjacencyRow {
  sourceCuisine: string;
  targetCuisine: string;
  weight: number;
  signalCount: number;
}

interface ScoreInput {
  dish: CityDish;
  affinityByCuisine: Map<string, number>;
}

function scoreDish({ dish, affinityByCuisine }: ScoreInput): {
  score: number;
  affinityMatched: string[];
} {
  const cuisineLower = dish.cuisine.toLowerCase();
  let score = BASE_SCORE;
  const matched: string[] = [];
  // Exact-cuisine match
  const exact = affinityByCuisine.get(cuisineLower);
  if (exact && exact > 0) {
    score += exact * AFFINITY_WEIGHT_PER_SIGNAL;
    matched.push(cuisineLower);
  }
  return { score, affinityMatched: matched };
}

export interface CityDishRecommendationInput {
  userId: string;
  city: string;
  k?: number;
}

/**
 * Top-K city specialty dishes ranked by user cuisine affinity.
 *
 * Cold-start (no user signal) returns dishes in catalog order with
 * uniform `BASE_SCORE`. Heavy-signal users see dishes whose cuisine
 * matches their adjacency weights bubble up.
 */
export async function getCityDishRecommendations(
  input: CityDishRecommendationInput,
): Promise<CityRecommendationResult> {
  if (!input.userId) {
    throw new Error('userId is required');
  }
  const k = Math.max(1, Math.min(input.k ?? DEFAULT_K, MAX_K));
  const city = resolveCity(input.city);
  if (!city) {
    return { city: null, dishes: [] };
  }

  // Read user's per-edge cuisine signal. Build a per-cuisine weight map by
  // taking the max of either side of an edge — a user who has signal for
  // (mexican → oaxacan) cares about both mexican and oaxacan dishes.
  const rows = (await (prisma as any).userCuisineAdjacencyWeight.findMany({
    where: { userId: input.userId },
    select: {
      sourceCuisine: true,
      targetCuisine: true,
      weight: true,
      signalCount: true,
    },
  })) as AdjacencyRow[];

  const affinityByCuisine = new Map<string, number>();
  for (const r of rows) {
    const w = Math.max(0, r.weight);
    if (w <= 0) continue;
    for (const c of [r.sourceCuisine, r.targetCuisine]) {
      const key = c.toLowerCase();
      const prev = affinityByCuisine.get(key) ?? 0;
      if (w > prev) affinityByCuisine.set(key, w);
    }
  }

  const scored = city.dishes.map((dish) => {
    const { score, affinityMatched } = scoreDish({ dish, affinityByCuisine });
    return {
      name: dish.name,
      cuisine: dish.cuisine,
      hook: dish.hook,
      emoji: dish.emoji,
      score,
      affinityMatched,
    } as CityDishRecommendation;
  });

  scored.sort((a, b) => b.score - a.score);
  return { city, dishes: scored.slice(0, k) };
}

export const __forTest = {
  MAX_K,
  DEFAULT_K,
  BASE_SCORE,
  AFFINITY_WEIGHT_PER_SIGNAL,
  scoreDish,
};
