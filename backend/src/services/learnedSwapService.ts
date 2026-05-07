// ROADMAP 4.0 IG6.2 — Learned ingredient-swap service.
//
// Replaces the static-dict-only `ingredientSwapService` with a 4-source
// ranker:
//   1. user prior — the user's own `swappedIn` choices for this ingredient
//      (highest weight; per-user signal beats everything else)
//   2. crowd mode — most-common `swappedIn` across other users for this
//      ingredient (medium; gated by k-anonymity floor)
//   3. embedding NN — IG1.2 semantic neighbors filtered by dietary tag
//      (low; falls back when user/crowd are silent)
//   4. static dict — the original `ingredientSwapService` (cold-start
//      fallback; covers the launch-day "no signal" path)
//
// Each result carries `source: 'user' | 'crowd' | 'embedding' | 'static'`
// for telemetry. The dietary filter applies to ALL four sources before merge.
//
// Cross-tier dovetail: IG1.2 doesn't exist yet — the embedding source is
// stubbed and gracefully degrades (returns []) until that ranker ships.
// IG6.1's swap-tap logger writes the user-prior signal this service reads.

import { prisma } from '../lib/prisma';
import { normalizeIngredientName } from '../utils/ingredientNormalizer';
import {
  getIngredientSwaps,
  type IngredientSwap,
} from './ingredientSwapService';

export type SwapSource = 'user' | 'crowd' | 'embedding' | 'static';

export interface LearnedSwap {
  /** Display name of the alternative ingredient. */
  alternative: string;
  /** Where the suggestion came from. */
  source: SwapSource;
  /** Soft rank weight (higher = stronger). */
  weight: number;
  /** Optional flavor / ratio note (only present for static-source). */
  flavorNote?: string;
  ratioNote?: string;
  /** Macro deltas (only present for static-source). */
  macroDelta?: IngredientSwap['macroDelta'];
}

const MAX_RESULTS = 5;
const CROWD_KANON_FLOOR = 30; // require at least 30 users contributing
const USER_PRIOR_WEIGHT = 1.0;
const CROWD_WEIGHT_BASE = 0.65;
const EMBEDDING_WEIGHT = 0.4;
const STATIC_WEIGHT = 0.25;

const DIETARY_TAG_BANS: Record<string, RegExp[]> = {
  vegan: [/(beef|chicken|turkey|pork|fish|salmon|shrimp|egg|milk|butter|cheese|yogurt|honey)/i],
  vegetarian: [/(beef|chicken|turkey|pork|fish|salmon|shrimp)/i],
  'dairy-free': [/(milk|butter|cheese|yogurt|cream|kefir|whey)/i],
  'gluten-free': [/(wheat|barley|rye|spelt|farro|seitan)/i],
};

function violatesDietary(name: string, restrictions: string[]): boolean {
  for (const r of restrictions) {
    const patterns = DIETARY_TAG_BANS[r.toLowerCase()];
    if (!patterns) continue;
    for (const p of patterns) {
      if (p.test(name)) return true;
    }
  }
  return false;
}

export interface SuggestSwapsInput {
  /** The original ingredient the user wants to substitute. */
  name: string;
  /** Optional user id — when present, enables user-prior + crowd lookups. */
  userId?: string;
  /** Dietary restriction labels (e.g. ['vegan', 'gluten-free']). */
  dietaryRestrictions?: string[];
  /** Cap on results returned. Default 5. */
  k?: number;
}

interface SwappedRow {
  swapTargetName: string | null;
}

async function userPriorSwaps(
  userId: string,
  fromName: string,
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  // Look at this user's `swappedIn` events whose partner was `fromName`.
  // The IG6.1 logger writes BOTH a swappedOut row (ingredientName=fromName,
  // swapTargetName=toName) AND a swappedIn row (ingredientName=toName,
  // swapTargetName=fromName). Either query path works; we pick swappedOut.
  const rows = (await (prisma as any).ingredientEvent.findMany({
    where: {
      userId,
      eventType: 'swappedOut',
      ingredientName: fromName,
    },
    select: { swapTargetName: true },
  })) as SwappedRow[];
  for (const r of rows) {
    if (!r.swapTargetName) continue;
    out.set(r.swapTargetName, (out.get(r.swapTargetName) ?? 0) + 1);
  }
  return out;
}

interface CrowdAggregate {
  swapTargetName: string;
  count: number;
  distinctUsers: number;
}

async function crowdSwapAggregate(
  fromName: string,
  excludeUserId: string | undefined,
): Promise<CrowdAggregate[]> {
  // Count distinct users + total events per swap target. SQLite supports
  // COUNT(DISTINCT) via Prisma `groupBy` on userId? Not directly — fall
  // back to a JS aggregation for clarity (the volume is small).
  const where: Record<string, unknown> = {
    eventType: 'swappedOut',
    ingredientName: fromName,
  };
  if (excludeUserId) where.userId = { not: excludeUserId };
  const rows = (await (prisma as any).ingredientEvent.findMany({
    where,
    select: { userId: true, swapTargetName: true },
  })) as Array<{ userId: string; swapTargetName: string | null }>;
  const byTarget = new Map<string, { count: number; users: Set<string> }>();
  for (const r of rows) {
    if (!r.swapTargetName) continue;
    const slot = byTarget.get(r.swapTargetName) ?? {
      count: 0,
      users: new Set<string>(),
    };
    slot.count += 1;
    slot.users.add(r.userId);
    byTarget.set(r.swapTargetName, slot);
  }
  const out: CrowdAggregate[] = [];
  for (const [swapTargetName, { count, users }] of byTarget) {
    out.push({ swapTargetName, count, distinctUsers: users.size });
  }
  out.sort((a, b) => b.count - a.count);
  return out;
}

/**
 * Stub for the IG1.2 embedding-neighbors lookup. Returns [] until IG1.2
 * ships an `ingredientAdjacencyService`. When that lands, this function
 * delegates to it (filtering by dietary tag).
 */
function embeddingNeighborsStub(): string[] {
  return [];
}

export async function suggestSwaps(
  input: SuggestSwapsInput,
): Promise<LearnedSwap[]> {
  if (!input.name) return [];
  const k = input.k ?? MAX_RESULTS;
  const fromName = normalizeIngredientName(input.name);
  const restrictions = (input.dietaryRestrictions ?? []).map((r) => r.toLowerCase());

  // Static-dict baseline (always available).
  const staticSwaps = getIngredientSwaps(fromName, restrictions);

  // User-prior signal (if userId provided).
  const userPriors = input.userId
    ? await userPriorSwaps(input.userId, fromName)
    : new Map<string, number>();

  // Crowd-mode signal (if userId provided so we can exclude self).
  const crowdAggregates = input.userId
    ? await crowdSwapAggregate(fromName, input.userId)
    : await crowdSwapAggregate(fromName, undefined);

  // Embedding neighbors stub.
  const embeddingNeighbors = embeddingNeighborsStub();

  // Merge. Higher-weight sources win on conflict.
  const merged = new Map<string, LearnedSwap>();
  const upsert = (l: LearnedSwap) => {
    if (violatesDietary(l.alternative, restrictions)) return;
    const prior = merged.get(l.alternative.toLowerCase());
    if (!prior || prior.weight < l.weight) {
      merged.set(l.alternative.toLowerCase(), l);
    }
  };

  // 1. User priors — weight scales with frequency
  let maxUser = 0;
  for (const [, v] of userPriors) maxUser = Math.max(maxUser, v);
  for (const [name, count] of userPriors) {
    const weight = USER_PRIOR_WEIGHT * (maxUser > 0 ? count / maxUser : 1);
    upsert({ alternative: name, source: 'user', weight });
  }

  // 2. Crowd mode — gated by k-anonymity floor
  if (crowdAggregates.length > 0) {
    const totalDistinctUsers = crowdAggregates.reduce(
      (acc, a) => acc + a.distinctUsers,
      0,
    );
    if (totalDistinctUsers >= CROWD_KANON_FLOOR) {
      const top = crowdAggregates[0].count;
      for (const agg of crowdAggregates) {
        const ratio = top > 0 ? agg.count / top : 0;
        upsert({
          alternative: agg.swapTargetName,
          source: 'crowd',
          weight: CROWD_WEIGHT_BASE * ratio,
        });
      }
    }
  }

  // 3. Embedding neighbors
  for (const n of embeddingNeighbors) {
    upsert({ alternative: n, source: 'embedding', weight: EMBEDDING_WEIGHT });
  }

  // 4. Static dict (cold-start fallback)
  for (const s of staticSwaps) {
    upsert({
      alternative: s.alternative,
      source: 'static',
      weight: STATIC_WEIGHT,
      flavorNote: s.flavorNote,
      ratioNote: s.ratioNote,
      macroDelta: s.macroDelta,
    });
  }

  const ranked = [...merged.values()].sort((a, b) => b.weight - a.weight);
  return ranked.slice(0, k);
}

export const __INTERNALS = {
  CROWD_KANON_FLOOR,
  USER_PRIOR_WEIGHT,
  CROWD_WEIGHT_BASE,
  EMBEDDING_WEIGHT,
  STATIC_WEIGHT,
};
