// P9 — extracted from lib/api.ts (recipe + collections + meal history)
import { apiClient, api } from './core';

export const recipeApi = {
  // Recipe operations
  getRecipes: (params?: { cuisine?: string; maxCookTime?: number; page?: number; pageSize?: number }) => {
    return apiClient.get('/recipes', { params });
  },

  getRecipe: (id: string) => {
    return apiClient.get(`/recipes/${id}`);
  },

  // M11: removed duplicate-key getSimilarRecipes — the second definition at
  // line ~869 shadowed this one at runtime. cookbook.tsx and useRecipeActions
  // had been silently receiving `{ recipes: [...] }` instead of the array
  // they expected (their `Array.isArray` checks always failed → empty UI).
  // Both callers updated below to consume `response.data.recipes`.

  getRelatedRecipes: (id: string, limit?: number) => {
    return apiClient.get(`/recipes/${id}/related`, {
      params: { limit: limit || 6 },
    });
  },

  getBatchCookingRecommendations: (limit?: number) => {
    return apiClient.get('/recipes/batch-cooking-recommendations', {
      params: { limit: limit || 10 },
    });
  },

  getSuggestedRecipes: (filters?: {
    cuisines?: string[];
    dietaryRestrictions?: string[];
    maxCookTime?: number;
    difficulty?: string[];
    offset?: number;
    mealPrepMode?: boolean;
    search?: string;
  }) => {
    const params: any = {};
    
    if (filters?.cuisines && filters.cuisines.length > 0) {
      params.cuisines = filters.cuisines.join(',');
    }
    if (filters?.dietaryRestrictions && filters.dietaryRestrictions.length > 0) {
      params.dietaryRestrictions = filters.dietaryRestrictions.join(',');
    }
    if (filters?.maxCookTime) {
      params.maxCookTime = filters.maxCookTime;
    }
    if (filters?.difficulty && filters.difficulty.length > 0) {
      params.difficulty = filters.difficulty.join(',');
    }
    if (filters?.offset !== undefined) {
      params.offset = filters.offset;
    }
    // Only include mealPrepMode when it's explicitly true
    if (filters?.mealPrepMode === true) {
      params.mealPrepMode = 'true';
    }
    if (filters?.search && filters.search.trim().length > 0) {
      params.search = filters.search.trim();
    }
    
    return apiClient.get('/recipes/suggested', { params });
  },

  // Get all recipes with pagination (for browsing all recipes in database)
  getAllRecipes: (options?: {
    page?: number;
    limit?: number;
    cuisine?: string;
    cuisines?: string[];
    dietaryRestrictions?: string[];
    mealType?: string;
    search?: string;
    maxCookTime?: number;
    difficulty?: string;
    mealPrepMode?: boolean;
    // Quick macro filters (Home Page 2.0)
    minProtein?: number;
    maxCarbs?: number;
    maxCalories?: number;
    // Discovery mode for pull-to-refresh
    shuffle?: boolean;
    // Time-aware defaults
    useTimeAwareDefaults?: boolean;
    // Mood-based recommendations (Home Page 2.0)
    mood?: string;
  }) => {
    const params: any = {};
    if (options?.page !== undefined) params.page = options.page;
    if (options?.limit !== undefined) params.limit = options.limit;
    if (options?.cuisine) params.cuisine = options.cuisine;
    if (options?.cuisines && options.cuisines.length > 0) params.cuisines = options.cuisines.join(',');
    if (options?.dietaryRestrictions && options.dietaryRestrictions.length > 0) params.dietaryRestrictions = options.dietaryRestrictions.join(',');
    if (options?.mealType) params.mealType = options.mealType;
    if (options?.search) params.search = options.search;
    if (options?.maxCookTime) params.maxCookTime = options.maxCookTime;
    if (options?.difficulty) params.difficulty = options.difficulty;
    if (options?.mealPrepMode !== undefined) params.mealPrepMode = options.mealPrepMode ? 'true' : 'false';
    // Quick macro filters (Home Page 2.0)
    if (options?.minProtein !== undefined) params.minProtein = options.minProtein;
    if (options?.maxCarbs !== undefined) params.maxCarbs = options.maxCarbs;
    if (options?.maxCalories !== undefined) params.maxCalories = options.maxCalories;
    // Discovery mode for pull-to-refresh
    if (options?.shuffle) params.shuffle = 'true';
    // Time-aware defaults
    if (options?.useTimeAwareDefaults) params.useTimeAwareDefaults = 'true';
    // Mood-based recommendations (Home Page 2.0)
    if (options?.mood) params.mood = options.mood;
    return apiClient.get('/recipes', { params });
  },

  getRandomRecipe: () => {
    return apiClient.get('/recipes/random');
  },

  // Get Recipe of the Day (Home Page 2.0)
  getRecipeOfTheDay: () => {
    return apiClient.get('/recipes/recipe-of-the-day');
  },

  // Group 11 Phase 5 — "New to you" personalized adjacency feed.
  // Returns recipes from cuisines adjacent to (but not yet explored by)
  // the caller. Each recipe carries personalizationReason + sourceCuisine.
  getNewToYou: (options?: { limit?: number }) => {
    const params: any = {};
    if (options?.limit !== undefined) params.limit = options.limit;
    return apiClient.get('/recipes/new-to-you', { params });
  },

  // Group 11 Phase 5 — "Browse by Region" cuisine-family ranking.
  // Returns CUISINE_FAMILIES annotated with this user's affinity, sorted
  // most-cooked → unexplored-but-adjacent ("New for you") → never-touched.
  getBrowseByFamily: () => {
    return apiClient.get('/recipes/browse-by-family');
  },

  // Consolidated home feed (replaces 7 separate API calls)
  getHomeFeed: (options?: {
    page?: number;
    limit?: number;
    cuisines?: string[];
    dietaryRestrictions?: string[];
    maxCookTime?: number;
    difficulty?: string;
    mealPrepMode?: boolean;
    search?: string;
    shuffle?: boolean;
    useTimeAwareDefaults?: boolean;
    mood?: string;
    minProtein?: number;
    maxCarbs?: number;
    maxCalories?: number;
    lat?: number;
    lon?: number;
  }) => {
    const params: any = {};
    if (options?.page !== undefined) params.page = options.page;
    if (options?.limit !== undefined) params.limit = options.limit;
    if (options?.cuisines && options.cuisines.length > 0) params.cuisines = options.cuisines.join(',');
    if (options?.dietaryRestrictions && options.dietaryRestrictions.length > 0) params.dietaryRestrictions = options.dietaryRestrictions.join(',');
    if (options?.maxCookTime) params.maxCookTime = options.maxCookTime;
    if (options?.difficulty) params.difficulty = options.difficulty;
    if (options?.mealPrepMode !== undefined) params.mealPrepMode = options.mealPrepMode ? 'true' : 'false';
    if (options?.search) params.search = options.search;
    if (options?.shuffle) params.shuffle = 'true';
    if (options?.useTimeAwareDefaults) params.useTimeAwareDefaults = 'true';
    if (options?.mood) params.mood = options.mood;
    if (options?.minProtein !== undefined) params.minProtein = options.minProtein;
    if (options?.maxCarbs !== undefined) params.maxCarbs = options.maxCarbs;
    if (options?.maxCalories !== undefined) params.maxCalories = options.maxCalories;
    if (options?.lat !== undefined) params.lat = options.lat;
    if (options?.lon !== undefined) params.lon = options.lon;
    return apiClient.get('/recipes/home-feed', { params });
  },

  getSavedRecipes: (options?: { page?: number; limit?: number; collectionId?: string }, config?: { signal?: AbortSignal }) => {
    const params: any = {};
    if (options?.page !== undefined) params.page = options.page;
    if (options?.limit !== undefined) params.limit = options.limit;
    if (options?.collectionId) params.collectionId = options.collectionId;
    return apiClient.get('/recipes/saved', { params, signal: config?.signal });
  },

  getLikedRecipes: (options?: { page?: number; limit?: number }, config?: { signal?: AbortSignal }) => {
    const params: any = {};
    if (options?.page !== undefined) params.page = options.page;
    if (options?.limit !== undefined) params.limit = options.limit;
    return apiClient.get('/recipes/liked', { params, signal: config?.signal });
  },

  getDislikedRecipes: (options?: { page?: number; limit?: number }, config?: { signal?: AbortSignal }) => {
    const params: any = {};
    if (options?.page !== undefined) params.page = options.page;
    if (options?.limit !== undefined) params.limit = options.limit;
    return apiClient.get('/recipes/disliked', { params, signal: config?.signal });
  },

  likeRecipe: (id: string) => {
    return apiClient.post(`/recipes/${id}/like`);
  },

  dislikeRecipe: (id: string, reason?: string) => {
    return apiClient.post(`/recipes/${id}/dislike`, reason ? { reason } : {});
  },

  saveRecipe: (id: string, data?: { collectionIds?: string[] }) => {
    return apiClient.post(`/recipes/${id}/save`, data);
  },

  unsaveRecipe: (id: string) => {
    return apiClient.delete(`/recipes/${id}/save`);
  },

  bulkUnsaveRecipes: (recipeIds: string[]) => {
    return apiClient.delete('/recipes/bulk-unsave', { data: { recipeIds } });
  },

  bulkMoveToCollection: (recipeIds: string[], collectionIds: string[]) => {
    return apiClient.patch('/recipes/bulk-move-collection', { recipeIds, collectionIds });
  },

  exportCookbook: () => {
    return apiClient.get('/recipes/export');
  },

  // Recipe scoring
  getRecipeScore: (id: string) => {
    return apiClient.get(`/recipes/${id}/score`);
  },

  // Recipe CRUD operations
  createRecipe: (data: any) => {
    return apiClient.post('/recipes', data);
  },

  importRecipeFromUrl: (url: string) => {
    return apiClient.post('/recipes/import-url', { url });
  },

  // AI-assisted recipe creation from free-text description
  generateFromDescription: (description: string) => {
    return apiClient.post('/recipes/generate-from-description', { description });
  },

  // Fork a recipe into a user-owned copy with optional substitutions applied
  forkRecipe: (id: string, options?: {
    substitutions?: Record<string, string>;
    macroAdjustments?: { calories?: number; protein?: number; carbs?: number; fat?: number; fiber?: number };
    instructionChanges?: Array<{ step: number; text: string }>;
  }) => {
    return apiClient.post(`/recipes/${id}/fork`, options ?? {});
  },

  // Conversational substitution — ask Sazon about swaps ("I don't have X", "Make this dairy-free")
  askSubstitution: (id: string, question: string) => {
    return apiClient.post(`/recipes/${id}/ask-substitution`, { question });
  },

  // Smart collections — rule-driven, auto-populated from saved recipes
  getSmartCollections: () => {
    return apiClient.get('/recipes/smart-collections');
  },
  getSmartCollectionRecipes: (id: string) => {
    return apiClient.get(`/recipes/smart-collections/${id}`);
  },
  getWeatherSmartCollection: (lat: number, lon: number) => {
    return apiClient.get(`/recipes/smart-collections/weather-today?lat=${lat}&lon=${lon}`);
  },

  updateRecipe: (id: string, data: any) => {
    return apiClient.put(`/recipes/${id}`, data);
  },

  deleteRecipe: (id: string) => {
    return apiClient.delete(`/recipes/${id}`);
  },

  healthifyRecipe: (id: string, force = false) => {
    return apiClient.post(`/recipes/${id}/healthify`, { force });
  },

  getIngredientSwaps: (ingredient: string) => {
    return apiClient.get(`/recipes/ingredient-swaps`, { params: { ingredient } });
  },

  flavorBoost: (id: string) => {
    return apiClient.post(`/recipes/${id}/flavor-boost`);
  },

  // Cookbook Quick Wins
  getSavedMeta: (id: string): Promise<{ data: { notes: string | null; rating: number | null } }> => {
    return apiClient.get(`/recipes/${id}/saved-meta`);
  },

  updateSavedMeta: (id: string, data: { notes?: string | null; rating?: number | null }) => {
    return apiClient.put(`/recipes/${id}/saved-meta`, data);
  },

  recordView: (id: string) => {
    return apiClient.post(`/recipes/${id}/view`);
  },

  getRecentlyViewed: (limit?: number) => {
    return apiClient.get('/recipes/recently-viewed', { params: { limit: limit || 50 } });
  },

  recordCook: (id: string, notes?: string) => {
    return apiClient.post(`/recipes/${id}/cook`, notes ? { notes } : undefined);
  },

  getCookingHistory: (id: string) => {
    return apiClient.get(`/recipes/${id}/cooking-history`);
  },

  // ROADMAP 4.0 FX3.2 — per-filter yield deltas for "Relax this filter" rows.
  getFilterYields: (filters: {
    cuisines?: string[];
    dietaryRestrictions?: string[];
    maxCookTime?: number | null;
    difficulty?: string[];
    highProtein?: boolean;
    lowCarb?: boolean;
    lowCalorie?: boolean;
    mealPrepMode?: boolean;
  }) => {
    return apiClient.post('/recipes/filter-yields', filters);
  },

  // ROADMAP 4.0 RD4.1 — leftover-bridge nudge ("your X wants to be in something tonight").
  getLeftoverBridge: (k: number = 3) => {
    return apiClient.get<{
      rows: Array<{
        leftoverIngredient: string;
        expiringIn: number;
        recipes: Array<{
          id: string;
          title: string;
          cuisine: string | null;
          cookTime: number | null;
          imageUrl: string | null;
        }>;
      }>;
    }>('/recipes/leftover-bridge', { params: { k } });
  },

  // ROADMAP 4.0 RD2.2 — anchor-recipe similarity ("More like this").
  getSimilarRecipes: (id: string, k: number = 8) => {
    return apiClient.get<{
      recipes: Array<{
        id: string;
        title: string;
        cuisine: string | null;
        cookTime: number | null;
        imageUrl: string | null;
        score: number;
      }>;
    }>(`/recipes/${id}/similar`, { params: { k } });
  },

  // ROADMAP 4.0 HX2.3 — Friends-who-cooked-this overlay on hero.
  getFriendCohort: (id: string, windowDays: number = 14) => {
    return apiClient.get<{
      members: Array<{
        userId: string;
        firstName: string;
        cookedAt: string;
      }>;
      totalCount: number;
      identityRedacted: boolean;
    }>(`/recipes/${id}/friend-cohort`, { params: { windowDays } });
  },

  // ROADMAP 4.0 RD5.1 — "Cooked this and then…" cohort recommender.
  getCookedNext: (id: string, k: number = 4) => {
    return apiClient.get<{
      recipes: Array<{
        id: string;
        title: string;
        cuisine: string | null;
        cookTime: number | null;
        imageUrl: string | null;
        cookCount: number;
      }>;
      privacyOptOut: boolean;
      belowKAnonFloor: boolean;
    }>(`/recipes/${id}/cooked-next`, { params: { k } });
  },

  // ROADMAP 4.0 HX2.1 — hero re-roll (next-ranked candidate).
  heroReroll: (rank: number) => {
    return apiClient.post<{
      rank: number;
      recipe: {
        id: string;
        title: string;
        imageUrl: string | null;
        cuisine: string | null;
        cookTime: number | null;
      } | null;
      exhausted: boolean;
    }>('/recipes/hero/reroll', { rank });
  },

  // ROADMAP 4.0 HX5.1 — next-5 candidates past the visible cut.
  getAlmostMadeIt: (cutoff: number, tail: number = 5) => {
    return apiClient.get<{
      rows: Array<{
        id: string;
        title: string;
        imageUrl: string | null;
        cuisine: string | null;
        cookTime: number | null;
        marginVsCut: number;
      }>;
      cutCount: number;
    }>('/recipes/home/almost-made-it', { params: { cutoff, tail } });
  },
};
// Collections API
export const collectionsApi = {
  list: () => apiClient.get('/recipes/collections'),
  create: (data: string | { name: string; description?: string; coverImageUrl?: string; category?: string | null }) => {
    const body = typeof data === 'string' ? { name: data } : data;
    return apiClient.post('/recipes/collections', body);
  },
  update: (id: string, data: { name?: string; description?: string | null; coverImageUrl?: string | null; isPinned?: boolean; category?: string | null }) =>
    apiClient.put(`/recipes/collections/${id}`, data),
  remove: (id: string) => apiClient.delete(`/recipes/collections/${id}`),
  togglePin: (id: string) => apiClient.patch(`/recipes/collections/${id}/pin`),
  reorder: (order: { id: string; sortOrder: number }[]) =>
    apiClient.put('/recipes/collections/reorder', { order }),
  duplicate: (id: string) => apiClient.post(`/recipes/collections/${id}/duplicate`),
  merge: (sourceIds: string[], targetId: string) =>
    apiClient.post('/recipes/collections/merge', { sourceIds, targetId }),
  moveSavedRecipe: (recipeId: string, collectionIds: string[]) =>
    apiClient.patch(`/recipes/${recipeId}/move-to-collection`, { collectionIds }),
};


// Meal History API
export const mealHistoryApi = {
  // Get meal history
  getMealHistory: (params?: {
    startDate?: string;
    endDate?: string;
    mealType?: string;
    limit?: number;
    offset?: number;
  }) => {
    return apiClient.get('/meal-history', { params });
  },

  // Add meal to history
  addMealToHistory: (data: {
    recipeId: string;
    mealType: string;
    date?: string;
    consumed?: boolean;
    feedback?: string;
    notes?: string;
    rating?: number;
  }) => {
    return apiClient.post('/meal-history', data);
  },

  // Update meal history entry
  updateMealHistory: (id: string, data: {
    mealType?: string;
    consumed?: boolean;
    feedback?: string;
    notes?: string;
    rating?: number;
  }) => {
    return apiClient.put(`/meal-history/${id}`, data);
  },

  // Delete meal history entry
  deleteMealHistory: (id: string) => {
    return apiClient.delete(`/meal-history/${id}`);
  },

  // Get meal history analytics
  getMealHistoryAnalytics: (params?: {
    period?: number;
    groupBy?: 'day' | 'week' | 'month';
  }) => {
    return apiClient.get('/meal-history/analytics', { params });
  },

  // Get meal history insights
  getMealHistoryInsights: () => {
    return apiClient.get('/meal-history/insights');
  }
};

