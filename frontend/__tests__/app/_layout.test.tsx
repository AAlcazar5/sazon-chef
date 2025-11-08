// frontend/__tests__/app/_layout.test.tsx
// Tests for protected routes and navigation

// Mock global.css before any imports
jest.mock('../../global.css', () => ({}));

// Mock dependencies
jest.mock('../../contexts/AuthContext');
jest.mock('expo-router');
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import RootLayout from '../../app/_layout';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, useSegments } from 'expo-router';

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseSegments = useSegments as jest.MockedFunction<typeof useSegments>;
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

describe('RootLayout - Protected Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter as any);
  });

  describe('Not Authenticated', () => {
    it('should redirect to login when not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        updateUser: jest.fn(),
      });

      mockUseSegments.mockReturnValue(['(tabs)']);

      render(<RootLayout />);

      expect(mockRouter.replace).toHaveBeenCalledWith('/login');
    });

    it('should not redirect if already on login screen', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        updateUser: jest.fn(),
      });

      mockUseSegments.mockReturnValue(['login']);

      render(<RootLayout />);

      expect(mockRouter.replace).not.toHaveBeenCalled();
    });

    it('should not redirect if on onboarding screen', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        updateUser: jest.fn(),
      });

      mockUseSegments.mockReturnValue(['onboarding']);

      render(<RootLayout />);

      expect(mockRouter.replace).not.toHaveBeenCalled();
    });
  });

  describe('Authenticated', () => {
    it('should redirect away from auth screens when authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com', name: 'Test' },
        token: 'token-123',
        isLoading: false,
        isAuthenticated: true,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        updateUser: jest.fn(),
      });

      mockUseSegments.mockReturnValue(['login']);

      render(<RootLayout />);

      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
    });

    it('should allow access to tabs when authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com', name: 'Test' },
        token: 'token-123',
        isLoading: false,
        isAuthenticated: true,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        updateUser: jest.fn(),
      });

      mockUseSegments.mockReturnValue(['(tabs)']);

      render(<RootLayout />);

      expect(mockRouter.replace).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should not redirect while loading authentication', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        token: null,
        isLoading: true,
        isAuthenticated: false,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        updateUser: jest.fn(),
      });

      mockUseSegments.mockReturnValue(['(tabs)']);

      const { container } = render(<RootLayout />);

      expect(mockRouter.replace).not.toHaveBeenCalled();
      expect(container).toBeTruthy();
    });
  });
});

