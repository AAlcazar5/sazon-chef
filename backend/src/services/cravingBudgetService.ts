// backend/src/services/cravingBudgetService.ts
// 10P: Craving + Weekly Budget Integration
//
// Takes a craving text + remaining daily macro budget and returns three paths:
//   1. "Go for it" — eat the craving, see recalculated remaining macros
//   2. "Healthier version" — AI-generated recipe ≤50% original calories + comparison
//   3. "Similar but lighter" — DB recipes matching the craving within calorie budget

import { cravingFlowService, type CravingFlowResult } from './cravingFlowService';
import { mapCravingToSearchTerms, scoreCravingMatch, type CravingMapping } from './cravingSearchService';
import { prisma } from '../lib/prisma';

// ─── Types ────────────────────────────────────────────────────────────

export interface CravingBudgetParams {
  craving: string;
  remainingCalories: number;
  remainingProtein?: number;
  remainingCarbs?: number;
  remainingFat?: number;
  userId: string;
  dietaryRestrictions?: string[];
  bannedIngredients?: string[];
}

interface MacroBudget {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface GoForItResult {
  originalCraving: MacroBudget;
  remainingAfter: MacroBudget;
  overBudget: boolean;
  overBy: MacroBudget;
}

interface MacroComparison {
  original: MacroBudget;
  healthified: MacroBudget;
  caloriesSaved: number;
  percentReduction: number;
  proteinDifference: number;
}

interface HealthierVersionResult {
  recipe: {
    title: string;
    description: string;
    cuisine: string;
    cookTime: number;
    servings: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    ingredients: Array<{ text: string; order: number }>;
    instructions: Array<{ text: string; step: number }>;
  };
  comparison: MacroComparison;
  honestyNote: string;
}

interface LighterRecipe {
  id: string;
  title: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  cuisine?: string;
  cookTime?: number;
  matchScore: number;
}

export interface CravingBudgetResult {
  goForIt: GoForItResult;
  healthierVersion: HealthierVersionResult;
  similarButLighter: LighterRecipe[];
}

// ─── Service ──────────────────────────────────────────────────────────

const MAX_LIGHTER_RESULTS = 5;
const CANDIDATE_POOL_SIZE = 200;

export class CravingBudgetService {
  async analyzeCraving(params: CravingBudgetParams): Promise<CravingBudgetResult> {
    const craving = (params.craving || '').trim();
    if (!craving) {
      throw new Error('craving text is required');
    }
    if (params.remainingCalories == null) {
      throw new Error('remainingCalories is required');
    }

    const remainingBudget: MacroBudget = {
      calories: params.remainingCalories,
      protein: params.remainingProtein ?? 0,
      carbs: params.remainingCarbs ?? 0,
      fat: params.remainingFat ?? 0,
    };

    // Run healthify + craving mapping in parallel
    const [flowResult, cravingMapping] = await Promise.all([
      cravingFlowService.healthifyCraving({
        craving,
        dietaryRestrictions: params.dietaryRestrictions,
        bannedIngredients: params.bannedIngredients,
      }),
      mapCravingToSearchTerms(craving),
    ]);

    // Build all three paths (lighter search uses the mapping from above)
    const [goForIt, healthierVersion, similarButLighter] = await Promise.all([
      Promise.resolve(this.buildGoForIt(flowResult, remainingBudget)),
      Promise.resolve(this.buildHealthierVersion(flowResult)),
      this.findSimilarButLighter(cravingMapping, remainingBudget),
    ]);

    return { goForIt, healthierVersion, similarButLighter };
  }

  // ─── Path 1: Go for it ─────────────────────────────────────────────

  private buildGoForIt(flow: CravingFlowResult, budget: MacroBudget): GoForItResult {
    const original: MacroBudget = {
      calories: flow.original.calories,
      protein: flow.original.protein,
      carbs: flow.original.carbs,
      fat: flow.original.fat,
    };

    const remainingAfter: MacroBudget = {
      calories: Math.max(0, budget.calories - original.calories),
      protein: Math.max(0, budget.protein - original.protein),
      carbs: Math.max(0, budget.carbs - original.carbs),
      fat: Math.max(0, budget.fat - original.fat),
    };

    const overBudget = original.calories > budget.calories;

    const overBy: MacroBudget = {
      calories: Math.max(0, original.calories - budget.calories),
      protein: Math.max(0, original.protein - budget.protein),
      carbs: Math.max(0, original.carbs - budget.carbs),
      fat: Math.max(0, original.fat - budget.fat),
    };

    return { originalCraving: original, remainingAfter, overBudget, overBy };
  }

  // ─── Path 2: Healthier version ─────────────────────────────────────

  private buildHealthierVersion(flow: CravingFlowResult): HealthierVersionResult {
    const originalMacros: MacroBudget = {
      calories: flow.original.calories,
      protein: flow.original.protein,
      carbs: flow.original.carbs,
      fat: flow.original.fat,
    };

    const healthifiedMacros: MacroBudget = {
      calories: flow.healthified.calories,
      protein: flow.healthified.protein,
      carbs: flow.healthified.carbs,
      fat: flow.healthified.fat,
    };

    const caloriesSaved = originalMacros.calories - healthifiedMacros.calories;
    const percentReduction = originalMacros.calories > 0
      ? (caloriesSaved / originalMacros.calories) * 100
      : 0;

    return {
      recipe: {
        title: flow.healthified.title,
        description: flow.healthified.description,
        cuisine: flow.healthified.cuisine,
        cookTime: flow.healthified.cookTime,
        servings: flow.healthified.servings,
        calories: flow.healthified.calories,
        protein: flow.healthified.protein,
        carbs: flow.healthified.carbs,
        fat: flow.healthified.fat,
        ingredients: flow.healthified.ingredients,
        instructions: flow.healthified.instructions,
      },
      comparison: {
        original: originalMacros,
        healthified: healthifiedMacros,
        caloriesSaved,
        percentReduction: Math.round(percentReduction * 10) / 10,
        proteinDifference: healthifiedMacros.protein - originalMacros.protein,
      },
      honestyNote: flow.honestyNote,
    };
  }

  // ─── Path 3: Similar but lighter ───────────────────────────────────

  private async findSimilarButLighter(
    mapping: CravingMapping,
    budget: MacroBudget,
  ): Promise<LighterRecipe[]> {
    // Query DB for candidate recipes within calorie budget
    const candidates = await prisma.recipe.findMany({
      where: {
        isUserCreated: false,
        calories: { lte: budget.calories },
      },
      take: CANDIDATE_POOL_SIZE,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        cuisine: true,
        cookTime: true,
        difficulty: true,
        calories: true,
        protein: true,
        carbs: true,
        fat: true,
        ingredients: { orderBy: { order: 'asc' as const }, select: { text: true } },
        instructions: { orderBy: { step: 'asc' as const }, select: { text: true } },
      },
    });

    // Score each candidate against the craving
    const scored = candidates
      .map((recipe) => ({
        ...recipe,
        matchScore: scoreCravingMatch(recipe, mapping),
      }))
      .filter((r) => r.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, MAX_LIGHTER_RESULTS);

    return scored.map((r) => ({
      id: r.id,
      title: r.title,
      calories: r.calories,
      protein: r.protein,
      carbs: r.carbs,
      fat: r.fat,
      cuisine: r.cuisine ?? undefined,
      cookTime: r.cookTime ?? undefined,
      matchScore: r.matchScore,
    }));
  }
}

export const cravingBudgetService = new CravingBudgetService();
