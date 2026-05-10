import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { Alert } from 'react-native';

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
  /** Machine-readable failure class — set on network/transport failures so
   *  callers can branch on "offline" vs "timeout" vs "server unreachable". */
  failureClass?: NetworkFailureClass;
  /** Original axios error code (ECONNABORTED, ERR_NETWORK, …) preserved for
   *  Sentry / log breadcrumbs even after the message is humanized. */
  axiosCode?: string;
  /** Endpoint URL — for diagnostics / Sentry correlation. */
  url?: string;
  /** HTTP method — for diagnostics. */
  method?: string;
}

export type NetworkFailureClass =
  | 'offline'           // No network connectivity (or DNS unreachable)
  | 'timeout'           // Server didn't respond within axios.timeout
  | 'server_unreachable'// Server actively refused (ECONNREFUSED) or TLS failure
  | 'canceled'          // AbortController.abort() — silent expected cancel
  | 'unknown_transport';// `error.request` present but code didn't match above

/**
 * Pure classifier — given an axios error's `code` / `message` / `name`,
 * returns the failure class, machine-readable code, and human-readable
 * message. Extracted from the response interceptor so it's directly
 * unit-testable without spinning up axios.
 */
export function classifyNetworkFailure(args: {
  axiosCode?: string;
  message?: string;
  name?: string;
}): { failureClass: NetworkFailureClass; code: string; message: string } {
  const { axiosCode, message, name } = args;
  if (axiosCode === 'ECONNABORTED' || axiosCode === 'ETIMEDOUT' || /timeout/i.test(message ?? '')) {
    return {
      failureClass: 'timeout',
      code: 'TIMEOUT',
      message: "The server is taking longer than expected. Give it a moment and try again.",
    };
  }
  if (axiosCode === 'ERR_CANCELED' || name === 'CanceledError') {
    return { failureClass: 'canceled', code: 'CANCELED', message: 'Request canceled.' };
  }
  if (axiosCode === 'ECONNREFUSED' || axiosCode === 'EHOSTUNREACH' || axiosCode === 'ECONNRESET') {
    return {
      failureClass: 'server_unreachable',
      code: 'SERVER_UNREACHABLE',
      message: "We can't reach the kitchen right now. We're on it — try again in a moment.",
    };
  }
  if (axiosCode === 'ERR_NETWORK' || axiosCode === 'ENETUNREACH' || axiosCode === 'ENOTFOUND') {
    return {
      failureClass: 'offline',
      code: 'OFFLINE',
      message: "You're offline. Reconnect and we'll pick up where you left off.",
    };
  }
  return {
    failureClass: 'unknown_transport',
    code: 'NETWORK_ERROR',
    message: 'Unable to reach the server. Please try again.',
  };
}

// Create axios instance with default configuration
// Android emulator uses 10.0.2.2 to access host localhost
export const getBaseURL = () => {
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
    // Silently pass through aborted/cancelled requests — no logging needed
    const isCancelled = error?.code === 'ERR_CANCELED' ||
      error?.name === 'AbortError' ||
      error?.name === 'CanceledError' ||
      error?.message === 'canceled' ||
      error?.message === 'cancelled';
    if (isCancelled) {
      const apiError: ApiError = { message: 'cancelled', code: 'CLIENT_ERROR' };
      return Promise.reject(apiError);
    }

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

      // AI generation failures bubble up as 500/GENERATION_ERROR — they're handled by
      // the calling screen with a user-friendly retry dialog, so suppress the raw log.
      const isAIGenerationError = (raw?.code === 'GENERATION_ERROR') ||
        /failed to generate (recipe|daily meal plan)/i.test(String(rawMessage || ''));

      // Don't log expected user errors (bad credentials, validation, not found).
      // 401/403 are intentionally NOT silenced — they trigger the auto-logout
      // path and we always want the offending URL visible in the console.
      const isExpectedUserError = statusCode === 400 || statusCode === 404;

      // Network errors (no response received) are handled gracefully below — no need to log
      const isNetworkError = !error.response && !!error.request;

      if (!isAlreadySaved && !isExpected404 && !isQuotaError && !isExpectedUserError && !isNetworkError && !isAIGenerationError) {
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

      // Bootstrap-time verify call (AuthContext.loadStoredAuth) handles its
      // own 401 — opt-out of the auto-logout Alert so we don't double-fire
      // logout while the user is mid-relogin.
      const skipAuthAutoLogout = (error.config as any)?._skipAuthAutoLogout === true;

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

        // Automatically logout on authentication errors (but NOT on auth
        // endpoints, NOT on the bootstrap verify call).
        if (logoutCallback && !isAuthEndpoint && !skipAuthAutoLogout) {
          // Log which URL forced the auto-logout — invaluable for debugging
          // "session expired despite logging back in" loops.
          console.warn(
            `⚠️  Auto-logout triggered by ${statusCode} on ${error.config?.method?.toUpperCase()} ${error.config?.url}`
          );
          // Dedupe the alert — concurrent 401s otherwise stack alerts.
          if (!sessionExpiredAlertActive) {
            sessionExpiredAlertActive = true;
            const doLogout = logoutCallback;
            Alert.alert(
              'Session Expired',
              'Your session has expired. Please log in again.',
              [{
                text: 'OK',
                onPress: () => {
                  sessionExpiredAlertActive = false;
                  doLogout().catch(() => {
                    // Logout errors are non-fatal — navigation will still redirect to login
                  });
                },
              }],
              { cancelable: false, onDismiss: () => { sessionExpiredAlertActive = false; } }
            );
          }
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
      // Request was made but no response received. Pure-function classifier
      // — see `classifyNetworkFailure` above + tests in
      // __tests__/lib/apiErrorClassifier.test.ts.
      const axiosCode: string | undefined = (error as { code?: string }).code;
      const classified = classifyNetworkFailure({
        axiosCode,
        message: error.message,
        name: error.name,
      });
      apiError.message = classified.message;
      apiError.code = classified.code;
      apiError.failureClass = classified.failureClass;
      apiError.axiosCode = axiosCode;
      apiError.url = error.config?.url ?? '<unknown>';
      apiError.method = (error.config?.method ?? 'GET').toUpperCase();

      // Structured log for Sentry / pinpointing — never for cancels
      // (those are expected when components unmount mid-flight).
      if (classified.failureClass !== 'canceled' && __DEV__) {
        console.warn(
          `🌐 Network failure (${classified.failureClass}) on ${apiError.method} ${apiError.url}` +
          (axiosCode ? ` [${axiosCode}]` : ''),
        );
      }
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
// Module-level guard: ensures only ONE "Session Expired" alert is visible
// at any time. Concurrent 401s (e.g., 3 background cleanup POSTs all firing
// at app boot before auth) otherwise stack 3 alerts on top of each other,
// each waiting for an OK tap before the next dismisses.
let sessionExpiredAlertActive = false;

export function setAuthToken(token: string | null) {
  currentAuthToken = token;
  // Clear cached privacy settings when token changes (login/logout)
  if (!token) {
    cachedPrivacySettings = null;
  }
  // A new login resets the alert guard so a future legitimate session-expired
  // event can fire its alert.
  if (token) {
    sessionExpiredAlertActive = false;
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

  // B2: deleteAccount moved to userApi.deleteAccount (calls /user/account
  // which requires { confirm: 'DELETE' }). The unguarded /auth/account
  // route is being removed.
  deleteAccount: () => {
    return apiClient.delete('/user/account', { data: { confirm: 'DELETE' } });
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

  // Phase 6 (10Y-C): Pro-gated coach prefs (e.g. weeklyCheckinOptIn).
  // Distinct from updatePreferences which targets the legacy taste profile.
  updateMyPreferences: (patch: { weeklyCheckinOptIn?: boolean }) => {
    return apiClient.patch('/user/preferences/weekly-checkin', patch);
  },

  // ROADMAP 4.0 i18n-OPS4.1: locale override (en, es, es-MX/AR/CO/ES/419, pt, pt-BR/PT).
  updateLocale: (locale: string) => {
    return apiClient.patch('/user/locale', { locale });
  },

  // ROADMAP 4.0 G1.2: bilingual coach-voice override. null clears the override
  // (coach voice falls back to User.locale).
  updateCoachLocale: (coachLocale: string | null) => {
    return apiClient.patch('/user/coach-locale', { coachLocale });
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

  // Profile picture
  uploadProfilePicture: (imageUri: string) => {
    const formData = new FormData();
    formData.append('profilePicture', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile-picture.jpg',
    } as any);
    return apiClient.upload('/user/profile-picture', formData);
  },

  deleteProfilePicture: () => {
    return apiClient.delete('/user/profile-picture');
  },

  // Profile presets
  getPresets: () => apiClient.get('/user/presets'),

  createPreset: (data: { name: string; description?: string }) => {
    return apiClient.post('/user/presets', data);
  },

  updatePreset: (id: string, data: { name?: string; description?: string }) => {
    return apiClient.put(`/user/presets/${id}`, data);
  },

  deletePreset: (id: string) => {
    return apiClient.delete(`/user/presets/${id}`);
  },

  applyPreset: (id: string) => {
    return apiClient.post(`/user/presets/${id}/apply`);
  },

  // Group 10I: Cooking Journey
  getCookingStats: () => {
    return apiClient.get<{
      recipesCookedThisMonth: number;
      recipesCookedAllTime: number;
      cuisinesExplored: string[];
      cuisinesExploredThisMonth: string[];
      averageDifficulty: number;
      averageDifficultyLabel: 'easy' | 'medium' | 'hard' | null;
      difficultyTrend: 'leveling_up' | 'steady' | 'leveling_down' | 'insufficient_data';
      longestStreakDays: number;
      currentStreakDays: number;
      firstCookedCuisines: Array<{ cuisine: string; firstCookedAt: string }>;
    }>('/user/cooking-stats');
  },

  getSkillProgress: () => {
    return apiClient.get<{
      currentLevel: 'beginner' | 'home_cook' | 'confident' | 'chef';
      effectiveLevel: 'beginner' | 'home_cook' | 'confident' | 'chef';
      readyToLevelUp: boolean;
      nextLevel: 'beginner' | 'home_cook' | 'confident' | 'chef' | null;
      reason: string;
      easyRecipesCookedWithGoodRating: number;
      mediumRecipesCooked: number;
    }>('/user/skill-progress');
  },

  acceptSkillLevelUp: (newLevel: string) => {
    return apiClient.post<{ cookingSkillLevel: string }>('/user/skill-progress/accept', { newLevel });
  },

  seedCookingJourney: (data: { seededCuisines?: string[]; cookingSkillLevel?: string }) => {
    return apiClient.put<{ seededCuisines: string[]; cookingSkillLevel: string | null }>(
      '/user/cooking-journey/seed',
      data,
    );
  },

  // Group 10S: Kitchen IQ progress
  getKitchenIQProgress: () => {
    return apiClient.get<{
      totalCards: number;
      unlockedCount: number;
      unlockedIds: string[];
      newUnlocks: string[];
    }>('/user/kitchen-iq/progress');
  },

  // Group 10R-Phase2: Affinity snapshot (top ingredients × nutrient gaps × goal × recent ingredients)
  getAffinitySnapshot: () => {
    return apiClient.get<{
      topAffinityIngredients: string[];
      rolling7dNutrientGaps: string[];
      goalPhase: 'cut' | 'maintain' | 'bulk' | 'recomp';
      last7DaysIngredients: string[];
    }>('/user/affinity/snapshot');
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

// Search 2.0 API
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
  getActiveList: (): Promise<{ data: import('../types').ShoppingList }> => {
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

  archiveList: (id: string): Promise<{ data: import('../types').ShoppingList }> => {
    return apiClient.post(`/shopping-lists/${id}/archive`);
  },

  restoreList: (id: string): Promise<{ data: import('../types').ShoppingList }> => {
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

// ROADMAP 4.0 N12 — Activation cliff surface (Day-3 / Day-7).
export interface ActivationStarterRecipe {
  id: string;
  title: string;
  cuisine: string | null;
  cookTime: number | null;
  imageUrl: string | null;
}
export interface ActivationSurface {
  phase: 'day-3' | 'day-7';
  daysSinceSignup: number;
  recipes: ActivationStarterRecipe[];
  onboardingCuisines: string[];
  headline: string;
  body: string;
}
// ROADMAP 4.0 I2.4 — reverse-discovery payload shape.
export interface ReverseDiscoveryCandidatePayload {
  canonical: string;
  locale: string;
  localName: string;
  availabilityTier: 'common' | 'specialty' | 'rare';
  notes: string | null;
}
export interface ReverseDiscoveryCopyPayload {
  eyebrow: string;
  headline: string;
  body: string;
  cta: string;
}
export interface ReverseDiscoveryResponse {
  candidate: ReverseDiscoveryCandidatePayload | null;
  copy: ReverseDiscoveryCopyPayload | null;
}

export const todayApi = {
  activation: () =>
    apiClient.get<{ surface: ActivationSurface | null }>('/today/activation'),
  // ROADMAP 4.0 N2.2 — coverage tier for first-7-days surface coordination.
  coverage: () =>
    apiClient.get<{
      tier: 'cold' | 'mid' | 'high';
      recentCookCount: number;
      lifetimeCookCount: number;
      daysSinceSignup: number;
    }>('/today/coverage'),
  // ROADMAP 4.0 I2.4 — "your market has X" reverse-discovery surface.
  // Returns { candidate: null, copy: null } for en/en-US users (no value
  // to add) and unsupported locales — surface auto-hides client-side.
  reverseDiscovery: () =>
    apiClient.get<ReverseDiscoveryResponse>('/today/reverse-discovery'),
};

// ROADMAP 4.0 IG8.2 — "Try this ingredient" weekly cultural discovery.
export interface DiscoverySuggestion {
  ingredient: string;
  cuisine: string;
  primerTitle: string | null;
  primerBody: string | null;
  recipeId: string | null;
  recipeTitle: string | null;
}

export const ingredientDiscoveryApi = {
  weekly: () =>
    apiClient.get<{ suggestion: DiscoverySuggestion | null }>(
      '/ingredient-discovery/weekly',
    ),
};

// ROADMAP 4.0 IG10.1 — Pantry IQ editorial card.
export interface PantryIQResponse {
  iq: {
    topCuisine: { cuisine: string; cookCount: number; perWeek: number } | null;
    mostUsed: { ingredientName: string; cookCount: number } | null;
    underused: { ingredientName: string; daysSinceLastUse: number } | null;
    totalCooksInWindow: number;
  } | null;
}

export const pantryIQApi = {
  get: () => apiClient.get<PantryIQResponse>('/pantry-iq'),
};

// Pantry API
export const pantryApi = {
  getAll: () => apiClient.get('/pantry'),
  addItem: (data: { name: string; category?: string }) => apiClient.post('/pantry', data),
  addMany: (items: Array<{ name: string; category?: string }>) => apiClient.post('/pantry/bulk', { items }),
  removeItem: (id: string) => apiClient.delete(`/pantry/${id}`),
  removeByName: (name: string) => apiClient.delete(`/pantry/by-name/${encodeURIComponent(name)}`),
  consume: (ingredients: string[]) => apiClient.post<{ consumed: string[]; unmatched: string[] }>('/pantry/consume', { ingredients }),
  // ROADMAP 4.0 IG4.3 — soon-to-expire pantry items for the use-it-up surface.
  getExpiring: (withinDays: number = 3) =>
    apiClient.get<{
      items: Array<{
        id: string;
        name: string;
        category: string | null;
        quantity: number | null;
        unit: string | null;
        daysUntilExpiry: number;
        expiresAt: string;
        expirySource: 'column' | 'fallback';
        prompt: string;
      }>;
    }>('/pantry/expiring', { params: { withinDays } }),
  // 10H: "What can I make right now?" pantry-based recipe matching
  pantryMatch: (params?: { minMatch?: number; maxMissing?: number; limit?: number }) =>
    apiClient.get<{
      recipes: Array<{
        id: string;
        title: string;
        description: string;
        cuisine: string;
        cookTime: number;
        imageUrl: string | null;
        calories: number;
        protein: number;
        matchPercentage: number;
        missingIngredients: string[];
        canSubstitute: boolean;
      }>;
      pantrySize: number;
    }>('/recipes/pantry-match', { params }),
  leftoverIdeas: (ingredients: string[], options?: { excludeCuisine?: string; excludeRecipeId?: string; limit?: number }) =>
    apiClient.post<{
      recipes: Array<{
        id: string;
        title: string;
        description: string;
        cuisine: string;
        cookTime: number;
        imageUrl: string | null;
        calories: number;
        protein: number;
        reuseCount: number;
      }>;
    }>('/recipes/leftover-ideas', { ingredients, ...options }),
};

// ─── Push Notifications (Group 6) ────────────────────────────────────────────

export const notificationsApi = {
  registerToken: (token: string, platform: string) =>
    apiClient.post('/notifications/register-token', { token, platform }),
  unregisterToken: (token: string) =>
    apiClient.delete('/notifications/unregister-token', { data: { token } }),
};

// ─── ROADMAP 4.0 Tier B3 — Surface event sink ────────────────────────────────

export type SurfaceName =
  | 'today_hero'
  | 'week_swap'
  | 'kitchen_discover'
  | 'sazon_tool'
  | 'smart_collection'
  | 'cravings_made_real'
  | 'new_to_you'
  | 'browse_by_family'
  | 'surprise_me_roulette'
  | 'other';

export type SurfaceAction = 'impression' | 'tap' | 'cook' | 'rate';

export interface SurfaceEventInput {
  surface: SurfaceName;
  action: SurfaceAction;
  recipeId?: string | null;
  variant?: string | null;
}

export const surfaceEventApi = {
  /** Best-effort fire-and-forget. Errors silently ignored — telemetry never blocks UX. */
  record: (event: SurfaceEventInput) =>
    apiClient.post('/telemetry/surface-events', event).catch(() => {}),
  recordBatch: (events: SurfaceEventInput[]) =>
    apiClient.post('/telemetry/surface-events', { events }).catch(() => {}),
};

// ROADMAP 4.0 IA2.8 — Sazon sheet open telemetry.
export type SazonOpenSource =
  | 'fab_tap'
  | 'fab_long_press'
  | 'history_link'
  | 'tab'
  | 'deep_link'
  | 'recipe_detail_pill'
  | 'other';

export interface SazonOpenEvent {
  source: SazonOpenSource;
  contextSeed?: string;
  locale?: string;
  extra?: Record<string, unknown>;
}

export const sazonTelemetryApi = {
  /** Best-effort fire-and-forget. Telemetry never blocks UX. */
  recordOpen: (event: SazonOpenEvent) =>
    apiClient.post('/telemetry/sazon-open', event).catch(() => {}),
};

// ─── ROADMAP 4.0 Tier C7 — Daily check-in ──────────────────────────────────

export interface DailyCheckInUpsertInput {
  date: string;
  nutritionSnapshot?: unknown;
  reflectionText?: string;
  hungerNow?: number;
  energyAtLastMeal?: number;
  satietyFromYesterday?: number;
}

export const dailyCheckInApi = {
  upsert: (input: DailyCheckInUpsertInput) => apiClient.post('/daily-check-in', input),
  list: (limit: number = 7) => apiClient.get(`/daily-check-in?limit=${limit}`),
};

// ─── ROADMAP 4.0 Tier C9 — Weekly recap card ───────────────────────────────

export interface WeeklyRecapPayload {
  userId: string;
  weekStart: string;
  weekEnd: string;
  cookCount: number;
  cuisineCount: number;
  topCuisine: { cuisine: string; count: number } | null;
  topIngredient: { name: string; count: number } | null;
  topNutrient: { name: string; total: number; target: number; percentOfTarget: number } | null;
  discovery: string | null;
}

export const weeklyRecapApi = {
  fetchThisWeek: () => apiClient.get<WeeklyRecapPayload>('/recap/this-week'),
};

// ─── ROADMAP 4.0 Tier C10 — Cultural primer ──────────────────────────────────

export interface CulturalPrimerPayload {
  shouldShow: boolean;
  primer: {
    title: string;
    body: string;
    nutritionalAngle: string;
  } | null;
}

export const culturalPrimerApi = {
  check: (cuisine: string) =>
    apiClient.get<CulturalPrimerPayload>(
      `/cultural-primer/check?cuisine=${encodeURIComponent(cuisine)}`
    ),
};

// ─── Drink pairing (F8) ──────────────────────────────────────────────────────

export interface DrinkPairingPayload {
  /** 2 or 3 lifestyle-voiced pairing suggestions in display order. */
  suggestions: string[];
}

export const drinkPairingApi = {
  get: (cuisine: string) =>
    apiClient.get<DrinkPairingPayload>(
      `/drink-pairing?cuisine=${encodeURIComponent(cuisine)}`,
    ),
};

// ─── Cohort social proof (F9) ────────────────────────────────────────────────

export interface CohortSocialProofPayload {
  proof: {
    cuisine: string;
    uniqueUsers: number;
    copy: string;
  } | null;
}

export const cohortSocialProofApi = {
  get: () => apiClient.get<CohortSocialProofPayload>('/cohort-social-proof'),
};

// ─── First-cook-of-cuisine stats (J2) ────────────────────────────────────────

export interface FirstCookStatsPayload {
  isFirstCook: boolean;
  cuisinesCookedCount: number;
  totalCuisinesAvailable: number;
}

export const firstCookStatsApi = {
  get: (cuisine: string) =>
    apiClient.get<FirstCookStatsPayload>(
      `/first-cook-stats?cuisine=${encodeURIComponent(cuisine)}`,
    ),
};

// ─── Cook-complete signals (J14 + J16) ───────────────────────────────────────

export type CookCompleteIntensity = 'big' | 'medium' | 'quiet';

export interface CookCompleteSignalsPayload {
  intensity: CookCompleteIntensity;
  recapInsight: string | null;
}

export interface CookCompleteSignalsQuery {
  cuisine?: string;
  recipeId?: string;
  rating?: number;
}

export const cookCompleteSignalsApi = {
  get: (q: CookCompleteSignalsQuery) => {
    const params = new URLSearchParams();
    if (q.cuisine) params.set('cuisine', q.cuisine);
    if (q.recipeId) params.set('recipeId', q.recipeId);
    if (typeof q.rating === 'number') params.set('rating', String(q.rating));
    const qs = params.toString();
    return apiClient.get<CookCompleteSignalsPayload>(
      `/cook-complete-signals${qs ? `?${qs}` : ''}`,
    );
  },
};

// ─── Discovery milestones (J5) ───────────────────────────────────────────────

export interface MarkMilestonePayload {
  newlyAchieved: boolean;
  alreadyAchieved: boolean;
}

export interface MilestonesListPayload {
  achieved: string[];
}

export const discoveryMilestonesApi = {
  mark: (key: string) =>
    apiClient.post<MarkMilestonePayload>('/discovery-milestones', { key }),
  list: () => apiClient.get<MilestonesListPayload>('/discovery-milestones'),
};

// ─── Cooking history stats (J11) ─────────────────────────────────────────────

export interface MostRecentCookPayload {
  mostRecent: {
    cookedAt: string;
    recipe: { id: string; title: string; cuisine: string | null };
  } | null;
}

export const cookingHistoryStatsApi = {
  mostRecent: () =>
    apiClient.get<MostRecentCookPayload>('/cooking-logs/most-recent'),
};

// ─── Stripe / Subscriptions (Group 7) ────────────────────────────────────────

export const stripeApi = {
  getSubscription: () => apiClient.get('/stripe/subscription'),
  createCheckout: (interval: 'month' | 'year') =>
    apiClient.post('/stripe/checkout', { interval }),
  createPortal: () => apiClient.post('/stripe/portal'),
  cancelSubscription: (payload: {
    reason: 'too_expensive' | 'not_using' | 'missing_feature' | 'other';
    feedback?: string;
    action: 'cancel' | 'pause';
  }) => apiClient.post('/stripe/cancel', payload),
};

// 10L: Branded Food & Restaurant Tracking
export const foodApi = {
  search: (query: string) =>
    apiClient.get(`/food/search?q=${encodeURIComponent(query)}`),
  getRecent: () => apiClient.get('/food/recent'),
  getFrequent: () => apiClient.get('/food/frequent'),
  logFood: (data: {
    foodItemId: string;
    mealType: string;
    servings?: number;
    date?: string;
  }) => apiClient.post('/food/log', data),
  createItem: (data: {
    name: string;
    brand?: string;
    category?: string;
    servingSize?: string;
    calories: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
  }) => apiClient.post('/food/items', data),
};

// ─── Build-a-Plate (Group 10X Phase 1) ───────────────────────────────────────

export type MealComponentSlot = 'protein' | 'base' | 'vegetable' | 'sauce' | 'garnish';
export type CookMethodHint = 'roast' | 'pan_sear' | 'simmer' | 'raw' | 'mix' | 'grill' | 'bake';

export interface MealComponent {
  id: string;
  slot: MealComponentSlot;
  name: string;
  description?: string;
  defaultPortionGrams: number;
  caloriesPerPortion: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  estimatedCostPerPortion?: number;
  cuisineTags: string[];
  dietaryTags: string[];
  cookMethodHint: CookMethodHint;
  pantryIngredientNames: string[];
  imageUrl?: string;
  pantryCoveragePercent: number;
}

export interface ComposedPlatePayload {
  components: { slot: string; componentId: string; portionMultiplier: number }[];
  name?: string;
  saveAsRecipe: boolean;
}

export interface ComposedPlateResponse {
  id: string;
  name?: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  pantryCoveragePercent: number;
  recipeId?: string;
}

export interface PermutationCandidate {
  id: string;
  components: {
    slot: MealComponentSlot;
    component: MealComponent;
    portionMultiplier: number;
  }[];
  coherenceScore: number;
  pantryCoveragePercent: number;
  macroFitScore: number | null;
}

export interface PermutationsBody {
  lockedSlots: { slot: MealComponentSlot; componentId: string }[];
  slotsToFill: MealComponentSlot[];
  maxResults: number;
  prioritizePantry: boolean;
}

export type SkillTier = 'beginner' | 'cook' | 'chef';

export interface SkillTierResponse {
  tier: SkillTier;
  visibleSlots: MealComponentSlot[];
}

export interface ComponentVariantResponse {
  id: string;
  variantKey: string;
  label: string;
  compatibilityScore: number;
  caloriesDeltaPerPortion?: number;
  cookTimeMinutes?: number;
}

export interface AutoFitTarget {
  calories: number;
  protein: number;
}

export interface AutoFitLockedSlot {
  slot: MealComponentSlot;
  componentId: string;
  portionMultiplier: number;
}

export interface AutoFitBody {
  target: AutoFitTarget;
  lockedSlots: AutoFitLockedSlot[];
  slotsToFill: MealComponentSlot[];
}

export interface AutoFitFilledSlot {
  slot: MealComponentSlot;
  component: MealComponent;
  portionMultiplier: number;
}

export interface AutoFitResult {
  achievable: boolean;
  filled: AutoFitFilledSlot[];
  totals?: { calories: number; protein: number; carbs: number; fat: number };
  gap?: { calories: number; protein: number };
}

// "Keep under" — upper-bound caps on any subset of macros (cal/p/c/f/fiber).
// At least one cap must be specified; the solver returns the highest-quality
// plate whose totals stay under every cap.
export interface KeepUnderCaps {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}

export interface KeepUnderBody {
  caps: KeepUnderCaps;
  lockedSlots: AutoFitLockedSlot[];
  slotsToFill: MealComponentSlot[];
}

export interface KeepUnderFilledSlot {
  slot: MealComponentSlot;
  component: MealComponent;
  portionMultiplier: number;
}

export interface KeepUnderResult {
  achievable: boolean;
  filled: KeepUnderFilledSlot[];
  totals: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
  /** Per-macro overage (positive numbers). Only present when achievable=false. */
  exceeded?: Partial<Record<keyof KeepUnderCaps, number>>;
}

export const mealComponentApi = {
  list: (params?: { slot?: MealComponentSlot; dietary?: string; cuisine?: string; q?: string }) =>
    apiClient.get<{ components: MealComponent[] }>('/meal-components', { params }),
  permutations: (body: PermutationsBody) =>
    apiClient.post<{ permutations: PermutationCandidate[] }>('/meal-components/permutations', body),
  plateFromPantry: () =>
    apiClient.get<{ plate: PermutationCandidate | null }>('/meal-components/plate-from-pantry'),
  affinity: (params: { slot: MealComponentSlot; limit?: number }) =>
    apiClient.get<{ slot: string; favorites: { componentId: string; score: number }[] }>('/meal-components/affinity', { params }),
  swapAway: (componentId: string) =>
    apiClient.post<{ ok: true }>(`/meal-components/${componentId}/swap-away`, {}),
  skillTier: () =>
    apiClient.get<SkillTierResponse>('/meal-components/skill-tier'),
  variants: (componentId: string) =>
    apiClient.get<{ variants: ComponentVariantResponse[] }>(`/meal-components/${componentId}/variants`),
};

export interface LeftoverInventoryItem {
  id: string;
  componentId: string;
  slot: MealComponentSlot;
  name: string;
  portionsRemaining: number;
  expiresAt?: string;
}

export const leftoverInventoryApi = {
  list: (params?: { slot?: MealComponentSlot }) =>
    apiClient.get<{ leftovers: LeftoverInventoryItem[] }>('/leftover-inventory', { params }),
};

export type TrackedNutrient = 'fiberG' | 'omega3G' | 'vitaminDIu' | 'ironMg' | 'magnesiumMg';

export interface NutrientGapResponse {
  topGap: TrackedNutrient | null;
  pctRemainingByNutrient: Record<TrackedNutrient, number>;
  targets: Record<TrackedNutrient, number>;
}

export const nutrientGapApi = {
  fetchTopGap: () =>
    apiClient.get<NutrientGapResponse>('/nutrient-gap/top'),
};

// ─── ROADMAP 4.0 D14 — Nutrition discovery ──────────────────────────────────

export interface RecipeNutritionAggregate {
  recipeId: string;
  servings: number;
  ingredientCoverage: number;
  invalidated: boolean;
  computedAt: string;
  [nutrient: string]: number | string | boolean | null;
}

export interface DailyNutritionSnapshot {
  userId: string;
  date: string;
  mealCount: number;
  computedAt: string;
  [nutrient: string]: number | string | null;
}

export const nutritionApi = {
  fetchRecipe: (recipeId: string) =>
    apiClient.get<{ aggregate: RecipeNutritionAggregate }>(`/nutrition/recipe/${recipeId}`),
  fetchDaily: (date?: string) =>
    apiClient.get<{ snapshot: DailyNutritionSnapshot }>(
      '/nutrition/daily',
      { params: date ? { date } : undefined },
    ),
};

// ─── ROADMAP 4.0 F1 — Friends feed ──────────────────────────────────────────

export interface FriendsFeedItem {
  plateId: string;
  ownerId: string;
  ownerName: string | null;
  plateName: string | null;
  shareSlug: string | null;
  score: {
    pantryCoverage: number;
    dietaryCompatibility: number;
    slotAffinityOverlap: number;
    composite: number;
  };
  createdAt: string;
}

export interface FollowSummary {
  userId: string;
  followingCount: number;
  followerCount: number;
}

export const followsApi = {
  follow: (userId: string) => apiClient.post(`/follows/${userId}`),
  unfollow: (userId: string) => apiClient.delete(`/follows/${userId}`),
  status: (userId: string) =>
    apiClient.get<{ following: boolean }>(`/follows/${userId}/status`),
  summary: () => apiClient.get<{ summary: FollowSummary }>('/follows/summary'),
  feed: () => apiClient.get<{ items: FriendsFeedItem[] }>('/follows/feed'),
};

export interface ComposedPlateSaveResponse {
  plate: ComposedPlateResponse;
  recipe?: { id: string };
}

export interface TimelineEvent {
  componentId: string;
  name: string;
  action: 'start' | 'finish' | 'plate';
  atMinuteFromStart: number;
  equipmentUsed: string[];
}

export interface ParallelTimeline {
  totalMinutes: number;
  events: TimelineEvent[];
  equipmentConflicts: {
    equipment: string;
    overlappingComponentIds: [string, string];
  }[];
}

// ─── Plate-of-the-week & variations & utterance composer (Phase 7+8) ────────

export interface PlateOfTheWeek {
  id: string;
  title: string;
  imageUrl?: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  region?: string;
  saveCount?: number;
  /** Personalization rationale (only present when viewer is authenticated). */
  reason?: string;
}

export interface PlateVariation {
  id: string;
  title: string;
  swappedSlot: MealComponentSlot;
  swappedFrom: string;
  swappedTo: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface UtteranceComposeResponse {
  plate: { id: string };
}

export const composedPlateApi = {
  save: (payload: ComposedPlatePayload) =>
    apiClient.post<ComposedPlateSaveResponse>('/composed-plates', payload),

  timeline: (plateId: string) =>
    apiClient.post<{ timeline: ParallelTimeline }>(`/composed-plates/${plateId}/timeline`, {}),

  autoFit: (body: AutoFitBody) =>
    apiClient.post<{ result: AutoFitResult }>('/composed-plates/auto-fit', body),

  keepUnder: (body: KeepUnderBody) =>
    apiClient.post<{ result: KeepUnderResult }>('/composed-plates/keep-under', body),

  fetchOfTheWeek: () =>
    apiClient.get<{ plate: PlateOfTheWeek | null }>('/composed-plates/of-the-week'),

  fetchVariations: (plateId: string) =>
    apiClient.get<{ variations: PlateVariation[] }>(`/composed-plates/${plateId}/variations`),

  composeFromUtterance: (utterance: string) =>
    apiClient.post<UtteranceComposeResponse>('/composed-plates/from-utterance', { utterance }),

  weeklySummary: () =>
    apiClient.get<{ totalPlatesThisWeek: number; greenVegCount: number }>(
      '/composed-plates/weekly-summary',
    ),

  family: (body: FamilyMealBody) =>
    apiClient.post<{ familyMeal: FamilyMealResponse; persisted?: PersistedFamilyMeal }>(
      '/composed-plates/family',
      body,
    ),

  diverge: (body: DivergeBody) =>
    apiClient.post<{ plates: FamilyPlatePayload[] }>(
      '/composed-plates/diverge',
      body,
    ),
};

// ─── Family meal types ──────────────────────────────────────────────────────

export interface FamilyPlateComponentPayload {
  slot: MealComponentSlot;
  componentId: string;
  portionMultiplier: number;
}

export interface FamilyPlatePayload {
  plateId: string;
  components: FamilyPlateComponentPayload[];
}

export interface FamilyMealBody {
  plates: Array<FamilyPlatePayload & { householdMemberId?: string }>;
  name?: string;
  persist?: boolean;
}

export interface MergedCookStep {
  componentId: string;
  totalPortions: number;
  servesPlateIds: string[];
  slot: MealComponentSlot;
}

export interface FamilyMealResponse {
  userId: string;
  plates: FamilyPlatePayload[];
  cookSteps: MergedCookStep[];
}

export interface PersistedFamilyMeal {
  id: string;
  userId: string;
  name: string | null;
  cookSteps: MergedCookStep[];
  plateIds: string[];
}

export interface DivergeBody {
  sharedSlots: { slot: MealComponentSlot; componentId: string }[];
  perPlateDivergentSlots: {
    plateId: string;
    slots: { slot: MealComponentSlot; componentId: string }[];
  }[];
}

// ─── Household roster (Group 10X Phase 7) ───────────────────────────────────

export type AgeBand = 'toddler' | 'kid' | 'teen' | 'adult' | 'elder';

export interface HouseholdMember {
  id: string;
  userId: string;
  displayName: string;
  ageBand: AgeBand;
  pickinessLevel: number;
  dietaryFlags: string[];
  bannedComponentIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface HouseholdMemberInput {
  displayName: string;
  ageBand: AgeBand;
  pickinessLevel?: number;
  dietaryFlags?: string[];
  bannedComponentIds?: string[];
}

export const householdApi = {
  list: () =>
    apiClient.get<{ members: HouseholdMember[] }>('/household'),
  create: (body: HouseholdMemberInput) =>
    apiClient.post<{ member: HouseholdMember }>('/household', body),
  update: (id: string, body: Partial<HouseholdMemberInput>) =>
    apiClient.patch<{ member: HouseholdMember }>(
      `/household/${encodeURIComponent(id)}`,
      body,
    ),
  remove: (id: string) =>
    apiClient.delete<void>(`/household/${encodeURIComponent(id)}`),
};

// ─── Shared Plates (Group 10X Phase 8 — deep link routing) ───────────────────

export interface SharedPlatePayload {
  id: string;
  slug: string;
  plate: {
    id: string;
    userId?: string;
    componentIds?: string;
    [key: string]: unknown;
  } | null;
  author?: {
    id: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export interface SharedPlateResponse {
  share: SharedPlatePayload;
}

export const sharedPlatesApi = {
  fetchBySlug: (slug: string) =>
    apiClient.get<SharedPlateResponse>(`/shared-plates/${encodeURIComponent(slug)}`),
  fetchSubCount: (slug: string) =>
    apiClient.get<{ subsCount: number }>(
      `/shared-plates/${encodeURIComponent(slug)}/sub-count`,
    ),
};

// ─── Sazon (Group 10Y) ───────────────────────────────────────────────────────

export type CoachTier = 'free' | 'premium';
export type CoachMessageRole = 'user' | 'assistant';

export interface CoachConversation {
  id: string;
  title: string;
  tier: CoachTier;
  createdAt: string;
  lastMessageAt: string;
}

export interface CoachMessage {
  id: string;
  role: CoachMessageRole;
  content: string;
  createdAt: string;
  attachments?: string;
}

export interface CoachToolUseEvent {
  type: 'tool_use';
  name: string;
  toolUseId: string;
  input: unknown;
}

export interface CoachToolResultEvent {
  type: 'tool_result';
  toolUseId: string;
  result: unknown;
}

export interface CoachTextEvent {
  type: 'text';
  text: string;
}

export interface CoachDoneEvent {
  type: 'done';
}

export interface CoachCostNoticeEvent {
  type: 'cost_notice';
  message: string;
}

export interface CoachMedicalDeflectionEvent {
  type: 'medical_deflection';
  reason: string;
}

export type CoachStreamEvent =
  | CoachTextEvent
  | CoachToolUseEvent
  | CoachToolResultEvent
  | CoachCostNoticeEvent
  | CoachMedicalDeflectionEvent
  | CoachDoneEvent;

export type CoachAttachmentMediaType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp';

export interface CoachAttachment {
  type: 'image_base64';
  mediaType: CoachAttachmentMediaType;
  data: string;
}

export interface CoachIdentifiedIngredient {
  name: string;
  confidence: number;
}

export interface CoachExtractPantryResponse {
  ingredients: CoachIdentifiedIngredient[];
}

export interface CoachConversationDetail extends CoachConversation {
  messages: CoachMessage[];
}

export interface CoachPaywallInfo {
  headline: string;
  cta: string;
}

export class CoachStreamError extends Error {
  code: string;
  paywall?: CoachPaywallInfo;
  feature?: string;
  status?: number;
  constructor(
    message: string,
    code: string,
    options?: { paywall?: CoachPaywallInfo; status?: number; feature?: string },
  ) {
    super(message);
    this.name = 'CoachStreamError';
    this.code = code;
    this.paywall = options?.paywall;
    this.status = options?.status;
    this.feature = options?.feature;
  }
}

interface CoachStreamRawError {
  error?: string;
  feature?: string;
  paywall?: CoachPaywallInfo;
}

// SSE stream → async iterator of typed events. Uses `expo/fetch` (not RN's
// built-in `fetch`) because RN's fetch returns `response.body = null`,
// which prevents reading streamed SSE chunks. `expo/fetch` exposes a real
// ReadableStream on iOS + Android. Throws CoachStreamError on 4xx / network
// failure.
//
// We intentionally only import `expo/fetch` lazily inside the function so
// jest unit tests (which mock `lib/api`) don't have to mock the import.
async function* streamCoachMessage(params: {
  conversationId: string;
  message: string;
  signal?: AbortSignal;
  attachments?: CoachAttachment[];
}): AsyncIterableIterator<CoachStreamEvent> {
  const url = `${getBaseURL()}/coach/message`;
  const token = getAuthToken();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { fetch: streamingFetch } = require('expo/fetch') as typeof import('expo/fetch');
  const response = await streamingFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      conversationId: params.conversationId,
      message: params.message,
      ...(params.attachments && params.attachments.length > 0
        ? { attachments: params.attachments }
        : {}),
    }),
    // expo/fetch supports AbortSignal via the same options shape.
    ...(params.signal ? { signal: params.signal } : {}),
  });

  if (response.status === 400) {
    let parsed: CoachStreamRawError = {};
    try {
      parsed = (await response.json()) as CoachStreamRawError;
    } catch {
      // ignore
    }
    throw new CoachStreamError(
      parsed.error ?? 'INVALID_ATTACHMENTS',
      parsed.error ?? 'INVALID_ATTACHMENTS',
      { status: 400 },
    );
  }

  if (response.status === 402) {
    let parsed: CoachStreamRawError = {};
    try {
      parsed = (await response.json()) as CoachStreamRawError;
    } catch {
      // ignore — keep empty parsed object
    }
    throw new CoachStreamError(
      parsed.error ?? 'COACH_DAILY_CAP',
      'COACH_DAILY_CAP',
      { paywall: parsed.paywall, status: 402 },
    );
  }

  if (response.status === 403) {
    let parsed: CoachStreamRawError = {};
    try {
      parsed = (await response.json()) as CoachStreamRawError;
    } catch {
      // ignore — keep empty parsed object
    }
    throw new CoachStreamError(
      parsed.error ?? 'PRO_FEATURE',
      'PRO_FEATURE',
      { paywall: parsed.paywall, status: 403, feature: parsed.feature },
    );
  }

  if (!response.ok || !response.body) {
    throw new CoachStreamError(
      `Coach stream failed: ${response.status}`,
      'COACH_STREAM_ERROR',
      { status: response.status },
    );
  }

  const reader = (response.body as unknown as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by blank lines.
      let sepIdx = buffer.indexOf('\n\n');
      while (sepIdx !== -1) {
        const rawEvent = buffer.slice(0, sepIdx);
        buffer = buffer.slice(sepIdx + 2);
        const parsed = parseSseEvent(rawEvent);
        if (parsed.event === 'done') {
          yield { type: 'done' };
          return;
        }
        if (parsed.data === undefined) {
          sepIdx = buffer.indexOf('\n\n');
          continue;
        }
        if (parsed.event === 'tool_use') {
          try {
            const payload = JSON.parse(parsed.data) as { name: string; toolUseId: string; input: unknown };
            yield { type: 'tool_use', name: payload.name, toolUseId: payload.toolUseId, input: payload.input };
          } catch {
            // ignore malformed event
          }
        } else if (parsed.event === 'cost_notice') {
          try {
            const payload = JSON.parse(parsed.data) as { message: string };
            yield { type: 'cost_notice', message: payload.message };
          } catch {
            // ignore malformed event
          }
        } else if (parsed.event === 'tool_result') {
          try {
            const payload = JSON.parse(parsed.data) as { toolUseId: string; result: unknown };
            yield { type: 'tool_result', toolUseId: payload.toolUseId, result: payload.result };
          } catch {
            // ignore malformed event
          }
        } else if (parsed.event === 'medical_deflection') {
          try {
            const payload = JSON.parse(parsed.data) as { reason?: string };
            yield { type: 'medical_deflection', reason: payload.reason ?? 'medical_claim' };
          } catch {
            // ignore malformed event
          }
        } else {
          yield { type: 'text', text: parsed.data };
        }
        sepIdx = buffer.indexOf('\n\n');
      }
    }
  } finally {
    try { reader.releaseLock(); } catch { /* ignore */ }
  }
}

function parseSseEvent(raw: string): { event?: string; data?: string } {
  const lines = raw.split('\n');
  let event: string | undefined;
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''));
    }
  }
  return { event, data: dataLines.length ? dataLines.join('\n') : undefined };
}

export type CoachMemoryKind =
  | 'preference'
  | 'goal'
  | 'constraint'
  | 'milestone';

export interface CoachMemory {
  id: string;
  userId: string;
  kind: CoachMemoryKind;
  content: string;
  confidence: number;
  sourceConversationId: string | null;
  sourceMessageId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CoachApi {
  listConversations: () => Promise<CoachConversation[]>;
  getConversation: (id: string) => Promise<CoachConversationDetail>;
  createConversation: (firstMessage: string) => Promise<CoachConversation>;
  streamMessage: (params: {
    conversationId: string;
    message: string;
    signal?: AbortSignal;
    attachments?: CoachAttachment[];
  }) => AsyncIterableIterator<CoachStreamEvent>;
  getCoachContext: () => Promise<CoachContextResponse>;
  extractPantryFromImage: (params: {
    imageBase64: string;
    mediaType: CoachAttachmentMediaType;
  }) => Promise<CoachExtractPantryResponse>;
  listMemories: () => Promise<CoachMemory[]>;
  updateMemory: (
    id: string,
    patch: { content?: string; confidence?: number },
  ) => Promise<CoachMemory>;
  deleteMemory: (id: string) => Promise<void>;
  exportConversation: (id: string) => Promise<string>;
}

export interface CoachContextResponse {
  // Tier S S5: ingredient names (resolved server-side from componentId), used
  // for chip copy like "I have leftover spinach — bridge it forward".
  pantryExpiringSoon: string[];
  leftoverInventory: Array<{
    id: string;
    componentId: string;
    slot: string;
    portionsRemaining: number;
    expiresAt: string;
    name?: string | null;
  }>;
  remainingMacros: { calories: number; protein: number; carbs: number; fat: number } | null;
  topAdjacentCuisine: string | null;
}

export const coachApi: CoachApi = {
  listConversations: async () => {
    const res = await api.get<CoachConversation[]>('/coach/conversations');
    return res.data;
  },
  getConversation: async (id: string) => {
    const res = await api.get<CoachConversationDetail>(
      `/coach/conversations/${encodeURIComponent(id)}`,
    );
    return res.data;
  },
  createConversation: async (firstMessage: string) => {
    const res = await api.post<CoachConversation>('/coach/conversations', { firstMessage });
    return res.data;
  },
  streamMessage: streamCoachMessage,
  getCoachContext: async () => {
    const res = await api.get<CoachContextResponse>('/coach/context');
    return res.data;
  },
  extractPantryFromImage: async ({ imageBase64, mediaType }) => {
    const res = await api.post<CoachExtractPantryResponse>(
      '/coach/extract-pantry-from-image',
      { imageBase64, mediaType },
    );
    return res.data;
  },
  listMemories: async () => {
    const res = await api.get<CoachMemory[]>('/coach/memories');
    return res.data;
  },
  updateMemory: async (id, patch) => {
    const res = await api.patch<CoachMemory>(
      `/coach/memories/${encodeURIComponent(id)}`,
      patch,
    );
    return res.data;
  },
  deleteMemory: async (id) => {
    await api.delete(`/coach/memories/${encodeURIComponent(id)}`);
  },
  exportConversation: async (id: string) => {
    const res = await api.get<string>(
      `/coach/conversations/${encodeURIComponent(id)}/export`,
      { responseType: 'text', transformResponse: [(d) => d as string] },
    );
    return res.data;
  },
};

export type { ApiResponse, ApiError };