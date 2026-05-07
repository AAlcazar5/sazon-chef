// ROADMAP 4.0 IG2.1 — Per-user ingredient co-occurrence matrix.
//
// Build pair counts by windowing IngredientEvent (purchased + consumed) into
// 7-day baskets. Two ingredients in the same basket increment their pair
// count once per basket. Pair keys are canonical (A < B lexicographically)
// so we don't double-store (cilantro, lime) and (lime, cilantro).
//
// Idempotent: re-running with the same event set produces the same counts.
// Decay: applyDecay halves counts older than the half-life (default 60d).
//
// Cross-tier dovetail (IG2.2): "you usually grab cilantro with lime" chips
// query this table by `(userId, ingredientA | ingredientB)`.

import { prisma } from '../lib/prisma';

export const DEFAULT_BASKET_WINDOW_DAYS = 7;
export const DEFAULT_HALF_LIFE_DAYS = 60;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const BASKETED_EVENT_TYPES = new Set(['purchased', 'consumed']);

interface PairKey {
  a: string;
  b: string;
}

/** Canonical pair ordering — A is lexicographically smaller. */
function pairKey(x: string, y: string): PairKey | null {
  if (x === y) return null; // self-edges aren't pairs
  return x < y ? { a: x, b: y } : { a: y, b: x };
}

interface EventRow {
  userId: string;
  ingredientName: string;
  eventType: string;
  occurredAt: Date;
}

interface BasketSlot {
  ingredients: Set<string>;
  /** Latest event time in this basket — used for `lastSeenAt`. */
  latestAt: Date;
}

function basketIndex(occurredAt: Date, anchor: Date, windowDays: number): number {
  const diffDays = Math.floor(
    (occurredAt.getTime() - anchor.getTime()) / MS_PER_DAY,
  );
  return Math.floor(diffDays / windowDays);
}

export interface RebuildInput {
  userId: string;
  /** Window length in days. Default 7. */
  windowDays?: number;
  /** Anchor for basket bucketing. Default = oldest event time. */
  anchorAt?: Date;
}

interface PairAccumulator {
  count: number;
  lastSeenAt: Date;
}

/**
 * Recompute the co-occurrence matrix for a single user from scratch using
 * the current `IngredientEvent` stream. Idempotent — same event set yields
 * same row counts. Replaces the user's prior rows in one transaction.
 */
export async function rebuildForUser(input: RebuildInput): Promise<number> {
  if (!input.userId) throw new Error('rebuildForUser: userId required');
  const windowDays = input.windowDays ?? DEFAULT_BASKET_WINDOW_DAYS;

  const events = (await (prisma as any).ingredientEvent.findMany({
    where: { userId: input.userId },
    orderBy: { occurredAt: 'asc' },
  })) as EventRow[];

  const basketed = events.filter((e) => BASKETED_EVENT_TYPES.has(e.eventType));
  if (basketed.length === 0) {
    // No events → blow away any stale rows + return 0.
    await (prisma as any).ingredientCoOccurrence.deleteMany({
      where: { userId: input.userId },
    });
    return 0;
  }

  const anchor = input.anchorAt ?? basketed[0].occurredAt;
  const baskets = new Map<number, BasketSlot>();

  for (const e of basketed) {
    const idx = basketIndex(e.occurredAt, anchor, windowDays);
    const slot = baskets.get(idx);
    if (slot) {
      slot.ingredients.add(e.ingredientName);
      if (e.occurredAt > slot.latestAt) slot.latestAt = e.occurredAt;
    } else {
      baskets.set(idx, {
        ingredients: new Set([e.ingredientName]),
        latestAt: e.occurredAt,
      });
    }
  }

  const accumulator = new Map<string, PairAccumulator>();
  for (const slot of baskets.values()) {
    const items = [...slot.ingredients].sort();
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const key = pairKey(items[i], items[j]);
        if (!key) continue;
        const k = `${key.a}|${key.b}`;
        const existing = accumulator.get(k);
        if (existing) {
          existing.count += 1;
          if (slot.latestAt > existing.lastSeenAt) {
            existing.lastSeenAt = slot.latestAt;
          }
        } else {
          accumulator.set(k, { count: 1, lastSeenAt: slot.latestAt });
        }
      }
    }
  }

  await (prisma as any).$transaction([
    (prisma as any).ingredientCoOccurrence.deleteMany({
      where: { userId: input.userId },
    }),
    ...[...accumulator.entries()].map(([k, v]) => {
      const [a, b] = k.split('|');
      return (prisma as any).ingredientCoOccurrence.create({
        data: {
          userId: input.userId,
          ingredientA: a,
          ingredientB: b,
          coCount: v.count,
          lastSeenAt: v.lastSeenAt,
        },
      });
    }),
  ]);

  return accumulator.size;
}

export interface ApplyDecayInput {
  userId: string;
  asOfDate: Date;
  halfLifeDays?: number;
}

interface DecayRow {
  id: string;
  coCount: number;
  lastSeenAt: Date;
}

/**
 * Apply exponential decay to all co-occurrence rows for a user. Half-life
 * specifies the days at which a count halves; rows with `coCount` near zero
 * are deleted to keep the table small.
 */
export async function applyDecay(input: ApplyDecayInput): Promise<number> {
  if (!input.userId) throw new Error('applyDecay: userId required');
  const halfLife = input.halfLifeDays ?? DEFAULT_HALF_LIFE_DAYS;
  const rows = (await (prisma as any).ingredientCoOccurrence.findMany({
    where: { userId: input.userId },
  })) as DecayRow[];

  const updates: Array<Promise<unknown>> = [];
  let deletedOrUpdated = 0;
  for (const r of rows) {
    const ageDays =
      (input.asOfDate.getTime() - r.lastSeenAt.getTime()) / MS_PER_DAY;
    const factor = Math.pow(0.5, ageDays / halfLife);
    const next = r.coCount * factor;
    if (next < 0.05) {
      updates.push(
        (prisma as any).ingredientCoOccurrence.delete({ where: { id: r.id } }),
      );
    } else {
      updates.push(
        (prisma as any).ingredientCoOccurrence.update({
          where: { id: r.id },
          data: { coCount: next },
        }),
      );
    }
    deletedOrUpdated += 1;
  }
  await Promise.all(updates);
  return deletedOrUpdated;
}

export interface GetPairsInput {
  userId: string;
  /** Anchor ingredient — pairs containing this name are returned. */
  withIngredient: string;
  /** Top-K. Default 5. */
  k?: number;
}

export interface PairSuggestion {
  ingredient: string;
  coCount: number;
  lastSeenAt: Date;
}

/**
 * Top-K co-occurring ingredients for the given anchor, descending by count.
 * Per-user scoped — no cross-user leakage.
 */
export async function getPairs(
  input: GetPairsInput,
): Promise<PairSuggestion[]> {
  if (!input.userId) return [];
  if (!input.withIngredient) return [];
  const k = input.k ?? 5;
  const rows = (await (prisma as any).ingredientCoOccurrence.findMany({
    where: {
      userId: input.userId,
      OR: [
        { ingredientA: input.withIngredient },
        { ingredientB: input.withIngredient },
      ],
    },
    orderBy: { coCount: 'desc' },
    take: k,
  })) as Array<{
    ingredientA: string;
    ingredientB: string;
    coCount: number;
    lastSeenAt: Date;
  }>;
  return rows.map((r) => ({
    ingredient:
      r.ingredientA === input.withIngredient ? r.ingredientB : r.ingredientA,
    coCount: r.coCount,
    lastSeenAt: r.lastSeenAt,
  }));
}
