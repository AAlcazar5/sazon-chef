// frontend/__tests__/components/build-a-plate/TechniqueChallengeBanner.test.tsx
// Group 10X Phase 9 — "Try this week" banner with weekly persistence.

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
import TechniqueChallengeBanner, {
  techniqueDismissalKey,
  isoWeekKey,
} from '../../../components/build-a-plate/TechniqueChallengeBanner';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

describe('isoWeekKey', () => {
  it('returns a string in the YYYY-Www format', () => {
    const k = isoWeekKey(new Date('2026-05-02T00:00:00Z'));
    expect(k).toMatch(/^\d{4}-W\d{2}$/);
  });

  it('returns the same key for two days in the same ISO week', () => {
    const monday = new Date('2026-05-04T12:00:00Z'); // Mon
    const wednesday = new Date('2026-05-06T12:00:00Z'); // Wed
    expect(isoWeekKey(monday)).toBe(isoWeekKey(wednesday));
  });
});

describe('TechniqueChallengeBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
  });

  it('renders the banner with eyebrow + serif title + body', async () => {
    const { getByTestId, getByText } = render(
      <TechniqueChallengeBanner
        title="Caramelize the onions"
        body="Slow and low — 30 minutes turns onions into jam."
        testID="technique-banner"
      />,
    );

    await waitFor(() => expect(getByTestId('technique-banner')).toBeTruthy());
    expect(getByText(/TRY THIS WEEK/i)).toBeTruthy();
    expect(getByText('Caramelize the onions')).toBeTruthy();
    expect(getByText(/Slow and low/i)).toBeTruthy();
  });

  it('persists dismissal under the current ISO-week key', async () => {
    const { getByTestId } = render(
      <TechniqueChallengeBanner
        title="Caramelize the onions"
        body="Slow and low."
        testID="technique-banner"
      />,
    );

    await waitFor(() => expect(getByTestId('technique-banner')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByTestId('technique-banner-dismiss'));
    });

    await waitFor(() => expect(mockSetItem).toHaveBeenCalled());
    const [key] = mockSetItem.mock.calls[0];
    expect(key).toBe(techniqueDismissalKey(new Date()));
  });

  it('does not render if AsyncStorage has dismissal flag for current week', async () => {
    mockGetItem.mockImplementation((key: string) => {
      if (key === techniqueDismissalKey(new Date())) return Promise.resolve('true');
      return Promise.resolve(null);
    });

    const { queryByTestId } = render(
      <TechniqueChallengeBanner
        title="Caramelize the onions"
        body="Slow and low."
        testID="technique-banner"
      />,
    );

    await waitFor(() => {
      expect(mockGetItem).toHaveBeenCalledWith(techniqueDismissalKey(new Date()));
    });

    expect(queryByTestId('technique-banner')).toBeNull();
  });
});
