import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Interfaces for this file
interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

// Create axios instance with default configuration
const api: AxiosInstance = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api',
  timeout: 60000, // 60s timeout - allows for sequential meal generation with retries
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and other headers
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add auth token if available
    const token = getAuthToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request in development
    if (__DEV__) {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
    }

    return config;
  },
  (error) => {
    if (__DEV__) {
      console.error('❌ Request Error:', error);
    }
    return Promise.reject(error);
  }
);

// Response interceptor for handling global responses and errors
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    if (__DEV__) {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }

    // If the response follows our ApiResponse structure, return the data directly
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      // If there's a 'data' property, unwrap it. Otherwise, keep the original response.data
      if ('data' in response.data) {
        return {
          ...response,
          data: response.data.data,
          message: response.data.message
        };
      }
      // For responses like { success: true, recipe: {...} }, keep as-is
      return response;
    }

    return response;
  },
  (error) => {
    if (__DEV__) {
      // Don't surface noisy errors for benign conflicts (already saved) or expected 404s
      const statusCode = error.response?.status;
      const raw = error.response?.data;
      const rawMessage: string | undefined = raw?.message || raw?.error || raw?.msg;
      const isAlreadySaved = statusCode === 409 || /already\s*saved/i.test(String(rawMessage || ''));
      const isExpected404 = statusCode === 404 && (
        /no price data found/i.test(String(rawMessage || '')) ||
        /meal plan not found/i.test(String(rawMessage || '')) ||
        /No active meal plan/i.test(String(rawMessage || ''))
      );
      
      if (!isAlreadySaved && !isExpected404) {
        console.error('❌ Response Error:', raw || error.message);
      } else if (isAlreadySaved) {
        console.log('ℹ️  Response Conflict (already saved)');
      } else if (isExpected404) {
        // Silently handle expected 404s (no price data, no meal plan, etc.)
      }
    }

    // Handle different error types
    const apiError: ApiError = {
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    };

    if (error.response) {
      // Server responded with error status
      const serverError = error.response.data;
      const statusCode = error.response.status;

      // Normalize common patterns
      const rawMessage: string | undefined = serverError?.message || serverError?.error || serverError?.msg;
      const normalizedMessage = rawMessage ? String(rawMessage) : getErrorMessage(statusCode);

      apiError.message = normalizedMessage;
      apiError.code = serverError?.code || `HTTP_${statusCode}`;
      apiError.details = serverError?.details;

      // Special-case: recipe already saved (some backends return 400 with message only)
      if (statusCode === 409) {
        // Map common 409 cases to friendly messages
        if (/already\s*saved/i.test(normalizedMessage)) {
          apiError.message = 'Recipe already saved';
        } else if (/collection.*exists/i.test(normalizedMessage)) {
          apiError.message = 'Collection already exists';
        }
        apiError.code = 'HTTP_409';
      }
      
      // Special-case: quota/billing errors (429 or message contains quota info)
      const isQuotaError = statusCode === 429 || 
                          serverError?.code === 'insufficient_quota' ||
                          /quota|billing|429.*exceeded/i.test(normalizedMessage);
      
      if (isQuotaError) {
        apiError.code = 'insufficient_quota';
        apiError.message = 'API quota exceeded. Please try again later.';
      }
    } else if (error.request) {
      // Request was made but no response received
      apiError.message = 'Unable to connect to server. Please check your internet connection.';
      apiError.code = 'NETWORK_ERROR';
    } else {
      // Something else happened
      apiError.message = error.message;
      apiError.code = 'CLIENT_ERROR';
    }

    return Promise.reject(apiError);
  }
);

// Helper function to get auth token (to be implemented based on your auth system)
function getAuthToken(): string | null {
  // TODO: Implement based on your auth storage (AsyncStorage, SecureStore, etc.)
  // Example: return await AsyncStorage.getItem('auth_token');
  return null;
}

// Helper function to get user-friendly error messages based on HTTP status
function getErrorMessage(status: number): string {
  const errorMessages: { [key: number]: string } = {
    400: 'Invalid request. Please check your input.',
    401: 'Please log in to continue.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: 'This resource already exists.',
    422: 'Validation failed. Please check your input.',
    429: 'Too many requests. Please try again later.',
    500: 'Server error. Please try again later.',
    502: 'Bad gateway. Please try again later.',
    503: 'Service unavailable. Please try again later.',
  };

  return errorMessages[status] || 'An unexpected error occurred.';
}

// API methods with proper typing
export const apiClient = {
  // GET request
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return api.get<T>(url, config);
  },

  // POST request
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return api.post<T>(url, data, config);
  },

  // PUT request
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return api.put<T>(url, data, config);
  },

  // PATCH request
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return api.patch<T>(url, data, config);
  },

  // DELETE request
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return api.delete<T>(url, config);
  },

  // Upload file
  upload: <T = any>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return api.post<T>(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      },
    });
  },
};

// Specific API methods for Sazon Chef
export const recipeApi = {
  // Recipe operations
  getRecipes: (params?: { cuisine?: string; maxCookTime?: number; page?: number; pageSize?: number }) => {
    return apiClient.get('/recipes', { params });
  },

  getRecipe: (id: string) => {
    return apiClient.get(`/recipes/${id}`);
  },

  getSuggestedRecipes: (filters?: {
    cuisines?: string[];
    dietaryRestrictions?: string[];
    maxCookTime?: number;
    difficulty?: string[];
    offset?: number;
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
    
    return apiClient.get('/recipes/suggested', { params });
  },

  getRandomRecipe: () => {
    return apiClient.get('/recipes/random');
  },

  getSavedRecipes: () => {
    return apiClient.get('/recipes/saved');
  },

  getLikedRecipes: () => {
    return apiClient.get('/recipes/liked');
  },

  getDislikedRecipes: () => {
    return apiClient.get('/recipes/disliked');
  },

  likeRecipe: (id: string) => {
    return apiClient.post(`/recipes/${id}/like`);
  },

  dislikeRecipe: (id: string) => {
    return apiClient.post(`/recipes/${id}/dislike`);
  },

  saveRecipe: (id: string, data?: { collectionIds?: string[] }) => {
    return apiClient.post(`/recipes/${id}/save`, data);
  },

  unsaveRecipe: (id: string) => {
    return apiClient.delete(`/recipes/${id}/save`);
  },

  // Recipe scoring
  getRecipeScore: (id: string) => {
    return apiClient.get(`/recipes/${id}/score`);
  },

  // Recipe CRUD operations
  createRecipe: (data: any) => {
    return apiClient.post('/recipes', data);
  },

  updateRecipe: (id: string, data: any) => {
    return apiClient.put(`/recipes/${id}`, data);
  },

  deleteRecipe: (id: string) => {
    return apiClient.delete(`/recipes/${id}`);
  },

  healthifyRecipe: (id: string) => {
    return apiClient.post(`/recipes/${id}/healthify`);
  }
};
// Collections API
export const collectionsApi = {
  list: () => apiClient.get('/recipes/collections'),
  create: (name: string) => apiClient.post('/recipes/collections', { name }),
  update: (id: string, name: string) => apiClient.put(`/recipes/collections/${id}`, { name }),
  remove: (id: string) => apiClient.delete(`/recipes/collections/${id}`),
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

// Daily Suggestions API
export const dailySuggestionsApi = {
  // Get daily meal suggestions
  getDailySuggestions: () => {
    return apiClient.get('/daily-suggestions');
  },

  // Get meal-specific suggestions
  getMealSuggestions: (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    return apiClient.get(`/daily-suggestions/meal/${mealType}`);
  },

  getUserRecipes: () => {
    return apiClient.get('/recipes/my-recipes');
  },
};


export const userApi = {
  // User preferences
  getPreferences: () => {
    return apiClient.get('/user/preferences');
  },

  updatePreferences: (preferences: any) => {
    return apiClient.put('/user/preferences', preferences);
  },

  // Macro goals
  getMacroGoals: () => {
    return apiClient.get('/user/macro-goals');
  },

  updateMacroGoals: (goals: any) => {
    return apiClient.put('/user/macro-goals', goals);
  },

  // User profile
  getProfile: () => {
    return apiClient.get('/user/profile');
  },

  updateProfile: (profile: any) => {
    return apiClient.put('/user/profile', profile);
  },

  // Notifications
  getNotifications: () => {
    return apiClient.get('/user/notifications');
  },

  updateNotifications: (notifications: any) => {
    return apiClient.put('/user/notifications', notifications);
  },

  // Physical profile
  getPhysicalProfile: () => {
    return apiClient.get('/user/physical-profile');
  },

  updatePhysicalProfile: (profile: any) => {
    return apiClient.put('/user/physical-profile', profile);
  },

  // Macro calculations
  getCalculatedMacros: () => {
    return apiClient.get('/user/calculate-macros');
  },

  applyCalculatedMacros: () => {
    return apiClient.post('/user/apply-calculated-macros');
  },
};

export const mealPlanApi = {
  // Meal planning
  getDailySuggestion: () => {
    return apiClient.get('/meal-plan/daily');
  },

  getWeeklyPlan: () => {
    return apiClient.get('/meal-plan/weekly');
  },

  generateMealPlan: (preferences: any) => {
    return apiClient.post('/meal-plan/generate', preferences);
  },

  getMealHistory: (params?: { startDate?: string; endDate?: string }) => {
    return apiClient.get('/meal-plan/history', { params });
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

// Export the raw axios instance for advanced use cases
export { api };

// Export types for use in other files
// Ingredient Availability API
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

  createShoppingList: (data?: { name?: string }) => {
    return apiClient.post('/shopping-lists', data);
  },

  updateShoppingList: (id: string, data: { name?: string; isActive?: boolean }) => {
    return apiClient.put(`/shopping-lists/${id}`, data);
  },

  deleteShoppingList: (id: string) => {
    return apiClient.delete(`/shopping-lists/${id}`);
  },

  addItem: (listId: string, data: { name: string; quantity?: string; category?: string; isCompleted?: boolean }) => {
    return apiClient.post(`/shopping-lists/${listId}/items`, data);
  },

  updateItem: (listId: string, itemId: string, data: { name?: string; quantity?: string; category?: string; isCompleted?: boolean }) => {
    return apiClient.put(`/shopping-lists/${listId}/items/${itemId}`, data);
  },

  deleteItem: (listId: string, itemId: string) => {
    return apiClient.delete(`/shopping-lists/${listId}/items/${itemId}`);
  },

  generateFromRecipes: (recipeIds: string[]) => {
    return apiClient.post('/shopping-lists/generate-from-recipes', { recipeIds });
  },

  generateFromMealPlan: (data: { startDate?: string; endDate?: string; recipeIds?: string[] }) => {
    return apiClient.post('/shopping-lists/generate-from-meal-plan', data);
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

export type { ApiResponse, ApiError };