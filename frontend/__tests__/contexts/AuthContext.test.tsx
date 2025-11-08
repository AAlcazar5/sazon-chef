// frontend/__tests__/contexts/AuthContext.test.tsx
// Tests for AuthContext authentication flows

// Mock dependencies BEFORE imports
jest.mock('../../lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
  setAuthToken: jest.fn(),
}));
jest.mock('expo-secure-store');

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import * as SecureStore from 'expo-secure-store';
import { api, setAuthToken } from '../../lib/api';

const mockApi = api as jest.Mocked<typeof api>;
const mockSetAuthToken = setAuthToken as jest.MockedFunction<typeof setAuthToken>;

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
    (mockSetAuthToken as jest.Mock).mockReturnValue(undefined);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  describe('Initial State', () => {
    it('should start with no user and not authenticated', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should load stored authentication on mount', async () => {
      const storedToken = 'stored-token-123';
      const storedUser = { id: 'user-1', email: 'test@example.com', name: 'Test User' };

      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(storedToken)
        .mockResolvedValueOnce(JSON.stringify(storedUser));

      mockApi.get.mockResolvedValueOnce({
        data: { user: storedUser },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.token).toBe(storedToken);
      expect(result.current.user).toEqual(storedUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('auth_token');
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('auth_user');
    });

    it('should clear invalid stored token', async () => {
      const storedToken = 'invalid-token';
      const storedUser = JSON.stringify({ id: 'user-1', email: 'test@example.com', name: 'Test' });

      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(storedToken)
        .mockResolvedValueOnce(storedUser);

      mockApi.get.mockRejectedValueOnce({
        response: { status: 401 },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Wait for the clearStoredAuth to complete
      await waitFor(() => {
        expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
      }, { timeout: 3000 });

      // After clearing invalid token, user should not be authenticated
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
      });
      
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_user');
      expect(mockSetAuthToken).toHaveBeenCalledWith(null);
    });
  });

  describe('Registration Flow', () => {
    it('should register a new user successfully', async () => {
      const newUser = {
        id: 'user-1',
        email: 'newuser@example.com',
        name: 'New User',
      };
      const token = 'new-token-123';

      mockApi.post.mockResolvedValueOnce({
        data: {
          success: true,
          user: newUser,
          token,
        },
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.register('New User', 'newuser@example.com', 'password123');
      });

      expect(result.current.user).toEqual(newUser);
      expect(result.current.token).toBe(token);
      expect(result.current.isAuthenticated).toBe(true);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_token', token);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_user', JSON.stringify(newUser));
      expect(mockSetAuthToken).toHaveBeenCalledWith(token);
      expect(mockApi.post).toHaveBeenCalledWith('/auth/register', {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
      });
    });

    it('should handle registration errors', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: {
          status: 409,
          data: { error: 'User already exists' },
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.register('Test', 'test@example.com', 'password123');
        })
      ).rejects.toThrow('User already exists');

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Login Flow', () => {
    it('should login user successfully', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      };
      const token = 'login-token-123';

      mockApi.post.mockResolvedValueOnce({
        data: {
          success: true,
          user,
          token,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(result.current.user).toEqual(user);
      expect(result.current.token).toBe(token);
      expect(result.current.isAuthenticated).toBe(true);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_token', token);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_user', JSON.stringify(user));
      expect(mockSetAuthToken).toHaveBeenCalledWith(token);
      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should handle login errors', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { error: 'Invalid credentials' },
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.login('test@example.com', 'wrongpassword');
        })
      ).rejects.toThrow('Invalid credentials');

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle network errors during login', async () => {
      mockApi.post.mockRejectedValueOnce({
        message: 'Network error',
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.login('test@example.com', 'password123');
        })
      ).rejects.toThrow('Network error');
    });
  });

  describe('Logout Flow', () => {
    it('should logout user and clear stored data', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      };
      const token = 'token-123';

      // Set up authenticated state
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(token)
        .mockResolvedValueOnce(JSON.stringify(user));

      mockApi.get.mockResolvedValueOnce({
        data: { user },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_user');
      expect(mockSetAuthToken).toHaveBeenCalledWith(null);
    });
  });

  describe('Update User', () => {
    it('should update user profile successfully', async () => {
      const initialUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      };
      const updatedUser = {
        ...initialUser,
        name: 'Updated Name',
      };

      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce('token-123')
        .mockResolvedValueOnce(JSON.stringify(initialUser));

      mockApi.get.mockResolvedValueOnce({
        data: { user: initialUser },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      mockApi.put.mockResolvedValueOnce({
        data: { user: updatedUser },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await act(async () => {
        await result.current.updateUser({ name: 'Updated Name' });
      });

      expect(result.current.user?.name).toBe('Updated Name');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'auth_user',
        JSON.stringify(updatedUser)
      );
    });
  });
});

