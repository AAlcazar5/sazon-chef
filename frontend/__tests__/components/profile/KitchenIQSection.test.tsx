// Group 10S: KitchenIQSection — profile entry point with unlock count + previews.

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...args: any[]) => mockPush(...args) } }));

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, onPress, accessibilityLabel, testID, style }: any) => (
      <TouchableOpacity
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={style}
      >
        {children}
      </TouchableOpacity>
    ),
  };
});

const mockUseKitchenIQProgress = jest.fn();
jest.mock('../../../hooks/useKitchenIQProgress', () => ({
  __esModule: true,
  default: () => mockUseKitchenIQProgress(),
  useKitchenIQProgress: () => mockUseKitchenIQProgress(),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import KitchenIQSection from '../../../components/profile/KitchenIQSection';

const defaultProgress = {
  totalCards: 32,
  unlockedCount: 0,
  unlockedIds: [] as string[],
  newUnlocks: [] as string[],
  loading: false,
  error: null as string | null,
  isUnlocked: () => false,
  refresh: jest.fn(),
  acknowledgeNewUnlock: jest.fn(),
};

describe('KitchenIQSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders unlock count when at least one card is unlocked', () => {
    mockUseKitchenIQProgress.mockReturnValue({
      ...defaultProgress,
      unlockedCount: 3,
      unlockedIds: ['nut-protein', 'con-volume-eating', 'con-reading-labels'],
    });

    const { getByText } = render(<KitchenIQSection testID="kitchen-iq-section" />);
    expect(getByText('Kitchen IQ')).toBeTruthy();
    expect(getByText(/3 of 32 unlocked/i)).toBeTruthy();
  });

  test('returns null when 0 cards unlocked', () => {
    mockUseKitchenIQProgress.mockReturnValue(defaultProgress);

    const { queryByTestId, queryByText } = render(<KitchenIQSection testID="kitchen-iq-section" />);
    expect(queryByTestId('kitchen-iq-section')).toBeNull();
    expect(queryByText('Kitchen IQ')).toBeNull();
  });

  test('shows up to 3 preview thumbnails of recently unlocked cards', () => {
    mockUseKitchenIQProgress.mockReturnValue({
      ...defaultProgress,
      unlockedCount: 5,
      unlockedIds: [
        'nut-protein',
        'con-volume-eating',
        'con-reading-labels',
        'nut-fiber',
        'nut-magnesium',
      ],
    });

    const { getAllByTestId } = render(<KitchenIQSection testID="kitchen-iq-section" />);
    const thumbs = getAllByTestId(/^kitchen-iq-thumb-/);
    expect(thumbs).toHaveLength(3);
  });

  test('tapping the section navigates to /kitchen-iq', () => {
    mockUseKitchenIQProgress.mockReturnValue({
      ...defaultProgress,
      unlockedCount: 1,
      unlockedIds: ['nut-protein'],
    });

    const { getByTestId } = render(<KitchenIQSection testID="kitchen-iq-section" />);
    fireEvent.press(getByTestId('kitchen-iq-section-header'));
    expect(mockPush).toHaveBeenCalledWith('/kitchen-iq');
  });

  test('header has an accessibilityLabel', () => {
    mockUseKitchenIQProgress.mockReturnValue({
      ...defaultProgress,
      unlockedCount: 1,
      unlockedIds: ['nut-protein'],
    });

    const { getByTestId } = render(<KitchenIQSection testID="kitchen-iq-section" />);
    const header = getByTestId('kitchen-iq-section-header');
    expect(header.props.accessibilityLabel).toBeTruthy();
  });

  test('renders nothing while loading', () => {
    mockUseKitchenIQProgress.mockReturnValue({
      ...defaultProgress,
      loading: true,
    });

    const { queryByTestId } = render(<KitchenIQSection testID="kitchen-iq-section" />);
    expect(queryByTestId('kitchen-iq-section')).toBeNull();
  });

  test('renders nothing when an error is present', () => {
    mockUseKitchenIQProgress.mockReturnValue({
      ...defaultProgress,
      unlockedCount: 2,
      unlockedIds: ['nut-protein', 'con-volume-eating'],
      error: 'network down',
    });

    const { queryByTestId } = render(<KitchenIQSection testID="kitchen-iq-section" />);
    expect(queryByTestId('kitchen-iq-section')).toBeNull();
  });
});
