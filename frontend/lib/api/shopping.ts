// P9 — extracted from lib/api.ts (shopping + ingredients + cost — minus today's reverse-discovery types)
import { apiClient } from './core';

export const ingredientAvailabilityApi = {
  checkIngredient: (ingredientName: string, location?: string) => {
    return apiClient.get(`/ingredient-availability/${encodeURIComponent(ingredientName)}`, {
      params: location ? { location } : {},
    });
  },

  analyzeRecipe: (recipeId: string, location?: string) => {
    return apiClient.get(`/ingredient-availability/recipes/${recipeId}`, {
      params: location ? { location } : {},
    });
  },

  filterRecipes: (recipeIds: string[], minAvailabilityScore?: number) => {
    return apiClient.post('/ingredient-availability/filter-recipes', {
      recipeIds,
      minAvailabilityScore,
    });
  },
};

// Shopping List API
export const shoppingListApi = {
  getShoppingLists: () => {
    return apiClient.get('/shopping-lists');
  },

  getShoppingList: (id: string) => {
    return apiClient.get(`/shopping-lists/${id}`);
  },

  createShoppingList: (data?: { name?: string; items?: Array<{ name: string; quantity?: string; category?: string; notes?: string }> }) => {
    return apiClient.post('/shopping-lists', data);
  },

  updateShoppingList: (id: string, data: { name?: string; isActive?: boolean }) => {
    return apiClient.put(`/shopping-lists/${id}`, data);
  },

  deleteShoppingList: (id: string) => {
    return apiClient.delete(`/shopping-lists/${id}`);
  },

  addItem: (listId: string, data: { name: string; quantity?: string; category?: string; isCompleted?: boolean; price?: number; notes?: string }) => {
    return apiClient.post(`/shopping-lists/${listId}/items`, data);
  },

  updateItem: (listId: string, itemId: string, data: { name?: string; quantity?: string; category?: string; purchased?: boolean; isCompleted?: boolean; price?: number | null; notes?: string | null; photoUrl?: string | null }) => {
    // Map isCompleted to purchased for backward compatibility
    const mappedData = { ...data };
    if (mappedData.isCompleted !== undefined) {
      mappedData.purchased = mappedData.isCompleted;
      delete mappedData.isCompleted;
    }
    return apiClient.put(`/shopping-lists/${listId}/items/${itemId}`, mappedData);
  },

  batchUpdateItems: (listId: string, updates: Array<{ itemId: string; purchased?: boolean; name?: string; quantity?: string; category?: string | null; notes?: string | null; price?: number | null }>) => {
    return apiClient.put(`/shopping-lists/${listId}/items/batch`, { updates });
  },

  deleteItem: (listId: string, itemId: string) => {
    return apiClient.delete(`/shopping-lists/${listId}/items/${itemId}`);
  },

  uploadItemPhoto: (imageUri: string) => {
    const formData = new FormData();
    formData.append('photo', { uri: imageUri, type: 'image/jpeg', name: 'item-photo.jpg' } as any);
    return apiClient.upload<{ url: string }>('/upload/item-photo', formData);
  },

  generateFromRecipes: (
    recipeIdsOrOptions:
      | string[]
      | {
          recipeIds: string[];
          name?: string;
          subtractPantry?: boolean;
          servingsByRecipe?: Record<string, number>;
          allowDuplicate?: boolean;
        },
    name?: string,
  ) => {
    const body = Array.isArray(recipeIdsOrOptions)
      ? { recipeIds: recipeIdsOrOptions, name }
      : recipeIdsOrOptions;
    return apiClient.post('/shopping-lists/generate-from-recipes', body);
  },

  generateFromMealPlan: (data: { startDate?: string; endDate?: string; recipeIds?: string[]; name?: string }) => {
    return apiClient.post('/shopping-lists/generate-from-meal-plan', data);
  },

  getPurchaseHistory: (params?: { limit?: number; favorites?: boolean; since?: string }) => {
    return apiClient.get('/shopping-lists/purchase-history', { params });
  },

  getRecentPurchases: (days?: number) => {
    return apiClient.get('/shopping-lists/purchase-history/recent', { params: { days: days || 7 } });
  },

  togglePurchaseHistoryFavorite: (id: string) => {
    return apiClient.put(`/shopping-lists/purchase-history/${id}/favorite`);
  },

  // 10Q-ListMgmt: lifecycle endpoints
  getActiveList: (): Promise<{ data: import('../../types').ShoppingList }> => {
    return apiClient.get('/shopping-lists/active');
  },

  cleanupOrphans: (): Promise<{ data: { deletedCount: number } }> => {
    return apiClient.post('/shopping-lists/cleanup-orphans');
  },

  autoArchiveStale: (): Promise<{ data: { archivedIds: string[] } }> => {
    return apiClient.post('/shopping-lists/auto-archive-stale');
  },

  tierArchived: (): Promise<{ data: { tieredCount: number } }> => {
    return apiClient.post('/shopping-lists/tier-archived');
  },

  archiveList: (id: string): Promise<{ data: import('../../types').ShoppingList }> => {
    return apiClient.post(`/shopping-lists/${id}/archive`);
  },

  restoreList: (id: string): Promise<{ data: import('../../types').ShoppingList }> => {
    return apiClient.post(`/shopping-lists/${id}/restore`);
  },

  markListDone: (id: string): Promise<{ data: { archivedListId: string; newActiveListId?: string; rolledOverItemCount: number } }> => {
    return apiClient.post(`/shopping-lists/${id}/done`);
  },

  clearItems: (id: string): Promise<{ data: { success: boolean; deletedCount: number } }> => {
    return apiClient.post(`/shopping-lists/${id}/clear`);
  },

  bulkAddItems: (id: string, items: Array<{ name: string; quantity?: string; category?: string; notes?: string }>): Promise<{ data: { success: boolean; addedCount: number } }> => {
    return apiClient.post(`/shopping-lists/${id}/bulk-add`, { items });
  },

  archiveOnCompletion: (id: string): Promise<{ data: { archivedListId: string; freshListId: string } }> => {
    return apiClient.post(`/shopping-lists/${id}/archive-on-completion`);
  },

  getMergeSuggestion: (): Promise<{ data: { suggestionId: string; name: string; overlap: number } | null }> => {
    return apiClient.get('/shopping-lists/active/merge-suggestion');
  },

  mergeFrom: (activeListId: string, sourceListId: string): Promise<{ data: { success: boolean } }> => {
    return apiClient.post(`/shopping-lists/${activeListId}/merge`, { sourceListId });
  },

  dismissMergeSuggestion: (activeListId: string, suggestionId: string): Promise<{ data: { success: boolean } }> => {
    return apiClient.post('/shopping-lists/active/dismiss-merge-suggestion', { suggestionId });
  },
};

// Shopping App Integration API
export const shoppingAppApi = {
  getSupportedApps: () => {
    return apiClient.get('/shopping-apps/supported');
  },

  getIntegrations: () => {
    return apiClient.get('/shopping-apps/integrations');
  },

  connectApp: (appName: string, credentials?: any) => {
    return apiClient.post('/shopping-apps/connect', { appName, credentials });
  },

  disconnectApp: (appName: string) => {
    return apiClient.delete(`/shopping-apps/connect/${appName}`);
  },

  syncToExternalApp: (appName: string, listId: string) => {
    return apiClient.post(`/shopping-apps/sync/${appName}`, { listId });
  },

  syncBidirectional: (appName: string, listId: string) => {
    return apiClient.post(`/shopping-apps/sync-bidirectional/${appName}`, { listId });
  },

  syncRecipe: (appName: string, recipeId: string) => {
    return apiClient.post(`/shopping-apps/sync-recipe/${appName}`, { recipeId });
  },
};

// Cost Tracking API
export const costTrackingApi = {
  getRecipeCost: (recipeId: string) => {
    return apiClient.get(`/cost-tracking/recipes/${recipeId}/cost`);
  },

  updateRecipeCost: (recipeId: string, data: { estimatedCost?: number; estimatedCostPerServing?: number; costSource?: string }) => {
    return apiClient.put(`/cost-tracking/recipes/${recipeId}/cost`, data);
  },

  getIngredientCosts: (params?: { ingredientName?: string; store?: string }) => {
    return apiClient.get('/cost-tracking/ingredients', { params });
  },

  upsertIngredientCost: (data: { ingredientName: string; unitCost: number; unit: string; store: string; location?: string }) => {
    return apiClient.post('/cost-tracking/ingredients', data);
  },

  deleteIngredientCost: (id: string) => {
    return apiClient.delete(`/cost-tracking/ingredients/${id}`);
  },

  getBudget: () => {
    return apiClient.get('/cost-tracking/budget');
  },

  updateBudget: (data: { maxRecipeCost?: number; maxMealCost?: number; maxDailyFoodBudget?: number; currency?: string }) => {
    return apiClient.put('/cost-tracking/budget', data);
  },

  getRecipeSavings: (recipeId: string) => {
    return apiClient.get(`/cost-tracking/recipes/${recipeId}/savings`);
  },

  compareIngredient: (ingredientName: string) => {
    return apiClient.get(`/cost-tracking/ingredients/${encodeURIComponent(ingredientName)}/compare`);
  },

  compareMultipleIngredients: (ingredientNames: string[]) => {
    return apiClient.post('/cost-tracking/ingredients/compare', { ingredientNames });
  },

  getBestStoreForShoppingList: (ingredientNames: string[], options?: { zipCode?: string; latitude?: number; longitude?: number; radiusMiles?: number }) => {
    return apiClient.post('/cost-tracking/shopping-list/best-store', {
      ingredientNames,
      ...options,
    });
  },
};

// Weight Goal and Tracking API
export const weightGoalApi = {
  logWeight: (data: { weightKg: number; date?: string; notes?: string }) => {
    return apiClient.post('/weight-goal/log', data);
  },

  getWeightHistory: (days?: number) => {
    return apiClient.get('/weight-goal/history', { params: { days } });
  },

  setWeightGoal: (data: { targetWeightKg: number; targetDate: string }) => {
    return apiClient.post('/weight-goal', data);
  },

  getWeightGoal: () => {
    return apiClient.get('/weight-goal');
  },
};

// Scanner API for food recognition
export const scannerApi = {
  recognizeFood: (imageUri: string) => {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'food-image.jpg',
    } as any);
    return apiClient.post('/scanner/recognize-food', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  scanBarcode: (barcode: string) => {
    return apiClient.post('/scanner/scan-barcode', { barcode });
  },
};

// ROADMAP 4.0 IG2.2 / IG5.2 — Co-purchase pair suggestions.
export interface IngredientPair {
  ingredient: string;
  coCount: number;
  lastSeenAt: string;
}
export const ingredientPairsApi = {
  /** GET /api/ingredients/pairs?with=<anchor>&k=<n> */
  getPairs: (anchor: string, k = 5) =>
    apiClient.get<{ pairs: IngredientPair[] }>('/ingredients/pairs', {
      params: { with: anchor, k },
    }),
};

// ROADMAP 4.0 IG6.1 — Ingredient event API (swap learning loop).
export const ingredientEventApi = {
  /** Record a swap-tap. Backend writes both swappedOut + swappedIn rows. */
  recordSwap: (input: {
    originalName: string;
    swapTargetName: string;
    recipeId?: string;
  }) =>
    apiClient.post<{ persisted: number }>('/ingredient-events/swap', input),
};
