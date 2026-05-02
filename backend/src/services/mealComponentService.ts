// backend/src/services/mealComponentService.ts
// Group 10X Phase 1 — Build-a-Plate component listing + plate composition.

import { prisma } from '../lib/prisma';

export type ComponentSlot = 'protein' | 'base' | 'vegetable' | 'sauce' | 'garnish';

export const COMPONENT_SLOTS: readonly ComponentSlot[] = [
  'protein',
  'base',
  'vegetable',
  'sauce',
  'garnish',
];

export interface ComponentSelection {
  slot: ComponentSlot;
  componentId: string;
  portionMultiplier: number;
}

export interface ListComponentsParams {
  userId: string;
  slot?: string;
  dietary?: string;
  cuisine?: string;
  q?: string;
}

export interface SaveComposedPlateParams {
  userId: string;
  components: ComponentSelection[];
  name?: string;
  saveAsRecipe: boolean;
}

const safeJsonArray = (raw: string): string[] => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

const COOK_METHOD_INSTRUCTIONS: Record<string, (name: string) => string> = {
  roast: (n) => `Roast the ${n} at 425°F until caramelized at the edges.`,
  pan_sear: (n) => `Pan-sear the ${n} over medium-high heat until browned.`,
  simmer: (n) => `Simmer the ${n} until tender.`,
  raw: (n) => `Prepare the ${n} fresh and add to the plate.`,
  mix: (n) => `Mix the ${n} until smooth and combined.`,
  grill: (n) => `Grill the ${n} until lightly charred.`,
  bake: (n) => `Bake the ${n} until cooked through.`,
};

export const computePantryCoverage = (
  componentIngredients: readonly string[],
  pantryNames: readonly string[]
): number => {
  if (componentIngredients.length === 0) return 0;
  const pantrySet = new Set(pantryNames.map((p) => p.toLowerCase().trim()));
  const matches = componentIngredients.filter((ing) =>
    pantrySet.has(ing.toLowerCase().trim())
  ).length;
  return Math.round((matches / componentIngredients.length) * 1000) / 10;
};

export const listComponents = async (
  params: ListComponentsParams
): Promise<Array<Record<string, unknown> & { pantryCoveragePercent: number }>> => {
  const where: Record<string, unknown> = {
    OR: [{ userId: null }, { userId: params.userId }],
  };
  if (params.slot) where.slot = params.slot;

  const [rows, pantryItems] = await Promise.all([
    prisma.mealComponent.findMany({ where, orderBy: { name: 'asc' } }),
    prisma.pantryItem.findMany({ where: { userId: params.userId } }),
  ]);

  const pantryNames = pantryItems.map((p: { name: string }) => p.name);
  const dietary = params.dietary?.toLowerCase().trim();
  const cuisine = params.cuisine?.toLowerCase().trim();
  const q = params.q?.toLowerCase().trim();

  return rows
    .filter((row: any) => {
      if (dietary) {
        const tags = safeJsonArray(row.dietaryTags).map((t) => t.toLowerCase());
        if (!tags.includes(dietary)) return false;
      }
      if (cuisine) {
        const tags = safeJsonArray(row.cuisineTags).map((t) => t.toLowerCase());
        if (!tags.includes(cuisine)) return false;
      }
      if (q) {
        const haystack = `${row.name} ${row.description ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    })
    .map((row: any) => ({
      ...row,
      cuisineTags: safeJsonArray(row.cuisineTags),
      dietaryTags: safeJsonArray(row.dietaryTags),
      pantryIngredientNames: safeJsonArray(row.pantryIngredientNames),
      pantryCoveragePercent: computePantryCoverage(
        safeJsonArray(row.pantryIngredientNames),
        pantryNames
      ),
    }));
};

const generatePlateName = (components: Array<{ name: string; slot: string }>): string => {
  const order: Record<string, number> = { protein: 0, base: 1, vegetable: 2, sauce: 3, garnish: 4 };
  const sorted = [...components].sort(
    (a, b) => (order[a.slot] ?? 99) - (order[b.slot] ?? 99)
  );
  return sorted.map((c) => c.name).join(' + ');
};

export const saveComposedPlate = async (
  params: SaveComposedPlateParams
): Promise<{ plate: Record<string, unknown>; recipe?: Record<string, unknown> }> => {
  if (!params.components || params.components.length === 0) {
    throw new Error('Plate must contain at least one component');
  }
  for (const sel of params.components) {
    if (!(sel.portionMultiplier > 0) || sel.portionMultiplier > 10) {
      throw new Error(`portionMultiplier must be > 0 and ≤ 10 (got ${sel.portionMultiplier})`);
    }
  }

  const componentIds = params.components.map((c) => c.componentId);
  const rows = await prisma.mealComponent.findMany({
    where: { id: { in: componentIds } },
  });

  const byId = new Map<string, any>(rows.map((r: any) => [r.id, r]));
  for (const sel of params.components) {
    if (!byId.has(sel.componentId)) {
      throw new Error(`Component not found: ${sel.componentId}`);
    }
  }

  const totals = params.components.reduce(
    (acc, sel) => {
      const c = byId.get(sel.componentId);
      const m = sel.portionMultiplier;
      return {
        cal: acc.cal + c.caloriesPerPortion * m,
        protein: acc.protein + c.proteinG * m,
        carbs: acc.carbs + c.carbsG * m,
        fat: acc.fat + c.fatG * m,
        cost: acc.cost + (c.estimatedCostPerPortion ?? 0) * m,
      };
    },
    { cal: 0, protein: 0, carbs: 0, fat: 0, cost: 0 }
  );

  const allIngredientNames = Array.from(
    new Set(
      params.components.flatMap((sel) =>
        safeJsonArray(byId.get(sel.componentId).pantryIngredientNames)
      )
    )
  );

  const pantryItems = await prisma.pantryItem.findMany({
    where: { userId: params.userId },
  });
  const pantryCoverage = computePantryCoverage(
    allIngredientNames,
    pantryItems.map((p: { name: string }) => p.name)
  );

  const componentSummaries = params.components.map((sel) => ({
    name: byId.get(sel.componentId).name,
    slot: sel.slot,
  }));
  const plateName = params.name?.trim() || generatePlateName(componentSummaries);

  const plate = await prisma.composedPlate.create({
    data: {
      userId: params.userId,
      name: plateName,
      componentIds: JSON.stringify(params.components),
      totalCalories: totals.cal,
      totalProtein: totals.protein,
      totalCarbs: totals.carbs,
      totalFat: totals.fat,
      totalCost: totals.cost,
      pantryCoveragePercent: pantryCoverage,
    },
  });

  if (!params.saveAsRecipe) {
    return { plate };
  }

  const ingredientTexts = allIngredientNames;
  const instructionTexts = params.components.map((sel) => {
    const c = byId.get(sel.componentId);
    const fn = COOK_METHOD_INSTRUCTIONS[c.cookMethodHint] ?? COOK_METHOD_INSTRUCTIONS.mix;
    return fn(c.name);
  });
  instructionTexts.push('Plate everything together and serve.');

  const dominantCuisine = (() => {
    const counts = new Map<string, number>();
    for (const sel of params.components) {
      const tags = safeJsonArray(byId.get(sel.componentId).cuisineTags);
      for (const t of tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    let top = 'American';
    let topCount = 0;
    for (const [k, v] of counts) {
      if (v > topCount) {
        top = k;
        topCount = v;
      }
    }
    return top;
  })();

  const recipe = await prisma.recipe.create({
    data: {
      title: plateName,
      description: `Composed plate: ${componentSummaries.map((c) => c.name).join(', ')}.`,
      cookTime: 25,
      cuisine: dominantCuisine,
      mealType: 'dinner',
      servings: 1,
      calories: Math.round(totals.cal),
      protein: Math.round(totals.protein),
      carbs: Math.round(totals.carbs),
      fat: Math.round(totals.fat),
      userId: params.userId,
      isUserCreated: true,
      source: 'user-composed',
      ingredients: {
        create: ingredientTexts.map((text, i) => ({ text, order: i + 1 })),
      },
      instructions: {
        create: instructionTexts.map((text, i) => ({ text, step: i + 1 })),
      },
    },
    include: {
      ingredients: { orderBy: { order: 'asc' } },
      instructions: { orderBy: { step: 'asc' } },
    },
  });

  await prisma.savedRecipe.upsert({
    where: { recipeId_userId: { recipeId: recipe.id, userId: params.userId } },
    create: { userId: params.userId, recipeId: recipe.id },
    update: {},
  });

  await prisma.composedPlate.update({
    where: { id: plate.id },
    data: { recipeId: recipe.id },
  });

  return { plate: { ...plate, recipeId: recipe.id }, recipe };
};
