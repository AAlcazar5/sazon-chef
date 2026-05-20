// Founder ask 2026-05-20 round 10: alternates peek fills the 1/3 of
// viewport below the 2/3-height main card. Tapping an alternate fires
// onPickAlternate with the index — wired in coach.tsx to setRecipeIndex.

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RecipeAlternatesPeek from '../../../components/cooking/RecipeAlternatesPeek';
import type { RecipeCardPayload } from '../../../lib/coach/findOrGenerateRecipe';

const ALTS: RecipeCardPayload[] = [
  {
    title: 'Italian Grilled Chicken',
    description: '',
    cuisine: 'Italian',
    baseServings: 2,
    ingredients: [{ name: 'chicken', amount: 1, unit: 'lb' }],
    steps: ['Grill.'],
    imageUrls: ['https://example.com/italian.jpg'],
  },
  {
    title: 'Mexican Grilled Chicken',
    description: '',
    cuisine: 'Mexican',
    baseServings: 2,
    ingredients: [{ name: 'chicken', amount: 1, unit: 'lb' }],
    steps: ['Grill.'],
    imageUrls: ['https://example.com/mexican.jpg'],
  },
];

describe('<RecipeAlternatesPeek />', () => {
  it('renders nothing when alternates list is empty', () => {
    const { toJSON } = render(
      <RecipeAlternatesPeek alternates={[]} onPickAlternate={() => {}} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders the OTHER IDEAS header + a row per alternate', () => {
    const { getByText } = render(
      <RecipeAlternatesPeek alternates={ALTS} onPickAlternate={() => {}} />,
    );
    expect(getByText('OTHER IDEAS')).toBeTruthy();
    expect(getByText('Italian Grilled Chicken')).toBeTruthy();
    expect(getByText('Mexican Grilled Chicken')).toBeTruthy();
  });

  it('renders the cuisine subtitle when present', () => {
    const { getByText } = render(
      <RecipeAlternatesPeek alternates={ALTS} onPickAlternate={() => {}} />,
    );
    expect(getByText('Italian')).toBeTruthy();
    expect(getByText('Mexican')).toBeTruthy();
  });

  it('tapping an alternate fires onPickAlternate with its index', () => {
    const onPickAlternate = jest.fn();
    const { getByLabelText } = render(
      <RecipeAlternatesPeek alternates={ALTS} onPickAlternate={onPickAlternate} />,
    );
    fireEvent.press(getByLabelText(/Show Italian Grilled Chicken/i));
    expect(onPickAlternate).toHaveBeenCalledWith(0);
    fireEvent.press(getByLabelText(/Show Mexican Grilled Chicken/i));
    expect(onPickAlternate).toHaveBeenCalledWith(1);
  });

  it('caps display at 3 alternates (even when more are provided)', () => {
    const many = [
      ...ALTS,
      { ...ALTS[0], title: 'Third' },
      { ...ALTS[0], title: 'Fourth' },
    ];
    const { getByText, queryByText } = render(
      <RecipeAlternatesPeek alternates={many} onPickAlternate={() => {}} />,
    );
    expect(getByText('Italian Grilled Chicken')).toBeTruthy();
    expect(getByText('Mexican Grilled Chicken')).toBeTruthy();
    expect(getByText('Third')).toBeTruthy();
    expect(queryByText('Fourth')).toBeNull();
  });
});
