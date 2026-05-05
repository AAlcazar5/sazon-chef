// frontend/__tests__/components/meal-plan/PantrySheet.test.tsx
// ROADMAP 4.0 Tier A2-d — Pantry sheet (TDD).

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: {
      background: '#FAF7F4',
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    },
  }),
}));

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  return {
    __esModule: true,
    BottomSheetModal: React.forwardRef(({ children }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        present: jest.fn(),
        dismiss: jest.fn(),
      }));
      return children;
    }),
    BottomSheetView: ({ children }: any) => children,
    BottomSheetScrollView: ({ children }: any) => children,
    BottomSheetBackdrop: () => null,
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PantrySheet from '../../../components/meal-plan/PantrySheet';

const fakeItem = (overrides: Partial<{ id: string; name: string; category: string }> = {}) => ({
  id: overrides.id ?? 'item-1',
  name: overrides.name ?? 'olive oil',
  category: overrides.category ?? 'Pantry',
});

describe('<PantrySheet />', () => {
  it('renders the title "Your pantry" when visible', () => {
    const { getByText } = render(
      <PantrySheet
        visible={true}
        onClose={jest.fn()}
        items={[fakeItem()]}
        loading={false}
        onRemoveItem={jest.fn()}
        onWhatCanIMake={jest.fn()}
      />
    );
    expect(getByText(/Your pantry/i)).toBeTruthy();
  });

  it('renders empty state when there are no items', () => {
    const { getByText } = render(
      <PantrySheet
        visible={true}
        onClose={jest.fn()}
        items={[]}
        loading={false}
        onRemoveItem={jest.fn()}
        onWhatCanIMake={jest.fn()}
      />
    );
    expect(getByText(/no ingredients yet/i)).toBeTruthy();
  });

  it('renders item count when items exist', () => {
    const items = [fakeItem({ id: '1' }), fakeItem({ id: '2', name: 'salt' })];
    const { getByText } = render(
      <PantrySheet
        visible={true}
        onClose={jest.fn()}
        items={items}
        loading={false}
        onRemoveItem={jest.fn()}
        onWhatCanIMake={jest.fn()}
      />
    );
    expect(getByText(/2 ingredients/i)).toBeTruthy();
  });

  it('renders "What can I make right now?" CTA when items exist', () => {
    const onWhatCanIMake = jest.fn();
    const { getByTestId } = render(
      <PantrySheet
        visible={true}
        onClose={jest.fn()}
        items={[fakeItem()]}
        loading={false}
        onRemoveItem={jest.fn()}
        onWhatCanIMake={onWhatCanIMake}
      />
    );
    fireEvent.press(getByTestId('pantry-sheet-what-can-i-make'));
    expect(onWhatCanIMake).toHaveBeenCalledTimes(1);
  });

  it('does NOT render the "What can I make" CTA when pantry is empty', () => {
    const { queryByTestId } = render(
      <PantrySheet
        visible={true}
        onClose={jest.fn()}
        items={[]}
        loading={false}
        onRemoveItem={jest.fn()}
        onWhatCanIMake={jest.fn()}
      />
    );
    expect(queryByTestId('pantry-sheet-what-can-i-make')).toBeNull();
  });

  it('renders item names from props', () => {
    const items = [
      fakeItem({ id: '1', name: 'olive oil' }),
      fakeItem({ id: '2', name: 'sea salt' }),
    ];
    const { getByText } = render(
      <PantrySheet
        visible={true}
        onClose={jest.fn()}
        items={items}
        loading={false}
        onRemoveItem={jest.fn()}
        onWhatCanIMake={jest.fn()}
      />
    );
    expect(getByText(/olive oil/i)).toBeTruthy();
    expect(getByText(/sea salt/i)).toBeTruthy();
  });

  it('calls onRemoveItem with item id when item remove is tapped', () => {
    const onRemoveItem = jest.fn();
    const items = [fakeItem({ id: 'remove-target', name: 'paprika' })];
    const { getByTestId } = render(
      <PantrySheet
        visible={true}
        onClose={jest.fn()}
        items={items}
        loading={false}
        onRemoveItem={onRemoveItem}
        onWhatCanIMake={jest.fn()}
      />
    );
    fireEvent.press(getByTestId('pantry-sheet-remove-remove-target'));
    expect(onRemoveItem).toHaveBeenCalledWith('remove-target');
  });

  it('renders nothing when not visible', () => {
    const { queryByText } = render(
      <PantrySheet
        visible={false}
        onClose={jest.fn()}
        items={[fakeItem()]}
        loading={false}
        onRemoveItem={jest.fn()}
        onWhatCanIMake={jest.fn()}
      />
    );
    expect(queryByText(/Your pantry/i)).toBeNull();
  });
});
