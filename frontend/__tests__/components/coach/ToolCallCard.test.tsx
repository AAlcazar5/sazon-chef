// 10Y Phase 3: Coach inline tool-call cards — recipe carousel + macros/pantry summary.

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ToolCallCard from '../../../components/coach/ToolCallCard';

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const recipeResult = {
  recipes: [
    {
      id: 'r1',
      title: 'Mediterranean Chicken Bowl',
      cuisine: 'Mediterranean',
      cookTime: 25,
      calories: 520,
      protein: 42,
      carbs: 38,
      fat: 18,
      imageUrl: null,
      personalization: {
        pantryCoverage: 0.85,
        macroFit: 'green' as const,
        affinityScore: 87.5,
      },
    },
    {
      id: 'r2',
      title: 'Greek Salad',
      cuisine: 'Greek',
      cookTime: 10,
      calories: 280,
      protein: 12,
      carbs: 18,
      fat: 14,
      imageUrl: null,
      personalization: {
        pantryCoverage: 0.4,
        macroFit: 'amber' as const,
        affinityScore: 62.0,
      },
    },
  ],
};

describe('ToolCallCard — find_recipes / search_cookbook variant', () => {
  it('renders recipe titles with personalization overlays', () => {
    const { getByText } = render(
      <ToolCallCard name="find_recipes" result={recipeResult} />
    );
    expect(getByText('Mediterranean Chicken Bowl')).toBeTruthy();
    expect(getByText('Greek Salad')).toBeTruthy();
    // pantryCoverage chip — 85%
    expect(getByText(/85%/)).toBeTruthy();
    // macroFit pill — green / amber labels
    expect(getByText(/green/i)).toBeTruthy();
    expect(getByText(/amber/i)).toBeTruthy();
  });

  it('shows the affinity score on each recipe', () => {
    const { getByText } = render(
      <ToolCallCard name="find_recipes" result={recipeResult} />
    );
    expect(getByText(/88/)).toBeTruthy();
    expect(getByText(/62/)).toBeTruthy();
  });

  it('navigates to recipe detail on tap', () => {
    mockPush.mockClear();
    const { getByLabelText } = render(
      <ToolCallCard name="find_recipes" result={recipeResult} />
    );
    fireEvent.press(getByLabelText(/Mediterranean Chicken Bowl/));
    expect(mockPush).toHaveBeenCalledWith('/recipe/r1');
  });

  it('renders search_cookbook variant the same way', () => {
    const { getByText } = render(
      <ToolCallCard name="search_cookbook" result={recipeResult} />
    );
    expect(getByText('Mediterranean Chicken Bowl')).toBeTruthy();
  });
});

describe('ToolCallCard — get_pantry variant', () => {
  it('renders compact pantry summary, no carousel', () => {
    const pantryResult = {
      pantry: [
        { id: 'p1', name: 'chicken thigh', category: 'protein' },
        { id: 'p2', name: 'lemon', category: 'produce' },
        { id: 'p3', name: 'olive oil', category: 'pantry' },
      ],
      leftoverInventory: [
        {
          id: 'l1',
          componentId: 'c1',
          slot: 'protein',
          portionsRemaining: 2,
          expiresAt: '2026-05-08T00:00:00Z',
        },
      ],
    };
    const { getByText, queryByLabelText } = render(
      <ToolCallCard name="get_pantry" result={pantryResult} />
    );
    expect(getByText(/3 items/i)).toBeTruthy();
    expect(getByText(/1 leftover/i)).toBeTruthy();
    // No recipe a11y label
    expect(queryByLabelText(/Mediterranean Chicken Bowl/)).toBeNull();
  });
});

describe('ToolCallCard — compose_plate variant', () => {
  it('renders happy path with macros, pantry coverage, and allergen-safe badge', () => {
    const composeResult = {
      plateId: 'plate-1',
      slots: [
        { slot: 'protein', componentId: 'c1', name: 'Grilled Chicken' },
        { slot: 'base', componentId: 'c2', name: 'Brown Rice' },
      ],
      totalMacros: { calories: 520, protein: 42, carbs: 38, fat: 18 },
      pantryCoverage: 80,
      allergenSafe: true as const,
    };
    const { getByText, getByLabelText } = render(
      <ToolCallCard name="compose_plate" result={composeResult} />
    );
    expect(getByText(/plate composed/i)).toBeTruthy();
    expect(getByText(/80%/)).toBeTruthy();
    expect(getByText(/allergen safe/i)).toBeTruthy();
    expect(getByText(/520 cal/i)).toBeTruthy();
    expect(getByLabelText(/compose-plate result/i)).toBeTruthy();
  });

  it('navigates to build-a-plate composer on tap', () => {
    mockPush.mockClear();
    const composeResult = {
      plateId: 'plate-42',
      slots: [{ slot: 'protein', componentId: 'c1', name: 'X' }],
      totalMacros: { calories: 100, protein: 10, carbs: 5, fat: 2 },
      pantryCoverage: 50,
      allergenSafe: true as const,
    };
    const { getByLabelText } = render(
      <ToolCallCard name="compose_plate" result={composeResult} />
    );
    fireEvent.press(getByLabelText(/compose-plate result/i));
    expect(mockPush).toHaveBeenCalledWith(
      '/build-a-plate?prefilledPlateId=plate-42',
    );
  });

  it('renders amber allergen-blocked card when violations present', () => {
    const blocked = {
      allergenSafe: { violations: ['peanut'] },
      slots: [{ slot: 'protein', componentId: 'c1', name: 'Peanut Chicken' }],
    };
    const { getByText, getByLabelText } = render(
      <ToolCallCard name="compose_plate" result={blocked} />
    );
    expect(getByText(/allergen blocked/i)).toBeTruthy();
    expect(getByText(/peanut/i)).toBeTruthy();
    expect(getByLabelText(/allergen blocked plate/i)).toBeTruthy();
  });
});

describe('ToolCallCard — log_meal variant', () => {
  it('renders Logged chip with totalCalories + mealType', () => {
    const logResult = {
      id: 'mh-1',
      totalCalories: 520,
      totalProtein: 42,
      totalCarbs: 38,
      totalFat: 18,
      mealType: 'dinner',
      eatenAt: '2026-05-03T18:00:00Z',
    };
    const { getByText, getByLabelText } = render(
      <ToolCallCard name="log_meal" result={logResult} />
    );
    expect(getByText(/logged/i)).toBeTruthy();
    expect(getByText(/520 cal/i)).toBeTruthy();
    expect(getByText(/dinner/i)).toBeTruthy();
    expect(getByLabelText(/logged meal/i)).toBeTruthy();
  });

  it('navigates to meal-plan on tap', () => {
    mockPush.mockClear();
    const logResult = {
      id: 'mh-1',
      totalCalories: 200,
      totalProtein: 10,
      totalCarbs: 20,
      totalFat: 5,
      mealType: 'snack',
    };
    const { getByLabelText } = render(
      <ToolCallCard name="log_meal" result={logResult} />
    );
    fireEvent.press(getByLabelText(/logged meal/i));
    expect(mockPush).toHaveBeenCalledWith('/meal-plan');
  });
});

describe('ToolCallCard — get_today_remaining_macros variant', () => {
  it('renders compact macro summary', () => {
    const macroResult = {
      remaining: {
        calories: 320,
        protein: 22,
        carbs: 30,
        fat: 10,
        fiber: 8,
      },
    };
    const { getByText } = render(
      <ToolCallCard name="get_today_remaining_macros" result={macroResult} />
    );
    expect(getByText(/320/)).toBeTruthy();
    expect(getByText(/22/)).toBeTruthy();
  });

  it('renders fallback when macros are null', () => {
    const { getByText } = render(
      <ToolCallCard
        name="get_today_remaining_macros"
        result={{ remaining: null }}
      />
    );
    expect(getByText(/no goal set/i)).toBeTruthy();
  });
});
