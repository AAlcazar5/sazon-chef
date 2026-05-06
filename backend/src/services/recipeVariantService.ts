// backend/src/services/recipeVariantService.ts
// ROADMAP 4.0 Tier J18.1 — Recipe variants as siblings, not replacements.
//
// Surfaces 1–N sibling recipe variants for a given parent — same dish,
// different technique. Tag taxonomy locked to the four canonical values:
//
//   weeknight | sunday | campfire | lighter
//
// Anything else is rejected at both write- and read-paths.
//
// Voice: variants live NEXT TO the title, never as a disclaimer footer.
// "Tacos tonight — the lean cut version." / "Enchiladas, oven-finished —
// same melt, less oil." Banned: any moralized framing ("healthier
// alternative," "guilt-free," "skinny," etc.).

import { prisma } from '../lib/prisma';

export const RECIPE_VARIANT_TAGS = [
  'weeknight',
  'sunday',
  'campfire',
  'lighter',
] as const;

export type RecipeVariantTag = (typeof RECIPE_VARIANT_TAGS)[number];

export interface VariantSiblingRecipe {
  id: string;
  title: string;
  imageUrl: string | null;
  cuisine: string;
  cookTime: number;
}

export interface VariantEntry {
  tag: RecipeVariantTag;
  siblingRecipe: VariantSiblingRecipe;
  techniqueLine: string | null;
}

export function isValidVariantTag(tag: unknown): tag is RecipeVariantTag {
  if (typeof tag !== 'string') return false;
  return (RECIPE_VARIANT_TAGS as readonly string[]).includes(tag);
}

interface RawVariantRow {
  tag: string;
  techniqueLine: string | null;
  sibling: VariantSiblingRecipe | null;
}

export async function getVariantsFor(recipeId: string): Promise<VariantEntry[]> {
  if (!recipeId) return [];

  const rows = (await (prisma as unknown as {
    recipeVariant: {
      findMany: (args: unknown) => Promise<RawVariantRow[]>;
    };
  }).recipeVariant.findMany({
    where: { recipeId },
    select: {
      tag: true,
      techniqueLine: true,
      sibling: {
        select: {
          id: true,
          title: true,
          imageUrl: true,
          cuisine: true,
          cookTime: true,
        },
      },
    },
  })) as RawVariantRow[];

  const entries: VariantEntry[] = [];
  for (const row of rows) {
    if (!row.sibling) continue;
    if (!isValidVariantTag(row.tag)) continue;
    entries.push({
      tag: row.tag,
      siblingRecipe: row.sibling,
      techniqueLine: row.techniqueLine,
    });
  }
  return entries;
}

/**
 * Attach `variants` to a recipe-detail payload. Used by recipeController to
 * extend the GET /api/recipes/:id response without forcing a separate fetch.
 */
export async function attachVariantsToRecipe<T extends { id: string }>(
  recipe: T,
): Promise<T & { variants: VariantEntry[] }> {
  const variants = await getVariantsFor(recipe.id);
  return { ...recipe, variants };
}
