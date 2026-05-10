// P9 — extracted from lib/api.ts (search + ai recipes)
import { apiClient } from './core';

export const searchApi = {
  getAutoCompleteSuggestions: (query: string, limit: number = 10) => {
    return apiClient.get('/recipes/autocomplete', { params: { q: query, limit } });
  },
  getPopularSearches: (limit: number = 5) => {
    return apiClient.get('/recipes/popular-searches', { params: { limit } });
  },
  naturalLanguageSearch: (query: string) => {
    return apiClient.post('/search/natural', { query });
  },
  // 10D: "I'm Craving..." Search
  cravingSearch: (query: string, filters?: {
    cuisines?: string[];
    dietaryRestrictions?: string[];
    maxCookTime?: number | null;
    difficulty?: string;
    mealPrepMode?: boolean;
  }) => {
    return apiClient.post('/recipes/craving-search', { query, ...filters });
  },
  // 10D-ii: Log implicit relevance signal from craving search results
  cravingSearchEvent: (cravingQuery: string, recipeId: string, action: 'tap' | 'save' | 'cook') => {
    return apiClient.post('/recipes/craving-search/event', { cravingQuery, recipeId, action });
  },
  // 10G-C: "I want to eat X tonight" full flow
  cravingFlow: (craving: string) => {
    return apiClient.post<{
      original: { name: string; description: string; calories: number; protein: number; carbs: number; fat: number };
      healthified: {
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
      honestyNote: string;
      lighterSuggestions: Array<{
        id: string;
        title: string;
        description?: string;
        cuisine?: string;
        cookTime?: number;
        calories?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
      }>;
    }>('/recipes/craving-flow', { craving });
  },
  // 10P: Craving + Weekly Budget Integration
  cravingBudget: (params: {
    craving: string;
    remainingCalories: number;
    remainingProtein?: number;
    remainingCarbs?: number;
    remainingFat?: number;
  }) => {
    return apiClient.post<{
      goForIt: {
        originalCraving: { calories: number; protein: number; carbs: number; fat: number };
        remainingAfter: { calories: number; protein: number; carbs: number; fat: number };
        overBudget: boolean;
        overBy: { calories: number; protein: number; carbs: number; fat: number };
      };
      healthierVersion: {
        recipe: {
          title: string; description: string; cuisine: string; cookTime: number;
          servings: number; calories: number; protein: number; carbs: number; fat: number;
          ingredients: Array<{ text: string; order: number }>;
          instructions: Array<{ text: string; step: number }>;
        };
        comparison: {
          original: { calories: number; protein: number; carbs: number; fat: number };
          healthified: { calories: number; protein: number; carbs: number; fat: number };
          caloriesSaved: number; percentReduction: number; proteinDifference: number;
        };
        honestyNote: string;
      };
      similarButLighter: Array<{
        id: string; title: string; calories: number; protein: number;
        carbs: number; fat: number; cuisine?: string; cookTime?: number; matchScore: number;
      }>;
    }>('/recipes/craving-budget', params);
  },
};

// AI Recipe API
export const aiRecipeApi = {
  // Generate a single AI recipe
  generateRecipe: (params?: { cuisine?: string; mealType?: string; recipeTitle?: string }) => {
    return apiClient.get('/ai-recipes/generate', { params });
  },

  // Generate daily meal plan with AI
  generateDailyPlan: (params?: { 
    meals?: string; // Comma-separated: breakfast,lunch,dinner,snack
    mealCount?: number; 
    cuisine?: string;
    useRemainingMacros?: boolean;
    remainingMacros?: { calories: number; protein: number; carbs: number; fat: number };
    maxTotalPrepTime?: number; // Maximum total prep time in minutes (default: 60)
    maxWeeklyBudget?: number; // Maximum daily budget in dollars (for single day generation, this is daily budget)
  }) => {
    // Convert remainingMacros object to query params if present
    const queryParams: any = { ...params };
    if (params?.remainingMacros) {
      queryParams.remainingCalories = params.remainingMacros.calories;
      queryParams.remainingProtein = params.remainingMacros.protein;
      queryParams.remainingCarbs = params.remainingMacros.carbs;
      queryParams.remainingFat = params.remainingMacros.fat;
      delete queryParams.remainingMacros; // Remove the nested object
    }
    if (params?.maxTotalPrepTime) {
      queryParams.maxTotalPrepTime = params.maxTotalPrepTime;
    }
    if (params?.maxWeeklyBudget) {
      queryParams.maxDailyBudget = params.maxWeeklyBudget; // Backend expects daily budget
    }
    return apiClient.get('/ai-recipes/daily-plan', { params: queryParams });
  },

  // Calculate remaining macros from existing meals
  calculateRemainingMacros: (existingMeals: Array<{ calories: number; protein: number; carbs: number; fat: number }>) => {
    return apiClient.post('/ai-recipes/remaining-macros', { existingMeals });
  },

  // Get AI-generated recipes from database
  getAIRecipes: (limit?: number) => {
    return apiClient.get('/ai-recipes', { params: { limit } });
  },
};

