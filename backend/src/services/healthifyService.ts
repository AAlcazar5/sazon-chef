// backend/src/services/healthifyService.ts
import { AIProviderManager } from './aiProviders/AIProviderManager';
import { GeneratedRecipe } from './aiRecipeService';

export interface RecipeHealthifyParams {
  originalRecipe: {
    title: string;
    description: string;
    ingredients: Array<{ text: string } | string>;
    instructions: Array<{ text: string } | string>;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    cookTime: number;
    cuisine: string;
  };
  userMacroGoals?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  dietaryRestrictions?: string[];
  bannedIngredients?: string[];
  fitnessGoal?: string;
}

export interface HealthifiedRecipe extends GeneratedRecipe {
  substitutions: Array<{
    original: string;
    replacement: string;
    reason: string;
  }>;
  improvements: Array<{
    aspect: string;
    before: string;
    after: string;
    benefit: string;
  }>;
  nutritionComparison: {
    before: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    after: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  };
}

export class HealthifyService {
  private providerManager: AIProviderManager;

  constructor() {
    this.providerManager = new AIProviderManager();
  }

  /**
   * Healthify a recipe - transform it to be healthier while maintaining deliciousness
   */
  async healthifyRecipe(params: RecipeHealthifyParams): Promise<HealthifiedRecipe> {
    try {
      console.log('💚 Healthifying recipe:', params.originalRecipe.title);

      const prompt = this.buildHealthifyPrompt(params);
      const systemPrompt = this.getSystemPrompt();

      // Use the AI provider to generate healthified recipe
      // We need to get the raw response to extract substitutions/improvements
      const recipe = await this.providerManager.generateRecipe({
        prompt,
        systemPrompt,
        temperature: 0.8, // Slightly lower for more consistent substitutions
        maxTokens: 2500,
      });

      // The AI response should include substitutions and improvements in the JSON
      // Parse the healthified recipe and extract substitutions/improvements
      const healthified = this.parseHealthifiedRecipe(recipe as any, params.originalRecipe);

      console.log('✅ Recipe healthified:', healthified.title);
      return healthified;
    } catch (error: any) {
      console.error('❌ Healthify Error:', error);
      throw new Error(`Failed to healthify recipe: ${error.message}`);
    }
  }

  /**
   * Build the healthify prompt
   */
  private buildHealthifyPrompt(params: RecipeHealthifyParams): string {
    const parts: string[] = [];

    // Original recipe context
    const ingredients = params.originalRecipe.ingredients.map(ing => 
      typeof ing === 'string' ? ing : ing.text
    );
    const instructions = params.originalRecipe.instructions.map(inst => 
      typeof inst === 'string' ? inst : inst.text
    );

    parts.push(
      `Transform this recipe into a healthier version while maintaining its deliciousness and core flavors.`,
      ``,
      `ORIGINAL RECIPE:`,
      `Title: ${params.originalRecipe.title}`,
      `Description: ${params.originalRecipe.description}`,
      `Cuisine: ${params.originalRecipe.cuisine}`,
      `Cook Time: ${params.originalRecipe.cookTime} minutes`,
      ``,
      `Current Nutrition (per serving):`,
      `- Calories: ${params.originalRecipe.calories}`,
      `- Protein: ${params.originalRecipe.protein}g`,
      `- Carbs: ${params.originalRecipe.carbs}g`,
      `- Fat: ${params.originalRecipe.fat}g`,
      ``,
      `Ingredients:`,
      ...ingredients.map((ing, i) => `  ${i + 1}. ${ing}`),
      ``,
      `Instructions:`,
      ...instructions.map((inst, i) => `  ${i + 1}. ${inst}`),
    );

    // Target nutrition goals
    if (params.userMacroGoals) {
      parts.push(
        ``,
        `TARGET NUTRITION GOALS (per serving):`,
        `- Calories: ${params.userMacroGoals.calories} (aim to reduce by 10-20% if possible)`,
        `- Protein: ${params.userMacroGoals.protein}g (increase if below target)`,
        `- Carbs: ${params.userMacroGoals.carbs}g (optimize for complex carbs)`,
        `- Fat: ${params.userMacroGoals.fat}g (prefer healthy fats)`,
      );
    }

    // Dietary restrictions
    if (params.dietaryRestrictions && params.dietaryRestrictions.length > 0) {
      parts.push(
        ``,
        `DIETARY RESTRICTIONS (must comply):`,
        ...params.dietaryRestrictions.map(r => `- ${r}`),
      );
    }

    // Banned ingredients
    if (params.bannedIngredients && params.bannedIngredients.length > 0) {
      parts.push(
        ``,
        `NEVER USE THESE INGREDIENTS:`,
        ...params.bannedIngredients.map(ing => `- ${ing}`),
      );
    }

    // Fitness goal context
    if (params.fitnessGoal) {
      const goalContext = this.getFitnessGoalContext(params.fitnessGoal);
      if (goalContext) {
        parts.push(``, goalContext);
      }
    }

    parts.push(
      ``,
      `REQUIREMENTS:`,
      `1. Maintain the core flavor profile and cuisine style`,
      `2. Make smart ingredient substitutions (e.g., Greek yogurt instead of sour cream, whole wheat instead of white flour)`,
      `3. Reduce unhealthy fats, sugars, and processed ingredients`,
      `4. Increase protein, fiber, and nutrient density`,
      `5. Keep cooking time similar (${params.originalRecipe.cookTime} minutes ± 10 minutes)`,
      `6. Ensure the recipe remains delicious and satisfying`,
      `7. Make substitutions that enhance flavor, not just reduce calories`,
      ``,
      `OUTPUT FORMAT (JSON):`,
      `{`,
      `  "title": "Healthier version of [original title] or new descriptive title",`,
      `  "description": "Updated description explaining the health improvements",`,
      `  "cuisine": "${params.originalRecipe.cuisine}",`,
      `  "cookTime": ${params.originalRecipe.cookTime},`,
      `  "servings": 1,`,
      `  "calories": <target or optimized calories>,`,
      `  "protein": <target or optimized protein>,`,
      `  "carbs": <target or optimized carbs>,`,
      `  "fat": <target or optimized fat>,`,
      `  "ingredients": [`,
      `    { "text": "1 cup whole wheat flour", "order": 1 },`,
      `    { "text": "2 tbsp olive oil", "order": 2 }`,
      `  ],`,
      `  "instructions": [`,
      `    { "text": "Step 1 instruction", "step": 1 },`,
      `    { "text": "Step 2 instruction", "step": 2 }`,
      `  ],`,
      `  "substitutions": [`,
      `    {`,
      `      "original": "white flour",`,
      `      "replacement": "whole wheat flour",`,
      `      "reason": "Higher fiber content and more nutrients"`,
      `    }`,
      `  ],`,
      `  "improvements": [`,
      `    {`,
      `      "aspect": "Fat content",`,
      `      "before": "12g saturated fat from butter",`,
      `      "after": "8g healthy fat from olive oil",`,
      `      "benefit": "Reduced saturated fat, increased monounsaturated fats"`,
      `    }`,
      `  ]`,
      `}`,
    );

    return parts.join('\n');
  }

  /**
   * Get fitness goal context for healthify prompt
   */
  private getFitnessGoalContext(goal: string): string | null {
    const goalLower = goal.toLowerCase();
    
    if (goalLower.includes('weight loss') || goalLower.includes('lose weight')) {
      return `FITNESS GOAL: Weight Loss - Focus on reducing calories while maintaining satiety. Increase fiber and protein to help with hunger management.`;
    }
    
    if (goalLower.includes('muscle') || goalLower.includes('gain') || goalLower.includes('build')) {
      return `FITNESS GOAL: Muscle Gain - Prioritize high protein content. Ensure adequate calories for muscle building while maintaining healthy ingredients.`;
    }
    
    if (goalLower.includes('maintain') || goalLower.includes('maintenance')) {
      return `FITNESS GOAL: Maintenance - Balance nutrition while optimizing ingredient quality. Focus on whole foods and nutrient density.`;
    }
    
    return null;
  }

  /**
   * Get system prompt for healthify
   */
  private getSystemPrompt(): string {
    return `You are an expert nutritionist and chef specializing in creating healthier versions of recipes while maintaining their deliciousness and core flavors.

Your task is to transform recipes by:
- Making smart ingredient substitutions (e.g., Greek yogurt for sour cream, whole wheat for white flour)
- Reducing unhealthy fats, sugars, and processed ingredients
- Increasing protein, fiber, and nutrient density
- Maintaining the cuisine style and flavor profile
- Ensuring the recipe remains satisfying and delicious

CRITICAL: Return ONLY valid JSON. No markdown, no code blocks, no extra text. Use double quotes for all strings. No trailing commas. Properly close all braces/brackets.

The JSON must include:
- All standard recipe fields (title, description, ingredients, instructions, macros, cookTime, servings)
- "substitutions" array with original, replacement, and reason
- "improvements" array with aspect, before, after, and benefit

Be specific about substitutions and explain the health benefits clearly.`;
  }

  /**
   * Parse and validate the healthified recipe response
   */
  private parseHealthifiedRecipe(
    recipe: any, // Use any to access substitutions/improvements that aren't in GeneratedRecipe
    original: RecipeHealthifyParams['originalRecipe']
  ): HealthifiedRecipe {
    // Extract substitutions and improvements from the recipe
    // The AI should include these in the response
    const substitutions = Array.isArray(recipe.substitutions) ? recipe.substitutions : [];
    const improvements = Array.isArray(recipe.improvements) ? recipe.improvements : [];

    // Ensure ingredients and instructions are in the correct format
    const ingredients = Array.isArray(recipe.ingredients) 
      ? recipe.ingredients.map((ing: any, index: number) => {
          if (typeof ing === 'string') {
            return { text: ing, order: index + 1 };
          }
          if (ing.text) {
            return { text: ing.text, order: ing.order || index + 1 };
          }
          // Handle name/amount/unit format from GeneratedRecipe
          if (ing.name) {
            return { text: `${ing.amount || ''} ${ing.unit || ''} ${ing.name}`.trim(), order: index + 1 };
          }
          return { text: String(ing), order: index + 1 };
        })
      : [];

    const instructions = Array.isArray(recipe.instructions)
      ? recipe.instructions.map((inst: any, index: number) => {
          if (typeof inst === 'string') {
            return { text: inst, step: index + 1 };
          }
          if (inst.text) {
            return { text: inst.text, step: inst.step || index + 1 };
          }
          if (inst.instruction) {
            return { text: inst.instruction, step: inst.step || index + 1 };
          }
          return { text: String(inst), step: index + 1 };
        })
      : [];

    // Calculate nutrition comparison
    const nutritionComparison = {
      before: {
        calories: original.calories,
        protein: original.protein,
        carbs: original.carbs,
        fat: original.fat,
      },
      after: {
        calories: recipe.calories || original.calories,
        protein: recipe.protein || original.protein,
        carbs: recipe.carbs || original.carbs,
        fat: recipe.fat || original.fat,
      },
    };

    return {
      title: recipe.title || original.title,
      description: recipe.description || original.description,
      cuisine: recipe.cuisine || original.cuisine,
      cookTime: recipe.cookTime || original.cookTime,
      difficulty: recipe.difficulty || 'medium',
      servings: recipe.servings || 1,
      calories: recipe.calories || original.calories,
      protein: recipe.protein || original.protein,
      carbs: recipe.carbs || original.carbs,
      fat: recipe.fat || original.fat,
      fiber: recipe.fiber,
      ingredients,
      instructions,
      tips: recipe.tips,
      tags: recipe.tags,
      substitutions,
      improvements,
      nutritionComparison,
    };
  }
}

export const healthifyService = new HealthifyService();

