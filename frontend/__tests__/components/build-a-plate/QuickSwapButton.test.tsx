// frontend/__tests__/components/build-a-plate/QuickSwapButton.test.tsx
// Group 10X — single-tap swap-to-best-alternative button on slot card right edge.

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', isDark: false, colors: { background: '#FAF7F4' } }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import QuickSwapButton from '../../../components/build-a-plate/QuickSwapButton';
import type { MealComponent } from '../../../lib/api';

const makeComponent = (overrides: Partial<MealComponent>): MealComponent => ({
  id: 'c1',
  slot: 'protein',
  name: 'Salmon',
  defaultPortionGrams: 150,
  caloriesPerPortion: 280,
  proteinG: 30,
  carbsG: 0,
  fatG: 18,
  fiberG: 0,
  cuisineTags: [],
  dietaryTags: [],
  cookMethodHint: 'pan_sear',
  pantryIngredientNames: ['salmon'],
  pantryCoveragePercent: 100,
  ...overrides,
});

const ALT = makeComponent({ id: 'tofu', name: 'Tofu' });

describe('<QuickSwapButton />', () => {
  it('exposes the swap target name in the accessibility label', () => {
    const { getByTestId } = render(
      <QuickSwapButton topAlternative={ALT} onSwap={jest.fn()} testID="quick-swap" />,
    );
    expect(getByTestId('quick-swap').props.accessibilityLabel).toMatch(/Tofu/i);
  });

  it('calls onSwap with the alternative id when pressed', () => {
    const onSwap = jest.fn();
    const { getByTestId } = render(
      <QuickSwapButton topAlternative={ALT} onSwap={onSwap} testID="quick-swap" />,
    );
    fireEvent.press(getByTestId('quick-swap'));
    expect(onSwap).toHaveBeenCalledWith('tofu');
  });

  it('renders nothing when there is no alternative', () => {
    const { queryByTestId } = render(
      <QuickSwapButton topAlternative={null} onSwap={jest.fn()} testID="quick-swap" />,
    );
    expect(queryByTestId('quick-swap')).toBeNull();
  });
});
