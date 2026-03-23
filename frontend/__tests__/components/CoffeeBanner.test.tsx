// frontend/__tests__/components/CoffeeBanner.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

// Must be hoisted before imports that trigger SazonMascot
jest.mock('../../components/mascot', () => ({
  SazonMascot: () => null,
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../hooks/useSubscription', () => ({
  useSubscription: jest.fn(() => ({
    subscription: { isPremium: false, loading: false },
  })),
}));

import { CoffeeBanner, shouldShowCoffeeBanner, recordCoffeeBannerShown } from '../../components/premium/CoffeeBanner';
import { useSubscription } from '../../hooks/useSubscription';
import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage is already mocked globally in jest.setup.js as default export
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('CoffeeBanner component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSubscription as jest.Mock).mockReturnValue({
      subscription: { isPremium: false, loading: false },
    });
  });

  it('renders when visible=true and user is free tier', () => {
    render(<CoffeeBanner visible={true} onDismiss={jest.fn()} />);
    expect(screen.getByText('Unlock the full menu')).toBeTruthy();
    expect(screen.getByText('Support Sazon ☕')).toBeTruthy();
  });

  it('returns null when user is premium', () => {
    (useSubscription as jest.Mock).mockReturnValue({
      subscription: { isPremium: true, loading: false },
    });
    const { toJSON } = render(<CoffeeBanner visible={true} onDismiss={jest.fn()} />);
    expect(toJSON()).toBeNull();
  });

  it('calls onDismiss when "Maybe later" is pressed', () => {
    const onDismiss = jest.fn();
    render(<CoffeeBanner visible={true} onDismiss={onDismiss} />);
    fireEvent.press(screen.getByText('Maybe later'));
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe('shouldShowCoffeeBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when no stored timestamp', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);
    expect(await shouldShowCoffeeBanner()).toBe(true);
  });

  it('returns false when shown less than 7 days ago', async () => {
    const recent = String(Date.now() - 1000 * 60 * 60 * 24 * 3);
    mockAsyncStorage.getItem.mockResolvedValue(recent);
    expect(await shouldShowCoffeeBanner()).toBe(false);
  });

  it('returns true when shown more than 7 days ago', async () => {
    const old = String(Date.now() - 1000 * 60 * 60 * 24 * 8);
    mockAsyncStorage.getItem.mockResolvedValue(old);
    expect(await shouldShowCoffeeBanner()).toBe(true);
  });

  it('returns false if AsyncStorage throws', async () => {
    mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
    expect(await shouldShowCoffeeBanner()).toBe(false);
  });
});

describe('recordCoffeeBannerShown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes current timestamp to AsyncStorage', async () => {
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    const before = Date.now();
    await recordCoffeeBannerShown();
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'lastCoffeeBannerShown',
      expect.any(String),
    );
    const written = parseInt((mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1], 10);
    expect(written).toBeGreaterThanOrEqual(before);
  });
});
