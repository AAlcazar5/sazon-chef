// ROADMAP 4.0 IG4.1 — Tag soon-to-expire pantry items.
//
// From `PantryItem.expiryHint + createdAt`, compute `daysUntilExpiry`.
// Items with `daysUntilExpiry ≤ 3` are flagged for the use-it-up surface
// (IG4.3) and the use-it-up ranker boost (IG4.2). Items without an expiry
// hint are excluded — no false positives from staples like rice / flour.
//
// Distinct from N2.3 `expiringInventoryService`, which spans pantry +
// leftover + meal-prep. This service is the pantry-only path that powers
// IG4 specifically; the unified service composes this for its pantry slice.

import { prisma } from '../lib/prisma';
import { lookupExpiryHint } from './pantryItemService';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const DEFAULT_EXPIRING_THRESHOLD_DAYS = 3;

export interface ExpiringPantryItem {
  id: string;
  name: string;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  /** Days until expiry. 0 = today; negative = already past. */
  daysUntilExpiry: number;
  /** Concrete expiry timestamp the heuristic resolved to. */
  expiresAt: Date;
  /** Source of the expiry signal. */
  expirySource: 'column' | 'fallback';
}

interface PantryRow {
  id: string;
  name: string;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  expiryHint: number | null;
  createdAt: Date;
  updatedAt: Date;
}

function diffDays(future: Date, now: Date): number {
  return Math.floor((future.getTime() - now.getTime()) / MS_PER_DAY);
}

export interface GetExpiringPantryInput {
  userId: string;
  /** Items expiring within this many days are returned. Default 3. */
  withinDays?: number;
  /** Inject reference time for tests. */
  now?: Date;
}

/**
 * Returns pantry items whose computed expiry falls within `withinDays`.
 * Items already past expiry are included with negative `daysUntilExpiry`
 * so callers decide how to render them.
 *
 * Resolution order for the expiry hint:
 *   1. `PantryItem.expiryHint` (column) — IG0.1 set this
 *   2. `lookupExpiryHint(name)` (`pantryItemService` lifespan defaults)
 *   3. otherwise: omit the item (no false positives from staples)
 */
export async function getExpiringPantryItems(
  input: GetExpiringPantryInput,
): Promise<ExpiringPantryItem[]> {
  if (!input.userId) return [];
  const withinDays = Math.max(0, input.withinDays ?? DEFAULT_EXPIRING_THRESHOLD_DAYS);
  const now = input.now ?? new Date();

  const rows = (await (prisma as any).pantryItem.findMany({
    where: { userId: input.userId },
  })) as PantryRow[];

  const out: ExpiringPantryItem[] = [];
  for (const r of rows) {
    let hint: number | null = null;
    let source: ExpiringPantryItem['expirySource'] = 'column';
    if (typeof r.expiryHint === 'number' && r.expiryHint > 0) {
      hint = r.expiryHint;
      source = 'column';
    } else {
      const fallback = lookupExpiryHint(r.name);
      if (fallback != null) {
        hint = fallback;
        source = 'fallback';
      }
    }
    if (hint == null) continue;
    const expiresAt = new Date(r.createdAt.getTime() + hint * MS_PER_DAY);
    const daysUntilExpiry = diffDays(expiresAt, now);
    if (daysUntilExpiry > withinDays) continue;
    out.push({
      id: r.id,
      name: r.name,
      category: r.category,
      quantity: r.quantity,
      unit: r.unit,
      daysUntilExpiry,
      expiresAt,
      expirySource: source,
    });
  }
  out.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  return out;
}

/** Convenience: just the names, ordered most-urgent first. */
export async function getExpiringIngredientNames(
  input: GetExpiringPantryInput,
): Promise<string[]> {
  const items = await getExpiringPantryItems(input);
  return items.map((i) => i.name);
}
