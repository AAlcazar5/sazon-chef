// frontend/__tests__/components/meal-plan/MealRequestModal.test.tsx
// Tests for MealRequestModal (10C: Find Me a Meal)

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: {}, theme: 'light', isDark: false }),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../lib/api', () => ({
  mealPlanApi: {
    findRecipes: jest.fn(),
  },
}));

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import MealRequestModal from '../../../components/meal-plan/MealRequestModal';
import { mealPlanApi } from '../../../lib/api';

const mockFindRecipes = mealPlanApi.findRecipes as jest.Mock;

const BASE_PROPS = {
  visible: true,
  onClose: jest.fn(),
  onMealSelected: jest.fn(),
  targetDate: '2026-04-06',
  targetMealType: 'dinner' as const,
  remainingCalories: 400,
  remainingProtein: 35,
};

const SAMPLE_RECIPE = {
  id: 'r1',
  title: 'Grilled Chicken Bowl',
  description: 'High protein bowl',
  cuisine: 'American',
  mealType: 'dinner',
  cookTime: 25,
  difficulty: 'easy',
  servings: 1,
  calories: 420,
  protein: 42,
  carbs: 30,
  fat: 8,
  fiber: 4,
  imageUrl: null,
};

const SAMPLE_OPTION = {
  recipe: SAMPLE_RECIPE,
  matchScore: 92,
  matchBreakdown: {
    caloriesInRange: true,
    proteinMet: true,
    fatMet: true,
    carbsMet: true,
    fiberMet: true,
    cuisineMatch: false,
  },
};

describe('MealRequestModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindRecipes.mockResolvedValue({
      data: { options: [SAMPLE_OPTION], totalMatches: 1, generatedCount: 0 },
    });
  });

  it('renders when visible', () => {
    const { getByText } = render(<MealRequestModal {...BASE_PROPS} />);
    expect(getByText(/find me a meal/i)).toBeTruthy();
  });

  it('does not crash when not visible', () => {
    const { queryByText } = render(<MealRequestModal {...BASE_PROPS} visible={false} />);
    expect(queryByText(/find me a meal/i)).toBeNull();
  });

  it('pre-populates remaining calories context message', () => {
    const { getByText } = render(<MealRequestModal {...BASE_PROPS} />);
    expect(getByText(/400/)).toBeTruthy();
  });

  it('pre-populates remaining protein context message', () => {
    const { getByText } = render(<MealRequestModal {...BASE_PROPS} />);
    expect(getByText(/35g/)).toBeTruthy();
  });

  it('shows smart macro presets', () => {
    const { getByText } = render(<MealRequestModal {...BASE_PROPS} />);
    expect(getByText(/High Protein/i)).toBeTruthy();
    expect(getByText(/Low Cal/i)).toBeTruthy();
    expect(getByText(/Balanced/i)).toBeTruthy();
  });

  it('calls findRecipes when user taps Find', async () => {
    const { getByText } = render(<MealRequestModal {...BASE_PROPS} />);
    const findButton = getByText(/find/i);
    await act(async () => { fireEvent.press(findButton); });
    expect(mockFindRecipes).toHaveBeenCalledWith(
      expect.objectContaining({ count: expect.any(Number) })
    );
  });

  it('calls onClose when close button is tapped', () => {
    const onClose = jest.fn();
    const { getByAccessibilityLabel } = render(
      <MealRequestModal {...BASE_PROPS} onClose={onClose} />
    );
    fireEvent.press(getByAccessibilityLabel('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('applying "High Protein" preset sets protein min to 35', async () => {
    const { getByText } = render(<MealRequestModal {...BASE_PROPS} />);
    fireEvent.press(getByText(/High Protein/i));
    // After preset applied, tapping Find should include protein constraint
    const findButton = getByText(/find/i);
    await act(async () => { fireEvent.press(findButton); });
    expect(mockFindRecipes).toHaveBeenCalledWith(
      expect.objectContaining({ protein: expect.objectContaining({ min: 35 }) })
    );
  });

  it('applying "Low Cal" preset sets calories max to 400', async () => {
    const { getByText } = render(<MealRequestModal {...BASE_PROPS} />);
    fireEvent.press(getByText(/Low Cal/i));
    const findButton = getByText(/find/i);
    await act(async () => { fireEvent.press(findButton); });
    expect(mockFindRecipes).toHaveBeenCalledWith(
      expect.objectContaining({ calories: expect.objectContaining({ max: 400 }) })
    );
  });

  it('count selector renders 1/3/5 options', () => {
    const { getByText } = render(<MealRequestModal {...BASE_PROPS} />);
    expect(getByText('1')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();
  });
});
