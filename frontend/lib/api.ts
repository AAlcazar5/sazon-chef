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
  timeout: 10000,
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
      return {
        ...response,
        data: response.data.data,
        message: response.data.message
      };
    }

    return response;
  },
  (error) => {
    if (__DEV__) {
      console.error('❌ Response Error:', error.response?.data || error.message);
    }

    // Handle different error types
    const apiError: ApiError = {
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    };

    if (error.response) {
      // Server responded with error status
      const serverError = error.response.data;
      apiError.message = serverError.message || getErrorMessage(error.response.status);
      apiError.code = serverError.code || `HTTP_${error.response.status}`;
      apiError.details = serverError.details;
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

  getSuggestedRecipes: () => {
    return apiClient.get('/recipes/suggested');
  },

  getSavedRecipes: () => {
    return apiClient.get('/recipes/saved');
  },

  likeRecipe: (id: string) => {
    return apiClient.post(`/recipes/${id}/like`);
  },

  dislikeRecipe: (id: string) => {
    return apiClient.post(`/recipes/${id}/dislike`);
  },

  saveRecipe: (id: string) => {
    return apiClient.post(`/recipes/${id}/save`);
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

// Export the raw axios instance for advanced use cases
export { api };

// Export types for use in other files
export type { ApiResponse, ApiError };