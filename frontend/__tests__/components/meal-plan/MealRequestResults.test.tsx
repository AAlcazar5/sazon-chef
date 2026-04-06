// frontend/__tests__/components/meal-plan/MealRequestResults.test.tsx
// Tests for MealRequestResults (10C: Find Me a Meal results view)

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
jest.mock('../../../lib/api', () => ({
  mealPlanApi: { addRecipeToMeal: jest.fn().mockResolvedValue({ data: {} }) },
  cookbookApi: { saveRecipe: jest.fn().mockResolvedValue({ data: {} }) },
}));

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import MealRequestResults from '../../../components/meal-plan/MealRequestResults';
import { mealPlanApi } from '../../../lib/api';

const RECIPE = {
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

const OPTION = {
  recipe: RECIPE,
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

const BASE_PROPS = {
  options: [OPTION],
  totalMatches: 1,
  generatedCount: 0,
  onAddToPlan: jest.fn(),
  onGenerateMore: jest.fn(),
  onClose: jest.fn(),
  targetDate: '2026-04-06',
  targetMealType: 'dinner' as const,
  isDark: false,
};

describe('MealRequestResults', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders recipe title', () => {
    const { getByText } = render(<MealRequestResults {...BASE_PROPS} />);
    expect(getByText('Grilled Chicken Bowl')).toBeTruthy();
  });

  it('shows matchScore for each option', () => {
    const { getByText } = render(<MealRequestResults {...BASE_PROPS} />);
    expect(getByText(/92/)).toBeTruthy();
  });

  it('shows green macro pills for met constraints', () => {
    const { getByText } = render(<MealRequestResults {...BASE_PROPS} />);
    // protein met → shows protein value
    expect(getByText(/42g protein/i)).toBeTruthy();
  });

  it('shows cuisine badge', () => {
    const { getByText } = render(<MealRequestResults {...BASE_PROPS} />);
    expect(getByText('American')).toBeTruthy();
  });

  it('shows cook time and difficulty', () => {
    const { getByText } = render(<MealRequestResults {...BASE_PROPS} />);
    expect(getByText(/25 min/i)).toBeTruthy();
    expect(getByText(/easy/i)).toBeTruthy();
  });

  it('calls onAddToPlan when "Add to Plan" is pressed', async () => {
    const onAddToPlan = jest.fn();
    const { getByText } = render(
      <MealRequestResults {...BASE_PROPS} onAddToPlan={onAddToPlan} />
    );
    await act(async () => { fireEvent.press(getByText(/add to plan/i)); });
    expect(onAddToPlan).toHaveBeenCalledWith(RECIPE);
  });

  it('calls onGenerateMore when "None of these" link is pressed', () => {
    const onGenerateMore = jest.fn();
    const { getByText } = render(
      <MealRequestResults {...BASE_PROPS} onGenerateMore={onGenerateMore} />
    );
    fireEvent.press(getByText(/none of these/i));
    expect(onGenerateMore).toHaveBeenCalled();
  });

  it('renders multiple options', () => {
    const option2 = { ...OPTION, recipe: { ...RECIPE, id: 'r2', title: 'Salmon Tacos' }, matchScore: 85 };
    const { getByText } = render(
      <MealRequestResults {...BASE_PROPS} options={[OPTION, option2]} totalMatches={2} />
    );
    expect(getByText('Grilled Chicken Bowl')).toBeTruthy();
    expect(getByText('Salmon Tacos')).toBeTruthy();
  });

  it('shows generatedCount info when AI recipes were generated', () => {
    const { getByText } = render(
      <MealRequestResults {...BASE_PROPS} generatedCount={2} />
    );
    expect(getByText(/2.*generated/i)).toBeTruthy();
  });

  it('each option card has accessibilityLabel', () => {
    const { getByLabelText } = render(<MealRequestResults {...BASE_PROPS} />);
    expect(getByLabelText(/Grilled Chicken Bowl/i)).toBeTruthy();
  });
});
