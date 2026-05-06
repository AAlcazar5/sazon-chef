// frontend/__tests__/components/onboarding/TonightModeNudge.test.tsx
// ROADMAP 4.0 T3.2 — one-time nudge for existing users.

jest.mock('../../../global.css', () => ({}));

const mockRouter = { push: jest.fn(), replace: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => mockRouter),
  router: mockRouter,
}));

const mockPut = jest.fn();
jest.mock('../../../lib/api', () => ({
  apiClient: { put: (...args: any[]) => mockPut(...args) },
}));

const asyncStore: Record<string, string | null> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((k: string) => Promise.resolve(asyncStore[k] ?? null)),
    setItem: jest.fn((k: string, v: string) => {
      asyncStore[k] = v;
      return Promise.resolve();
    }),
  },
}));

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return ({ children, ...props }: any) => (
    <TouchableOpacity {...props}>{children}</TouchableOpacity>
  );
});

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TonightModeNudge from '../../../components/onboarding/TonightModeNudge';

describe('<TonightModeNudge />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(asyncStore).forEach((k) => delete asyncStore[k]);
  });

  it('does NOT render when flag is off', () => {
    const { queryByText } = render(
      <TonightModeNudge flagOn={false} promptedAt={null} />
    );
    expect(queryByText(/just pick dinner/i)).toBeNull();
  });

  it('does NOT render when promptedAt is already set', () => {
    const { queryByText } = render(
      <TonightModeNudge flagOn={true} promptedAt={new Date()} />
    );
    expect(queryByText(/just pick dinner/i)).toBeNull();
  });

  it('renders the card when flag on AND promptedAt is null', () => {
    const { getByText } = render(
      <TonightModeNudge flagOn={true} promptedAt={null} />
    );
    expect(getByText(/just pick dinner/i)).toBeTruthy();
    expect(getByText(/Try it/i)).toBeTruthy();
    expect(getByText(/Not now/i)).toBeTruthy();
  });

  it('Try it enables pref + dismisses prompt + routes to /tonight', async () => {
    mockPut.mockResolvedValue({ data: { tonightModeEnabled: true } });
    const { getByText } = render(
      <TonightModeNudge flagOn={true} promptedAt={null} />
    );
    fireEvent.press(getByText(/Try it/i));
    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith('/user/tonight-mode', {
        enabled: true,
        dismissPrompt: true,
      });
    });
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/tonight');
    });
  });

  it('Not now sets promptedAt timestamp without enabling', async () => {
    mockPut.mockResolvedValue({ data: { tonightModeEnabled: false } });
    const { getByText } = render(
      <TonightModeNudge flagOn={true} promptedAt={null} />
    );
    fireEvent.press(getByText(/Not now/i));
    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith('/user/tonight-mode', {
        enabled: false,
        dismissPrompt: true,
      });
    });
    expect(mockRouter.replace).not.toHaveBeenCalledWith('/tonight');
  });
});
