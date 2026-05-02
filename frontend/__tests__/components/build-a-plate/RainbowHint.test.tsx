// frontend/__tests__/components/build-a-plate/RainbowHint.test.tsx
// Group 10X Phase 9 — "Eat the rainbow" hint shown above Vegetable picker when user lacks greens.

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', isDark: false }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import RainbowHint, { RAINBOW_HINT_KEY, shouldShowRainbowHint } from '../../../components/build-a-plate/RainbowHint';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

describe('shouldShowRainbowHint', () => {
  it('returns true when greenVegCount === 0 and totalPlates >= 4', () => {
    expect(shouldShowRainbowHint({ greenVegCount: 0, totalPlates: 4 })).toBe(true);
    expect(shouldShowRainbowHint({ greenVegCount: 0, totalPlates: 7 })).toBe(true);
  });

  it('returns false when greenVegCount > 0', () => {
    expect(shouldShowRainbowHint({ greenVegCount: 1, totalPlates: 5 })).toBe(false);
  });

  it('returns false when totalPlates < 4', () => {
    expect(shouldShowRainbowHint({ greenVegCount: 0, totalPlates: 3 })).toBe(false);
  });
});

describe('RainbowHint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
  });

  it('renders the hint when condition matches and not dismissed', async () => {
    const { getByTestId } = render(
      <RainbowHint
        greenVegCount={0}
        totalPlates={5}
        testID="rainbow-hint"
      />,
    );

    await waitFor(() => expect(getByTestId('rainbow-hint')).toBeTruthy());
  });

  it('hides when greenVegCount > 0', () => {
    const { queryByTestId } = render(
      <RainbowHint
        greenVegCount={2}
        totalPlates={5}
        testID="rainbow-hint"
      />,
    );
    expect(queryByTestId('rainbow-hint')).toBeNull();
  });

  it('hides when totalPlates < 4', () => {
    const { queryByTestId } = render(
      <RainbowHint
        greenVegCount={0}
        totalPlates={3}
        testID="rainbow-hint"
      />,
    );
    expect(queryByTestId('rainbow-hint')).toBeNull();
  });

  it('persists dismissal to AsyncStorage with 7-day expiry', async () => {
    const { getByTestId, queryByTestId } = render(
      <RainbowHint
        greenVegCount={0}
        totalPlates={5}
        testID="rainbow-hint"
      />,
    );

    await waitFor(() => expect(getByTestId('rainbow-hint')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByTestId('rainbow-hint-dismiss'));
    });

    await waitFor(() => expect(mockSetItem).toHaveBeenCalled());
    const [key, value] = mockSetItem.mock.calls[0];
    expect(key).toBe(RAINBOW_HINT_KEY);
    const parsed = JSON.parse(value);
    expect(parsed.expiresAt).toBeGreaterThan(Date.now());
    expect(parsed.expiresAt - Date.now()).toBeGreaterThan(6 * 24 * 60 * 60 * 1000); // > 6 days
    expect(queryByTestId('rainbow-hint')).toBeNull();
  });

  it('does not render when AsyncStorage has unexpired dismissal', async () => {
    const future = Date.now() + 5 * 24 * 60 * 60 * 1000; // 5 days from now
    mockGetItem.mockImplementation((key: string) => {
      if (key === RAINBOW_HINT_KEY) {
        return Promise.resolve(JSON.stringify({ expiresAt: future }));
      }
      return Promise.resolve(null);
    });

    const { queryByTestId } = render(
      <RainbowHint
        greenVegCount={0}
        totalPlates={5}
        testID="rainbow-hint"
      />,
    );

    await waitFor(() => {
      expect(mockGetItem).toHaveBeenCalledWith(RAINBOW_HINT_KEY);
    });

    expect(queryByTestId('rainbow-hint')).toBeNull();
  });
});
