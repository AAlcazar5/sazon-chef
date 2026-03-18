// frontend/__tests__/components/ShoppingListItem.test.tsx

import React from 'react';
import { TouchableOpacity } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import ShoppingListItem from '../../components/shopping/ShoppingListItem';
import { ShoppingListItem as ShoppingListItemType } from '../../types';

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHapticTouchableOpacity(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../components/ui/Icon', () => {
  const { Text } = require('react-native');
  return function MockIcon({ accessibilityLabel }: { accessibilityLabel?: string }) {
    return <Text testID="icon-el">{accessibilityLabel || 'icon'}</Text>;
  };
});

const makeItem = (overrides: Partial<ShoppingListItemType> = {}): ShoppingListItemType => ({
  id: 'item-1',
  name: 'Chicken breast',
  quantity: '2 lbs',
  category: 'Meat',
  purchased: false,
  price: 0,
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

describe('ShoppingListItem', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the item name', () => {
    const { getByText } = render(
      <ShoppingListItem item={makeItem()} {...defaultProps} />
    );
    expect(getByText('Chicken breast')).toBeTruthy();
  });

  it('renders quantity when provided', () => {
    const { getByText } = render(
      <ShoppingListItem item={makeItem({ quantity: '2 lbs' })} {...defaultProps} />
    );
    expect(getByText('2 lbs')).toBeTruthy();
  });

  it('renders price when non-zero', () => {
    const { getByText } = render(
      <ShoppingListItem item={makeItem({ price: 5.99 })} {...defaultProps} />
    );
    expect(getByText('$5.99')).toBeTruthy();
  });

  it('does not render price when zero', () => {
    const { queryByText } = render(
      <ShoppingListItem item={makeItem({ price: 0 })} {...defaultProps} />
    );
    expect(queryByText('$0.00')).toBeNull();
  });

  it('renders checkmark icon always (shown/hidden via animated opacity)', () => {
    // The checkmark Icon always renders — Animated.View controls visibility via opacity.
    // Both purchased and unpurchased states render the Purchased accessibility label.
    const { getAllByTestId } = render(
      <ShoppingListItem item={makeItem({ purchased: false })} {...defaultProps} />
    );
    expect(getAllByTestId('icon-el').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Purchased checkmark accessibility label when item is purchased', () => {
    const { getByText } = render(
      <ShoppingListItem item={makeItem({ purchased: true })} {...defaultProps} />
    );
    expect(getByText('Purchased')).toBeTruthy();
  });

  it('applies dimmed text class when item is purchased', () => {
    const { getByText } = render(
      <ShoppingListItem item={makeItem({ purchased: true })} {...defaultProps} />
    );
    const nameEl = getByText('Chicken breast');
    expect(nameEl.props.className).toContain('text-gray-400');
  });

  it('applies normal text class when item is not purchased', () => {
    const { getByText } = render(
      <ShoppingListItem item={makeItem({ purchased: false })} {...defaultProps} />
    );
    const nameEl = getByText('Chicken breast');
    expect(nameEl.props.className).toContain('text-gray-900');
  });

  it('calls onTogglePurchased when checkbox TouchableOpacity is pressed outside selection mode', () => {
    const onTogglePurchased = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <ShoppingListItem
        item={makeItem()}
        {...defaultProps}
        onTogglePurchased={onTogglePurchased}
      />
    );
    // First TouchableOpacity is the checkbox
    const checkboxTouchable = UNSAFE_getAllByType(TouchableOpacity)[0];
    fireEvent.press(checkboxTouchable);
    expect(onTogglePurchased).toHaveBeenCalledWith(expect.objectContaining({ id: 'item-1' }));
  });

  it('calls onEditQuantity when row name is tapped outside selection mode', () => {
    const onEditQuantity = jest.fn();
    const { getByText } = render(
      <ShoppingListItem
        item={makeItem()}
        {...defaultProps}
        onEditQuantity={onEditQuantity}
      />
    );
    fireEvent.press(getByText('Chicken breast'));
    expect(onEditQuantity).toHaveBeenCalledWith(expect.objectContaining({ name: 'Chicken breast' }));
  });

  it('calls onToggleSelection when row is tapped in selection mode', () => {
    const onToggleSelection = jest.fn();
    const { getByText } = render(
      <ShoppingListItem
        item={makeItem()}
        {...defaultProps}
        selectionMode={true}
        onToggleSelection={onToggleSelection}
      />
    );
    fireEvent.press(getByText('Chicken breast'));
    expect(onToggleSelection).toHaveBeenCalledWith('item-1');
  });

  it('calls onLongPress when row is long-pressed outside selection mode', () => {
    const onLongPress = jest.fn();
    const { getByText } = render(
      <ShoppingListItem
        item={makeItem()}
        {...defaultProps}
        onLongPress={onLongPress}
      />
    );
    fireEvent(getByText('Chicken breast'), 'longPress');
    expect(onLongPress).toHaveBeenCalledWith('item-1');
  });

  it('does not call onLongPress when in selection mode', () => {
    const onLongPress = jest.fn();
    const { getByText } = render(
      <ShoppingListItem
        item={makeItem()}
        {...defaultProps}
        selectionMode={true}
        onLongPress={onLongPress}
      />
    );
    fireEvent(getByText('Chicken breast'), 'longPress');
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('shows Selected checkmark when in selection mode and selected', () => {
    const { getByText } = render(
      <ShoppingListItem
        item={makeItem()}
        {...defaultProps}
        selectionMode={true}
        isSelected={true}
      />
    );
    expect(getByText('Selected')).toBeTruthy();
  });

  it('shows Skip button in in-store mode for non-purchased, non-cant-find item', () => {
    const { getByText } = render(
      <ShoppingListItem
        item={makeItem({ purchased: false })}
        {...defaultProps}
        inStoreMode={true}
        isCantFind={false}
      />
    );
    expect(getByText('Skip')).toBeTruthy();
  });

  it('calls onCantFind when Skip button is pressed', () => {
    const onCantFind = jest.fn();
    const { getByText } = render(
      <ShoppingListItem
        item={makeItem({ purchased: false })}
        {...defaultProps}
        inStoreMode={true}
        isCantFind={false}
        onCantFind={onCantFind}
      />
    );
    fireEvent.press(getByText('Skip'));
    expect(onCantFind).toHaveBeenCalledWith('item-1');
  });

  it('shows Skipped badge when isCantFind is true', () => {
    const { getByText } = render(
      <ShoppingListItem
        item={makeItem({ purchased: false })}
        {...defaultProps}
        inStoreMode={true}
        isCantFind={true}
      />
    );
    expect(getByText('Skipped')).toBeTruthy();
  });

  it('does not show Skip button for purchased items in in-store mode', () => {
    const { queryByText } = render(
      <ShoppingListItem
        item={makeItem({ purchased: true })}
        {...defaultProps}
        inStoreMode={true}
      />
    );
    expect(queryByText('Skip')).toBeNull();
  });

  it('uses larger font in in-store mode', () => {
    const { getByText } = render(
      <ShoppingListItem
        item={makeItem()}
        {...defaultProps}
        inStoreMode={true}
      />
    );
    const nameEl = getByText('Chicken breast');
    expect(nameEl.props.style).toMatchObject({ fontSize: 17 });
  });

  it('uses standard font outside in-store mode', () => {
    const { getByText } = render(
      <ShoppingListItem item={makeItem()} {...defaultProps} />
    );
    const nameEl = getByText('Chicken breast');
    expect(nameEl.props.style).toMatchObject({ fontSize: 15 });
  });

  // ─── Recipe Context Tag Tests ──────────────────────────────────────

  it('shows recipe title tag when item has recipe context', () => {
    const item = makeItem({
      recipeId: 'recipe-1',
      recipe: { id: 'recipe-1', title: 'Thai Basil Chicken' } as any,
    });
    const { getByText } = render(
      <ShoppingListItem item={item} {...defaultProps} />
    );
    expect(getByText('Thai Basil Chicken')).toBeTruthy();
  });

  it('does not show recipe tag when groupByRecipe is true', () => {
    const item = makeItem({
      recipeId: 'recipe-1',
      recipe: { id: 'recipe-1', title: 'Thai Basil Chicken' } as any,
    });
    const { queryByText } = render(
      <ShoppingListItem item={item} {...defaultProps} groupByRecipe={true} />
    );
    expect(queryByText('Thai Basil Chicken')).toBeNull();
  });

  it('does not show recipe tag when item is purchased', () => {
    const item = makeItem({
      purchased: true,
      recipeId: 'recipe-1',
      recipe: { id: 'recipe-1', title: 'Thai Basil Chicken' } as any,
    });
    const { queryByText } = render(
      <ShoppingListItem item={item} {...defaultProps} />
    );
    expect(queryByText('Thai Basil Chicken')).toBeNull();
  });

  it('does not show recipe tag when item has no recipe', () => {
    const { queryByText } = render(
      <ShoppingListItem item={makeItem()} {...defaultProps} />
    );
    expect(queryByText('Thai Basil Chicken')).toBeNull();
  });
});
