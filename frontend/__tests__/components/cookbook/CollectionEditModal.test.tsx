// frontend/__tests__/components/cookbook/CollectionEditModal.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CollectionEditModal from '../../../components/cookbook/CollectionEditModal';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
  ImpactFeedbackStyle: { Medium: 'medium' },
}));

jest.mock('../../../hooks/useModalAnimation', () => ({
  useModalAnimation: () => ({ contentStyle: {} }),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: { text: { secondary: '#9CA3AF' } }, theme: 'light' }),
}));

const noop = jest.fn();

const renderModal = (props = {}) =>
  render(
    <CollectionEditModal
      visible
      onClose={noop}
      onSave={noop}
      {...props}
    />,
  );

describe('CollectionEditModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders category picker chips', () => {
    const { getByTestId } = renderModal();
    expect(getByTestId('category-chip-meal_type')).toBeTruthy();
    expect(getByTestId('category-chip-cuisine')).toBeTruthy();
    expect(getByTestId('category-chip-mood')).toBeTruthy();
    expect(getByTestId('category-chip-dietary')).toBeTruthy();
    expect(getByTestId('category-chip-seasonal')).toBeTruthy();
    expect(getByTestId('category-chip-custom')).toBeTruthy();
  });

  it('calls onSave with category=null by default (create mode shows Create button)', () => {
    const onSave = jest.fn();
    const { getByPlaceholderText, getByText } = renderModal({ onSave });

    fireEvent.changeText(getByPlaceholderText('Collection name'), 'My Collection');
    fireEvent.press(getByText('Create'));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'My Collection', category: null }),
    );
  });

  it('calls onSave with selected category', () => {
    const onSave = jest.fn();
    const { getByPlaceholderText, getByTestId, getByText } = renderModal({ onSave });

    fireEvent.changeText(getByPlaceholderText('Collection name'), 'Italian Favs');
    fireEvent.press(getByTestId('category-chip-cuisine'));
    fireEvent.press(getByText('Create'));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Italian Favs', category: 'cuisine' }),
    );
  });

  it('pre-selects category when editing an existing collection', () => {
    const { getByTestId } = renderModal({
      collection: {
        id: '1', name: 'Weeknight Dinners', category: 'meal_type',
      },
    });
    expect(getByTestId('category-chip-meal_type')).toBeTruthy();
  });

  it('does not call onSave when name is empty', () => {
    const onSave = jest.fn();
    const { getByText } = renderModal({ onSave });
    fireEvent.press(getByText('Create'));
    expect(onSave).not.toHaveBeenCalled();
  });
});
