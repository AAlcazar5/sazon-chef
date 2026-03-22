// frontend/__tests__/components/MacroRingGrid.test.tsx
// Tests for the MacroRingGrid 2x2 macro visualization

import React from 'react';
import { render } from '@testing-library/react-native';
import MacroRingGrid from '../../components/ui/MacroRingGrid';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = {
    ...jest.requireActual('react-native-reanimated/mock'),
    createAnimatedComponent: (component: any) => component,
  };
  return Reanimated;
});

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <View {...props} />,
    Svg: (props: any) => <View {...props} />,
    Circle: (props: any) => <View {...props} />,
  };
});

describe('MacroRingGrid', () => {
  const baseMacros = {
    calories: 450,
    protein: 35,
    carbs: 55,
    fat: 12,
  };

  it('renders all 4 macro labels', () => {
    const { getByText } = render(
      <MacroRingGrid macros={baseMacros} />
    );
    expect(getByText('Cal')).toBeTruthy();
    expect(getByText('Protein')).toBeTruthy();
    expect(getByText('Carbs')).toBeTruthy();
    expect(getByText('Fat')).toBeTruthy();
  });

  it('renders with targets for progress calculation', () => {
    const targets = { calories: 2000, protein: 150, carbs: 250, fat: 65 };
    const { getByTestId } = render(
      <MacroRingGrid macros={baseMacros} targets={targets} testID="macro-grid" />
    );
    expect(getByTestId('macro-grid')).toBeTruthy();
  });

  it('renders without targets (defaults to 100%)', () => {
    const { getByTestId } = render(
      <MacroRingGrid macros={baseMacros} testID="macro-grid" />
    );
    expect(getByTestId('macro-grid')).toBeTruthy();
  });

  it('handles zero values gracefully', () => {
    const zeroMacros = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const { getByTestId } = render(
      <MacroRingGrid macros={zeroMacros} testID="macro-grid" />
    );
    expect(getByTestId('macro-grid')).toBeTruthy();
  });

  it('handles large numbers without layout break', () => {
    const largeMacros = { calories: 2500, protein: 200, carbs: 300, fat: 100 };
    const { getByTestId } = render(
      <MacroRingGrid macros={largeMacros} testID="macro-grid" />
    );
    expect(getByTestId('macro-grid')).toBeTruthy();
  });
});
