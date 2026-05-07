// ROADMAP 4.0 N2.3 — expiringInventoryService.
//
// Three parallel data stores answer the same question ("what does the user
// have that's about to go bad?"):
//
//   - PantryItem            (no expiry column today; IG0.1 will add expiryHint)
//   - LeftoverInventory     (concrete `expiresAt`)
//   - MealPrepPortion       (fresh `expiryDate` + frozen `freezerExpiryDate`)
//
// Four surfaces consume them, each going to a different source today:
// IG4.3 <UseItUpStrip>, RD4.2 <LeftoverBridgeCard>, WK1.2 useItUpHint,
// WK2.2 <CarryOverBadge>. Same emotional beat, four code paths, three
// lifestyle-voice copy variants drifting independently.
//
// This service is the unified read path. Copy goes through N3
// (`sazonVoiceService.expiringPrompt`); the four consumers route here
// instead of querying their respective sources directly.
//
// Note on PantryItem: the model currently has no expiry column. We honor
// the source via a category → days TTL heuristic so the service works
// today; IG0.1 replaces the heuristic with a real column.

import { prisma } from '../lib/prisma';

export type ExpiringSource = 'pantry' | 'leftover' | 'meal-prep';

export interface ExpiringItem {
  /** Display-ready ingredient or component name. */
  ingredientName: string;
  /** Where this row originated. */
  source: ExpiringSource;
  /** Whole days until expiry. 0 = today; negative = already past. */
  daysUntilExpiry: number;
  /** Concrete expiry timestamp the heuristic + DB landed on. */
  expiresAt: Date;
  /** Origin row id — caller can drill back into the underlying record. */
  originRef: string;
  /**
   * For meal-prep portions: how many fresh servings remain. For leftovers:
   * `portionsRemaining`. Pantry items have no portion count.
   */
  portionsRemaining?: number;
}

/**
 * Pantry-category TTL heuristic (days from createdAt) until IG0.1 ships
 * a real `PantryItem.expiryHint` column. Categories without an entry are
 * treated as "no expiry hint" — those items are omitted.
 */
const PANTRY_CATEGORY_TTL_DAYS: Record<string, number> = {
  produce: 7,
  herbs: 5,
  greens: 4,
  dairy: 14,
  meat: 4,
  seafood: 2,
  bread: 5,
  bakery: 4,
};

export interface GetExpiringInput {
  userId: string;
  /** Window. Defaults to 3 days. Items already expired are still included. */
  withinDays?: number;
  /** Restrict to a subset of sources. Defaults to all three. */
  sources?: ExpiringSource[];
  /** Inject `now` for tests; defaults to `new Date()`. */
  now?: Date;
}

const ALL_SOURCES: readonly ExpiringSource[] = [
  'pantry',
  'leftover',
  'meal-prep',
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function diffDays(future: Date, now: Date): number {
  const diffMs = future.getTime() - now.getTime();
  return Math.floor(diffMs / MS_PER_DAY);
}

async function loadPantry(
  userId: string,
  now: Date,
  withinDays: number,
): Promise<ExpiringItem[]> {
  const rows = (await (prisma as any).pantryItem.findMany({
    where: { userId },
  })) as Array<{
    id: string;
    name: string;
    category: string | null;
    createdAt: Date;
  }>;

  const out: ExpiringItem[] = [];
  for (const r of rows) {
    if (!r.category) continue;
    const ttl = PANTRY_CATEGORY_TTL_DAYS[r.category.toLowerCase()];
    if (ttl == null) continue;
    const expiresAt = new Date(r.createdAt.getTime() + ttl * MS_PER_DAY);
    const daysUntilExpiry = diffDays(expiresAt, now);
    if (daysUntilExpiry > withinDays) continue;
    out.push({
      ingredientName: r.name,
      source: 'pantry',
      daysUntilExpiry,
      expiresAt,
      originRef: r.id,
    });
  }
  return out;
}

async function loadLeftover(
  userId: string,
  now: Date,
  withinDays: number,
): Promise<ExpiringItem[]> {
  const cutoff = new Date(now.getTime() + withinDays * MS_PER_DAY);
  const rows = (await (prisma as any).leftoverInventory.findMany({
    where: { userId, expiresAt: { lte: cutoff } },
    include: { component: { select: { name: true } } },
  })) as Array<{
    id: string;
    expiresAt: Date;
    portionsRemaining: number;
    component: { name: string };
  }>;
  return rows.map((r) => ({
    ingredientName: r.component.name,
    source: 'leftover' as const,
    daysUntilExpiry: diffDays(r.expiresAt, now),
    expiresAt: r.expiresAt,
    originRef: r.id,
    portionsRemaining: r.portionsRemaining,
  }));
}

async function loadMealPrep(
  userId: string,
  now: Date,
  withinDays: number,
): Promise<ExpiringItem[]> {
  const cutoff = new Date(now.getTime() + withinDays * MS_PER_DAY);
  const rows = (await (prisma as any).mealPrepPortion.findMany({
    where: {
      userId,
      expiryDate: { lte: cutoff, not: null },
      freshServingsRemaining: { gt: 0 },
    },
    include: { recipe: { select: { title: true } } },
  })) as Array<{
    id: string;
    expiryDate: Date;
    freshServingsRemaining: number;
    recipe: { title: string };
  }>;
  return rows.map((r) => ({
    ingredientName: r.recipe.title,
    source: 'meal-prep' as const,
    daysUntilExpiry: diffDays(r.expiryDate, now),
    expiresAt: r.expiryDate,
    originRef: r.id,
    portionsRemaining: r.freshServingsRemaining,
  }));
}

/**
 * Returns a flat list of expiring items across the requested sources,
 * ordered by `daysUntilExpiry` ASC (most urgent first). Items already past
 * expiry are included (with negative days) so callers can decide how to
 * handle them — typically: keep showing for 1d, then drop.
 */
export async function getExpiring(
  input: GetExpiringInput,
): Promise<ExpiringItem[]> {
  if (!input.userId) return [];
  const withinDays = Math.max(0, input.withinDays ?? 3);
  const now = input.now ?? new Date();
  const sources = input.sources ?? ALL_SOURCES;

  const tasks: Array<Promise<ExpiringItem[]>> = [];
  if (sources.includes('pantry')) {
    tasks.push(loadPantry(input.userId, now, withinDays));
  }
  if (sources.includes('leftover')) {
    tasks.push(loadLeftover(input.userId, now, withinDays));
  }
  if (sources.includes('meal-prep')) {
    tasks.push(loadMealPrep(input.userId, now, withinDays));
  }

  const buckets = await Promise.all(tasks);
  const flat = buckets.flat();
  flat.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  return flat;
}

/** Test helper — exposes the heuristic for assertions. */
export const __testHelpers = { PANTRY_CATEGORY_TTL_DAYS };
