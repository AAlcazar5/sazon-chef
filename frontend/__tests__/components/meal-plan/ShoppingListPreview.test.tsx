// frontend/__tests__/components/meal-plan/ShoppingListPreview.test.tsx
// ROADMAP 4.0 Tier SH — inline shopping-list preview (lobby surface on Week tab).

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: {
      background: '#FAF7F4',
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    },
  }),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ShoppingListPreview from '../../../components/meal-plan/ShoppingListPreview';

describe('<ShoppingListPreview />', () => {
  it('renders the empty/start state when totalCount is 0 (lets the user create a list)', () => {
    const onPress = jest.fn();
    const { getByTestId, getByText } = render(
      <ShoppingListPreview totalCount={0} unpurchasedCount={0} onPress={onPress} />,
    );
    // Card is always visible — no empty placeholder branch any more.
    expect(getByTestId('shopping-list-preview')).toBeTruthy();
    expect(getByText('START SHOPPING')).toBeTruthy();
    expect(getByText('No list yet — start one.')).toBeTruthy();
    expect(getByText(/create your first shopping list/i)).toBeTruthy();
    // Tap routes to /shopping-list, which already exposes the Create New
    // List affordance in its header for users with no lists.
    fireEvent.press(getByTestId('shopping-list-preview'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders the in-progress headline with the unpurchased count', () => {
    const { getByText, getByTestId } = render(
      <ShoppingListPreview totalCount={15} unpurchasedCount={12} onPress={jest.fn()} />,
    );
    expect(getByTestId('shopping-list-preview')).toBeTruthy();
    expect(getByText('SHOP THIS WEEK')).toBeTruthy();
    expect(getByText('12 items left to grab.')).toBeTruthy();
    // Supporting copy reflects partial progress.
    expect(getByText(/3 of 15 grabbed/)).toBeTruthy();
  });

  it('uses singular "item" copy when exactly one is left', () => {
    const { getByText } = render(
      <ShoppingListPreview totalCount={5} unpurchasedCount={1} onPress={jest.fn()} />,
    );
    expect(getByText('1 item left to grab.')).toBeTruthy();
  });

  it('renders the all-grabbed headline when unpurchasedCount is 0', () => {
    const { getByText } = render(
      <ShoppingListPreview totalCount={12} unpurchasedCount={0} onPress={jest.fn()} />,
    );
    expect(getByText('SHOP COMPLETE')).toBeTruthy();
    expect(getByText("You've grabbed all 12.")).toBeTruthy();
    expect(getByText(/list archived/i)).toBeTruthy();
  });

  it('drops the "X of Y" supporting line when nothing has been grabbed yet', () => {
    const { queryByText, getByText } = render(
      <ShoppingListPreview totalCount={10} unpurchasedCount={10} onPress={jest.fn()} />,
    );
    expect(getByText('10 items left to grab.')).toBeTruthy();
    expect(queryByText(/0 of 10 grabbed/i)).toBeNull();
    expect(getByText(/focused in-store list/i)).toBeTruthy();
  });

  it('fires onPress when tapped (routes to focused shop mode)', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ShoppingListPreview totalCount={5} unpurchasedCount={5} onPress={onPress} />,
    );
    fireEvent.press(getByTestId('shopping-list-preview'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes accessibilityRole="button" with a descriptive label', () => {
    const { getByTestId } = render(
      <ShoppingListPreview totalCount={8} unpurchasedCount={3} onPress={jest.fn()} />,
    );
    const node = getByTestId('shopping-list-preview');
    expect(node.props.accessibilityRole).toBe('button');
    expect(node.props.accessibilityLabel).toMatch(/SHOP THIS WEEK/);
    expect(node.props.accessibilityLabel).toMatch(/3 items left to grab/);
  });
});
