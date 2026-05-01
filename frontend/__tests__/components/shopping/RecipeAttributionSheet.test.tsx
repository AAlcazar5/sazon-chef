// frontend/__tests__/components/shopping/RecipeAttributionSheet.test.tsx
// TDD: Task 1 — RecipeAttributionSheet lists source recipes as tappable rows

import React from 'react';
import { TouchableOpacity } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import RecipeAttributionSheet from '../../../components/shopping/RecipeAttributionSheet';

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHapticTouchableOpacity(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ push: mockPush })),
  router: { push: mockPush },
}));

const sampleRecipes = [
  { id: 'recipe-1', title: 'Thai Basil Chicken', imageUrl: null },
  { id: 'recipe-2', title: 'Garlic Butter Pasta', imageUrl: null },
];

describe('RecipeAttributionSheet', () => {
  const onClose = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders nothing when visible is false', () => {
    const { queryByText } = render(
      <RecipeAttributionSheet visible={false} recipes={sampleRecipes} onClose={onClose} />
    );
    expect(queryByText('Thai Basil Chicken')).toBeNull();
  });

  it('renders all source recipe rows when visible', () => {
    const { getByText } = render(
      <RecipeAttributionSheet visible={true} recipes={sampleRecipes} onClose={onClose} />
    );
    expect(getByText('Thai Basil Chicken')).toBeTruthy();
    expect(getByText('Garlic Butter Pasta')).toBeTruthy();
  });

  it('navigates to recipe detail when a row is tapped', () => {
    const { getAllByLabelText } = render(
      <RecipeAttributionSheet visible={true} recipes={sampleRecipes} onClose={onClose} />
    );
    const row = getAllByLabelText('Go to Thai Basil Chicken')[0];
    fireEvent.press(row);
    expect(mockPush).toHaveBeenCalledWith('/recipe/recipe-1');
  });

  it('calls onClose when close button is pressed', () => {
    const { getByLabelText } = render(
      <RecipeAttributionSheet visible={true} recipes={sampleRecipes} onClose={onClose} />
    );
    fireEvent.press(getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('each recipe row has an accessibilityLabel', () => {
    const { getByLabelText } = render(
      <RecipeAttributionSheet visible={true} recipes={sampleRecipes} onClose={onClose} />
    );
    expect(getByLabelText('Go to Thai Basil Chicken')).toBeTruthy();
    expect(getByLabelText('Go to Garlic Butter Pasta')).toBeTruthy();
  });

  it('renders empty state message when no recipes', () => {
    const { getByText } = render(
      <RecipeAttributionSheet visible={true} recipes={[]} onClose={onClose} />
    );
    expect(getByText('No source recipes')).toBeTruthy();
  });
});
