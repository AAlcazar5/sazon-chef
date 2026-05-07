// backend/src/services/recommender/bridgeFromLeftover.ts
// ROADMAP 4.0 RD4.1 — leftover-bridge recipe picker.
//
// "Your cilantro wants to be in something tonight." For each leftover the
// user has expiring soon, find recipes that *use* that ingredient. Sort
// rows by `expiringIn` (most urgent first); exclude recipes the user
// cooked in the last 7 days. Returns empty when the user has no
// leftovers or no overlap.
//
// Voice contract: lifestyle invitation, never expiry-shame. The COPY for
// the surface lives in `<LeftoverBridgeCard>` (RD4.2); this service just
// picks recipes.

import { prisma } from '../../lib/prisma';

export interface BridgeRecipe {
  id: string;
  title: string;
  cuisine: string | null;
  cookTime: number | null;
  imageUrl: string | null;
}

export interface BridgeRow {
  /** The ingredient (component name) the user has on hand. */
  leftoverIngredient: string;
  /** Days until expiry (0 = today). Floor of the diff. */
  expiringIn: number;
  recipes: BridgeRecipe[];
}

export interface BridgeFromLeftoverArgs {
  userId: string;
  /** Number of recipes per leftover row. Default 3. */
  k?: number;
  /** How many days ahead to consider leftovers as expiring. Default 3. */
  expiringHorizonDays?: number;
}

const DEFAULT_K = 3;
const DEFAULT_HORIZON_DAYS = 3;
const RECENT_COOK_EXCLUDE_DAYS = 7;

interface LeftoverRow {
  id: string;
  componentId: string;
  expiresAt: Date;
  component: { name: string } | null;
}

interface CatalogRecipe {
  id: string;
  title: string;
  cuisine: string | null;
  cookTime: number | null;
  imageUrl: string | null;
  ingredients: Array<{ text: string }>;
}

function daysFromNow(d: Date, now: number): number {
  const diff = d.getTime() - now;
  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
}

function recipeUsesIngredient(recipe: Pick<CatalogRecipe, 'ingredients'>, ingredient: string): boolean {
  const needle = ingredient.toLowerCase().trim();
  if (!needle) return false;
  for (const ing of recipe.ingredients) {
    if ((ing.text ?? '').toLowerCase().includes(needle)) return true;
  }
  return false;
}

export async function bridgeFromLeftover(
  args: BridgeFromLeftoverArgs,
): Promise<BridgeRow[]> {
  const k = args.k ?? DEFAULT_K;
  const horizonDays = args.expiringHorizonDays ?? DEFAULT_HORIZON_DAYS;
  const now = Date.now();
  const horizon = new Date(now + horizonDays * 24 * 60 * 60 * 1000);
  const cutoff = new Date(now);

  const leftovers = (await (prisma as any).leftoverInventory.findMany({
    where: {
      userId: args.userId,
      expiresAt: { gte: cutoff, lte: horizon },
    },
    include: { component: { select: { name: true } } },
    orderBy: { expiresAt: 'asc' },
  })) as LeftoverRow[];

  if (leftovers.length === 0) return [];

  // Recently-cooked exclusion (7d window).
  const sevenDaysAgo = new Date(now - RECENT_COOK_EXCLUDE_DAYS * 24 * 60 * 60 * 1000);
  let recentlyCookedIds = new Set<string>();
  try {
    const recent = (await (prisma as any).cookingLog.findMany({
      where: { userId: args.userId, cookedAt: { gte: sevenDaysAgo } },
      select: { recipeId: true },
    })) as Array<{ recipeId: string }>;
    recentlyCookedIds = new Set(recent.map((r) => r.recipeId));
  } catch {
    /* swallow — graceful */
  }

  // Single catalog scan; in-memory match per leftover.
  const catalog = (await prisma.recipe.findMany({
    where: { deletedAt: null } as any,
    select: {
      id: true,
      title: true,
      cuisine: true,
      cookTime: true,
      imageUrl: true,
      ingredients: { select: { text: true } },
    } as any,
  } as any)) as unknown as CatalogRecipe[];

  const rows: BridgeRow[] = [];
  for (const leftover of leftovers) {
    const ingredient = leftover.component?.name ?? '';
    if (!ingredient) continue;
    const matches = catalog
      .filter((r) => !recentlyCookedIds.has(r.id))
      .filter((r) => recipeUsesIngredient(r, ingredient))
      .slice(0, k)
      .map<BridgeRecipe>((r) => ({
        id: r.id,
        title: r.title,
        cuisine: r.cuisine,
        cookTime: r.cookTime,
        imageUrl: r.imageUrl,
      }));
    if (matches.length === 0) continue;
    rows.push({
      leftoverIngredient: ingredient,
      expiringIn: daysFromNow(leftover.expiresAt, now),
      recipes: matches,
    });
  }

  return rows;
}
