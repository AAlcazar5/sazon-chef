import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HorizontalRecipeRow, {
  type HorizontalRecipeCard,
} from '../../../components/recipe/HorizontalRecipeRow';

const SAMPLE: HorizontalRecipeCard[] = [
  { id: 'r1', title: 'Recipe One', cuisine: 'Italian', cookTime: 25, imageUrl: null },
  { id: 'r2', title: 'Recipe Two', cuisine: 'Thai', cookTime: 20, imageUrl: 'https://example.com/r2.jpg' },
];

describe('HorizontalRecipeRow', () => {
  it('renders title + cards with prefixed testIDs', () => {
    const { getByTestId, getByText } = render(
      <HorizontalRecipeRow
        title="More like this"
        cards={SAMPLE}
        cardBackgroundColor="#FAEFE2"
        onCardPress={() => undefined}
        testID="more-like-this-row"
        cardTestIdPrefix="more-like-this-card"
      />,
    );
    expect(getByText('More like this')).toBeTruthy();
    expect(getByTestId('more-like-this-row')).toBeTruthy();
    expect(getByTestId('more-like-this-card-r1')).toBeTruthy();
    expect(getByTestId('more-like-this-card-r2')).toBeTruthy();
  });

  it('passes the card and its index to onCardPress', () => {
    const onCardPress = jest.fn();
    const { getByTestId } = render(
      <HorizontalRecipeRow
        title="Test"
        cards={SAMPLE}
        cardBackgroundColor="#fff"
        onCardPress={onCardPress}
        testID="t"
        cardTestIdPrefix="t-card"
      />,
    );
    fireEvent.press(getByTestId('t-card-r2'));
    expect(onCardPress).toHaveBeenCalledWith(SAMPLE[1], 1);
  });

  it('renders loading spinner block when loading is true', () => {
    const { getByTestId, queryByText } = render(
      <HorizontalRecipeRow
        title="Test"
        cards={[]}
        cardBackgroundColor="#fff"
        onCardPress={() => undefined}
        testID="t"
        cardTestIdPrefix="t-card"
        loading
      />,
    );
    expect(getByTestId('t-loading')).toBeTruthy();
    expect(queryByText('Test')).toBeNull();
  });

  it('renders cuisine + cookTime in the card sub line', () => {
    const { getByText } = render(
      <HorizontalRecipeRow
        title="Test"
        cards={SAMPLE}
        cardBackgroundColor="#fff"
        onCardPress={() => undefined}
        testID="t"
        cardTestIdPrefix="t-card"
      />,
    );
    expect(getByText('Italian · 25 min')).toBeTruthy();
    expect(getByText('Thai · 20 min')).toBeTruthy();
  });

  it('falls back to "Recipe" when cuisine is null', () => {
    const { getByText } = render(
      <HorizontalRecipeRow
        title="Test"
        cards={[{ id: 'x', title: 'X', cuisine: null, cookTime: null, imageUrl: null }]}
        cardBackgroundColor="#fff"
        onCardPress={() => undefined}
        testID="t"
        cardTestIdPrefix="t-card"
      />,
    );
    expect(getByText('Recipe')).toBeTruthy();
  });
});
