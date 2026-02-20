// frontend/__tests__/components/BuyAgainSection.test.tsx

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BuyAgainSection from '../../components/shopping/BuyAgainSection';
import { PurchaseHistoryItem } from '../../types';

// Mock ThemeContext
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', colors: {} }),
}));

// Mock Icon component
jest.mock('../../components/ui/Icon', () => {
  const { Text } = require('react-native');
  return function MockIcon({ accessibilityLabel }: { accessibilityLabel?: string }) {
    return <Text>{accessibilityLabel || 'icon'}</Text>;
  };
});

// Mock HapticTouchableOpacity
jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHapticTouchableOpacity(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

const mockFavoriteItem: PurchaseHistoryItem = {
  id: 'fav-1',
  userId: 'user-1',
  itemName: 'chicken breast',
  quantity: '2 lbs',
  category: 'Meat & Seafood',
  purchaseCount: 5,
  lastPurchasedAt: new Date().toISOString(),
  isFavorite: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockFrequentItem: PurchaseHistoryItem = {
  id: 'freq-1',
  userId: 'user-1',
  itemName: 'whole milk',
  quantity: '1 gallon',
  category: 'Dairy',
  purchaseCount: 3,
  lastPurchasedAt: new Date().toISOString(),
  isFavorite: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockFrequentItem2: PurchaseHistoryItem = {
  id: 'freq-2',
  userId: 'user-1',
  itemName: 'white rice',
  quantity: '5 lbs',
  category: 'Pantry',
  purchaseCount: 2,
  lastPurchasedAt: new Date().toISOString(),
  isFavorite: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('BuyAgainSection', () => {
  const defaultProps = {
    purchaseHistory: [mockFavoriteItem, mockFrequentItem, mockFrequentItem2],
    loading: false,
    onAddItem: jest.fn(),
    onToggleFavorite: jest.fn(),
    onReorderLastWeek: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the Buy Again header', () => {
    const { getByText } = render(<BuyAgainSection {...defaultProps} />);
    expect(getByText('Buy Again')).toBeTruthy();
  });

  it('should render the Last Week button', () => {
    const { getByText } = render(<BuyAgainSection {...defaultProps} />);
    expect(getByText('Last Week')).toBeTruthy();
  });

  it('should render favorite items with capitalized names', () => {
    const { getByText } = render(<BuyAgainSection {...defaultProps} />);
    expect(getByText('Chicken breast')).toBeTruthy();
  });

  it('should render frequent (non-favorite) items', () => {
    const { getByText } = render(<BuyAgainSection {...defaultProps} />);
    expect(getByText('Whole milk')).toBeTruthy();
    expect(getByText('White rice')).toBeTruthy();
  });

  it('should show purchase count for items bought more than once', () => {
    const { getByText } = render(<BuyAgainSection {...defaultProps} />);
    expect(getByText('x5')).toBeTruthy(); // chicken breast count
    expect(getByText('x3')).toBeTruthy(); // whole milk count
    expect(getByText('x2')).toBeTruthy(); // white rice count
  });

  it('should call onAddItem when tapping a chip', () => {
    const { getByText } = render(<BuyAgainSection {...defaultProps} />);
    fireEvent.press(getByText('Whole milk'));
    expect(defaultProps.onAddItem).toHaveBeenCalledWith(mockFrequentItem);
  });

  it('should call onToggleFavorite on long-press', () => {
    const { getByText } = render(<BuyAgainSection {...defaultProps} />);
    fireEvent(getByText('Whole milk'), 'longPress');
    expect(defaultProps.onToggleFavorite).toHaveBeenCalledWith(mockFrequentItem);
  });

  it('should call onReorderLastWeek when tapping Last Week button', () => {
    const { getByText } = render(<BuyAgainSection {...defaultProps} />);
    fireEvent.press(getByText('Last Week'));
    expect(defaultProps.onReorderLastWeek).toHaveBeenCalled();
  });

  it('should return null when loading', () => {
    const { queryByText } = render(
      <BuyAgainSection {...defaultProps} loading={true} />
    );
    expect(queryByText('Buy Again')).toBeNull();
  });

  it('should return null when purchase history is empty', () => {
    const { queryByText } = render(
      <BuyAgainSection {...defaultProps} purchaseHistory={[]} />
    );
    expect(queryByText('Buy Again')).toBeNull();
  });

  it('should show hint text about tap and long-press', () => {
    const { getByText } = render(<BuyAgainSection {...defaultProps} />);
    expect(getByText('Tap to add, long-press to favorite')).toBeTruthy();
  });
});
