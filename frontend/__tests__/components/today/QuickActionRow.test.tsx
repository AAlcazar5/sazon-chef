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
  onVoice: jest.fn(),
  onSnap: jest.fn(),
  onBuildAPlate: jest.fn(),
  onFindMeAMeal: jest.fn(),
};

describe('<QuickActionRow />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
  });

  it('renders all 4 action chips', async () => {
    const { getByTestId } = render(<QuickActionRow {...baseHandlers} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(getByTestId('quick-action-voice')).toBeTruthy();
    expect(getByTestId('quick-action-snap')).toBeTruthy();
    expect(getByTestId('quick-action-build-a-plate')).toBeTruthy();
    expect(getByTestId('quick-action-find-me-a-meal')).toBeTruthy();
  });

  it('fires correct handler when chip is tapped', async () => {
    const onVoice = jest.fn();
    const { getByTestId } = render(<QuickActionRow {...baseHandlers} onVoice={onVoice} />);
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.press(getByTestId('quick-action-voice'));
    expect(onVoice).toHaveBeenCalledTimes(1);
  });

  it('persists most-recently-used to AsyncStorage on tap', async () => {
    const { getByTestId } = render(<QuickActionRow {...baseHandlers} />);
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.press(getByTestId('quick-action-snap'));
    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalledWith(
        'today.quick-actions.mru',
        expect.stringContaining('snap')
      );
    });
  });

  it('reads the MRU list from AsyncStorage on mount', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify(['snap', 'voice', 'build-a-plate', 'find-me-a-meal']));
    render(<QuickActionRow {...baseHandlers} />);
    await waitFor(() => {
      expect(mockGetItem).toHaveBeenCalledWith('today.quick-actions.mru');
    });
  });

  it('falls through to default order when AsyncStorage is empty', async () => {
    mockGetItem.mockResolvedValue(null);
    const { getAllByTestId } = render(<QuickActionRow {...baseHandlers} />);
    await act(async () => {
      await Promise.resolve();
    });
    const chips = getAllByTestId(/quick-action-/);
    expect(chips.length).toBe(4);
  });

  it('exposes accessibilityRole="button" on each chip', async () => {
    const { getByTestId } = render(<QuickActionRow {...baseHandlers} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(getByTestId('quick-action-voice').props.accessibilityRole).toBe('button');
    expect(getByTestId('quick-action-snap').props.accessibilityRole).toBe('button');
    expect(getByTestId('quick-action-build-a-plate').props.accessibilityRole).toBe('button');
    expect(getByTestId('quick-action-find-me-a-meal').props.accessibilityRole).toBe('button');
  });

  it('exposes accessibility labels on each chip', async () => {
    const { getByLabelText } = render(<QuickActionRow {...baseHandlers} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(getByLabelText(/Voice composer/i)).toBeTruthy();
    expect(getByLabelText(/Snap to log/i)).toBeTruthy();
    expect(getByLabelText(/Build a plate/i)).toBeTruthy();
    expect(getByLabelText(/Find me a meal/i)).toBeTruthy();
  });

  it('renders chip labels in user-facing copy', async () => {
    const { getByText } = render(<QuickActionRow {...baseHandlers} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(getByText(/Voice/)).toBeTruthy();
    expect(getByText(/Snap/)).toBeTruthy();
    expect(getByText(/Build/)).toBeTruthy();
    expect(getByText(/Find me/)).toBeTruthy();
  });
});
