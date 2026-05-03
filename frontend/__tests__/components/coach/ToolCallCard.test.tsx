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
