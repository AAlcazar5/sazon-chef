// frontend/__tests__/components/today/QuickActionRow.test.tsx
// ROADMAP 4.0 Tier A1-d — Today quick-action chip row (TDD).

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: {
      background: '#FAF7F4',
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    },
  }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => mockGetItem(key),
    setItem: (key: string, value: string) => mockSetItem(key, value),
  },
}));

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import QuickActionRow from '../../../components/today/QuickActionRow';

const baseHandlers = {
  onBuildAPlate: jest.fn(),
  onCookForFamily: jest.fn(),
  onLogMeal: jest.fn(),
  onSurpriseMe: jest.fn(),
  onFindMeAMeal: jest.fn(),
};

describe('<QuickActionRow />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
  });

  it('renders all 5 action chips (Build a plate, Cook for the family, Log a meal, Surprise me, Find me a meal)', async () => {
    const { getByTestId } = render(<QuickActionRow {...baseHandlers} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(getByTestId('quick-action-build-a-plate')).toBeTruthy();
    expect(getByTestId('quick-action-cook-for-family')).toBeTruthy();
    expect(getByTestId('quick-action-log-meal')).toBeTruthy();
    expect(getByTestId('quick-action-surprise-me')).toBeTruthy();
    expect(getByTestId('quick-action-find-me-a-meal')).toBeTruthy();
  });

  it('fires onSurpriseMe when the surprise-me chip is tapped', async () => {
    const onSurpriseMe = jest.fn();
    const { getByTestId } = render(
      <QuickActionRow {...baseHandlers} onSurpriseMe={onSurpriseMe} />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.press(getByTestId('quick-action-surprise-me'));
    expect(onSurpriseMe).toHaveBeenCalledTimes(1);
  });

  it('fires correct handler when chip is tapped', async () => {
    const onCookForFamily = jest.fn();
    const { getByTestId } = render(<QuickActionRow {...baseHandlers} onCookForFamily={onCookForFamily} />);
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.press(getByTestId('quick-action-cook-for-family'));
    expect(onCookForFamily).toHaveBeenCalledTimes(1);
  });

  it('persists tap log to AsyncStorage on tap', async () => {
    // Storage key was renamed today.quick-actions.mru → quickActionTapLog:v1
    // and the shape changed from a string[] to a { count, lastTappedAt } map.
    const { getByTestId } = render(<QuickActionRow {...baseHandlers} />);
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.press(getByTestId('quick-action-log-meal'));
    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalledWith(
        'quickActionTapLog:v1',
        expect.stringContaining('log-meal'),
      );
    });
  });

  it('reads the tap log from AsyncStorage on mount', async () => {
    mockGetItem.mockResolvedValue(
      JSON.stringify({
        'log-meal': { count: 3, lastTappedAt: Date.now() },
      }),
    );
    render(<QuickActionRow {...baseHandlers} />);
    await waitFor(() => {
      expect(mockGetItem).toHaveBeenCalledWith('quickActionTapLog:v1');
    });
  });

  it('falls through to default order when AsyncStorage is empty', async () => {
    mockGetItem.mockResolvedValue(null);
    const { getAllByTestId } = render(<QuickActionRow {...baseHandlers} />);
    await act(async () => {
      await Promise.resolve();
    });
    const chips = getAllByTestId(/quick-action-/);
    expect(chips.length).toBe(5);
  });

  it('exposes accessibilityRole="button" on each chip', async () => {
    const { getByTestId } = render(<QuickActionRow {...baseHandlers} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(getByTestId('quick-action-build-a-plate').props.accessibilityRole).toBe('button');
    expect(getByTestId('quick-action-cook-for-family').props.accessibilityRole).toBe('button');
    expect(getByTestId('quick-action-log-meal').props.accessibilityRole).toBe('button');
    expect(getByTestId('quick-action-surprise-me').props.accessibilityRole).toBe('button');
    expect(getByTestId('quick-action-find-me-a-meal').props.accessibilityRole).toBe('button');
  });

  it('exposes accessibility labels on each chip', async () => {
    const { getByLabelText } = render(<QuickActionRow {...baseHandlers} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(getByLabelText(/Build a plate/i)).toBeTruthy();
    expect(getByLabelText(/Cook for the family/i)).toBeTruthy();
    expect(getByLabelText(/Log a meal/i)).toBeTruthy();
    expect(getByLabelText(/Surprise me/i)).toBeTruthy();
    expect(getByLabelText(/Find me a meal/i)).toBeTruthy();
  });

  it('renders chip labels in user-facing copy', async () => {
    const { getByText } = render(<QuickActionRow {...baseHandlers} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(getByText(/Build/)).toBeTruthy();
    expect(getByText(/Cook for the family/)).toBeTruthy();
    expect(getByText(/Log a meal/)).toBeTruthy();
    expect(getByText(/Surprise me/)).toBeTruthy();
    expect(getByText(/Find me/)).toBeTruthy();
  });
});
