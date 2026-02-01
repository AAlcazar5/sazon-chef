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
// Android emulator uses 10.0.2.2 to access host localhost
const getBaseURL = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  // Default to 10.0.2.2 for Android emulator, localhost for iOS
  try {
    const { Platform } = require('react-native');
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3001/api';
    }
  } catch (e) {
    // Fallback if Platform is not available
  }

  return 'http://localhost:3001/api';
};

const api: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: 60000, // 60s timeout - allows for sequential meal generation with retries
  headers: {
    'Content-Type': 'application/json',
  },
});

// Cache for privacy settings to avoid reading from storage on every request
let cachedPrivacySettings: { userId: string; settings: any } | null = null;

// Request interceptor to add auth token and other headers
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Add auth token if available
    const token = getAuthToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add privacy settings to headers if available (use cached settings to avoid storage reads)
    // This is done asynchronously but with a short timeout to prevent blocking
    try {
      // Only read from storage if we don't have cached settings
      if (!cachedPrivacySettings) {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const SecureStore = require('expo-secure-store');
        const USER_KEY = 'auth_user';

        // Wrap in a timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Storage timeout')), 1000)
        );

        const readStorage = async () => {
          const storedUser = await SecureStore.getItemAsync(USER_KEY);
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            const userId = userData?.id;

            if (userId) {
              const savedSettings = await AsyncStorage.getItem(`privacy_settings_${userId}`);
              if (savedSettings) {
                cachedPrivacySettings = { userId, settings: JSON.parse(savedSettings) };
              }
            }
          }
        };

        await Promise.race([readStorage(), timeoutPromise]).catch(() => {
          // Timeout or error - continue without privacy settings
        });
      }

      // Apply cached settings if available
      if (cachedPrivacySettings?.settings) {
        const settings = cachedPrivacySettings.settings;
        config.headers = config.headers || {};
        config.headers['x-data-sharing-enabled'] = settings.dataSharingEnabled ? 'true' : 'false';
        config.headers['x-analytics-enabled'] = settings.analyticsEnabled ? 'true' : 'false';
        config.headers['x-location-services-enabled'] = settings.locationServicesEnabled ? 'true' : 'false';
      }
    } catch (error) {
      // Silently fail - privacy settings are optional
      if (__DEV__) {
        console.log('Could not load privacy settings for request:', error);
      }
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
      const rawMessage: string | undefined = raw?.error || raw?.message || raw?.msg;
      const isAlreadySaved = statusCode === 409 || /already\s*saved/i.test(String(rawMessage || ''));
      const isExpected404 = statusCode === 404 && (
        /no price data found/i.test(String(rawMessage || '')) ||
        /meal plan not found/i.test(String(rawMessage || '')) ||
        /No active meal plan/i.test(String(rawMessage || '')) ||
        /template not found/i.test(String(rawMessage || '')) ||
        /no meal prep template exists/i.test(String(rawMessage || '')) ||
        /item not found/i.test(String(rawMessage || '')) || // Shopping list items that were deleted
        /shopping list.*not found/i.test(String(rawMessage || ''))
      );
      const isQuotaError = statusCode === 429 ||
        statusCode === 503 ||
        /quota.*exceeded/i.test(String(rawMessage || '')) ||
        /too many requests/i.test(String(rawMessage || '')) ||
        /insufficient_quota/i.test(String(rawMessage || '')) ||
        /API quota exceeded/i.test(String(rawMessage || ''));

      // Don't log expected user errors (bad credentials, validation errors, not found)
      const isExpectedUserError = statusCode === 400 || statusCode === 401 || statusCode === 404;

      if (!isAlreadySaved && !isExpected404 && !isQuotaError && !isExpectedUserError) {
        console.error('❌ Response Error:', raw || error.message);
      } else if (isAlreadySaved) {
        console.log('ℹ️  Response Conflict (already saved)');
      } else if (isExpected404) {
        // Silently handle expected 404s (no price data, no meal plan, etc.)
      } else if (isQuotaError) {
        // Silently handle quota/rate limit errors - these are expected when API limits are reached
        // The UI will handle these gracefully by showing fallback content
      } else if (isExpectedUserError) {
        // Silently handle expected user errors (wrong credentials, validation errors)
        // These are displayed to the user via the UI, no need to log them
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

      // Normalize common patterns - prioritize 'error' field as primary message
      // Backend auth returns: { success: false, error: '...' }
      // Rate limiter returns: { error: '...', message: '...' }
      // Some APIs return: { error: '...' } or { message: '...' }
      const rawMessage: string | undefined = serverError?.error || serverError?.message || serverError?.msg;
      const normalizedMessage = rawMessage ? String(rawMessage) : getErrorMessage(statusCode);

      // Initialize error with normalized message (may be overridden by specific handlers below)
      apiError.message = normalizedMessage;
      apiError.code = serverError?.code || `HTTP_${statusCode}`;
      apiError.details = serverError?.details;

      // Special-case: Authentication errors (401/403) - automatically logout
      // BUT: Don't auto-logout on login/register endpoints - those 401s mean bad credentials
      const isAuthEndpoint = error.config?.url?.includes('/auth/login') ||
                            error.config?.url?.includes('/auth/register') ||
                            error.config?.url?.includes('/auth/forgot-password') ||
                            error.config?.url?.includes('/auth/reset-password');

      if (statusCode === 401 || statusCode === 403) {
        apiError.code = statusCode === 401 ? 'HTTP_401' : 'HTTP_403';

        // For auth endpoints, use specific error messages (don't mention session expiry)
        if (isAuthEndpoint && statusCode === 401) {
          apiError.message = normalizedMessage || 'Invalid credentials. Please check your email and password.';
        } else {
          apiError.message = statusCode === 401
            ? 'Your session has expired. Please log in again.'
            : 'You do not have permission to perform this action.';
        }

        // Automatically logout on authentication errors (but NOT on auth endpoints)
        if (logoutCallback && !isAuthEndpoint) {
          // Call logout asynchronously to avoid blocking error handling
          // The AuthContext state change will trigger navigation in _layout.tsx
          const doLogout = logoutCallback;
          setTimeout(async () => {
            try {
              await doLogout();
            } catch (error) {
              console.error('Error during automatic logout:', error);
            }
          }, 0);
        }
      }

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
      // BUT: Only apply this to AI-related endpoints, not shopping list or auth endpoints
      const isAIEndpoint = error.config?.url?.includes('/ai-recipes') ||
                          (error.config?.url?.includes('/recipes') && (error.config?.method === 'post' || error.config?.method === 'put'));
      const isShoppingListEndpoint = error.config?.url?.includes('/shopping-lists');
      const isAuthEndpointGeneral = error.config?.url?.includes('/auth/');
      
      // Check if it's a true AI quota error (not just a generic 429 or rate limit)
      const isTrueAIQuotaError = serverError?.code === 'insufficient_quota' ||
                                (statusCode === 429 && isAIEndpoint) ||
                                (/AI.*quota|OpenAI.*quota|Claude.*quota|anthropic.*quota/i.test(normalizedMessage));
      
      // Generic rate limit or quota-like errors (could be from any service)
      const isGenericRateLimit = statusCode === 429 && !isTrueAIQuotaError;
      const isGenericQuotaMessage = /quota|billing|rate.*limit/i.test(normalizedMessage) && !isTrueAIQuotaError;
      
      if (isTrueAIQuotaError && isAIEndpoint && !isShoppingListEndpoint && !isAuthEndpointGeneral) {
        console.warn(`[API_CLIENT] Quota error detected on AI endpoint: ${error.config?.url}`);
        apiError.code = 'insufficient_quota';
        apiError.message = 'API quota exceeded. Please try again later.';
      } else if (isAuthEndpointGeneral && (isGenericRateLimit || isGenericQuotaMessage)) {
        // Auth endpoints have legitimate rate limiting for security - pass through original message
        // The rate limiter returns: { error: '...', message: '...' }
        const authRateLimitMessage = serverError?.error || serverError?.message || normalizedMessage || 'Too many login attempts. Please try again after 15 minutes.';
        apiError.code = serverError?.code || `HTTP_${statusCode}`;
        apiError.message = authRateLimitMessage;
      } else if (isShoppingListEndpoint && (isGenericRateLimit || isGenericQuotaMessage)) {
        // Shopping list endpoints might hit generic rate limits (database, API gateway, etc.)
        // This is not necessarily a bug - just pass through as a regular error
        apiError.code = serverError?.code || `HTTP_${statusCode}`;
        apiError.message = normalizedMessage || 'Rate limit exceeded. Please try again later.';
      } else if (isTrueAIQuotaError) {
        // For other endpoints with true AI quota errors, apply quota error handling
        apiError.code = 'insufficient_quota';
        apiError.message = 'API quota exceeded. Please try again later.';
      } else if (isGenericRateLimit && !isAuthEndpointGeneral) {
        // Generic rate limit (not AI-specific, not auth)
        apiError.code = 'rate_limit';
        apiError.message = 'Rate limit exceeded. Please try again later.';
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

// Helper function to get auth token from SecureStore
// This is called synchronously in the interceptor, so we need to handle it carefully
// For now, we'll use a module-level variable that gets updated by AuthContext
let currentAuthToken: string | null = null;
let logoutCallback: (() => Promise<void>) | null = null;

export function setAuthToken(token: string | null) {
  currentAuthToken = token;
  // Clear cached privacy settings when token changes (login/logout)
  if (!token) {
    cachedPrivacySettings = null;
  }
}

export function setLogoutCallback(callback: (() => Promise<void>) | null) {
  logoutCallback = callback;
}

function getAuthToken(): string | null {
  return currentAuthToken;
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

  getSimilarRecipes: (id: string, limit?: number, mealPrepMode?: boolean) => {
    return apiClient.get(`/recipes/${id}/similar`, {
      params: { 
        limit: limit || 5,
        mealPrepMode: mealPrepMode !== undefined ? mealPrepMode : undefined,
      },
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
  create: (data: string | { name: string; coverImageUrl?: string }) => {
    const body = typeof data === 'string' ? { name: data } : data;
    return apiClient.post('/recipes/collections', body);
  },
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

// Meal Prep API
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


export const authApi = {
  changePassword: (currentPassword: string, newPassword: string) => {
    return apiClient.put('/auth/password', { currentPassword, newPassword });
  },

  deleteAccount: () => {
    return apiClient.delete('/auth/account');
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

  // Superfood preferences
  getPreferredSuperfoods: () => {
    return apiClient.get('/user/superfoods');
  },

  addPreferredSuperfood: (category: string) => {
    return apiClient.post('/user/superfoods', { category });
  },

  removePreferredSuperfood: (category: string) => {
    return apiClient.delete(`/user/superfoods/${category}`);
  },

  updatePreferredSuperfoods: (categories: string[]) => {
    return apiClient.put('/user/superfoods', { categories });
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

  getWeeklyPlan: (params?: { startDate?: string; endDate?: string }) => {
    return apiClient.get('/meal-plan/weekly', { params });
  },

  generateMealPlan: (preferences: any) => {
    return apiClient.post('/meal-plan/generate', preferences);
  },

  getMealHistory: (params?: { startDate?: string; endDate?: string }) => {
    return apiClient.get('/meal-plan/history', { params });
  },

  addRecipeToMeal: (data: { mealPlanId?: string; recipeId: string; date: string; mealType: string }) => {
    return apiClient.post('/meal-plan/add-recipe', data);
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

  getWeeklyNutritionSummary: (params?: { startDate?: string; endDate?: string }) => {
    return apiClient.get('/meal-plan/weekly-nutrition', { params });
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

  createShoppingList: (data?: { name?: string; items?: Array<{ name: string; quantity?: string; category?: string; notes?: string }> }) => {
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

  updateItem: (listId: string, itemId: string, data: { name?: string; quantity?: string; category?: string; purchased?: boolean; isCompleted?: boolean }) => {
    // Map isCompleted to purchased for backward compatibility
    const mappedData = { ...data };
    if (mappedData.isCompleted !== undefined) {
      mappedData.purchased = mappedData.isCompleted;
      delete mappedData.isCompleted;
    }
    return apiClient.put(`/shopping-lists/${listId}/items/${itemId}`, mappedData);
  },

  batchUpdateItems: (listId: string, updates: Array<{ itemId: string; purchased?: boolean; name?: string; quantity?: string; category?: string | null; notes?: string | null }>) => {
    return apiClient.put(`/shopping-lists/${listId}/items/batch`, { updates });
  },

  deleteItem: (listId: string, itemId: string) => {
    return apiClient.delete(`/shopping-lists/${listId}/items/${itemId}`);
  },

  generateFromRecipes: (recipeIds: string[], name?: string) => {
    return apiClient.post('/shopping-lists/generate-from-recipes', { recipeIds, name });
  },

  generateFromMealPlan: (data: { startDate?: string; endDate?: string; recipeIds?: string[]; name?: string }) => {
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

export type { ApiResponse, ApiError };