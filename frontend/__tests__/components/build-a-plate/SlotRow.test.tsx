// SlotRow tests — covers the Phase 10 "✨ Estimated" chip on custom components.

import React from 'react';
import { render } from '@testing-library/react-native';
import SlotRow from '../../../components/build-a-plate/SlotRow';
import type { MealComponent } from '../../../lib/api';

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

const baseComponent: MealComponent = {
  id: 'mc_salmon_01',
  slot: 'protein',
  name: 'Wild salmon',
  defaultPortionGrams: 150,
  caloriesPerPortion: 250,
  proteinG: 30,
  carbsG: 0,
  fatG: 14,
  fiberG: 0,
  cuisineTags: ['Mediterranean'],
  dietaryTags: ['pescatarian'],
  cookMethodHint: 'pan_sear',
  pantryIngredientNames: ['salmon'],
  pantryCoveragePercent: 0,
};

const baseProps = {
  slot: 'protein' as const,
  label: 'Protein',
  emoji: '🐟',
  onPress: jest.fn(),
  onLongPress: jest.fn(),
  testID: 'slot-row-protein',
};

describe('SlotRow', () => {
  it('does NOT render the estimated chip for a normal (non-custom) component', () => {
    const { queryByTestId } = render(
      <SlotRow {...baseProps} selected={baseComponent} />,
    );
    expect(queryByTestId('slot-row-protein-estimated-chip')).toBeNull();
  });

  it('renders the "✨ Estimated" chip when the component id starts with "custom-"', () => {
    const custom: MealComponent = { ...baseComponent, id: `custom-${Date.now()}` };
    const { getByTestId } = render(
      <SlotRow {...baseProps} selected={custom} />,
    );
    const chip = getByTestId('slot-row-protein-estimated-chip');
    expect(chip).toBeTruthy();
    expect(chip.props.children).toBe('✨ Estimated');
  });

  it('renders no chip when no component is selected', () => {
    const { queryByTestId } = render(<SlotRow {...baseProps} />);
    expect(queryByTestId('slot-row-protein-estimated-chip')).toBeNull();
  });
});
