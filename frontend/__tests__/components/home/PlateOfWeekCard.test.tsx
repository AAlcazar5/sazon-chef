// frontend/__tests__/components/home/PlateOfWeekCard.test.tsx
// Group 10X Phase 8 — Plate-of-the-week editorial home card tests.

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

const mockFetchOfTheWeek = jest.fn();
jest.mock('../../../lib/api', () => ({
  composedPlateApi: {
    fetchOfTheWeek: (...args: any[]) => mockFetchOfTheWeek(...args),
  },
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: ({ source, testID, ...rest }: any) => (
      <View testID={testID ?? 'plate-of-week-image'} {...rest} />
    ),
  };
});

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

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import PlateOfWeekCard from '../../../components/home/PlateOfWeekCard';

const MOCK_PLATE = {
  id: 'plate-week-1',
  title: 'Mediterranean Salmon Bowl',
  imageUrl: 'https://example.com/plate.jpg',
  totalCalories: 540,
  totalProtein: 38,
  totalCarbs: 52,
  totalFat: 18,
  region: 'Mediterranean',
  saveCount: 142,
};

describe('PlateOfWeekCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when API returns null plate', async () => {
    mockFetchOfTheWeek.mockResolvedValue({ data: { plate: null } });
    const { queryByText } = render(<PlateOfWeekCard />);
    await waitFor(() => {
      expect(queryByText('PLATE OF THE WEEK')).toBeNull();
    });
  });

  it('renders nothing when API errors (404)', async () => {
    const err: any = new Error('Not Found');
    err.response = { status: 404 };
    mockFetchOfTheWeek.mockRejectedValue(err);
    const { queryByText } = render(<PlateOfWeekCard />);
    await waitFor(() => {
      expect(queryByText('PLATE OF THE WEEK')).toBeNull();
    });
  });

  it('renders eyebrow and title when API returns a plate', async () => {
    mockFetchOfTheWeek.mockResolvedValue({ data: { plate: MOCK_PLATE } });
    const { findByText } = render(<PlateOfWeekCard />);
    await findByText('PLATE OF THE WEEK');
    expect(await findByText('Mediterranean Salmon Bowl')).toBeTruthy();
  });

  it('renders the hero image', async () => {
    mockFetchOfTheWeek.mockResolvedValue({ data: { plate: MOCK_PLATE } });
    const { findByTestId } = render(<PlateOfWeekCard />);
    expect(await findByTestId('plate-of-week-image')).toBeTruthy();
  });

  it('renders macro pills row with totals', async () => {
    mockFetchOfTheWeek.mockResolvedValue({ data: { plate: MOCK_PLATE } });
    const { findByTestId } = render(<PlateOfWeekCard />);
    const pills = await findByTestId('plate-of-week-macros');
    const text = Array.isArray(pills.props.children)
      ? pills.props.children.join(' ')
      : String(pills.props.children);
    expect(text).toContain('540');
    expect(text).toContain('38');
  });

  it('CTA navigates to build-a-plate with plateId', async () => {
    mockFetchOfTheWeek.mockResolvedValue({ data: { plate: MOCK_PLATE } });
    const { findByText } = render(<PlateOfWeekCard />);
    const cta = await findByText('Build this plate');
    await act(async () => {
      fireEvent.press(cta);
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/build-a-plate',
      params: { plateId: 'plate-week-1' },
    });
  });

  it('has accessibilityLabel describing the card', async () => {
    mockFetchOfTheWeek.mockResolvedValue({ data: { plate: MOCK_PLATE } });
    const { findByTestId } = render(<PlateOfWeekCard />);
    const card = await findByTestId('plate-of-week-card');
    expect(card.props.accessibilityLabel).toMatch(/plate of the week/i);
    expect(card.props.accessibilityLabel).toContain('Mediterranean Salmon Bowl');
  });

  it('renders the personalization reason badge when plate.reason is set (N=1)', async () => {
    mockFetchOfTheWeek.mockResolvedValue({
      data: { plate: { ...MOCK_PLATE, reason: '83% in your pantry · cuisine you love' } },
    });
    const { findByTestId } = render(<PlateOfWeekCard />);
    const reason = await findByTestId('plate-of-week-reason');
    const text = Array.isArray(reason.props.children)
      ? reason.props.children.join(' ')
      : String(reason.props.children);
    expect(text).toContain('in your pantry');
    expect(text).toContain('cuisine you love');
    expect(reason.props.accessibilityLabel).toMatch(/picked because/i);
  });

  it('hides the reason badge for anonymous viewers (no reason field)', async () => {
    mockFetchOfTheWeek.mockResolvedValue({ data: { plate: MOCK_PLATE } });
    const { queryByTestId, findByText } = render(<PlateOfWeekCard />);
    await findByText('PLATE OF THE WEEK');
    expect(queryByTestId('plate-of-week-reason')).toBeNull();
  });
});
