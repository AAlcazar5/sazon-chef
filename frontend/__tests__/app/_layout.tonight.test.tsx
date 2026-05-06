// frontend/__tests__/app/_layout.tonight.test.tsx
// ROADMAP 4.0 T0.1 — root layout redirects to /tonight when tonight mode is on
// AND the env flag is on. Either off → original (tabs) routing is preserved.

jest.mock('../../global.css', () => ({}));

const mockRouterObj = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };

jest.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: jest.fn(),
}));
jest.mock('../../contexts/ToastContext', () => ({
  ToastProvider: ({ children }: any) => children,
  useToast: jest.fn().mockReturnValue({ showToast: jest.fn() }),
}));
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

const asyncStorageStore: Record<string, string | null> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(asyncStorageStore[key] ?? null)),
  setItem: jest.fn((key: string, val: string) => {
    asyncStorageStore[key] = val;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete asyncStorageStore[key];
    return Promise.resolve();
  }),
}));
jest.mock('../../hooks/usePushNotifications', () => ({
  usePushNotifications: jest.fn(),
}));
jest.mock('../../components/ui/SplashScreen', () =>
  function MockSplashScreen({ onFinish }: any) {
    const React = require('react');
    React.useEffect(() => { if (onFinish) onFinish(); }, []);
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

const TONIGHT_FLAG_KEY = 'tonight_mode_flag_on';
const TONIGHT_PREF_KEY = 'tonight_mode_pref_enabled';

const setAuthed = () =>
  mockUseAuth.mockReturnValue({
    user: { id: 'user-1', email: 'a@b.com', name: 'A' },
    token: 't', isLoading: false, isAuthenticated: true,
    login: jest.fn(), register: jest.fn(), socialLogin: jest.fn(), logout: jest.fn(), updateUser: jest.fn(),
  });

describe('RootLayout — Tonight Mode redirect (T0.1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(asyncStorageStore).forEach(k => delete asyncStorageStore[k]);
  });

  it('redirects to /tonight when both flag-on AND pref-on', async () => {
    asyncStorageStore[TONIGHT_FLAG_KEY] = '1';
    asyncStorageStore[TONIGHT_PREF_KEY] = '1';
    setAuthed();
    mockUseSegments.mockReturnValue(['(tabs)']);

    render(<RootLayout />);

    await waitFor(() => {
      expect(mockRouterObj.replace).toHaveBeenCalledWith('/tonight');
    });
  });

  it('does NOT redirect when flag is off (pref on)', async () => {
    asyncStorageStore[TONIGHT_PREF_KEY] = '1';
    setAuthed();
    mockUseSegments.mockReturnValue(['(tabs)']);

    render(<RootLayout />);

    await waitFor(() => {
      // No redirect to /tonight; auth+tabs path is unchanged.
      expect(mockRouterObj.replace).not.toHaveBeenCalledWith('/tonight');
    });
  });

  it('does NOT redirect when pref is off (flag on)', async () => {
    asyncStorageStore[TONIGHT_FLAG_KEY] = '1';
    setAuthed();
    mockUseSegments.mockReturnValue(['(tabs)']);

    render(<RootLayout />);

    await waitFor(() => {
      expect(mockRouterObj.replace).not.toHaveBeenCalledWith('/tonight');
    });
  });

  it('does NOT redirect from /tonight if already there (no infinite loop)', async () => {
    asyncStorageStore[TONIGHT_FLAG_KEY] = '1';
    asyncStorageStore[TONIGHT_PREF_KEY] = '1';
    setAuthed();
    mockUseSegments.mockReturnValue(['tonight']);

    render(<RootLayout />);

    await waitFor(() => {
      expect(mockRouterObj.replace).not.toHaveBeenCalledWith('/tonight');
    });
  });
});
