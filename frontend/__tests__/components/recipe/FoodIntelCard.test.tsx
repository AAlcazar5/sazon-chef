// frontend/__tests__/components/recipe/FoodIntelCard.test.tsx
// Group 10R Surface 1 — collapsible Food Intel card on recipe detail.

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' },
}));

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

jest.mock('../../../lib/foodIntelMatcher', () => ({
  matchFoodIntelTips: jest.fn(),
  recordTipEngagement: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../hooks/useFoodIntelUserState', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import FoodIntelCard from '../../../components/recipe/FoodIntelCard';
import { matchFoodIntelTips, recordTipEngagement } from '../../../lib/foodIntelMatcher';
import useFoodIntelUserState from '../../../hooks/useFoodIntelUserState';

const TIP = {
  id: 'sf-turmeric-pepper',
  category: 'superfood' as const,
  trigger: 'turmeric',
  title: 'Pair turmeric with black pepper',
  body: 'Black pepper boosts curcumin absorption from turmeric by up to 2,000%. A pinch is enough.',
  tags: ['turmeric', 'black pepper'],
  personalizationKeys: {
    cuisine: ['indian'],
    nutrient: ['anti-inflammatory'],
    skillTier: ['beginner', 'cook', 'chef'] as Array<'beginner' | 'cook' | 'chef'>,
    goalPhase: ['any'] as Array<'cut' | 'maintain' | 'bulk' | 'recomp' | 'any'>,
  },
};

const USER_STATE = {
  userId: 'user-123',
  cookHistory: { cuisines: ['indian'] },
  topAffinityIngredients: [],
  rolling7dNutrientGaps: [],
  skillTier: 'cook' as const,
  goalPhase: 'maintain' as const,
};

describe('FoodIntelCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useFoodIntelUserState as jest.Mock).mockReturnValue(USER_STATE);
    (matchFoodIntelTips as jest.Mock).mockResolvedValue([TIP]);
  });

  it('renders when a tip is matched', async () => {
    const { getByText } = render(
      <FoodIntelCard ingredients={['turmeric', 'chicken']} recipeId="r1" />,
    );
    await waitFor(() => {
      expect(getByText(TIP.title)).toBeTruthy();
    });
  });

  it('hides when no tip matches', async () => {
    (matchFoodIntelTips as jest.Mock).mockResolvedValue([]);
    const { queryByTestId } = render(
      <FoodIntelCard ingredients={['salt']} recipeId="r2" testID="food-intel-card" />,
    );
    await waitFor(() => {
      expect((matchFoodIntelTips as jest.Mock)).toHaveBeenCalled();
    });
    expect(queryByTestId('food-intel-card')).toBeNull();
  });

  it('is collapsed by default — only title visible, not body', async () => {
    const { getByText, queryByText } = render(
      <FoodIntelCard ingredients={['turmeric']} recipeId="r3" />,
    );
    await waitFor(() => {
      expect(getByText(TIP.title)).toBeTruthy();
    });
    expect(queryByText(TIP.body)).toBeNull();
  });

  it('expands on tap to show body', async () => {
    const { getByTestId, getByText } = render(
      <FoodIntelCard ingredients={['turmeric']} recipeId="r4" testID="food-intel-card" />,
    );
    await waitFor(() => {
      expect(getByText(TIP.title)).toBeTruthy();
    });
    await act(async () => {
      fireEvent.press(getByTestId('food-intel-card-toggle'));
    });
    expect(getByText(TIP.body)).toBeTruthy();
  });

  it('shows correct tip title and body content', async () => {
    const { getByTestId, getByText } = render(
      <FoodIntelCard ingredients={['turmeric']} recipeId="r5" testID="food-intel-card" />,
    );
    await waitFor(() => {
      expect(getByText(TIP.title)).toBeTruthy();
    });
    await act(async () => {
      fireEvent.press(getByTestId('food-intel-card-toggle'));
    });
    expect(getByText(TIP.title)).toBeTruthy();
    expect(getByText(TIP.body)).toBeTruthy();
  });

  it('exposes accessibilityLabel on toggle', async () => {
    const { getByTestId } = render(
      <FoodIntelCard ingredients={['turmeric']} recipeId="r6" testID="food-intel-card" />,
    );
    await waitFor(() => {
      expect(getByTestId('food-intel-card-toggle')).toBeTruthy();
    });
    const toggle = getByTestId('food-intel-card-toggle');
    expect(toggle.props.accessibilityLabel).toBeTruthy();
  });

  it('records engagement on first expand', async () => {
    const { getByTestId, getByText } = render(
      <FoodIntelCard ingredients={['turmeric']} recipeId="r7" testID="food-intel-card" />,
    );
    await waitFor(() => {
      expect(getByText(TIP.title)).toBeTruthy();
    });
    await act(async () => {
      fireEvent.press(getByTestId('food-intel-card-toggle'));
    });
    expect(recordTipEngagement).toHaveBeenCalledWith('user-123', TIP.id, 'expanded');
    // collapse + re-expand should not double-fire
    await act(async () => {
      fireEvent.press(getByTestId('food-intel-card-toggle'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('food-intel-card-toggle'));
    });
    expect(recordTipEngagement).toHaveBeenCalledTimes(1);
  });
});
