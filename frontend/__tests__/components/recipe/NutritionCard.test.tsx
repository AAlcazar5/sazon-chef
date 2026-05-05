// frontend/__tests__/components/recipe/NutritionCard.test.tsx
// ROADMAP 4.0 D14 — recipe-detail nutrition card.

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import NutritionCard from '../../../components/recipe/NutritionCard';
import { pickSurpriseNutrient, RECIPE_CORE_NUTRIENTS } from '../../../constants/Nutrients';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

const SAMPLE_AGGREGATE = {
  ingredientCoverage: 0.95,
  calories: 420,
  protein: 28,
  fat: 18,
  carbs: 32,
  fiber: 7,
  iron: 3.2,
  magnesium: 80,
  b12: 1.4,
  omega3: 0.4,
  // Add a few extras so the "see all" expansion has more rows than the
  // featured slice.
  vitC: 45,
  vitK: 120,
  potassium: 700,
  calcium: 200,
  zinc: 4,
  folate: 180,
};

describe('NutritionCard (D14)', () => {
  it('renders the top-N featured rows for macros + micros density', () => {
    const { getByTestId, queryByTestId } = render(
      <NutritionCard recipeId="r1" aggregate={SAMPLE_AGGREGATE} density="macros + micros" />,
    );
    // Core 7 always present
    for (const key of RECIPE_CORE_NUTRIENTS) {
      expect(getByTestId(`nutrition-row-${key}`)).toBeTruthy();
    }
    // Surprise pick (key varies by recipeId hash, just check 1 surprise row exists)
    const surprise = pickSurpriseNutrient('r1', new Set(RECIPE_CORE_NUTRIENTS));
    expect(getByTestId(`nutrition-row-${surprise}`)).toBeTruthy();

    // 'See all' visible since the aggregate has more than the featured slice.
    expect(getByTestId('nutrition-card-see-all')).toBeTruthy();
    expect(queryByTestId('nutrition-card-collapse')).toBeNull();
  });

  it('renders nothing when density is minimal', () => {
    const { queryByTestId } = render(
      <NutritionCard recipeId="r1" aggregate={SAMPLE_AGGREGATE} density="minimal" />,
    );
    expect(queryByTestId('nutrition-card')).toBeNull();
  });

  it('renders nothing when aggregate is null', () => {
    const { queryByTestId } = render(
      <NutritionCard recipeId="r1" aggregate={null} />,
    );
    expect(queryByTestId('nutrition-card')).toBeNull();
  });

  it('shows "Approximate" pill when ingredientCoverage is below threshold', () => {
    const lowCov = { ...SAMPLE_AGGREGATE, ingredientCoverage: 0.4 };
    const { getByTestId } = render(<NutritionCard recipeId="r1" aggregate={lowCov} />);
    expect(getByTestId('nutrition-card-approximate')).toBeTruthy();
  });

  it('hides "Approximate" pill when coverage is high', () => {
    const { queryByTestId } = render(<NutritionCard recipeId="r1" aggregate={SAMPLE_AGGREGATE} />);
    expect(queryByTestId('nutrition-card-approximate')).toBeNull();
  });

  it('expands to show all available nutrients on "See all"', () => {
    const { getByTestId, queryByTestId } = render(
      <NutritionCard recipeId="r1" aggregate={SAMPLE_AGGREGATE} density="macros + micros" />,
    );
    fireEvent.press(getByTestId('nutrition-card-see-all'));
    // After expansion, additional rows should be present
    expect(getByTestId('nutrition-row-potassium')).toBeTruthy();
    expect(getByTestId('nutrition-row-calcium')).toBeTruthy();
    expect(getByTestId('nutrition-card-collapse')).toBeTruthy();
    expect(queryByTestId('nutrition-card-see-all')).toBeNull();
  });

  it('renders a DV bar for nutrients with a defined DV target', () => {
    const { getByTestId } = render(<NutritionCard recipeId="r1" aggregate={SAMPLE_AGGREGATE} />);
    // iron DV = 18mg, so 3.2mg → 18% bar
    expect(getByTestId('nutrition-row-iron-bar')).toBeTruthy();
  });

  it('surprise nutrient is stable across re-renders for the same recipeId', () => {
    const surprise1 = pickSurpriseNutrient('recipe_abc', new Set(RECIPE_CORE_NUTRIENTS));
    const surprise2 = pickSurpriseNutrient('recipe_abc', new Set(RECIPE_CORE_NUTRIENTS));
    expect(surprise1).toBe(surprise2);
  });

  it('different recipeIds can pick different surprise nutrients (anti-monotony)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      seen.add(pickSurpriseNutrient(`recipe_${i}`, new Set(RECIPE_CORE_NUTRIENTS)));
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
