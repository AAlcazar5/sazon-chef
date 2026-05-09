// backend/src/services/aiRecipeResponseShape.ts
// K9: shared response serializer for AI-generated recipe endpoints.
// Pulled out of aiRecipeController so future endpoints that return a
// generated recipe don't recopy the field-mapping block. Note: the broader
// "split aiRecipeController.ts (5,553 lines)" goal lives in Tier R5 — this
// is just the small DRY win the audit flagged.

export interface SerializableRecipe {
  id: string;
  title: string;
  description: string | null;
  cuisine: string | null;
  cookTime: number | null;
  difficulty: string | null;
  servings: number | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  imageUrl: string | null;
  ingredients: unknown;
  instructions: Array<{ step: number; text: string }>;
}

export function serializeAIRecipeResponse(savedRecipe: SerializableRecipe) {
  return {
    success: true as const,
    recipe: {
      id: savedRecipe.id,
      title: savedRecipe.title,
      description: savedRecipe.description,
      cuisine: savedRecipe.cuisine,
      cookTime: savedRecipe.cookTime,
      difficulty: savedRecipe.difficulty,
      servings: savedRecipe.servings,
      calories: savedRecipe.calories,
      protein: savedRecipe.protein,
      carbs: savedRecipe.carbs,
      fat: savedRecipe.fat,
      fiber: savedRecipe.fiber,
      imageUrl: savedRecipe.imageUrl,
      source: 'ai-generated' as const,
      ingredients: savedRecipe.ingredients,
      instructions: savedRecipe.instructions.map((inst) => ({
        step: inst.step,
        instruction: inst.text,
      })),
    },
  };
}
