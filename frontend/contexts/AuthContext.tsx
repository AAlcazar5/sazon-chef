// frontend/contexts/AuthContext.tsx
// Authentication context for managing user authentication state

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, setAuthToken, setLogoutCallback } from '../lib/api';
import { analytics } from '../utils/analytics';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  socialLogin: (provider: 'google' | 'apple', providerId: string, email: string, name: string, idToken?: string, accessToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored auth data on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    console.log('[Auth] loadStoredAuth called');

    // Shorter timeout for faster feedback on Android
    const timeoutMs = 5000;
    let didTimeout = false;

    const timeoutId = setTimeout(() => {
      console.log('[Auth] TIMEOUT - forcing isLoading to false');
      didTimeout = true;
      setIsLoading(false);
    }, timeoutMs);

    try {
      console.log('[Auth] Starting to load stored auth...');

      // Wrap SecureStore calls with individual timeouts
      const getWithTimeout = async (key: string, timeoutMs: number = 2000): Promise<string | null> => {
        return new Promise(async (resolve) => {
          const timeout = setTimeout(() => {
            console.log(`[Auth] SecureStore.getItemAsync(${key}) timed out`);
            resolve(null);
          }, timeoutMs);

          try {
            const result = await SecureStore.getItemAsync(key);
            clearTimeout(timeout);
            resolve(result);
          } catch (e) {
            clearTimeout(timeout);
            console.log(`[Auth] SecureStore.getItemAsync(${key}) error:`, e);
            resolve(null);
          }
        });
      };

      const storedToken = await getWithTimeout(TOKEN_KEY);
      console.log('[Auth] Got stored token:', !!storedToken);

      if (didTimeout) return;

      const storedUser = await getWithTimeout(USER_KEY);
      console.log('[Auth] Got stored user:', !!storedUser);

      if (didTimeout) return;

      if (storedToken && storedUser) {
        const userData = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);
        setAuthToken(storedToken);

        // Skip analytics init during load - can be slow
        // Initialize analytics in background
        if (userData?.id) {
          analytics.initialize(userData.id).catch(() => {});
        }

        // Verify token with shorter timeout
        try {
          console.log('[Auth] Verifying token with server...');
          const response = await api.get('/auth/profile', {
            headers: { Authorization: `Bearer ${storedToken}` },
            timeout: 3000,
          });
          console.log('[Auth] Token verified successfully');
          if (response.data?.user && !didTimeout) {
            const updatedUser = response.data.user;
            setUser(updatedUser);
            // Don't await storage write - do it in background
            SecureStore.setItemAsync(USER_KEY, JSON.stringify(updatedUser)).catch(() => {});
          }
        } catch (error) {
          console.log('[Auth] Token verification failed, clearing auth');
          if (!didTimeout) {
            await clearStoredAuth();
          }
        }
      } else {
        console.log('[Auth] No stored auth found');
      }
    } catch (error) {
      console.error('[Auth] Error loading stored auth:', error);
    } finally {
      clearTimeout(timeoutId);
      if (!didTimeout) {
        console.log('[Auth] Setting isLoading to false');
        setIsLoading(false);
      }
    }
  };

  const clearStoredAuth = async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
      console.error('Error clearing stored auth:', error);
    }
    setToken(null);
    setUser(null);
    setAuthToken(null); // Clear API client token
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });

      if (response.data?.token && response.data?.user) {
        const authToken = response.data.token;
        const userData = response.data.user;

        // Store token and user
        await SecureStore.setItemAsync(TOKEN_KEY, authToken);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));

        setToken(authToken);
        setUser(userData);
        setAuthToken(authToken); // Update API client token

        // Initialize analytics
        if (userData?.id) {
          await analytics.initialize(userData.id);
          await analytics.track('user_login', { method: 'email' });
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      // The API interceptor already normalizes errors into { message, code, details }
      // If it's already an Error with a message, use it. Otherwise extract from error object.
      let errorMessage = 'Login failed. Please try again.';

      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      throw new Error(errorMessage);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await api.post('/auth/register', { name, email, password });

      if (response.data?.token && response.data?.user) {
        const authToken = response.data.token;
        const userData = response.data.user;

        // Store token and user
        await SecureStore.setItemAsync(TOKEN_KEY, authToken);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));

        setToken(authToken);
        setUser(userData);
        setAuthToken(authToken); // Update API client token

        // Initialize analytics
        if (userData?.id) {
          await analytics.initialize(userData.id);
          await analytics.track('user_register', { method: 'email' });
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      let errorMessage = 'Registration failed. Please try again.';

      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    await clearStoredAuth();
  };

  // Register logout callback with API client for automatic logout on auth errors
  useEffect(() => {
    setLogoutCallback(logout);
    return () => {
      setLogoutCallback(null);
    };
  }, []);

  const socialLogin = async (
    provider: 'google' | 'apple',
    providerId: string,
    email: string,
    name: string,
    idToken?: string,
    accessToken?: string
  ) => {
    try {
      const response = await api.post('/auth/social/callback', {
        provider,
        providerId,
        email,
        name,
        idToken,
        accessToken,
      });

      if (response.data?.token && response.data?.user) {
        const authToken = response.data.token;
        const userData = response.data.user;

        // Store token and user
        await SecureStore.setItemAsync(TOKEN_KEY, authToken);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));

        setToken(authToken);
        setUser(userData);
        setAuthToken(authToken); // Update API client token
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      let errorMessage = 'Social login failed. Please try again.';

      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      throw new Error(errorMessage);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    try {
      const response = await api.put('/auth/profile', userData);

      if (response.data?.user) {
        const updatedUser = { ...user, ...response.data.user } as User;
        setUser(updatedUser);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(updatedUser));
      }
    } catch (error: any) {
      let errorMessage = 'Failed to update profile. Please try again.';

      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      throw new Error(errorMessage);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    socialLogin,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

