// backend/src/services/flavorBoostService.ts
// AI-powered flavor boost suggestions — analyzes a recipe's flavor profile and returns
// 3-5 sauce/spice/topping additions that add excitement without blowing macros.

import { AIProviderManager } from './aiProviders/AIProviderManager';

export interface FlavorBoostSuggestion {
  addition: string;       // e.g. "1 tbsp gochujang"
  description: string;   // e.g. "for a Korean kick"
  macroCost: {
    calories: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  category: 'spice' | 'sauce' | 'topping' | 'herb' | 'acid';
}

export interface FlavorBoostResult {
  suggestions: FlavorBoostSuggestion[];
  flavorProfile: string; // e.g. "savory, mild, Mediterranean"
}

interface RecipeContext {
  title: string;
  cuisine: string;
  ingredients: string[];
  instructions?: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export class FlavorBoostService {
  private providerManager: AIProviderManager;

  constructor() {
    this.providerManager = new AIProviderManager();
  }

  async getFlavorBoosts(recipe: RecipeContext, dietaryRestrictions: string[] = []): Promise<FlavorBoostResult> {
    const prompt = this.buildPrompt(recipe, dietaryRestrictions);

    const result = await this.providerManager.generateRecipe({
      prompt,
      systemPrompt: this.systemPrompt(),
      temperature: 0.9,
      maxTokens: 800,
    });

    return this.parseResult(result as any);
  }

  private buildPrompt(recipe: RecipeContext, restrictions: string[]): string {
    const ingredientList = recipe.ingredients.slice(0, 12).join(', ');
    const restrictionLine = restrictions.length > 0
      ? `\nDIETARY RESTRICTIONS: ${restrictions.join(', ')} — all suggestions MUST comply.`
      : '';

    return `Analyze this recipe and suggest 4–5 flavor additions that would make it more exciting.
Each addition must add ≤50 calories. Prioritize high-impact, low-calorie options.

RECIPE:
Title: ${recipe.title}
Cuisine: ${recipe.cuisine}
Key ingredients: ${ingredientList}
Macros: ${recipe.calories} cal, ${recipe.protein}g protein, ${recipe.carbs}g carbs, ${recipe.fat}g fat
${restrictionLine}

OUTPUT FORMAT (JSON only — no markdown):
{
  "flavorProfile": "brief description of current flavor profile",
  "suggestions": [
    {
      "addition": "1 tbsp gochujang",
      "description": "for a Korean kick",
      "category": "sauce",
      "macroCost": { "calories": 15, "carbs": 2 }
    }
  ]
}

Rules:
- Each suggestion must have calories ≤ 50
- Category must be one of: spice, sauce, topping, herb, acid
- Suggestions should complement the cuisine, not clash
- Be specific (amount + ingredient), not vague ("add spices")`;
  }

  private systemPrompt(): string {
    return `You are a creative chef specializing in flavor enhancement.
Your goal is to make recipes more exciting with high-impact, low-calorie additions.
Return ONLY valid JSON. No markdown, no extra text.`;
  }

  private parseResult(raw: any): FlavorBoostResult {
    const suggestions: FlavorBoostSuggestion[] = [];
    const rawSuggestions = Array.isArray(raw?.suggestions) ? raw.suggestions : [];

    for (const s of rawSuggestions) {
      if (!s.addition || !s.description) continue;
      const calories = s.macroCost?.calories ?? 0;
      // Enforce ≤50 calorie rule
      if (calories > 50) continue;

      suggestions.push({
        addition: String(s.addition),
        description: String(s.description),
        category: ['spice', 'sauce', 'topping', 'herb', 'acid'].includes(s.category)
          ? s.category
          : 'spice',
        macroCost: {
          calories,
          protein: s.macroCost?.protein,
          carbs: s.macroCost?.carbs,
          fat: s.macroCost?.fat,
        },
      });
    }

    return {
      suggestions: suggestions.slice(0, 5),
      flavorProfile: typeof raw?.flavorProfile === 'string' ? raw.flavorProfile : 'savory',
    };
  }
}

export const flavorBoostService = new FlavorBoostService();
