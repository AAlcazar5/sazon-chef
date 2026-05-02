// frontend/__tests__/components/recipe/PlateVariationsSheet.test.tsx
// Group 10X Phase 1+2 — "Vary this plate" bottom sheet tests.

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', isDark: false }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

const mockGetVariations = jest.fn();
jest.mock('../../../lib/api', () => ({
  composedPlateApi: {
    fetchVariations: (...args: any[]) => mockGetVariations(...args),
  },
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, testID }: any) => (
      <View testID={testID ?? 'linear-gradient'}>{children}</View>
    ),
  };
});

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: function MockIonicons({ name, testID }: any) {
      return <Text testID={testID ?? `icon-${name}`}>{name}</Text>;
    },
  };
});

jest.mock('../../../components/ui/BrandButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ label, onPress, accessibilityLabel, testID }: any) => (
      <TouchableOpacity
        onPress={onPress}
        accessibilityLabel={accessibilityLabel ?? label}
        testID={testID ?? `brand-btn-${label}`}
      >
        <Text>{label}</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, onPress, accessibilityLabel, testID }: any) => (
      <TouchableOpacity onPress={onPress} accessibilityLabel={accessibilityLabel} testID={testID}>
        {children}
      </TouchableOpacity>
    ),
  };
});

jest.mock('../../../components/ui/BottomSheet', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, visible, testID }: any) =>
      visible ? <View testID={testID ?? 'bottom-sheet'}>{children}</View> : null,
  };
});

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import PlateVariationsSheet from '../../../components/recipe/PlateVariationsSheet';

const VARIATIONS = [
  {
    id: 'var-1',
    title: 'Try with Chicken',
    swappedSlot: 'protein',
    swappedFrom: 'Salmon',
    swappedTo: 'Chicken Breast',
    totalCalories: 510,
    totalProtein: 42,
    totalCarbs: 50,
    totalFat: 14,
  },
  {
    id: 'var-2',
    title: 'Try with Brown Rice',
    swappedSlot: 'base',
    swappedFrom: 'Farro',
    swappedTo: 'Brown Rice',
    totalCalories: 530,
    totalProtein: 36,
    totalCarbs: 60,
    totalFat: 17,
  },
  {
    id: 'var-3',
    title: 'Try with Tahini Sauce',
    swappedSlot: 'sauce',
    swappedFrom: 'Yogurt Sauce',
    swappedTo: 'Tahini Drizzle',
    totalCalories: 580,
    totalProtein: 38,
    totalCarbs: 50,
    totalFat: 24,
  },
];

describe('PlateVariationsSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render content when not visible', async () => {
    mockGetVariations.mockResolvedValue({ data: { variations: VARIATIONS } });
    const { queryByText } = render(
      <PlateVariationsSheet plateId="plate-1" visible={false} onClose={() => {}} />,
    );
    expect(queryByText('Try with Chicken')).toBeNull();
  });

  it('fetches variations on open', async () => {
    mockGetVariations.mockResolvedValue({ data: { variations: VARIATIONS } });
    render(<PlateVariationsSheet plateId="plate-1" visible={true} onClose={() => {}} />);
    await waitFor(() => expect(mockGetVariations).toHaveBeenCalledWith('plate-1'));
  });

  it('renders 3 variation cards from API response', async () => {
    mockGetVariations.mockResolvedValue({ data: { variations: VARIATIONS } });
    const { findByText, getByText } = render(
      <PlateVariationsSheet plateId="plate-1" visible={true} onClose={() => {}} />,
    );
    await findByText('Try with Chicken');
    expect(getByText('Try with Brown Rice')).toBeTruthy();
    expect(getByText('Try with Tahini Sauce')).toBeTruthy();
  });

  it('tapping a variation navigates to /build-a-plate with the variation id', async () => {
    mockGetVariations.mockResolvedValue({ data: { variations: VARIATIONS } });
    const { findByTestId } = render(
      <PlateVariationsSheet plateId="plate-1" visible={true} onClose={() => {}} />,
    );
    const card = await findByTestId('plate-variation-card-var-2');
    await act(async () => {
      fireEvent.press(card);
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/build-a-plate',
      params: { plateId: 'var-2' },
    });
  });

  it('renders empty state copy when API returns no variations', async () => {
    mockGetVariations.mockResolvedValue({ data: { variations: [] } });
    const { findByTestId } = render(
      <PlateVariationsSheet plateId="plate-1" visible={true} onClose={() => {}} />,
    );
    expect(await findByTestId('plate-variations-empty')).toBeTruthy();
  });

  it('handles API error gracefully', async () => {
    mockGetVariations.mockRejectedValue(new Error('Network'));
    const { findByTestId } = render(
      <PlateVariationsSheet plateId="plate-1" visible={true} onClose={() => {}} />,
    );
    expect(await findByTestId('plate-variations-empty')).toBeTruthy();
  });

  it('cards have accessibilityLabel', async () => {
    mockGetVariations.mockResolvedValue({ data: { variations: VARIATIONS } });
    const { findByLabelText } = render(
      <PlateVariationsSheet plateId="plate-1" visible={true} onClose={() => {}} />,
    );
    expect(await findByLabelText(/try with chicken/i)).toBeTruthy();
  });
});
