// frontend/__tests__/components/CollectionSavePicker.test.tsx
// Phase 5: CollectionSavePicker — collection rows render, selection toggles, save fires onSave

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CollectionSavePicker from '../../components/cookbook/CollectionSavePicker';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  return function MockHTO(props: any) {
    return require('react').createElement(require('react-native').TouchableOpacity, props);
  };
});

jest.mock('../../components/ui/Icon', () => {
  return function MockIcon({ accessibilityLabel }: any) {
    return require('react').createElement(
      require('react-native').Text,
      { accessibilityLabel },
      accessibilityLabel || 'icon',
    );
  };
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

const collections = [
  { id: 'col-1', name: 'Favourites', recipeCount: 4 },
  { id: 'col-2', name: 'Weeknight Dinners', recipeCount: 7 },
  { id: 'col-3', name: 'Meal Prep', recipeCount: 2 },
];

const baseProps = {
  visible: true,
  onClose: jest.fn(),
  collections,
  selectedCollectionIds: [],
  onSelectionChange: jest.fn(),
  onSave: jest.fn(),
  onCreateCollection: jest.fn(),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CollectionSavePicker', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders all collection names', () => {
    const { getByText } = render(<CollectionSavePicker {...baseProps} />);
    expect(getByText('Favourites')).toBeTruthy();
    expect(getByText('Weeknight Dinners')).toBeTruthy();
    expect(getByText('Meal Prep')).toBeTruthy();
  });

  it('renders recipe counts for each collection', () => {
    const { getByText } = render(<CollectionSavePicker {...baseProps} />);
    expect(getByText('4 recipes')).toBeTruthy();
    expect(getByText('7 recipes')).toBeTruthy();
    expect(getByText('2 recipes')).toBeTruthy();
  });

  it('calls onSelectionChange with the tapped collection added', () => {
    const onSelectionChange = jest.fn();
    const { getByText } = render(
      <CollectionSavePicker {...baseProps} onSelectionChange={onSelectionChange} />
    );
    fireEvent.press(getByText('Favourites'));
    expect(onSelectionChange).toHaveBeenCalledWith(['col-1']);
  });

  it('calls onSelectionChange with correct id when second collection is tapped', () => {
    const onSelectionChange = jest.fn();
    const { getByText } = render(
      <CollectionSavePicker {...baseProps} onSelectionChange={onSelectionChange} />
    );
    fireEvent.press(getByText('Weeknight Dinners'));
    expect(onSelectionChange).toHaveBeenCalledWith(['col-2']);
  });

  it('deselects a collection when it is tapped while already selected', () => {
    const onSelectionChange = jest.fn();
    const { getByText } = render(
      <CollectionSavePicker
        {...baseProps}
        selectedCollectionIds={['col-1']}
        onSelectionChange={onSelectionChange}
      />
    );
    fireEvent.press(getByText('Favourites'));
    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });

  it('preserves existing selection when a new collection is added', () => {
    const onSelectionChange = jest.fn();
    const { getByText } = render(
      <CollectionSavePicker
        {...baseProps}
        selectedCollectionIds={['col-1']}
        onSelectionChange={onSelectionChange}
      />
    );
    fireEvent.press(getByText('Meal Prep'));
    expect(onSelectionChange).toHaveBeenCalledWith(['col-1', 'col-3']);
  });

  it('calls onSave when Save button is pressed', () => {
    const onSave = jest.fn();
    const { getByText } = render(
      <CollectionSavePicker {...baseProps} onSave={onSave} />
    );
    fireEvent.press(getByText('Save'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel button is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <CollectionSavePicker {...baseProps} onClose={onClose} />
    );
    fireEvent.press(getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows "Save to Collection" header', () => {
    const { getByText } = render(<CollectionSavePicker {...baseProps} />);
    expect(getByText('Save to Collection')).toBeTruthy();
  });

  it('shows "+ Create new collection" link', () => {
    const { getByText } = render(<CollectionSavePicker {...baseProps} />);
    expect(getByText('+ Create new collection')).toBeTruthy();
  });

  it('does not render when visible is false', () => {
    const { queryByText } = render(
      <CollectionSavePicker {...baseProps} visible={false} />
    );
    expect(queryByText('Favourites')).toBeNull();
  });
});
