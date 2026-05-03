// frontend/__tests__/components/coach/QuickStartChips.test.tsx
// 10Y-B: Coach quick-start chips — fills composer, calls onSelect.

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import QuickStartChips from '../../../components/coach/QuickStartChips';

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

const sampleChips = [
  'Chicken thighs + 30 min — what should I make?',
  'I have leftover rice — bridge it forward',
  '320 cal under — got dessert ideas?',
  "Try a cuisine I haven't yet",
];

describe('QuickStartChips', () => {
  it('renders all four chips', () => {
    const { getByText } = render(
      <QuickStartChips chips={sampleChips} onSelect={jest.fn()} />
    );
    sampleChips.forEach(label => {
      expect(getByText(label)).toBeTruthy();
    });
  });

  it('calls onSelect with chip text when tapped', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <QuickStartChips chips={sampleChips} onSelect={onSelect} />
    );
    fireEvent.press(getByText(sampleChips[1]));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(sampleChips[1]);
  });
});

import { chipsFromCoachContext } from '../../../components/coach/QuickStartChips';

describe('chipsFromCoachContext — N=1 chip generation', () => {
  it('reflects expiring leftovers and remaining macros (not generic fallbacks)', () => {
    const chips = chipsFromCoachContext({
      pantryExpiringSoon: ['salmon'],
      remainingMacros: { calories: 320, protein: 22, carbs: 30, fat: 10 },
      leftoverInventory: [],
      topAdjacentCuisine: 'Greek',
    });
    expect(chips.length).toBe(4);
    expect(chips.some(c => /salmon/i.test(c))).toBe(true);
    expect(chips.some(c => /320/.test(c))).toBe(true);
    expect(chips.some(c => /Greek/i.test(c))).toBe(true);
  });

  it('falls back gracefully when no signals present', () => {
    const chips = chipsFromCoachContext({
      pantryExpiringSoon: [],
      remainingMacros: null,
      leftoverInventory: [],
      topAdjacentCuisine: null,
    });
    expect(chips.length).toBe(4);
    expect(chips.every(c => c.length > 0)).toBe(true);
  });
});
