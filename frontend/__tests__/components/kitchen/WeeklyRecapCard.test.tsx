// frontend/__tests__/components/kitchen/WeeklyRecapCard.test.tsx
// ROADMAP 4.0 Tier C9 frontend — WeeklyRecapCard (TDD).

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

const mockFetchThisWeek = jest.fn();
jest.mock('../../../lib/api', () => ({
  weeklyRecapApi: {
    fetchThisWeek: (...args: unknown[]) => mockFetchThisWeek(...args),
  },
}));

const mockCapture = jest.fn(() => Promise.resolve('file:///tmp/recap.png'));
jest.mock('react-native-view-shot', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ReactLib.forwardRef(function MockViewShot(props: any, ref: any) {
      ReactLib.useImperativeHandle(ref, () => ({ capture: mockCapture }));
      return ReactLib.createElement(View, { testID: 'view-shot', ...props }, props.children);
    }),
  };
});

import React from 'react';
import { render, waitFor, act, fireEvent } from '@testing-library/react-native';
import * as Sharing from 'expo-sharing';
import WeeklyRecapCard from '../../../components/kitchen/WeeklyRecapCard';

const mockShareAsync = Sharing.shareAsync as jest.Mock;
const mockIsAvailable = Sharing.isAvailableAsync as jest.Mock;

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('<WeeklyRecapCard />', () => {
  it('renders nothing while loading', () => {
    mockFetchThisWeek.mockReturnValue(new Promise(() => {}));
    const { queryByTestId } = render(<WeeklyRecapCard />);
    expect(queryByTestId('weekly-recap-card')).toBeNull();
  });

  it('renders the recap card after fetch', async () => {
    mockFetchThisWeek.mockResolvedValue({
      data: {
        userId: 'u1',
        weekStart: new Date('2026-04-26').toISOString(),
        weekEnd: new Date('2026-05-02').toISOString(),
        cookCount: 5,
        cuisineCount: 3,
        topCuisine: { cuisine: 'Persian', count: 3 },
        topIngredient: { name: 'parsley', count: 6 },
        topNutrient: null,
        discovery: 'First time cooking Lebanese this week. New cuisine added to your map.',
      },
    });
    const { getByTestId } = render(<WeeklyRecapCard />);
    await flush();
    await waitFor(() => {
      expect(getByTestId('weekly-recap-card')).toBeTruthy();
    });
  });

  it('shows cook count + cuisine count', async () => {
    mockFetchThisWeek.mockResolvedValue({
      data: {
        userId: 'u1',
        weekStart: new Date().toISOString(),
        weekEnd: new Date().toISOString(),
        cookCount: 5,
        cuisineCount: 4,
        topCuisine: null,
        topIngredient: null,
        topNutrient: null,
        discovery: null,
      },
    });
    const { getByText } = render(<WeeklyRecapCard />);
    await flush();
    await waitFor(() => {
      expect(getByText('5')).toBeTruthy(); // cook count
      expect(getByText('4')).toBeTruthy(); // cuisine count
      expect(getByText(/plates cooked/i)).toBeTruthy();
      expect(getByText(/cuisines explored/i)).toBeTruthy();
    });
  });

  it('shows top cuisine when present', async () => {
    mockFetchThisWeek.mockResolvedValue({
      data: {
        userId: 'u1',
        weekStart: new Date().toISOString(),
        weekEnd: new Date().toISOString(),
        cookCount: 4,
        cuisineCount: 2,
        topCuisine: { cuisine: 'Persian', count: 3 },
        topIngredient: null,
        topNutrient: null,
        discovery: null,
      },
    });
    const { getByText } = render(<WeeklyRecapCard />);
    await flush();
    await waitFor(() => {
      expect(getByText(/Persian/)).toBeTruthy();
    });
  });

  it('shows discovery line when present', async () => {
    mockFetchThisWeek.mockResolvedValue({
      data: {
        userId: 'u1',
        weekStart: new Date().toISOString(),
        weekEnd: new Date().toISOString(),
        cookCount: 1,
        cuisineCount: 1,
        topCuisine: null,
        topIngredient: null,
        topNutrient: null,
        discovery: 'First time cooking Lebanese this week.',
      },
    });
    const { getByText } = render(<WeeklyRecapCard />);
    await flush();
    await waitFor(() => {
      expect(getByText(/Lebanese/)).toBeTruthy();
    });
  });

  it('renders a quiet-week placeholder when cookCount is 0', async () => {
    mockFetchThisWeek.mockResolvedValue({
      data: {
        userId: 'u1',
        weekStart: new Date().toISOString(),
        weekEnd: new Date().toISOString(),
        cookCount: 0,
        cuisineCount: 0,
        topCuisine: null,
        topIngredient: null,
        topNutrient: null,
        discovery: null,
      },
    });
    const { getByText } = render(<WeeklyRecapCard />);
    await flush();
    await waitFor(() => {
      expect(getByText(/quiet/i)).toBeTruthy();
    });
  });

  it('hides the card on fetch error (best-effort)', async () => {
    mockFetchThisWeek.mockRejectedValue(new Error('network'));
    const { queryByTestId } = render(<WeeklyRecapCard />);
    await flush();
    expect(queryByTestId('weekly-recap-card')).toBeNull();
  });

  it('renders a share button when there is at least one cook', async () => {
    mockFetchThisWeek.mockResolvedValue({
      data: {
        userId: 'u1',
        weekStart: new Date().toISOString(),
        weekEnd: new Date().toISOString(),
        cookCount: 3,
        cuisineCount: 2,
        topCuisine: { cuisine: 'Persian', count: 2 },
        topIngredient: null,
        topNutrient: null,
        discovery: null,
      },
    });
    const { getByLabelText } = render(<WeeklyRecapCard />);
    await flush();
    await waitFor(() => {
      expect(getByLabelText(/share.*recap/i)).toBeTruthy();
    });
  });

  it('does not render share button on a quiet week', async () => {
    mockFetchThisWeek.mockResolvedValue({
      data: {
        userId: 'u1',
        weekStart: new Date().toISOString(),
        weekEnd: new Date().toISOString(),
        cookCount: 0,
        cuisineCount: 0,
        topCuisine: null,
        topIngredient: null,
        topNutrient: null,
        discovery: null,
      },
    });
    const { queryByLabelText } = render(<WeeklyRecapCard />);
    await flush();
    expect(queryByLabelText(/share.*recap/i)).toBeNull();
  });

  it('captures + shares as image when share button pressed', async () => {
    mockFetchThisWeek.mockResolvedValue({
      data: {
        userId: 'u1',
        weekStart: new Date().toISOString(),
        weekEnd: new Date().toISOString(),
        cookCount: 5,
        cuisineCount: 3,
        topCuisine: { cuisine: 'Persian', count: 3 },
        topIngredient: null,
        topNutrient: null,
        discovery: null,
      },
    });
    mockCapture.mockClear();
    mockShareAsync.mockClear();
    mockIsAvailable.mockResolvedValue(true);

    const { getByLabelText } = render(<WeeklyRecapCard />);
    await flush();
    const button = await waitFor(() => getByLabelText(/share.*recap/i));
    await act(async () => {
      fireEvent.press(button);
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockCapture).toHaveBeenCalled();
      expect(mockShareAsync).toHaveBeenCalledWith(
        'file:///tmp/recap.png',
        expect.objectContaining({ mimeType: 'image/png' }),
      );
    });
  });

  it('swallows share errors silently (best-effort)', async () => {
    mockFetchThisWeek.mockResolvedValue({
      data: {
        userId: 'u1',
        weekStart: new Date().toISOString(),
        weekEnd: new Date().toISOString(),
        cookCount: 5,
        cuisineCount: 3,
        topCuisine: null,
        topIngredient: null,
        topNutrient: null,
        discovery: null,
      },
    });
    mockCapture.mockRejectedValueOnce(new Error('capture failed'));
    mockShareAsync.mockClear();

    const { getByLabelText } = render(<WeeklyRecapCard />);
    await flush();
    const button = await waitFor(() => getByLabelText(/share.*recap/i));
    await act(async () => {
      fireEvent.press(button);
      await Promise.resolve();
    });
    expect(mockShareAsync).not.toHaveBeenCalled();
  });

  it('exposes accessibilityLabel on the card', async () => {
    mockFetchThisWeek.mockResolvedValue({
      data: {
        userId: 'u1',
        weekStart: new Date().toISOString(),
        weekEnd: new Date().toISOString(),
        cookCount: 3,
        cuisineCount: 2,
        topCuisine: { cuisine: 'Persian', count: 2 },
        topIngredient: null,
        topNutrient: null,
        discovery: null,
      },
    });
    const { getByTestId } = render(<WeeklyRecapCard />);
    await flush();
    await waitFor(() => {
      const card = getByTestId('weekly-recap-card');
      expect(card.props.accessibilityLabel).toMatch(/week/i);
    });
  });
});
