// frontend/__tests__/components/meal-plan/LogFoodSheet.test.tsx
// Tests for LogFoodSheet (10L: Branded Food & Restaurant Tracking)

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: {}, theme: 'light', isDark: false }),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  createAnimatedComponent: (component: any) => component,
  useReducedMotion: () => false,
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const mockSearch = jest.fn();
const mockGetRecent = jest.fn();
const mockGetFrequent = jest.fn();
const mockLogFood = jest.fn();
const mockCreateItem = jest.fn();

jest.mock('../../../lib/api', () => ({
  foodApi: {
    search: (...args: any[]) => mockSearch(...args),
    getRecent: (...args: any[]) => mockGetRecent(...args),
    getFrequent: (...args: any[]) => mockGetFrequent(...args),
    logFood: (...args: any[]) => mockLogFood(...args),
    createItem: (...args: any[]) => mockCreateItem(...args),
  },
}));

import React from 'react';
import { render, fireEvent, waitFor, act, within } from '@testing-library/react-native';
import LogFoodSheet from '../../../components/meal-plan/LogFoodSheet';

const MOCK_FOOD_ITEM = {
  id: 'fi-1',
  name: 'Chipotle Chicken Burrito Bowl',
  brand: 'Chipotle',
  category: 'restaurant',
  servingSize: '1 bowl (510g)',
  calories: 665,
  protein: 52,
  carbs: 55,
  fat: 25,
  fiber: 10,
  source: 'nutritionix' as const,
  externalId: 'nix-123',
  imageUrl: null,
  createdAt: '2026-04-17T00:00:00Z',
  updatedAt: '2026-04-17T00:00:00Z',
};

const BASE_PROPS = {
  visible: true,
  onClose: jest.fn(),
  onFoodLogged: jest.fn(),
  mealType: 'lunch' as const,
};

describe('LogFoodSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRecent.mockResolvedValue({ data: { items: [] } });
    mockGetFrequent.mockResolvedValue({ data: { items: [] } });
  });

  test('renders search bar and recent/frequent sections', async () => {
    mockGetRecent.mockResolvedValue({
      data: { items: [MOCK_FOOD_ITEM] },
    });

    const { getByPlaceholderText, getByText } = render(
      <LogFoodSheet {...BASE_PROPS} />,
    );

    expect(getByPlaceholderText(/search/i)).toBeTruthy();
    await waitFor(() => {
      expect(getByText('Recent Foods')).toBeTruthy();
    });
  });

  test('search shows results from API', async () => {
    mockSearch.mockResolvedValue({
      data: { results: [MOCK_FOOD_ITEM], source: 'nutritionix' },
    });

    const { getByPlaceholderText, getByText } = render(
      <LogFoodSheet {...BASE_PROPS} />,
    );

    const input = getByPlaceholderText(/search/i);
    await act(async () => {
      fireEvent.changeText(input, 'chipotle');
    });

    // Debounced search — wait for results
    await waitFor(
      () => {
        expect(getByText('Chipotle Chicken Burrito Bowl')).toBeTruthy();
      },
      { timeout: 2000 },
    );
  });

  test('tapping a food item shows confirm view with serving stepper', async () => {
    mockSearch.mockResolvedValue({
      data: { results: [MOCK_FOOD_ITEM], source: 'cache' },
    });

    const { getByPlaceholderText, getByText } = render(
      <LogFoodSheet {...BASE_PROPS} />,
    );

    await act(async () => {
      fireEvent.changeText(getByPlaceholderText(/search/i), 'chipotle');
    });

    await waitFor(() => {
      expect(getByText('Chipotle Chicken Burrito Bowl')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('Chipotle Chicken Burrito Bowl'));
    });

    // Should show serving stepper and Log button
    expect(getByText(/1 serving/)).toBeTruthy();
    expect(getByText('Log lunch')).toBeTruthy();
  });

  test('serving size adjustment recalculates macros', async () => {
    mockSearch.mockResolvedValue({
      data: { results: [MOCK_FOOD_ITEM], source: 'cache' },
    });

    const { getByPlaceholderText, getByText, getByLabelText } = render(
      <LogFoodSheet {...BASE_PROPS} />,
    );

    await act(async () => {
      fireEvent.changeText(getByPlaceholderText(/search/i), 'chipotle');
    });

    await waitFor(() => {
      expect(getByText('Chipotle Chicken Burrito Bowl')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('Chipotle Chicken Burrito Bowl'));
    });

    // Default is 1 serving — should show original macros
    expect(getByText('665')).toBeTruthy();

    // Tap "+" to increase servings (0.5 increment → 1.5)
    const plusButton = getByLabelText('Increase servings');
    await act(async () => {
      fireEvent.press(plusButton);
    });
    await act(async () => {
      fireEvent.press(plusButton);
    });

    // 2 servings: 665*2 = 1330
    expect(getByText('1330')).toBeTruthy();
  });

  test('logging a food item calls API and triggers onFoodLogged', async () => {
    mockSearch.mockResolvedValue({
      data: { results: [MOCK_FOOD_ITEM], source: 'cache' },
    });
    mockLogFood.mockResolvedValue({ data: { meal: { id: 'meal-1' } } });

    const { getByPlaceholderText, getByText } = render(
      <LogFoodSheet {...BASE_PROPS} />,
    );

    await act(async () => {
      fireEvent.changeText(getByPlaceholderText(/search/i), 'chipotle');
    });

    await waitFor(() => {
      expect(getByText('Chipotle Chicken Burrito Bowl')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('Chipotle Chicken Burrito Bowl'));
    });

    // Tap Log button
    const logButton = getByText('Log lunch');
    await act(async () => {
      fireEvent.press(logButton);
    });

    await waitFor(() => {
      expect(mockLogFood).toHaveBeenCalledWith({
        foodItemId: 'fi-1',
        mealType: 'lunch',
        servings: 1,
      });
      expect(BASE_PROPS.onFoodLogged).toHaveBeenCalled();
    });
  });

  test('one-tap re-log from recent foods', async () => {
    mockGetRecent.mockResolvedValue({
      data: { items: [MOCK_FOOD_ITEM] },
    });

    const { getByText } = render(<LogFoodSheet {...BASE_PROPS} />);

    await waitFor(() => {
      expect(getByText('Chipotle Chicken Burrito Bowl')).toBeTruthy();
    });

    // Tapping a recent food shows confirm view (not immediate log)
    await act(async () => {
      fireEvent.press(getByText('Chipotle Chicken Burrito Bowl'));
    });

    expect(getByText(/1 serving/)).toBeTruthy();
  });

  test('"Can\'t find it?" shows manual entry form', async () => {
    const { getByText } = render(<LogFoodSheet {...BASE_PROPS} />);

    await waitFor(() => {
      expect(getByText(/can't find/i)).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText(/can't find/i));
    });

    // Should show manual entry fields
    expect(getByText(/add your own/i)).toBeTruthy();
  });
});
