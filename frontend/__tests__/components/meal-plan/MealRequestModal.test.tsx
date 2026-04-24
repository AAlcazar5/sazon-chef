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
    const { getByLabelText } = render(<MealRequestModal {...BASE_PROPS} />);
    const findButton = getByLabelText('Find meals');
    await act(async () => { fireEvent.press(findButton); });
    expect(mockFindRecipes).toHaveBeenCalledWith(
      expect.objectContaining({ count: expect.any(Number) })
    );
  });

  it('calls onClose when close button is tapped', () => {
    const onClose = jest.fn();
    const { getAllByLabelText } = render(
      <MealRequestModal {...BASE_PROPS} onClose={onClose} />
    );
    const closeButtons = getAllByLabelText('Close');
    fireEvent.press(closeButtons[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('applying "High Protein" preset sets protein min to 35', async () => {
    const { getByText, getByLabelText } = render(<MealRequestModal {...BASE_PROPS} />);
    fireEvent.press(getByText(/High Protein/i));
    const findButton = getByLabelText('Find meals');
    await act(async () => { fireEvent.press(findButton); });
    expect(mockFindRecipes).toHaveBeenCalledWith(
      expect.objectContaining({ protein: expect.objectContaining({ min: 35 }) })
    );
  });

  it('applying "Low Cal" preset sets calories max to 400', async () => {
    const { getByText, getByLabelText } = render(<MealRequestModal {...BASE_PROPS} />);
    fireEvent.press(getByText(/Low Cal/i));
    const findButton = getByLabelText('Find meals');
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

  it('renders macro sliders including calorie max constraint', () => {
    const { getByText, getAllByText } = render(<MealRequestModal {...BASE_PROPS} />);
    expect(getAllByText(/Calories/i).length).toBeGreaterThanOrEqual(1);
    expect(getByText(/Macro Targets/i)).toBeTruthy();
    expect(getAllByText(/Fat/i).length).toBeGreaterThanOrEqual(1);
    expect(getAllByText(/Fiber/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders meal type selector with options', () => {
    const { getByText } = render(<MealRequestModal {...BASE_PROPS} />);
    expect(getByText('Breakfast')).toBeTruthy();
    expect(getByText('Lunch')).toBeTruthy();
    expect(getByText('Dinner')).toBeTruthy();
  });

  it('shows request history when available', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const historyEntry = { count: 3, protein: { min: 30 } };
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify([historyEntry]));

    const { getByText } = render(<MealRequestModal {...BASE_PROPS} />);
    await act(async () => {});
    expect(getByText(/Recent Searches/i)).toBeTruthy();
  });

  describe('Cuisine family chips', () => {
    it('renders cuisine family chips', () => {
      const { getByText } = render(<MealRequestModal {...BASE_PROPS} />);
      expect(getByText('Latin American')).toBeTruthy();
      expect(getByText('Asian')).toBeTruthy();
      expect(getByText('European')).toBeTruthy();
      expect(getByText('Mediterranean')).toBeTruthy();
    });

    it('tapping a family chip expands to show subcuisines', () => {
      const { getByText, queryByText } = render(<MealRequestModal {...BASE_PROPS} />);
      expect(queryByText('Mexican')).toBeNull();
      fireEvent.press(getByText('Latin American'));
      expect(getByText('Mexican')).toBeTruthy();
      expect(getByText('Brazilian')).toBeTruthy();
      expect(getByText('Peruvian')).toBeTruthy();
    });

    it('multi-select cuisines sends cuisineFamilies in request', async () => {
      const { getByText, getByLabelText } = render(<MealRequestModal {...BASE_PROPS} />);
      fireEvent.press(getByText('Latin American'));
      fireEvent.press(getByText('Asian'));
      const findButton = getByLabelText('Find meals');
      await act(async () => { fireEvent.press(findButton); });
      expect(mockFindRecipes).toHaveBeenCalledWith(
        expect.objectContaining({ cuisineFamilies: expect.arrayContaining(['Latin American', 'Asian']) })
      );
    });

    it('selecting subcuisine sends it in cuisines param', async () => {
      const { getByText, getByLabelText } = render(<MealRequestModal {...BASE_PROPS} />);
      fireEvent.press(getByText('Latin American'));
      fireEvent.press(getByText('Mexican'));
      const findButton = getByLabelText('Find meals');
      await act(async () => { fireEvent.press(findButton); });
      expect(mockFindRecipes).toHaveBeenCalledWith(
        expect.objectContaining({ cuisines: ['Mexican'] })
      );
    });
  });
});
