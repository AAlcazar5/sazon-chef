// frontend/__tests__/components/today/NutritionStrip.test.tsx
// ROADMAP 4.0 D14 — daily nutrient strip on Today.

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import NutritionStrip from '../../../components/today/NutritionStrip';
import { DAILY_TOP_NUTRIENTS } from '../../../constants/Nutrients';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

const SAMPLE_SNAPSHOT = {
  date: '2026-05-05',
  mealCount: 2,
  calories: 1450,
  protein: 88,
  fiber: 24,
  iron: 14,
  magnesium: 320,
  b12: 3.1,
};

describe('NutritionStrip (D14)', () => {
  it('renders a pill per top-6 nutrient', () => {
    const { getByTestId } = render(
      <NutritionStrip snapshot={SAMPLE_SNAPSHOT} />,
    );
    for (const key of DAILY_TOP_NUTRIENTS) {
      expect(getByTestId(`nutrition-pill-${key}`)).toBeTruthy();
    }
  });

  it('renders nothing when density is minimal', () => {
    const { queryByTestId } = render(
      <NutritionStrip snapshot={SAMPLE_SNAPSHOT} density="minimal" />,
    );
    expect(queryByTestId('nutrition-strip')).toBeNull();
    expect(queryByTestId('nutrition-strip-empty')).toBeNull();
  });

  it('renders the empty-state copy when no nutrient values are present', () => {
    const { getByTestId } = render(
      <NutritionStrip snapshot={{ date: '2026-05-05', mealCount: 0 }} />,
    );
    expect(getByTestId('nutrition-strip-empty')).toBeTruthy();
  });

  it('renders nothing when snapshot is null', () => {
    const { queryByTestId } = render(<NutritionStrip snapshot={null} />);
    expect(queryByTestId('nutrition-strip')).toBeNull();
    expect(queryByTestId('nutrition-strip-empty')).toBeNull();
  });

  it('only renders pills for nutrients that have a value (skips missing)', () => {
    const partial = { date: '2026-05-05', mealCount: 1, calories: 600, protein: 32 };
    const { getByTestId, queryByTestId } = render(<NutritionStrip snapshot={partial} />);
    expect(getByTestId('nutrition-pill-calories')).toBeTruthy();
    expect(getByTestId('nutrition-pill-protein')).toBeTruthy();
    expect(queryByTestId('nutrition-pill-iron')).toBeNull();
    expect(queryByTestId('nutrition-pill-magnesium')).toBeNull();
  });

  it('fires onPress when a pill is tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <NutritionStrip snapshot={SAMPLE_SNAPSHOT} onPress={onPress} />,
    );
    fireEvent.press(getByTestId('nutrition-pill-iron'));
    expect(onPress).toHaveBeenCalled();
  });

  it('exposes a friendly accessibility label with value + DV%', () => {
    const { getByLabelText } = render(<NutritionStrip snapshot={SAMPLE_SNAPSHOT} />);
    // iron 14mg, DV=18mg → 78%
    expect(getByLabelText(/Iron: 14 mg.*78%/i)).toBeTruthy();
  });
});
