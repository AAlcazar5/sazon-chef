// P3 retention — cuisine-unlock auto-collection service.
//
// When a user cooks a cuisine for the first time, we seed a "Welcome to
// {Cuisine}" collection with up to N recipes from that cuisine so the
// discovery moment compounds into a follow-up exploration loop.
//
// Pure side-effect service called from the cooking-log creation path.
// Idempotent via the `(userId, name)` unique on Collection — re-running
// for the same cuisine returns the existing collection without
// duplicating saves.

import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';

export interface CuisineUnlockResult {
  collectionId: string;
  recipesAdded: number;
  alreadyExisted: boolean;
}

const SEED_TARGET = 5;
const SEED_CEILING = 8;

const titleCase = (s: string): string =>
  s
    .split(/\s+/)
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');

/**
 * Idempotent: ensure a "Welcome to {Cuisine}" collection exists for this
 * user and seed it with recipes from that cuisine the user hasn't already
 * cooked or saved.
 */
export async function ensureCuisineUnlockCollection(
  userId: string,
  cuisineRaw: string,
): Promise<CuisineUnlockResult | null> {
  const cuisine = cuisineRaw.trim();
  if (!cuisine) return null;

  const display = titleCase(cuisine);
  const name = `Welcome to ${display}`;

  // 1. Find or create the collection. @@unique([userId, name]) is the safety net.
  const existing = await prisma.collection.findUnique({
    where: { userId_name: { userId, name } },
    select: { id: true },
  });

  let collectionId: string;
  let alreadyExisted = false;

  if (existing) {
    collectionId = existing.id;
    alreadyExisted = true;
  } else {
    const created = await prisma.collection.create({
      data: {
        userId,
        name,
        description: `Sazon picked these for you after your first ${display} cook.`,
        category: 'cuisine',
      },
      select: { id: true },
    });
    collectionId = created.id;
  }

  // If the collection already existed, treat as already-seeded (idempotent).
  if (alreadyExisted) {
    return { collectionId, recipesAdded: 0, alreadyExisted: true };
  }

  // 2. Pick seed recipes — same cuisine, excluding any the user has
  //    already cooked or saved.
  const cookedIds = await prisma.cookingLog.findMany({
    where: { userId, recipe: { cuisine } },
    select: { recipeId: true },
  });
  const savedIds = await prisma.savedRecipe.findMany({
    where: { userId, recipe: { cuisine } },
    select: { recipeId: true },
  });
  const excludeIds = new Set<string>([
    ...cookedIds.map((c) => c.recipeId),
    ...savedIds.map((s) => s.recipeId),
  ]);

  const candidates = await prisma.recipe.findMany({
    where: {
      cuisine,
      id: { notIn: Array.from(excludeIds) },
      deletedAt: null,
    },
    select: { id: true },
    take: SEED_CEILING,
    orderBy: { createdAt: 'desc' },
  });

  const picks = candidates.slice(0, SEED_TARGET);
  let recipesAdded = 0;

  for (const pick of picks) {
    try {
      const saved = await prisma.savedRecipe.upsert({
        where: { recipeId_userId: { recipeId: pick.id, userId } },
        create: { recipeId: pick.id, userId },
        update: {},
        select: { id: true },
      });
      await prisma.recipeCollection.upsert({
        where: {
          savedRecipeId_collectionId: {
            savedRecipeId: saved.id,
            collectionId,
          },
        },
        create: { savedRecipeId: saved.id, collectionId },
        update: {},
      });
      recipesAdded++;
    } catch (error) {
      logger.warn(
        { err: error, recipeId: pick.id, userId, cuisine },
        'cuisineUnlock.seed.failed',
      );
    }
  }

  return { collectionId, recipesAdded, alreadyExisted: false };
}

/**
 * Fire-and-forget caller used from the cooking-log creation path. Calls
 * the unlock only when this is the user's first ever cook of the cuisine.
 * Errors are logged + swallowed — never blocks the cooking-complete flow.
 */
export async function maybeFireCuisineUnlock(
  userId: string,
  recipeId: string,
): Promise<void> {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      select: { cuisine: true },
    });
    const cuisine = recipe?.cuisine?.trim();
    if (!cuisine) return;

    // Was the cook we just recorded the *first* cook of this cuisine?
    // Count cooking logs where the recipe is in the same cuisine — if
    // exactly 1, that's the one we just inserted. If >1, the user already
    // had history before this cook.
    const cookCount = await prisma.cookingLog.count({
      where: { userId, recipe: { cuisine } },
    });
    if (cookCount !== 1) return;

    const result = await ensureCuisineUnlockCollection(userId, cuisine);
    if (result && !result.alreadyExisted) {
      logger.info(
        { userId, cuisine, collectionId: result.collectionId, recipesAdded: result.recipesAdded },
        'cuisineUnlock.fired',
      );
    }
  } catch (error) {
    logger.error({ err: error, userId, recipeId }, 'cuisineUnlock.failed');
  }
}
