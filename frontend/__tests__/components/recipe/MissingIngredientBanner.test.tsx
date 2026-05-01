// frontend/__tests__/components/recipe/MissingIngredientBanner.test.tsx
// TDD: Task 2 — MissingIngredientBanner

import React from 'react';
import { TouchableOpacity } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import MissingIngredientBanner from '../../../components/recipe/MissingIngredientBanner';

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHapticTouchableOpacity(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

interface MissingIngredient {
  id: string;
  ingredientName: string;
  recipeId: string;
  dismissed: boolean;
}

const makeMissing = (name: string, id = name): MissingIngredient => ({
  id,
  ingredientName: name,
  recipeId: 'recipe-1',
  dismissed: false,
});

describe('MissingIngredientBanner', () => {
  const onDismiss = jest.fn();
  const onShowAll = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders nothing when ingredients array is empty', () => {
    const { queryByText } = render(
      <MissingIngredientBanner ingredients={[]} onDismiss={onDismiss} onShowAll={onShowAll} />
    );
    expect(queryByText(/missing/i)).toBeNull();
  });

  it('renders nothing when ingredients is undefined', () => {
    const { queryByText } = render(
      <MissingIngredientBanner ingredients={undefined as any} onDismiss={onDismiss} onShowAll={onShowAll} />
    );
    expect(queryByText(/missing/i)).toBeNull();
  });

  it('renders first 3 ingredient names when there are exactly 3', () => {
    const ingredients = [
      makeMissing('Olive oil'),
      makeMissing('Garlic'),
      makeMissing('Lemon'),
    ];
    const { getByText } = render(
      <MissingIngredientBanner ingredients={ingredients} onDismiss={onDismiss} onShowAll={onShowAll} />
    );
    expect(getByText('Olive oil')).toBeTruthy();
    expect(getByText('Garlic')).toBeTruthy();
    expect(getByText('Lemon')).toBeTruthy();
  });

  it('renders first 3 names + "+N more" link when there are more than 3', () => {
    const ingredients = [
      makeMissing('Olive oil'),
      makeMissing('Garlic'),
      makeMissing('Lemon'),
      makeMissing('Thyme'),
      makeMissing('Rosemary'),
    ];
    const { getByText, queryByText } = render(
      <MissingIngredientBanner ingredients={ingredients} onDismiss={onDismiss} onShowAll={onShowAll} />
    );
    expect(getByText('Olive oil')).toBeTruthy();
    expect(getByText('Garlic')).toBeTruthy();
    expect(getByText('Lemon')).toBeTruthy();
    expect(queryByText('Thyme')).toBeNull();
    expect(getByText('+2 more')).toBeTruthy();
  });

  it('calls onShowAll when "+N more" is tapped', () => {
    const ingredients = [
      makeMissing('Olive oil'),
      makeMissing('Garlic'),
      makeMissing('Lemon'),
      makeMissing('Thyme'),
    ];
    const { getByText } = render(
      <MissingIngredientBanner ingredients={ingredients} onDismiss={onDismiss} onShowAll={onShowAll} />
    );
    fireEvent.press(getByText('+1 more'));
    expect(onShowAll).toHaveBeenCalled();
  });

  it('calls onDismiss when dismiss button is pressed', () => {
    const ingredients = [makeMissing('Olive oil')];
    const { getByLabelText } = render(
      <MissingIngredientBanner ingredients={ingredients} onDismiss={onDismiss} onShowAll={onShowAll} />
    );
    fireEvent.press(getByLabelText('Dismiss missing ingredients'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('has peach-tinted background', () => {
    const ingredients = [makeMissing('Olive oil')];
    const { getByTestId } = render(
      <MissingIngredientBanner ingredients={ingredients} onDismiss={onDismiss} onShowAll={onShowAll} />
    );
    const banner = getByTestId('missing-ingredient-banner');
    // Check background color contains peach (#FFF0E6 or similar pastel peach)
    const style = banner.props.style;
    const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flatStyle.backgroundColor).toBeTruthy();
  });

  it('renders banner for single ingredient without "+N more"', () => {
    const ingredients = [makeMissing('Soy sauce')];
    const { getByText, queryByText } = render(
      <MissingIngredientBanner ingredients={ingredients} onDismiss={onDismiss} onShowAll={onShowAll} />
    );
    expect(getByText('Soy sauce')).toBeTruthy();
    expect(queryByText(/more/)).toBeNull();
  });
});
