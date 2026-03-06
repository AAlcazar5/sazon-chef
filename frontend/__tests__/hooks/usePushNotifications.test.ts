// frontend/__tests__/hooks/usePushNotifications.test.ts
import { renderHook } from '@testing-library/react-native';
import { usePushNotifications } from '../../hooks/usePushNotifications';

// Mock expo-constants
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    appOwnership: 'standalone', // not Expo Go → allows registration
    expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
  },
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock notifications API
jest.mock('../../lib/api', () => ({
  notificationsApi: {
    registerToken: jest.fn().mockResolvedValue({ data: { success: true } }),
    unregisterToken: jest.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

// Mock expo-notifications (dynamic import via jest.mock on the module)
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test-token]' }),
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  AndroidImportance: { MAX: 5 },
  setNotificationChannelAsync: jest.fn(),
}));

import { useAuth } from '../../contexts/AuthContext';
import { notificationsApi } from '../../lib/api';

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('usePushNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not register when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      socialLogin: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    });

    renderHook(() => usePushNotifications());

    // Should not attempt registration
    expect(notificationsApi.registerToken).not.toHaveBeenCalled();
  });

  it('skips registration in Expo Go environment', () => {
    // Override appOwnership to simulate Expo Go
    const Constants = require('expo-constants').default;
    Constants.appOwnership = 'expo';

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', name: 'Test', email: 'test@example.com' },
      token: 'token-123',
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      socialLogin: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    });

    renderHook(() => usePushNotifications());

    // No token registration in Expo Go
    expect(notificationsApi.registerToken).not.toHaveBeenCalled();

    // Restore
    Constants.appOwnership = 'standalone';
  });

  it('renders without throwing when authenticated in standalone', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', name: 'Test', email: 'test@example.com' },
      token: 'token-123',
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      socialLogin: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    });

    expect(() => renderHook(() => usePushNotifications())).not.toThrow();
  });
});
