import { logger } from '../utils/logger';
// backend/src/services/mealComponentService.ts
// Group 10X Phase 1+2 — Build-a-Plate component listing, plate composition, and permutations.

import { prisma } from '../lib/prisma';
import { plateCoherenceScore, componentsClash } from './cuisineCoherence';
import { recordAffinityEvent } from './slotAffinityService';
import { serializeJsonColumnSafe } from '../utils/jsonColumns';

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
      componentIds: serializeJsonColumnSafe('componentIds', params.components),
      totalCalories: totals.cal,
      totalProtein: totals.protein,
      totalCarbs: totals.carbs,
      totalFat: totals.fat,
      totalCost: totals.cost,
      pantryCoveragePercent: pantryCoverage,
    },
  });

  const savedComponentIds = params.components.map((c) => c.componentId);
  recordAffinityEvent({ type: 'plate_saved', userId: params.userId, componentIds: savedComponentIds }).catch(
    (err) => logger.warn({ err: err }, '[affinity] plate_saved event failed (non-fatal):')
  );

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

// ─── Phase 2: Permutations + Pantry Intelligence ────────────────────────────

export interface MealComponentDTO {
  id: string;
  slot: string;
  name: string;
  description: string | null;
  defaultPortionGrams: number;
  caloriesPerPortion: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  estimatedCostPerPortion: number | null;
  cuisineTags: string[];
  dietaryTags: string[];
  cookMethodHint: string;
  pantryIngredientNames: string[];
  imageUrl: string | null;
  isUserCreated: boolean;
  userId: string | null;
  pantryCoveragePercent: number;
}

export interface PermutationCandidate {
  id: string;
  components: Array<{
    slot: ComponentSlot;
    component: MealComponentDTO;
    portionMultiplier: number;
  }>;
  coherenceScore: number;
  pantryCoveragePercent: number;
  macroFitScore: number | null;
}

export interface GeneratePermutationsParams {
  userId: string;
  lockedSlots: Array<{ slot: ComponentSlot; componentId: string }>;
  slotsToFill: ComponentSlot[];
  maxResults: number;
  prioritizePantry: boolean;
}

export interface GetPlateFromPantryParams {
  userId: string;
}

const PANTRY_PLATE_SLOTS: ComponentSlot[] = ['protein', 'base', 'vegetable', 'sauce'];
const PANTRY_COVERAGE_THRESHOLD = 80;

const clampMaxResults = (n: number): number => Math.min(20, Math.max(1, n));

const buildComponentDTO = (row: any, pantryNames: string[]): MealComponentDTO => ({
  id: row.id,
  slot: row.slot,
  name: row.name,
  description: row.description ?? null,
  defaultPortionGrams: row.defaultPortionGrams,
  caloriesPerPortion: row.caloriesPerPortion,
  proteinG: row.proteinG,
  carbsG: row.carbsG,
  fatG: row.fatG,
  fiberG: row.fiberG,
  estimatedCostPerPortion: row.estimatedCostPerPortion ?? null,
  cuisineTags: safeJsonArray(row.cuisineTags),
  dietaryTags: safeJsonArray(row.dietaryTags),
  cookMethodHint: row.cookMethodHint,
  pantryIngredientNames: safeJsonArray(row.pantryIngredientNames),
  imageUrl: row.imageUrl ?? null,
  isUserCreated: row.isUserCreated ?? false,
  userId: row.userId ?? null,
  pantryCoveragePercent: computePantryCoverage(safeJsonArray(row.pantryIngredientNames), pantryNames),
});

const cartesian = <T>(arrays: T[][]): T[][] => {
  if (arrays.length === 0) return [[]];
  const [first, ...rest] = arrays;
  const restProduct = cartesian(rest);
  return first.flatMap((item) => restProduct.map((combo) => [item, ...combo]));
};

const macroFitScoreFor = (
  components: MealComponentDTO[],
  macroGoals: { protein: number; calories: number } | null
): number | null => {
  if (!macroGoals) return null;
  const totalCal = components.reduce((s, c) => s + c.caloriesPerPortion, 0);
  const totalProtein = components.reduce((s, c) => s + c.proteinG, 0);
  const calScore = 1 - Math.abs(totalCal - macroGoals.calories) / Math.max(macroGoals.calories, 1);
  const proteinScore = Math.min(1, totalProtein / Math.max(macroGoals.protein, 1));
  return Math.max(0, (calScore + proteinScore) / 2);
};

const permutationId = (components: MealComponentDTO[]): string =>
  [...components].sort((a, b) => a.id.localeCompare(b.id)).map((c) => c.id).join('|');

const makeDietaryFilter = (
  userRecord: any
): ((dto: MealComponentDTO) => boolean) => {
  const restrictions: string[] =
    userRecord?.preferences?.dietaryRestrictions
      ?.filter((r: any) => r.severity === 'strict')
      .map((r: any) => (r.name as string).toLowerCase()) ?? [];

  if (restrictions.length === 0) return () => true;

  return (dto: MealComponentDTO): boolean => {
    const tags = dto.dietaryTags.map((t) => t.toLowerCase());
    return restrictions.every((r) => tags.includes(r));
  };
};

const fetchUserContext = async (userId: string) =>
  prisma.user.findUnique({
    where: { id: userId },
    include: {
      preferences: { include: { dietaryRestrictions: true } },
      macroGoals: true,
    },
  });

const hasClash = (components: MealComponentDTO[]): boolean => {
  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      if (componentsClash(components[i], components[j])) return true;
    }
  }
  return false;
};

export const generatePermutations = async (
  params: GeneratePermutationsParams
): Promise<PermutationCandidate[]> => {
  const limit = clampMaxResults(params.maxResults);

  const [userRecord, pantryItems] = await Promise.all([
    fetchUserContext(params.userId),
    prisma.pantryItem.findMany({ where: { userId: params.userId } }),
  ]);

  const pantryNames = (pantryItems as Array<{ name: string }>).map((p) => p.name);
  const passesDietary = makeDietaryFilter(userRecord);

  const macroGoals = (userRecord as any)?.macroGoals?.calories != null
    ? {
        calories: (userRecord as any).macroGoals.calories as number,
        protein: (userRecord as any).macroGoals.protein as number,
      }
    : null;

  const optionsBySlot = new Map<ComponentSlot, MealComponentDTO[]>();
  await Promise.all(
    params.slotsToFill.map(async (slot) => {
      const rows = await prisma.mealComponent.findMany({
        where: { slot, OR: [{ userId: null }, { userId: params.userId }] },
      });
      const dtos = (rows as any[])
        .map((r) => buildComponentDTO(r, pantryNames))
        .filter(passesDietary);
      optionsBySlot.set(slot, dtos);
    })
  );

  const lockedComponentIds = params.lockedSlots.map((l) => l.componentId);
  const lockedRows = lockedComponentIds.length > 0
    ? await prisma.mealComponent.findMany({
        where: {
          id: { in: lockedComponentIds },
          OR: [{ userId: null }, { userId: params.userId }],
        },
      })
    : [];
  const lockedRowById = new Map<string, any>((lockedRows as any[]).map((r) => [r.id, r]));

  for (const { componentId } of params.lockedSlots) {
    if (!lockedRowById.has(componentId)) {
      throw new Error(`Locked component not found or not owned by user: ${componentId}`);
    }
  }

  const lockedSlotEntries = params.lockedSlots.map(({ slot, componentId }) => ({
    slot: slot as ComponentSlot,
    component: buildComponentDTO(lockedRowById.get(componentId), pantryNames),
    portionMultiplier: 1,
  }));

  const slotKeys = params.slotsToFill;
  const slotOptionArrays = slotKeys.map((s) => optionsBySlot.get(s) ?? []);
  const combos = cartesian(slotOptionArrays);

  const rawPantry = params.prioritizePantry ? 0.6 : 0.3;
  const rawMacro = macroGoals ? 0.3 : 0;
  const rawCoherence = 0.4;
  const totalWeight = rawPantry + rawMacro + rawCoherence;
  const pantryWeight = rawPantry / totalWeight;
  const macroWeight = rawMacro / totalWeight;
  const coherenceWeight = rawCoherence / totalWeight;

  type ScoredCandidate = PermutationCandidate & { _score: number };
  const candidates: ScoredCandidate[] = [];

  for (const combo of combos) {
    const lockedComponents = lockedSlotEntries.map((l) => l.component);
    const allComponents = [...lockedComponents, ...combo];

    if (hasClash(allComponents)) continue;

    const coherenceScore = plateCoherenceScore(allComponents);
    if (coherenceScore === 0 && allComponents.length > 1) continue;

    const allIngredients = allComponents.flatMap((c) => c.pantryIngredientNames);
    const pantryCoveragePercent = computePantryCoverage(allIngredients, pantryNames);
    const mFitScore = macroFitScoreFor(allComponents, macroGoals);

    const score =
      pantryWeight * (pantryCoveragePercent / 100) +
      coherenceWeight * coherenceScore +
      macroWeight * (mFitScore ?? 0);

    candidates.push({
      id: permutationId(allComponents),
      components: [
        ...lockedSlotEntries,
        ...combo.map((dto, i) => ({
          slot: slotKeys[i],
          component: dto,
          portionMultiplier: 1,
        })),
      ],
      coherenceScore,
      pantryCoveragePercent,
      macroFitScore: mFitScore,
      _score: score,
    });
  }

  // ── Phase 4: Affinity weighting (slot + pair) ──────────────────────────────
  const [slotAffinityRows, slotSampleSum] = await Promise.all([
    (prisma as any).slotAffinity.findMany({
      where: { userId: params.userId },
      select: { componentId: true, score: true, sampleCount: true },
    }) as Promise<Array<{ componentId: string; score: number; sampleCount: number }>>,
    (prisma as any).slotAffinity.aggregate({
      where: { userId: params.userId },
      _sum: { sampleCount: true },
    }) as Promise<{ _sum: { sampleCount: number | null } }>,
  ]);

  const totalSamples = slotSampleSum._sum.sampleCount ?? 0;
  const affinityByComponent = new Map(
    slotAffinityRows.map((r) => [r.componentId, r.score])
  );

  if (totalSamples >= 10 && candidates.length > 0) {
    const slotBonuses = candidates.map((cand) => {
      const allComps = cand.components.map((c) => c.component);
      return allComps.reduce((sum, c) => sum + (affinityByComponent.get(c.id) ?? 0), 0);
    });

    const minBonus = Math.min(...slotBonuses);
    const maxBonus = Math.max(...slotBonuses);
    const rangeBonus = maxBonus - minBonus;

    // Fetch all unique pairs across all candidates
    const uniquePairKeys = new Set<string>();
    for (const cand of candidates) {
      const ids = cand.components.map((c) => c.component.id);
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const [a, b] = [ids[i], ids[j]].sort();
          uniquePairKeys.add(`${a}|${b}`);
        }
      }
    }

    const pairScores = new Map<string, number>();
    if (uniquePairKeys.size > 0) {
      const pairRows = await (prisma as any).pairAffinity.findMany({
        where: { userId: params.userId },
        select: { componentIdA: true, componentIdB: true, score: true },
      }) as Array<{ componentIdA: string; componentIdB: string; score: number }>;
      for (const row of pairRows) {
        pairScores.set(`${row.componentIdA}|${row.componentIdB}`, row.score);
      }
    }

    const pairBonuses = candidates.map((cand) => {
      const ids = cand.components.map((c) => c.component.id);
      let total = 0;
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const [a, b] = [ids[i], ids[j]].sort();
          total += pairScores.get(`${a}|${b}`) ?? 0;
        }
      }
      return total;
    });
    const minPair = Math.min(...pairBonuses);
    const maxPair = Math.max(...pairBonuses);
    const rangePair = maxPair - minPair;

    candidates.forEach((cand, i) => {
      const normalizedSlot = rangeBonus > 0 ? (slotBonuses[i] - minBonus) / rangeBonus : 0;
      const normalizedPair = rangePair > 0 ? (pairBonuses[i] - minPair) / rangePair : 0;
      cand._score += 0.2 * normalizedSlot + 0.1 * normalizedPair;
    });
  }
  // ─────────────────────────────────────────────────────────────────────────

  return candidates
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
    .map(({ _score, ...rest }) => rest);
};

export const getPlateFromPantry = async (
  params: GetPlateFromPantryParams
): Promise<PermutationCandidate | null> => {
  const [userRecord, pantryItems] = await Promise.all([
    fetchUserContext(params.userId),
    prisma.pantryItem.findMany({ where: { userId: params.userId } }),
  ]);

  const pantryNames = (pantryItems as Array<{ name: string }>).map((p) => p.name);
  if (pantryNames.length === 0) return null;

  const passesDietary = makeDietaryFilter(userRecord);

  const optionsBySlot = new Map<ComponentSlot, MealComponentDTO[]>();
  await Promise.all(
    PANTRY_PLATE_SLOTS.map(async (slot) => {
      const rows = await prisma.mealComponent.findMany({
        where: { slot, OR: [{ userId: null }, { userId: params.userId }] },
      });
      const dtos = (rows as any[])
        .map((r) => buildComponentDTO(r, pantryNames))
        .filter((d) => d.pantryCoveragePercent >= PANTRY_COVERAGE_THRESHOLD && passesDietary(d))
        .sort((a, b) => a.id.localeCompare(b.id));
      optionsBySlot.set(slot, dtos);
    })
  );

  const hasAllSlots = PANTRY_PLATE_SLOTS.every(
    (s) => (optionsBySlot.get(s) ?? []).length > 0
  );
  if (!hasAllSlots) return null;

  const slotOptionArrays = PANTRY_PLATE_SLOTS.map((s) => optionsBySlot.get(s) ?? []);
  const combos = cartesian(slotOptionArrays);

  let bestCandidate: PermutationCandidate | null = null;
  let bestScore = -1;

  for (const combo of combos) {
    const coherenceScore = plateCoherenceScore(combo);
    if (coherenceScore === 0) continue;

    const allIngredients = combo.flatMap((c) => c.pantryIngredientNames);
    const pantryCoveragePercent = computePantryCoverage(allIngredients, pantryNames);
    const score = 0.6 * (pantryCoveragePercent / 100) + 0.4 * coherenceScore;

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = {
        id: permutationId(combo),
        components: PANTRY_PLATE_SLOTS.map((slot, i) => ({
          slot,
          component: combo[i],
          portionMultiplier: 1,
        })),
        coherenceScore,
        pantryCoveragePercent,
        macroFitScore: null,
      };
    }
  }

  return bestCandidate;
};
