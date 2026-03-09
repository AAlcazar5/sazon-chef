// frontend/__tests__/components/ShoppingListCategory.test.tsx
// Phase 3: ShoppingListCategory — section completion flash when all items purchased

import React from 'react';
import { render } from '@testing-library/react-native';
import ShoppingListCategory from '../../components/shopping/ShoppingListCategory';
import { ShoppingListItem } from '../../types';

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHapticTouchableOpacity(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../components/ui/Icon', () => {
  const { Text } = require('react-native');
  return function MockIcon({ accessibilityLabel }: { accessibilityLabel?: string }) {
    return <Text>{accessibilityLabel || 'icon'}</Text>;
  };
});

jest.mock('../../components/ui/SwipeableItem', () => {
  return function MockSwipeableItem({ children }: any) {
    return children;
  };
});

jest.mock('../../components/shopping/ShoppingListItem', () => {
  const { Text } = require('react-native');
  return function MockShoppingListItem({ item }: { item: ShoppingListItem }) {
    return <Text testID={`item-${item.id}`}>{item.name}</Text>;
  };
});

const makeItem = (id: string, name: string, purchased = false): ShoppingListItem => ({
  id,
  name,
  quantity: '1',
  category: 'Produce',
  purchased,
  price: 0,
} as ShoppingListItem);

const defaultProps = {
  selectionMode: false,
  selectedItems: [],
  cantFindItems: [],
  inStoreMode: false,
  onTogglePurchased: jest.fn(),
  onEditQuantity: jest.fn(),
  onDeleteItem: jest.fn(),
  onToggleSelection: jest.fn(),
  onLongPress: jest.fn(),
  onCantFind: jest.fn(),
};

const makeGrouped = (items: ShoppingListItem[], recipeId = 'r1', recipeTitle = 'Pasta') => ({
  grouped: {
    [recipeId]: {
      recipe: { id: recipeId, title: recipeTitle },
      items,
    },
  },
  noRecipe: [],
});

describe('ShoppingListCategory', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders recipe group title', () => {
    const { getByText } = render(
      <ShoppingListCategory
        itemsByRecipe={makeGrouped([makeItem('i1', 'Tomato')])}
        {...defaultProps}
      />
    );
    expect(getByText('Pasta')).toBeTruthy();
  });

  it('shows item count in group header', () => {
    const { getByText } = render(
      <ShoppingListCategory
        itemsByRecipe={makeGrouped([makeItem('i1', 'Tomato'), makeItem('i2', 'Basil')])}
        {...defaultProps}
      />
    );
    expect(getByText('2 items')).toBeTruthy();
  });

  it('shows "1 item" (singular) for single-item groups', () => {
    const { getByText } = render(
      <ShoppingListCategory
        itemsByRecipe={makeGrouped([makeItem('i1', 'Tomato')])}
        {...defaultProps}
      />
    );
    expect(getByText('1 item')).toBeTruthy();
  });

  it('renders each item in the group', () => {
    const { getByTestId } = render(
      <ShoppingListCategory
        itemsByRecipe={makeGrouped([makeItem('i1', 'Tomato'), makeItem('i2', 'Basil')])}
        {...defaultProps}
      />
    );
    expect(getByTestId('item-i1')).toBeTruthy();
    expect(getByTestId('item-i2')).toBeTruthy();
  });

  it('shows "✓" suffix in title when all items are purchased', () => {
    const { getByText } = render(
      <ShoppingListCategory
        itemsByRecipe={makeGrouped([
          makeItem('i1', 'Tomato', true),
          makeItem('i2', 'Basil', true),
        ])}
        {...defaultProps}
      />
    );
    expect(getByText('Pasta ✓')).toBeTruthy();
  });

  it('does not show "✓" when some items are not purchased', () => {
    const { queryByText, getByText } = render(
      <ShoppingListCategory
        itemsByRecipe={makeGrouped([
          makeItem('i1', 'Tomato', true),
          makeItem('i2', 'Basil', false),
        ])}
        {...defaultProps}
      />
    );
    expect(queryByText('Pasta ✓')).toBeNull();
    expect(getByText('Pasta')).toBeTruthy();
  });

  it('does not show "✓" when group is empty', () => {
    const { queryByText } = render(
      <ShoppingListCategory
        itemsByRecipe={makeGrouped([])}
        {...defaultProps}
      />
    );
    expect(queryByText('Pasta ✓')).toBeNull();
  });

  it('renders "Other Items" section for noRecipe items', () => {
    const { getByText, getByTestId } = render(
      <ShoppingListCategory
        itemsByRecipe={{
          grouped: {},
          noRecipe: [makeItem('i3', 'Salt')],
        }}
        {...defaultProps}
      />
    );
    expect(getByText('Other Items')).toBeTruthy();
    expect(getByTestId('item-i3')).toBeTruthy();
  });

  it('renders multiple recipe groups', () => {
    const { getByText } = render(
      <ShoppingListCategory
        itemsByRecipe={{
          grouped: {
            r1: { recipe: { id: 'r1', title: 'Pasta' }, items: [makeItem('i1', 'Tomato')] },
            r2: { recipe: { id: 'r2', title: 'Salad' }, items: [makeItem('i2', 'Lettuce')] },
          },
          noRecipe: [],
        }}
        {...defaultProps}
      />
    );
    expect(getByText('Pasta')).toBeTruthy();
    expect(getByText('Salad')).toBeTruthy();
  });
});
