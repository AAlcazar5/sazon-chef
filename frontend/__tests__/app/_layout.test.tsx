// frontend/__tests__/app/_layout.test.tsx
// Tests for protected routes and navigation

// Mock global.css before any imports
jest.mock('../../global.css', () => ({}));

const mockRouterObj = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };

// AuthProvider must render children — auto-mock returns undefined and blocks rendering
jest.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: jest.fn(),
}));
jest.mock('../../contexts/ToastContext', () => ({
  ToastProvider: ({ children }: any) => children,
  useToast: jest.fn().mockReturnValue({ showToast: jest.fn() }),
}));
// Mock react-native-gesture-handler to prevent GestureHandlerRootView from crashing in tests
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: any) => children,
}));

jest.mock('expo-router', () => {
  const StackMock = () => null;
  (StackMock as any).Screen = () => null;
  return {
    useRouter: jest.fn(() => mockRouterObj),
    useSegments: jest.fn(() => []),
    useLocalSearchParams: jest.fn(() => ({})),
    useFocusEffect: jest.fn(),
    Stack: StackMock,
    router: mockRouterObj,
  };
});
jest.mock('@react-native-async-storage/async-storage', () => ({
  // Return null → (null === null) = true → isOnboardingComplete = true
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn(),
}));
jest.mock('../../hooks/usePushNotifications', () => ({
  usePushNotifications: jest.fn(),
}));
// Mock SplashScreen to call onFinish immediately via effect so showSplash becomes false quickly
jest.mock('../../components/ui/SplashScreen', () =>
  function MockSplashScreen({ onFinish }: any) {
    const React = require('react');
    React.useEffect(() => {
      if (onFinish) onFinish();
    }, []);
    return null;
  }
);

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import RootLayout from '../../app/_layout';
import { useAuth } from '../../contexts/AuthContext';
import { useSegments } from 'expo-router';

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseSegments = useSegments as jest.MockedFunction<typeof useSegments>;

describe('RootLayout - Protected Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Not Authenticated', () => {
    it('should redirect to login when not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null, token: null, isLoading: false, isAuthenticated: false,
        login: jest.fn(), register: jest.fn(), logout: jest.fn(), updateUser: jest.fn(),
      });
      mockUseSegments.mockReturnValue(['(tabs)']);

      render(<RootLayout />);

      await waitFor(() => {
        expect(mockRouterObj.replace).toHaveBeenCalledWith('/login');
      });
    });

    it('should not redirect if already on login screen', async () => {
      mockUseAuth.mockReturnValue({
        user: null, token: null, isLoading: false, isAuthenticated: false,
        login: jest.fn(), register: jest.fn(), logout: jest.fn(), updateUser: jest.fn(),
      });
      mockUseSegments.mockReturnValue(['login']);

      render(<RootLayout />);

      // Give effects time to fire; login screen should not trigger redirect
      await waitFor(() => {
        expect(mockRouterObj.replace).not.toHaveBeenCalled();
      });
    });

    it('should not redirect if on onboarding screen', async () => {
      mockUseAuth.mockReturnValue({
        user: null, token: null, isLoading: false, isAuthenticated: false,
        login: jest.fn(), register: jest.fn(), logout: jest.fn(), updateUser: jest.fn(),
      });
      mockUseSegments.mockReturnValue(['onboarding']);

      render(<RootLayout />);

      await waitFor(() => {
        expect(mockRouterObj.replace).not.toHaveBeenCalled();
      });
    });
  });

  describe('Authenticated', () => {
    it('should redirect away from auth screens when authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com', name: 'Test' },
        token: 'token-123', isLoading: false, isAuthenticated: true,
        login: jest.fn(), register: jest.fn(), logout: jest.fn(), updateUser: jest.fn(),
      });
      mockUseSegments.mockReturnValue(['login']);

      render(<RootLayout />);

      await waitFor(() => {
        expect(mockRouterObj.replace).toHaveBeenCalledWith('/(tabs)');
      });
    });

    it('should allow access to tabs when authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com', name: 'Test' },
        token: 'token-123', isLoading: false, isAuthenticated: true,
        login: jest.fn(), register: jest.fn(), logout: jest.fn(), updateUser: jest.fn(),
      });
      mockUseSegments.mockReturnValue(['(tabs)']);

      render(<RootLayout />);

      await waitFor(() => {
        expect(mockRouterObj.replace).not.toHaveBeenCalled();
      });
    });
  });

  describe('Loading State', () => {
    it('should not redirect while loading authentication', async () => {
      mockUseAuth.mockReturnValue({
        user: null, token: null, isLoading: true, isAuthenticated: false,
        login: jest.fn(), register: jest.fn(), logout: jest.fn(), updateUser: jest.fn(),
      });
      mockUseSegments.mockReturnValue(['(tabs)']);

      const rendered = render(<RootLayout />);

      await waitFor(() => {
        expect(mockRouterObj.replace).not.toHaveBeenCalled();
      });
      expect(rendered).toBeTruthy();
    });
  });
});
