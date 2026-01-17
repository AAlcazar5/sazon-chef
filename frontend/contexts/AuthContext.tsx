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
    try {
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      const storedUser = await SecureStore.getItemAsync(USER_KEY);

      if (storedToken && storedUser) {
        const userData = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);
        setAuthToken(storedToken); // Set API client token immediately
        
        // Initialize analytics
        if (userData?.id) {
          await analytics.initialize(userData.id);
        }
        
        // Verify token is still valid by fetching user profile
        try {
          const response = await api.get('/auth/profile', {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          if (response.data?.user) {
            const updatedUser = response.data.user;
            setUser(updatedUser);
            await SecureStore.setItemAsync(USER_KEY, JSON.stringify(updatedUser));
            
            // Re-initialize analytics with updated user data
            if (updatedUser?.id) {
              await analytics.initialize(updatedUser.id);
            }
          }
        } catch (error) {
          // Token is invalid, clear stored auth
          await clearStoredAuth();
        }
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
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
      const errorMessage = error.response?.data?.error || error.message || 'Login failed';
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
      const errorMessage = error.response?.data?.error || error.message || 'Registration failed';
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
      const errorMessage = error.response?.data?.error || error.message || 'Social login failed';
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
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update profile';
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

