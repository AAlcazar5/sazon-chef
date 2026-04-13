// backend/src/services/cravingFlowService.ts
// 10G-C: The "I want to eat [X] tonight" flow.
//
// Takes a craving text (e.g. "pizza") and returns:
//   - `original`: estimated macros for a typical version (so the user sees the damage)
//   - `healthified`: a macro-friendly recipe that scratches the same itch
//   - `honestyNote`: a short, honest disclaimer — never claims the healthy version is "just as good"
//
// The service wraps a single AIProviderManager.generateRecipe call so tests can mock
// the provider without spinning up real API keys. The prompt asks the model to return
// both the estimated original and the healthified version in one shot.

import { AIProviderManager } from './aiProviders/AIProviderManager';

export interface CravingMacros {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface HealthifiedCravingRecipe {
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
}

export interface CravingFlowResult {
  original: CravingMacros;
  healthified: HealthifiedCravingRecipe;
  honestyNote: string;
}

export interface CravingFlowParams {
  craving: string;
  userMacroGoals?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  dietaryRestrictions?: string[];
  bannedIngredients?: string[];
}

const MAX_CALORIES = 5000;
const MAX_MACRO_GRAMS = 500;

function clampNonNegative(value: unknown, max: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(max, Math.round(n)));
}

export class CravingFlowService {
  private providerManager: AIProviderManager;

  constructor() {
    this.providerManager = new AIProviderManager();
  }

  async healthifyCraving(params: CravingFlowParams): Promise<CravingFlowResult> {
    const craving = (params.craving || '').trim();
    if (!craving) {
      throw new Error('craving text is required');
    }

    const prompt = this.buildPrompt({ ...params, craving });
    const systemPrompt = this.getSystemPrompt();

    const raw = await this.providerManager.generateRecipe({
      prompt,
      systemPrompt,
      temperature: 0.8,
      maxTokens: 2000,
    } as any);

    return this.parseResponse(raw as any);
  }

  private buildPrompt(params: CravingFlowParams): string {
    const parts: string[] = [];
    parts.push(
      `A user is craving "${params.craving}" and wants to see both the typical version AND a macro-friendly alternative.`,
      ``,
      `Return a JSON object with THREE fields:`,
      ``,
      `1. "original" — a realistic estimate of what a typical serving looks like (do NOT soften the numbers):`,
      `   { "name": string, "description": string, "calories": number, "protein": number, "carbs": number, "fat": number }`,
      ``,
      `2. "healthified" — a macro-friendly version that scratches the same craving using smart substitutions`,
      `   (cauliflower crust, skim cheese, Greek yogurt, turkey meats, oat flour, etc.):`,
      `   {`,
      `     "title": string,`,
      `     "description": string,`,
      `     "cuisine": string,`,
      `     "cookTime": number,`,
      `     "servings": 1,`,
      `     "calories": number, "protein": number, "carbs": number, "fat": number,`,
      `     "ingredients": [{ "text": string, "order": number }],`,
      `     "instructions": [{ "text": string, "step": number }]`,
      `   }`,
      ``,
      `3. "honestyNote" — one short honest sentence. Never claim the healthy version is "just as good".`,
      `   Acknowledge the trade-off plainly (e.g., "Won't lie — not quite delivery pizza, but it'll crush the craving at 1/3 the calories").`,
    );

    if (params.userMacroGoals) {
      parts.push(
        ``,
        `USER DAILY MACRO GOALS:`,
        `- Calories: ${params.userMacroGoals.calories}`,
        `- Protein: ${params.userMacroGoals.protein}g`,
        `- Carbs: ${params.userMacroGoals.carbs}g`,
        `- Fat: ${params.userMacroGoals.fat}g`,
        `Aim for the healthified version to fit comfortably inside one meal of these goals.`,
      );
    }

    if (params.dietaryRestrictions && params.dietaryRestrictions.length > 0) {
      parts.push(
        ``,
        `DIETARY RESTRICTIONS (must comply):`,
        ...params.dietaryRestrictions.map(r => `- ${r}`),
      );
    }

    if (params.bannedIngredients && params.bannedIngredients.length > 0) {
      parts.push(
        ``,
        `🚫 BANNED INGREDIENTS (NEVER use these, not even in substitutions):`,
        ...params.bannedIngredients.map(i => `- ${i}`),
      );
    }

    parts.push(
      ``,
      `CRITICAL: Return ONLY valid JSON. No markdown, no code blocks, no extra text.`,
    );

    return parts.join('\n');
  }

  private getSystemPrompt(): string {
    return `You are an honest, pragmatic nutritionist helping a user satisfy a craving without guilt.
You never shame the craving. You never pretend the healthy version is "just as good".
You acknowledge trade-offs plainly and help the user make an informed choice.
Return ONLY valid JSON matching the specified schema. No markdown, no code blocks.`;
  }

  private parseResponse(raw: any): CravingFlowResult {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Invalid AI response: not an object');
    }

    const { original, healthified, honestyNote } = raw;

    if (!original || typeof original !== 'object' || typeof original.calories !== 'number') {
      throw new Error('Invalid AI response: missing or invalid "original" field');
    }

    if (!healthified || typeof healthified !== 'object' || typeof healthified.calories !== 'number') {
      throw new Error('Invalid AI response: missing or invalid "healthified" field');
    }

    const originalSafe: CravingMacros = {
      name: String(original.name || ''),
      description: String(original.description || ''),
      calories: clampNonNegative(original.calories, MAX_CALORIES),
      protein: clampNonNegative(original.protein, MAX_MACRO_GRAMS),
      carbs: clampNonNegative(original.carbs, MAX_MACRO_GRAMS),
      fat: clampNonNegative(original.fat, MAX_MACRO_GRAMS),
    };

    const healthifiedSafe: HealthifiedCravingRecipe = {
      title: String(healthified.title || ''),
      description: String(healthified.description || ''),
      cuisine: String(healthified.cuisine || ''),
      cookTime: clampNonNegative(healthified.cookTime, 600),
      servings: Math.max(1, Math.round(healthified.servings || 1)),
      calories: clampNonNegative(healthified.calories, MAX_CALORIES),
      protein: clampNonNegative(healthified.protein, MAX_MACRO_GRAMS),
      carbs: clampNonNegative(healthified.carbs, MAX_MACRO_GRAMS),
      fat: clampNonNegative(healthified.fat, MAX_MACRO_GRAMS),
      ingredients: Array.isArray(healthified.ingredients)
        ? healthified.ingredients.map((ing: any, i: number) => ({
            text: String(ing?.text || ing || ''),
            order: Number(ing?.order) || i + 1,
          }))
        : [],
      instructions: Array.isArray(healthified.instructions)
        ? healthified.instructions.map((inst: any, i: number) => ({
            text: String(inst?.text || inst || ''),
            step: Number(inst?.step) || i + 1,
          }))
        : [],
    };

    return {
      original: originalSafe,
      healthified: healthifiedSafe,
      honestyNote: typeof honestyNote === 'string' ? honestyNote : '',
    };
  }
}

export const cravingFlowService = new CravingFlowService();
