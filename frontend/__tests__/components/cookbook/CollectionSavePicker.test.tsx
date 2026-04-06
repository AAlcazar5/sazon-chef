// frontend/__tests__/components/cookbook/CollectionSavePicker.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CollectionSavePicker from '../../../components/cookbook/CollectionSavePicker';

const COLLECTIONS = [
  { id: 'all', name: 'All Recipes', isDefault: true, recipeCount: 20 },
  { id: 'c1', name: 'Weeknight Dinners', recipeCount: 5 },
  { id: 'c2', name: 'Meal Prep', recipeCount: 8 },
  { id: 'c3', name: 'Date Night', recipeCount: 3 },
];

const baseProps = {
  visible: true,
  onClose: jest.fn(),
  collections: COLLECTIONS,
  selectedCollectionIds: [],
  onSelectionChange: jest.fn(),
  onSave: jest.fn(),
  onCreateCollection: jest.fn(),
};

describe('CollectionSavePicker', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders collection names', () => {
    const { getByText } = render(<CollectionSavePicker {...baseProps} />);
    expect(getByText('All Recipes')).toBeTruthy();
    expect(getByText('Weeknight Dinners')).toBeTruthy();
    expect(getByText('Meal Prep')).toBeTruthy();
  });

  it('calls onSelectionChange when a collection row is tapped', () => {
    const onSelectionChange = jest.fn();
    const { getByText } = render(
      <CollectionSavePicker {...baseProps} onSelectionChange={onSelectionChange} />,
    );
    fireEvent.press(getByText('Weeknight Dinners'));
    expect(onSelectionChange).toHaveBeenCalledWith(['c1']);
  });

  it('deselects already-selected collection', () => {
    const onSelectionChange = jest.fn();
    const { getByText } = render(
      <CollectionSavePicker
        {...baseProps}
        selectedCollectionIds={['c1']}
        onSelectionChange={onSelectionChange}
      />,
    );
    fireEvent.press(getByText('Weeknight Dinners'));
    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });

  it('calls onSave when Save is pressed', () => {
    const onSave = jest.fn();
    const { getByText } = render(<CollectionSavePicker {...baseProps} onSave={onSave} />);
    fireEvent.press(getByText('Save'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(<CollectionSavePicker {...baseProps} onClose={onClose} />);
    fireEvent.press(getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe('recently-used collections', () => {
    it('shows Recent section header when recentCollectionIds has matching collections', () => {
      const { getByTestId } = render(
        <CollectionSavePicker {...baseProps} recentCollectionIds={['c2', 'c1']} />,
      );
      expect(getByTestId('recent-section-header')).toBeTruthy();
    });

    it('does not show Recent header when recentCollectionIds is empty', () => {
      const { queryByTestId } = render(
        <CollectionSavePicker {...baseProps} recentCollectionIds={[]} />,
      );
      expect(queryByTestId('recent-section-header')).toBeNull();
    });

    it('does not show Recent header when recentCollectionIds is undefined', () => {
      const { queryByTestId } = render(<CollectionSavePicker {...baseProps} />);
      expect(queryByTestId('recent-section-header')).toBeNull();
    });

    it('recent collections appear before non-recent collections', () => {
      const { getAllByTestId } = render(
        <CollectionSavePicker {...baseProps} recentCollectionIds={['c3', 'c2']} />,
      );
      const rows = getAllByTestId(/^collection-row-/);
      const ids = rows.map(r => r.props.testID.replace('collection-row-', ''));
      const c3Index = ids.indexOf('c3');
      const c2Index = ids.indexOf('c2');
      const c1Index = ids.indexOf('c1');
      expect(c3Index).toBeLessThan(c1Index);
      expect(c2Index).toBeLessThan(c1Index);
    });

    it('recent collections maintain MRU order among themselves', () => {
      const { getAllByTestId } = render(
        <CollectionSavePicker {...baseProps} recentCollectionIds={['c3', 'c2']} />,
      );
      const rows = getAllByTestId(/^collection-row-/);
      const ids = rows.map(r => r.props.testID.replace('collection-row-', ''));
      expect(ids.indexOf('c3')).toBeLessThan(ids.indexOf('c2'));
    });

    it('non-recent collections still appear after recent ones', () => {
      const { getAllByTestId } = render(
        <CollectionSavePicker {...baseProps} recentCollectionIds={['c1']} />,
      );
      const rows = getAllByTestId(/^collection-row-/);
      const ids = rows.map(r => r.props.testID.replace('collection-row-', ''));
      expect(ids.indexOf('c1')).toBeLessThan(ids.indexOf('c2'));
      expect(ids.indexOf('c1')).toBeLessThan(ids.indexOf('c3'));
    });
  });
});
