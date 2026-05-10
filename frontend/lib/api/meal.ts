// P9 — extracted from lib/api.ts (mealPrep + dailySuggestions + mealPlan)
import { apiClient } from './core';

export const mealPrepApi = {
  // Create a meal prep portion entry
  createMealPrepPortion: (data: {
    recipeId: string;
    totalServings: number;
    servingsToFreeze: number;
    servingsForWeek: number;
    prepDate?: string;
    notes?: string;
  }) => {
    return apiClient.post('/meal-prep/portions', data);
  },

  // Get all meal prep portions
  getMealPrepPortions: (includeConsumed?: boolean) => {
    return apiClient.get('/meal-prep/portions', {
      params: { includeConsumed: includeConsumed !== false },
    });
  },

  // Get a specific meal prep portion
  getMealPrepPortion: (id: string) => {
    return apiClient.get(`/meal-prep/portions/${id}`);
  },

  // Record consumption of a meal prep portion
  consumeMealPrepPortion: (id: string, data: {
    servings: number;
    portionType: 'frozen' | 'fresh';
    consumedDate?: string;
    notes?: string;
  }) => {
    return apiClient.post(`/meal-prep/portions/${id}/consume`, data);
  },

  // Get meal prep statistics
  getMealPrepStats: () => {
    return apiClient.get('/meal-prep/stats');
  },

  // Meal prep session management
  createMealPrepSession: (data: {
    scheduledDate: string;
    scheduledTime?: string;
    duration?: number;
    notes?: string;
    recipeIds?: string[];
  }) => {
    return apiClient.post('/meal-prep/sessions', data);
  },

  getMealPrepSessions: (params?: {
    startDate?: string;
    endDate?: string;
  }) => {
    return apiClient.get('/meal-prep/sessions', { params });
  },

  updateMealPrepSession: (id: string, data: {
    scheduledDate?: string;
    scheduledTime?: string;
    duration?: number;
    notes?: string;
    isCompleted?: boolean;
  }) => {
    return apiClient.put(`/meal-prep/sessions/${id}`, data);
  },

  deleteMealPrepSession: (id: string) => {
    return apiClient.delete(`/meal-prep/sessions/${id}`);
  },

  // Get cost analysis for meal prep
  getMealPrepCostAnalysis: (recipeId: string, totalServings?: number) => {
    return apiClient.get('/meal-prep/cost-analysis', {
      params: { recipeId, totalServings },
    });
  },

  // Thawing reminders
  getThawingReminders: (daysAhead?: number) => {
    return apiClient.get('/meal-prep/thawing-reminders', {
      params: { daysAhead: daysAhead || 1 },
    });
  },

  scheduleThawingReminder: (data: {
    mealPrepPortionId: string;
    reminderDate: string;
    reminderTime?: string;
  }) => {
    return apiClient.post('/meal-prep/thawing-reminders', data);
  },

  // Meal prep templates
  createOrUpdateTemplate: (data: {
    recipeId: string;
    defaultServings: number;
    defaultServingsToFreeze?: number;
    defaultServingsForWeek?: number;
    name?: string;
    notes?: string;
    isFavorite?: boolean;
  }) => {
    return apiClient.post('/meal-prep/templates', data);
  },

  getTemplates: (favoriteOnly?: boolean) => {
    return apiClient.get('/meal-prep/templates', {
      params: { favoriteOnly: favoriteOnly ? 'true' : undefined },
    });
  },

  getTemplateByRecipe: (recipeId: string) => {
    return apiClient.get(`/meal-prep/templates/recipe/${recipeId}`);
  },

  deleteTemplate: (id: string) => {
    return apiClient.delete(`/meal-prep/templates/${id}`);
  },

  useTemplate: (id: string, data?: {
    overrideServings?: number;
    overrideServingsToFreeze?: number;
    overrideServingsForWeek?: number;
    prepDate?: string;
    notes?: string;
  }) => {
    return apiClient.post(`/meal-prep/templates/${id}/use`, data);
  },
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


export const mealPlanApi = {
  // Meal planning
  getDailySuggestion: () => {
    return apiClient.get('/meal-plan/daily');
  },

  getWeeklyPlan: (params?: { startDate?: string; endDate?: string }) => {
    return apiClient.get('/meal-plan/weekly', { params });
  },

  getWeeklyBudget: () => {
    return apiClient.get<{
      weekStart: string;
      weekEnd: string;
      daysRemaining: number;
      targets: {
        dailyCalories: number;
        dailyProtein: number;
        weeklyCalories: number;
        weeklyProtein: number;
      } | null;
      consumed: { calories: number; protein: number } | null;
      remaining: { calories: number; protein: number } | null;
      adjusted: {
        todayCalories: number;
        todayProtein: number;
        deltaCalories: number;
        deltaProtein: number;
      } | null;
    }>('/meal-plan/weekly-budget');
  },

  generateMealPlan: (params: {
    days?: number;
    startDate?: string;
    mealsPerDay?: string[];
    maxTotalPrepTime?: number;
    maxDailyBudget?: number;
    planningMode?: 'cut' | 'maintain' | 'build';
  }) => {
    return apiClient.post('/meal-plan/generate', params);
  },

  regenerateDay: (params: {
    mealPlanId: string;
    date: string;
    mealsPerDay?: string[];
  }) => {
    return apiClient.post('/meal-plan/regenerate-day', params);
  },

  getVarietyScore: (mealPlanId: string) => {
    return apiClient.get<{
      success: boolean;
      varietyScore: {
        score: number;
        isBoringWeek: boolean;
        uniqueProteins: number;
        uniqueCuisines: number;
        consecutiveProteinRepeats: number;
        consecutiveCuisineRepeats: number;
        repeatedMealTitles: number;
      };
      repetitiveMealIds: string[];
      nudgeMessage: string | null;
    }>(`/meal-plan/${mealPlanId}/variety-score`);
  },

  getCookedRecipeIds: () => {
    return apiClient.get('/meal-plan/cooked-recipe-ids');
  },

  getMealHistory: (params?: { startDate?: string; endDate?: string }) => {
    return apiClient.get('/meal-plan/history', { params });
  },

  addRecipeToMeal: (data: { mealPlanId?: string; recipeId: string; date: string; mealType: string }) => {
    return apiClient.post('/meal-plan/add-recipe', data);
  },

  quickLogMeal: (data: { name: string; mealType: string; calories: number; protein?: number; carbs?: number; fat?: number; notes?: string }) => {
    return apiClient.post('/meal-plan/quick-log', data);
  },

  // Meal enhancement methods
  updateMealCompletion: (mealId: string, isCompleted: boolean) => {
    return apiClient.put(`/meal-plan/meals/${mealId}/complete`, { isCompleted });
  },

  updateMealNotes: (mealId: string, notes: string) => {
    return apiClient.put(`/meal-plan/meals/${mealId}/notes`, { notes });
  },

  getMealSwapSuggestions: (mealId: string) => {
    return apiClient.get(`/meal-plan/meals/${mealId}/swap-suggestions`);
  },

  submitTasteFeedback: (mealId: string, data: { tasteRating: number; flavorTags: string[] }) => {
    return apiClient.post(`/meal-plan/meals/${mealId}/taste-feedback`, data);
  },

  getWeeklyNutritionSummary: (params?: { startDate?: string; endDate?: string }) => {
    return apiClient.get('/meal-plan/weekly-nutrition', { params });
  },

  // Templates
  getTemplates: () => {
    return apiClient.get('/meal-plan/templates');
  },

  createTemplate: (data: { name: string; description?: string; goal?: string; mealPlanId: string }) => {
    return apiClient.post('/meal-plan/templates', data);
  },

  applyTemplate: (templateId: string, data: { startDate: string }) => {
    return apiClient.post(`/meal-plan/templates/${templateId}/apply`, data);
  },

  deleteTemplate: (templateId: string) => {
    return apiClient.delete(`/meal-plan/templates/${templateId}`);
  },

  // Duplicate meals
  duplicateMeals: (data: {
    mode: 'week' | 'day' | 'meal';
    targetStartDate: string;
    sourceDate?: string;
    targetDate?: string;
    sourceMealId?: string;
    targetDates?: string[];
    targetMealType?: string;
  }) => {
    return apiClient.post('/meal-plan/duplicate', data);
  },

  // Recurring meals
  getRecurringMeals: () => {
    return apiClient.get('/meal-plan/recurring');
  },
  createRecurringMeal: (data: { mealType: string; daysOfWeek: string; recipeId?: string; title?: string; calories?: number; protein?: number; carbs?: number; fat?: number }) => {
    return apiClient.post('/meal-plan/recurring', data);
  },
  updateRecurringMeal: (id: string, data: any) => {
    return apiClient.put(`/meal-plan/recurring/${id}`, data);
  },
  deleteRecurringMeal: (id: string) => {
    return apiClient.delete(`/meal-plan/recurring/${id}`);
  },
  applyRecurringMeals: (weekStartDate: string) => {
    return apiClient.post('/meal-plan/recurring/apply', { weekStartDate });
  },

  findRecipes: (params: {
    count: number;
    cuisines?: string[];
    cuisineFamilies?: string[];
    calories?: { min?: number; max?: number };
    protein?: { min?: number };
    fat?: { max?: number };
    carbs?: { min?: number; max?: number };
    fiber?: { min?: number };
    mealType?: string;
    maxCookTime?: number;
    difficulty?: string;
    dietaryRestrictions?: string[];
  }) => {
    return apiClient.post('/meal-plan/find-recipes', params);
  },
};

