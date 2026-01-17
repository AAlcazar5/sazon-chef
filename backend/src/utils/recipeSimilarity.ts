/**
 * Recipe Similarity Utility
 * 
 * Calculates similarity between recipes based on:
 * - Cuisine matching
 * - Ingredient overlap
 * - Nutritional similarity (macros, calories)
 * - Cook time similarity
 * - Semantic similarity (title/description keywords)
 */

interface RecipeForSimilarity {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  cookTime: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servings?: number;
  ingredients?: Array<{ text: string }>;
}

interface SimilarityScore {
  recipeId: string;
  score: number;
  factors: {
    cuisine: number;
    ingredients: number;
    nutrition: number;
    cookTime: number;
    semantic: number;
  };
}

/**
 * Calculate ingredient overlap between two recipes
 */
function calculateIngredientOverlap(
  ingredients1: Array<{ text: string }>,
  ingredients2: Array<{ text: string }>
): number {
  if (ingredients1.length === 0 || ingredients2.length === 0) {
    return 0;
  }

  // Normalize ingredient names (lowercase, remove quantities, extract base ingredient)
  const normalizeIngredient = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/\d+[\/\d]*\s*(cup|tbsp|tsp|oz|lb|g|kg|ml|l|piece|pieces|clove|cloves|slice|slices)/gi, '')
      .replace(/\([^)]*\)/g, '') // Remove parenthetical notes
      .trim()
      .split(',')[0] // Take first part before comma
      .split('(')[0] // Take first part before parenthesis
      .trim();
  };

  const ingredients1Set = new Set(
    ingredients1.map(ing => normalizeIngredient(ing.text))
  );
  const ingredients2Set = new Set(
    ingredients2.map(ing => normalizeIngredient(ing.text))
  );

  // Calculate Jaccard similarity
  const intersection = new Set(
    [...ingredients1Set].filter(x => ingredients2Set.has(x))
  );
  const union = new Set([...ingredients1Set, ...ingredients2Set]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Calculate nutritional similarity between two recipes
 */
function calculateNutritionalSimilarity(
  recipe1: RecipeForSimilarity,
  recipe2: RecipeForSimilarity
): number {
  // Normalize by serving size for fair comparison
  const normalize = (value: number, servings: number) => value / servings;

  const r1Calories = normalize(recipe1.calories, recipe1.servings || 1);
  const r2Calories = normalize(recipe2.calories, recipe2.servings || 1);
  const r1Protein = normalize(recipe1.protein, recipe1.servings || 1);
  const r2Protein = normalize(recipe2.protein, recipe2.servings || 1);
  const r1Carbs = normalize(recipe1.carbs, recipe1.servings || 1);
  const r2Carbs = normalize(recipe2.carbs, recipe2.servings || 1);
  const r1Fat = normalize(recipe1.fat, recipe1.servings || 1);
  const r2Fat = normalize(recipe2.fat, recipe2.servings || 1);

  // Calculate similarity for each macro (using inverse of percentage difference)
  const calorieSim = 1 - Math.abs(r1Calories - r2Calories) / Math.max(r1Calories, r2Calories, 1);
  const proteinSim = 1 - Math.abs(r1Protein - r2Protein) / Math.max(r1Protein, r2Protein, 1);
  const carbsSim = 1 - Math.abs(r1Carbs - r2Carbs) / Math.max(r1Carbs, r2Carbs, 1);
  const fatSim = 1 - Math.abs(r1Fat - r2Fat) / Math.max(r1Fat, r2Fat, 1);

  // Weighted average (calories are most important)
  return (calorieSim * 0.4 + proteinSim * 0.25 + carbsSim * 0.2 + fatSim * 0.15);
}

/**
 * Calculate cook time similarity
 */
function calculateCookTimeSimilarity(
  cookTime1: number,
  cookTime2: number
): number {
  const maxTime = Math.max(cookTime1, cookTime2, 1);
  const diff = Math.abs(cookTime1 - cookTime2);
  return Math.max(0, 1 - diff / maxTime);
}

/**
 * Calculate semantic similarity based on title and description keywords
 */
function calculateSemanticSimilarity(
  recipe1: RecipeForSimilarity,
  recipe2: RecipeForSimilarity
): number {
  // Extract keywords from title and description
  const extractKeywords = (text: string): Set<string> => {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3) // Filter out short words
      .filter(word => !['with', 'and', 'the', 'for', 'from', 'this', 'that'].includes(word));
    return new Set(words);
  };

  const keywords1 = new Set([
    ...extractKeywords(recipe1.title),
    ...extractKeywords(recipe1.description || '')
  ]);
  const keywords2 = new Set([
    ...extractKeywords(recipe2.title),
    ...extractKeywords(recipe2.description || '')
  ]);

  // Calculate Jaccard similarity
  const intersection = new Set(
    [...keywords1].filter(x => keywords2.has(x))
  );
  const union = new Set([...keywords1, ...keywords2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Find similar recipes to a given recipe
 * 
 * @param targetRecipe The recipe to find similarities for
 * @param candidateRecipes Array of candidate recipes to compare against
 * @param options Configuration options
 * @returns Array of similar recipes sorted by similarity score
 */
export function findSimilarRecipes(
  targetRecipe: RecipeForSimilarity,
  candidateRecipes: RecipeForSimilarity[],
  options: {
    limit?: number;
    minScore?: number;
    weights?: {
      cuisine?: number;
      ingredients?: number;
      nutrition?: number;
      cookTime?: number;
      semantic?: number;
    };
  } = {}
): SimilarityScore[] {
  const {
    limit = 10,
    minScore = 0.1,
    weights = {
      cuisine: 0.25,
      ingredients: 0.30,
      nutrition: 0.20,
      cookTime: 0.10,
      semantic: 0.15,
    }
  } = options;

  const similarities: SimilarityScore[] = [];

  for (const candidate of candidateRecipes) {
    // Skip if it's the same recipe
    if (candidate.id === targetRecipe.id) {
      continue;
    }

    // Calculate individual similarity factors
    const cuisineScore = candidate.cuisine === targetRecipe.cuisine ? 1 : 0;
    
    const ingredientScore = calculateIngredientOverlap(
      targetRecipe.ingredients || [],
      candidate.ingredients || []
    );
    
    const nutritionScore = calculateNutritionalSimilarity(
      targetRecipe,
      candidate
    );
    
    const cookTimeScore = calculateCookTimeSimilarity(
      targetRecipe.cookTime,
      candidate.cookTime
    );
    
    const semanticScore = calculateSemanticSimilarity(
      targetRecipe,
      candidate
    );

    // Calculate weighted total score
    const totalScore =
      cuisineScore * weights.cuisine! +
      ingredientScore * weights.ingredients! +
      nutritionScore * weights.nutrition! +
      cookTimeScore * weights.cookTime! +
      semanticScore * weights.semantic!;

    if (totalScore >= minScore) {
      similarities.push({
        recipeId: candidate.id,
        score: totalScore,
        factors: {
          cuisine: cuisineScore,
          ingredients: ingredientScore,
          nutrition: nutritionScore,
          cookTime: cookTimeScore,
          semantic: semanticScore,
        },
      });
    }
  }

  // Sort by score (highest first) and return top results
  return similarities
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Find recipes similar to search query (for enhanced search)
 * Uses semantic matching to find recipes in the same category
 */
export function findSimilarToSearchQuery(
  searchQuery: string,
  candidateRecipes: RecipeForSimilarity[],
  exactMatches: RecipeForSimilarity[],
  options: {
    limit?: number;
    minScore?: number;
  } = {}
): SimilarityScore[] {
  const { limit = 10, minScore = 0.2 } = options;

  // Extract keywords from search query
  const queryKeywords = new Set(
    searchQuery
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
  );

  // Get cuisines and keywords from exact matches
  const matchCuisines = new Set(exactMatches.map(r => r.cuisine));
  const matchKeywords = new Set<string>();
  exactMatches.forEach(recipe => {
    const keywords = [
      ...recipe.title.toLowerCase().split(/\s+/),
      ...(recipe.description || '').toLowerCase().split(/\s+/)
    ];
    keywords.forEach(kw => {
      if (kw.length > 3) matchKeywords.add(kw);
    });
  });

  const similarities: SimilarityScore[] = [];
  const exactMatchIds = new Set(exactMatches.map(r => r.id));

  // Define related dish types for common searches (e.g., tacos -> burritos, quesadillas, etc.)
  const relatedDishTypes: Record<string, string[]> = {
    'taco': ['burrito', 'quesadilla', 'bowl', 'wrap', 'enchilada', 'tostada', 'nachos'],
    'burrito': ['taco', 'quesadilla', 'bowl', 'wrap', 'enchilada'],
    'quesadilla': ['taco', 'burrito', 'wrap', 'enchilada'],
    'pizza': ['calzone', 'stromboli', 'flatbread', 'focaccia'],
    'pasta': ['noodle', 'spaghetti', 'lasagna', 'ravioli', 'gnocchi'],
    'soup': ['stew', 'chili', 'chowder', 'bisque'],
    'salad': ['bowl', 'wrap', 'sandwich'],
    'sandwich': ['wrap', 'burger', 'panini', 'sub'],
  };

  // Find related dish types for the search query
  const searchLower = searchQuery.toLowerCase();
  const relatedTypes: string[] = [];
  for (const [key, related] of Object.entries(relatedDishTypes)) {
    if (searchLower.includes(key)) {
      relatedTypes.push(...related);
    }
  }

  for (const candidate of candidateRecipes) {
    // Skip exact matches
    if (exactMatchIds.has(candidate.id)) {
      continue;
    }

    let score = 0;
    const factors = {
      cuisine: 0,
      ingredients: 0,
      nutrition: 0,
      cookTime: 0,
      semantic: 0,
    };

    // Cuisine match (if any exact match has same cuisine) - give this more weight
    if (matchCuisines.has(candidate.cuisine)) {
      factors.cuisine = 1;
      score += 0.5; // Increased from 0.3 to 0.5 - cuisine is very important
    }

    // Check for related dish types in title/description
    const candidateText = `${candidate.title} ${candidate.description || ''}`.toLowerCase();
    let relatedDishScore = 0;
    if (relatedTypes.length > 0) {
      for (const relatedType of relatedTypes) {
        if (candidateText.includes(relatedType)) {
          relatedDishScore = 0.4; // Strong match for related dish types
          break;
        }
      }
    }

    // Semantic match (keywords in title/description)
    const matchingKeywords = [...queryKeywords].filter(kw => candidateText.includes(kw));
    if (matchingKeywords.length > 0) {
      factors.semantic = matchingKeywords.length / queryKeywords.size;
      score += factors.semantic * 0.3; // Reduced from 0.4
    }

    // Related dish type match (e.g., searching "tacos" finds "burritos")
    if (relatedDishScore > 0) {
      factors.semantic = Math.max(factors.semantic, relatedDishScore);
      score += relatedDishScore;
    }

    // Match keywords from exact matches (shared ingredients, cooking methods, etc.)
    const candidateKeywords = new Set(
      candidateText.split(/\s+/).filter(w => w.length > 3)
    );
    const overlap = [...matchKeywords].filter(kw => candidateKeywords.has(kw));
    if (overlap.length > 0) {
      const overlapScore = overlap.length / Math.max(matchKeywords.size, 1);
      factors.semantic = Math.max(factors.semantic, overlapScore);
      score += overlapScore * 0.2; // Reduced from 0.3
    }

    // If same cuisine but no other matches, still give a small boost
    if (matchCuisines.has(candidate.cuisine) && score < 0.3) {
      score = 0.3; // Minimum score for same cuisine
    }

    if (score >= minScore) {
      similarities.push({
        recipeId: candidate.id,
        score,
        factors,
      });
    }
  }

  return similarities
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

