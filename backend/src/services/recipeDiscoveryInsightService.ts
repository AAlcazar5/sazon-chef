// backend/src/services/recipeDiscoveryInsightService.ts
// ROADMAP 4.0 RD6.1 — one-line discovery insight under recipe-detail title.
//
// Returns at most one short retrospective line, lifestyle voice. Rules in
// priority order:
//
//   1. first-with-ingredient    "First time you'd cook with sumac."
//   2. micro-standout           "High in iron compared to your usual Italian."
//   3. cuisine-cadence          "First Persian dish in three weeks."
//
// Returns null when no rule fires. Banned vocabulary stays out: no
// "should" / "deficient" / "low in" — discovery, not verdict.
//
// Cross-tier dovetail (N3.2): final prose routes through `sazonVoiceService`
// once that service lands. Until then, inline templates enforce the same
// rules at compile time.

import { prisma } from '../lib/prisma';

export type DiscoveryInsightRule =
  | 'first_with_ingredient'
  | 'micro_standout'
  | 'cuisine_cadence';

export interface DiscoveryInsight {
  /** ≤ 90 chars; lifestyle voice. */
  line: string;
  rule: DiscoveryInsightRule;
}

export interface DiscoveryInsightArgs {
  userId: string;
  recipeId: string;
  /** Reference time for cadence math. Defaults to `new Date()`. */
  asOf?: Date;
}

const PRIMARY_MAX = 90;
const CADENCE_DAYS = 21;
const MICRO_STANDOUT_MULTIPLE = 1.5;

const BANNED = [
  /\byou should\b/i,
  /\bdeficient\b/i,
  /\blow in\b/i,
  /\byou need\b/i,
  /\bfailing\b/i,
];

function clean(line: string): string {
  let out = line;
  for (const re of BANNED) out = out.replace(re, '').replace(/\s+/g, ' ').trim();
  return out.length > PRIMARY_MAX ? out.slice(0, PRIMARY_MAX - 1).trim() + '…' : out;
}

function daysApart(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}

interface AnchorRecipe {
  id: string;
  cuisine: string | null;
  ingredients: Array<{ text: string }>;
  iron?: number | null;
}

async function loadAnchor(recipeId: string): Promise<AnchorRecipe | null> {
  const r = (await prisma.recipe.findUnique({
    where: { id: recipeId },
    select: {
      id: true,
      cuisine: true,
      ingredients: { select: { text: true } },
      iron: true,
    } as any,
  } as any)) as any;
  return r as AnchorRecipe | null;
}

/**
 * Look at the user's cooking history; return the set of distinct ingredient
 * texts (lowercased, trimmed) seen across cooked recipes.
 */
async function userCookedIngredients(userId: string): Promise<Set<string>> {
  const cooked = (await (prisma as any).cookingLog.findMany({
    where: { userId },
    include: { recipe: { select: { ingredients: { select: { text: true } } } } },
  })) as Array<{ recipe: { ingredients: Array<{ text: string }> } | null }>;
  const set = new Set<string>();
  for (const entry of cooked) {
    if (!entry.recipe) continue;
    for (const ing of entry.recipe.ingredients) {
      const txt = (ing.text ?? '').toLowerCase().trim();
      if (txt) set.add(txt);
    }
  }
  return set;
}

/**
 * Return the most recent cookingLog entry for the given cuisine, or null.
 * Used by the cadence rule.
 */
async function lastCookOfCuisine(
  userId: string,
  cuisine: string,
): Promise<Date | null> {
  const cooked = (await (prisma as any).cookingLog.findMany({
    where: { userId, recipe: { cuisine } },
    orderBy: { cookedAt: 'desc' },
    take: 1,
    select: { cookedAt: true },
  })) as Array<{ cookedAt: Date }>;
  return cooked[0]?.cookedAt ?? null;
}

/**
 * Return the user's 30-day average iron-per-serving for the same cuisine.
 * Used by the micro-standout rule.
 */
async function userAvgIronForCuisine(
  userId: string,
  cuisine: string,
  asOf: Date,
): Promise<number | null> {
  const since = new Date(asOf.getTime() - 30 * 24 * 60 * 60 * 1000);
  const cooked = (await (prisma as any).cookingLog.findMany({
    where: {
      userId,
      cookedAt: { gte: since },
      recipe: { cuisine },
    },
    include: { recipe: { select: { iron: true } } },
  })) as Array<{ recipe: { iron: number | null } | null }>;
  const values = cooked
    .map((c) => c.recipe?.iron)
    .filter((v): v is number => typeof v === 'number' && v > 0);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function findFirstNewIngredient(
  anchorIngredients: Array<{ text: string }>,
  userKnown: Set<string>,
): string | null {
  for (const ing of anchorIngredients) {
    const txt = (ing.text ?? '').toLowerCase().trim();
    if (!txt) continue;
    if (!userKnown.has(txt)) return ing.text.trim();
  }
  return null;
}

export async function compute(args: DiscoveryInsightArgs): Promise<DiscoveryInsight | null> {
  const asOf = args.asOf ?? new Date();
  const anchor = await loadAnchor(args.recipeId);
  if (!anchor) return null;

  // 1. first-with-ingredient (highest priority)
  const cookedIngredients = await userCookedIngredients(args.userId);
  if (cookedIngredients.size > 0 && anchor.ingredients.length > 0) {
    const newOne = findFirstNewIngredient(anchor.ingredients, cookedIngredients);
    if (newOne) {
      return {
        line: clean(`First time you'd cook with ${newOne}.`),
        rule: 'first_with_ingredient',
      };
    }
  }

  // 2. micro-standout (iron, against user's 30d avg for same cuisine)
  if (anchor.cuisine && typeof anchor.iron === 'number' && anchor.iron > 0) {
    const avg = await userAvgIronForCuisine(args.userId, anchor.cuisine, asOf);
    if (avg != null && anchor.iron >= avg * MICRO_STANDOUT_MULTIPLE) {
      return {
        line: clean(`High in iron compared to your usual ${anchor.cuisine}.`),
        rule: 'micro_standout',
      };
    }
  }

  // 3. cuisine-cadence (cooked the cuisine before, but not in 21+ days)
  if (anchor.cuisine) {
    const lastCookedAt = await lastCookOfCuisine(args.userId, anchor.cuisine);
    if (lastCookedAt) {
      const days = daysApart(asOf, lastCookedAt);
      if (days >= CADENCE_DAYS) {
        const weeks = Math.floor(days / 7);
        const cadenceText = weeks >= 4 ? `${Math.floor(weeks / 4)} months` : `${weeks} weeks`;
        return {
          line: clean(`First ${anchor.cuisine} dish in ${cadenceText}.`),
          rule: 'cuisine_cadence',
        };
      }
    }
  }

  return null;
}
