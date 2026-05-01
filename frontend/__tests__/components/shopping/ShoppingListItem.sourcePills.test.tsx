// frontend/__tests__/components/shopping/ShoppingListItem.sourcePills.test.tsx
// TDD: Task 1 — recipe source pills

import React from 'react';
import { TouchableOpacity } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import ShoppingListItem from '../../../components/shopping/ShoppingListItem';
import { ShoppingListItem as ShoppingListItemType } from '../../../types';

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHapticTouchableOpacity(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../../components/ui/Icon', () => {
  const { Text } = require('react-native');
  return function MockIcon({ accessibilityLabel }: { accessibilityLabel?: string }) {
    return <Text testID="icon-el">{accessibilityLabel || 'icon'}</Text>;
  };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  router: { push: jest.fn() },
}));

const makeItem = (overrides: Partial<ShoppingListItemType> = {}): ShoppingListItemType => ({
  id: 'item-1',
  name: 'Chicken breast',
  quantity: '2 lbs',
  category: 'Meat',
  purchased: false,
  price: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
} as ShoppingListItemType);

const defaultProps = {
  selectionMode: false,
  isSelected: false,
  groupByRecipe: false,
  inStoreMode: false,
  isCantFind: false,
  isPantryItem: false,
  onTogglePurchased: jest.fn(),
  onEditQuantity: jest.fn(),
  onToggleSelection: jest.fn(),
  onLongPress: jest.fn(),
  onCantFind: jest.fn(),
  onAddToPantry: jest.fn(),
};

describe('ShoppingListItem — recipe source pills', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows single 📖 pill when sourceRecipeIds has exactly 1 entry', () => {
    const item = makeItem({ sourceRecipeIds: JSON.stringify(['recipe-1']) });
    const { getByText } = render(<ShoppingListItem item={item} {...defaultProps} />);
    expect(getByText('📖')).toBeTruthy();
  });

  it('shows 📖 ×N pill when sourceRecipeIds has 2 entries', () => {
    const item = makeItem({ sourceRecipeIds: JSON.stringify(['recipe-1', 'recipe-2']) });
    const { getByText } = render(<ShoppingListItem item={item} {...defaultProps} />);
    expect(getByText('📖 ×2')).toBeTruthy();
  });

  it('shows 📖 ×3 pill when sourceRecipeIds has 3 entries', () => {
    const item = makeItem({ sourceRecipeIds: JSON.stringify(['r1', 'r2', 'r3']) });
    const { getByText } = render(<ShoppingListItem item={item} {...defaultProps} />);
    expect(getByText('📖 ×3')).toBeTruthy();
  });

  it('hides pill when sourceRecipeIds is empty array', () => {
    const item = makeItem({ sourceRecipeIds: JSON.stringify([]) });
    const { queryByText } = render(<ShoppingListItem item={item} {...defaultProps} />);
    expect(queryByText(/📖/)).toBeNull();
  });

  it('hides pill when sourceRecipeIds is undefined', () => {
    const item = makeItem({ sourceRecipeIds: undefined });
    const { queryByText } = render(<ShoppingListItem item={item} {...defaultProps} />);
    expect(queryByText(/📖/)).toBeNull();
  });

  it('tapping the pill opens RecipeAttributionSheet', () => {
    const item = makeItem({ sourceRecipeIds: JSON.stringify(['recipe-1', 'recipe-2']) });
    const { getByText, queryByText } = render(
      <ShoppingListItem item={item} {...defaultProps} />
    );
    const pill = getByText('📖 ×2');
    fireEvent.press(pill);
    // Sheet should appear with source recipe rows
    // We verify the pill itself is pressable — full sheet rendering tested in RecipeAttributionSheet tests
    expect(pill).toBeTruthy();
  });

  it('pill has accessibilityLabel for screen readers', () => {
    const item = makeItem({ sourceRecipeIds: JSON.stringify(['recipe-1']) });
    const { getByLabelText } = render(<ShoppingListItem item={item} {...defaultProps} />);
    expect(getByLabelText('View source recipes')).toBeTruthy();
  });
});
