// frontend/__tests__/components/cookbook/CollectionStatsBar.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import CollectionStatsBar from '../../../components/cookbook/CollectionStatsBar';

const makeRecipe = (overrides = {}) => ({
  cookTime: 30,
  calories: 400,
  protein: 25,
  cuisine: 'Italian',
  ...overrides,
});

describe('CollectionStatsBar', () => {
  it('returns null when recipes is empty', () => {
    const { toJSON } = render(<CollectionStatsBar recipes={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('returns null when recipes is undefined', () => {
    const { toJSON } = render(<CollectionStatsBar recipes={undefined as any} />);
    expect(toJSON()).toBeNull();
  });

  it('shows recipe count', () => {
    const { getByText } = render(
      <CollectionStatsBar recipes={[makeRecipe(), makeRecipe(), makeRecipe()]} />,
    );
    expect(getByText('3')).toBeTruthy();
  });

  it('shows average cook time rounded', () => {
    const recipes = [makeRecipe({ cookTime: 10 }), makeRecipe({ cookTime: 20 })];
    const { getByText } = render(<CollectionStatsBar recipes={recipes} />);
    expect(getByText('15 min')).toBeTruthy();
  });

  it('shows average protein rounded', () => {
    const recipes = [makeRecipe({ protein: 10 }), makeRecipe({ protein: 30 })];
    const { getByText } = render(<CollectionStatsBar recipes={recipes} />);
    expect(getByText('20g')).toBeTruthy();
  });

  it('shows top cuisine by frequency', () => {
    const recipes = [
      makeRecipe({ cuisine: 'Mexican' }),
      makeRecipe({ cuisine: 'Mexican' }),
      makeRecipe({ cuisine: 'Italian' }),
    ];
    const { getByText } = render(<CollectionStatsBar recipes={recipes} />);
    expect(getByText('Mexican')).toBeTruthy();
  });

  it('handles single recipe correctly', () => {
    const { getByText } = render(
      <CollectionStatsBar recipes={[makeRecipe({ cookTime: 45, protein: 35, cuisine: 'Thai' })]} />,
    );
    expect(getByText('1')).toBeTruthy();
    expect(getByText('45 min')).toBeTruthy();
    expect(getByText('35g')).toBeTruthy();
    expect(getByText('Thai')).toBeTruthy();
  });

  it('rounds averages to nearest integer', () => {
    const recipes = [makeRecipe({ cookTime: 10 }), makeRecipe({ cookTime: 11 }), makeRecipe({ cookTime: 12 })];
    const { getByText } = render(<CollectionStatsBar recipes={recipes} />);
    expect(getByText('11 min')).toBeTruthy();
  });
});
