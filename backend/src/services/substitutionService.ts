// backend/src/services/substitutionService.ts
// AI-powered conversational ingredient substitution — takes a user question about
// a recipe and returns structured ingredient + instruction changes.

import { AIProviderManager } from './aiProviders/AIProviderManager';

export interface SubstitutionDiff {
  ingredientChanges: Array<{
    original: string;
    replacement: string;
    reason: string;
  }>;
  instructionChanges: Array<{
    step: number;
    original: string;
    updated: string;
    reason: string;
  }>;
  macroImpact: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  summary: string;
}

interface RecipeContext {
  title: string;
  cuisine: string;
  ingredients: Array<{ text: string; order: number }>;
  instructions: Array<{ text: string; step: number }>;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export class SubstitutionService {
  private providerManager: AIProviderManager;

  constructor() {
    this.providerManager = new AIProviderManager();
  }

  async askSubstitution(
    recipe: RecipeContext,
    userQuestion: string,
    dietaryRestrictions: string[] = [],
  ): Promise<SubstitutionDiff> {
    const prompt = this.buildPrompt(recipe, userQuestion, dietaryRestrictions);

    const result = await this.providerManager.generateRecipe({
      prompt,
      systemPrompt: this.systemPrompt(),
      temperature: 0.7,
      maxTokens: 1200,
    });

    return this.parseResult(result as any, recipe);
  }

  private buildPrompt(recipe: RecipeContext, question: string, restrictions: string[]): string {
    const ingredientList = recipe.ingredients
      .map((ing, i) => `${i + 1}. ${ing.text}`)
      .join('\n');
    const instructionList = recipe.instructions
      .map((inst) => `Step ${inst.step}: ${inst.text}`)
      .join('\n');
    const restrictionLine = restrictions.length > 0
      ? `\nDIETARY RESTRICTIONS (must comply): ${restrictions.join(', ')}`
      : '';

    return `A user is looking at this recipe and has a question about substitutions.

RECIPE: ${recipe.title} (${recipe.cuisine})
Current macros: ${recipe.calories} cal, ${recipe.protein}g protein, ${recipe.carbs}g carbs, ${recipe.fat}g fat${recipe.fiber ? `, ${recipe.fiber}g fiber` : ''}

INGREDIENTS:
${ingredientList}

INSTRUCTIONS:
${instructionList}
${restrictionLine}

USER QUESTION: "${question}"

Respond with a JSON object describing the changes needed. Include:
- ingredientChanges: which ingredients to swap (use the EXACT original text from the ingredient list)
- instructionChanges: any instruction steps that need updating because of the swap (use the EXACT step numbers)
- macroImpact: estimated NET change in macros (positive = more, negative = less)
- summary: a friendly 1-2 sentence explanation of what you changed and why

OUTPUT FORMAT (JSON only — no markdown):
{
  "ingredientChanges": [
    { "original": "exact ingredient text", "replacement": "new ingredient text with amount", "reason": "brief reason" }
  ],
  "instructionChanges": [
    { "step": 2, "original": "exact instruction text", "updated": "modified instruction", "reason": "why this changed" }
  ],
  "macroImpact": { "calories": -50, "protein": 3, "carbs": -10, "fat": -5, "fiber": 0 },
  "summary": "Friendly explanation of the changes"
}

Rules:
- Only change what's necessary to answer the user's question
- Use the EXACT original ingredient text so the frontend can match and replace
- If a swap affects cooking technique, update the relevant instruction steps
- Be honest about trade-offs (taste, texture, cook time)
- Macro estimates should be reasonable per-serving deltas
- If the question doesn't require any changes, return empty arrays and explain in summary`;
  }

  private systemPrompt(): string {
    return `You are Sazon, a friendly AI chef who helps users adapt recipes to their needs.
You give practical, specific substitution advice — not vague suggestions.
When a swap changes technique or timing, you update the instructions too.
Be honest about trade-offs. Never claim a healthy swap tastes identical when it doesn't.
Return ONLY valid JSON. No markdown, no extra text.`;
  }

  private parseResult(raw: any, recipe: RecipeContext): SubstitutionDiff {
    const ingredientChanges: SubstitutionDiff['ingredientChanges'] = [];
    const instructionChanges: SubstitutionDiff['instructionChanges'] = [];

    // Parse ingredient changes — validate originals exist in recipe
    const ingredientTexts = new Set(recipe.ingredients.map((i) => i.text));
    for (const ic of (raw?.ingredientChanges ?? [])) {
      if (!ic?.original || !ic?.replacement) continue;
      // Accept if exact match OR partial match (AI sometimes trims quantities)
      const matchesExact = ingredientTexts.has(ic.original);
      const matchesPartial = !matchesExact && [...ingredientTexts].some(
        (t) => t.toLowerCase().includes(ic.original.toLowerCase()) ||
               ic.original.toLowerCase().includes(t.toLowerCase())
      );
      if (matchesExact || matchesPartial) {
        // Use the exact original text from the recipe for reliable frontend matching
        const exactOriginal = matchesExact
          ? ic.original
          : [...ingredientTexts].find(
              (t) => t.toLowerCase().includes(ic.original.toLowerCase()) ||
                     ic.original.toLowerCase().includes(t.toLowerCase())
            )!;
        ingredientChanges.push({
          original: exactOriginal,
          replacement: String(ic.replacement),
          reason: String(ic.reason ?? ''),
        });
      }
    }

    // Parse instruction changes — validate step numbers exist
    const validSteps = new Set(recipe.instructions.map((i) => i.step));
    for (const ic of (raw?.instructionChanges ?? [])) {
      if (!ic?.step || !ic?.updated) continue;
      const step = Number(ic.step);
      if (!validSteps.has(step)) continue;
      const originalInst = recipe.instructions.find((i) => i.step === step);
      instructionChanges.push({
        step,
        original: originalInst?.text ?? String(ic.original ?? ''),
        updated: String(ic.updated),
        reason: String(ic.reason ?? ''),
      });
    }

    // Parse macro impact with safe defaults
    const mi = raw?.macroImpact ?? {};
    const macroImpact = {
      calories: Number(mi.calories) || 0,
      protein: Number(mi.protein) || 0,
      carbs: Number(mi.carbs) || 0,
      fat: Number(mi.fat) || 0,
      fiber: Number(mi.fiber) || 0,
    };

    return {
      ingredientChanges,
      instructionChanges,
      macroImpact,
      summary: typeof raw?.summary === 'string'
        ? raw.summary
        : 'Here are the suggested changes for your recipe.',
    };
  }
}

export const substitutionService = new SubstitutionService();
