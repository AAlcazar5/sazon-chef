import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { Alert } from 'react-native';

// Interfaces for this file
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
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

export const api: AxiosInstance = axios.create({
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

export function getAuthToken(): string | null {
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

