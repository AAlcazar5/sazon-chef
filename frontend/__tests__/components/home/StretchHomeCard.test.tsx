// frontend/__tests__/components/home/StretchHomeCard.test.tsx
// Group 10X Phase 6 — "Stretch last night" home hero card tests.

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

const mockGetItem = jest.fn().mockResolvedValue(null);
const mockSetItem = jest.fn().mockResolvedValue(undefined);
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args: any[]) => mockGetItem(...args),
  setItem: (...args: any[]) => mockSetItem(...args),
}));

const mockListLeftovers = jest.fn();
jest.mock('../../../lib/api', () => ({
  leftoverInventoryApi: {
    list: (...args: any[]) => mockListLeftovers(...args),
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

jest.mock('../../../components/mascot/Sazon', () => {
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: () => <Text>sazon</Text>,
    expressionToSazon: (expr: string) => ({ variant: 'orange', motion: 'wobble', fx: [] }),
    SAZON_SIZE_PX: { tiny: 32, small: 48, medium: 64, large: 96, hero: 144 },
  };
});

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import StretchHomeCard from '../../../components/home/StretchHomeCard';

const SALMON = {
  id: 'lo-salmon',
  componentId: 'salmon-c',
  name: 'Salmon',
  slot: 'protein',
  portionsRemaining: 1,
  expiresAt: new Date(Date.now() + 86400000 * 2).toISOString(),
};

const FARRO = {
  id: 'lo-farro',
  componentId: 'farro-c',
  name: 'Farro',
  slot: 'base',
  portionsRemaining: 1,
  expiresAt: new Date(Date.now() + 86400000 * 4).toISOString(),
};

const VEGGIES = {
  id: 'lo-veg',
  componentId: 'veg-c',
  name: 'Roasted Veg',
  slot: 'vegetable',
  portionsRemaining: 1,
  expiresAt: new Date(Date.now() + 86400000 * 2).toISOString(),
};

describe('StretchHomeCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
  });

  it('renders nothing when fewer than 2 leftovers exist', async () => {
    mockListLeftovers.mockResolvedValue({ data: { leftovers: [SALMON] } });
    const { queryByText } = render(<StretchHomeCard />);
    await waitFor(() => {
      expect(queryByText('STRETCH LAST NIGHT')).toBeNull();
    });
  });

  it('renders nothing when zero leftovers exist', async () => {
    mockListLeftovers.mockResolvedValue({ data: { leftovers: [] } });
    const { queryByText } = render(<StretchHomeCard />);
    await waitFor(() => {
      expect(queryByText('STRETCH LAST NIGHT')).toBeNull();
    });
  });

  it('renders the eyebrow and title when 2+ leftovers exist', async () => {
    mockListLeftovers.mockResolvedValue({
      data: { leftovers: [SALMON, FARRO, VEGGIES] },
    });
    const { findByText, getByText } = render(<StretchHomeCard />);
    await findByText('STRETCH LAST NIGHT');
    expect(getByText(/Reuse what's still/)).toBeTruthy();
    expect(getByText('good')).toBeTruthy();
  });

  it('renders body listing leftover names', async () => {
    mockListLeftovers.mockResolvedValue({
      data: { leftovers: [SALMON, FARRO, VEGGIES] },
    });
    const { findByTestId } = render(<StretchHomeCard />);
    const body = await findByTestId('stretch-card-body');
    const text = Array.isArray(body.props.children)
      ? body.props.children.join('')
      : String(body.props.children);
    expect(text.toLowerCase()).toContain('salmon');
    expect(text.toLowerCase()).toContain('farro');
    expect(text.toLowerCase()).toContain('roasted veg');
  });

  it('renders curious Sazon mascot', async () => {
    mockListLeftovers.mockResolvedValue({
      data: { leftovers: [SALMON, FARRO] },
    });
    const { findByTestId } = render(<StretchHomeCard />);
    expect(await findByTestId('sazon-curious')).toBeTruthy();
  });

  it('has accessibilityLabel describing the card', async () => {
    mockListLeftovers.mockResolvedValue({
      data: { leftovers: [SALMON, FARRO] },
    });
    const { findByLabelText } = render(<StretchHomeCard />);
    expect(await findByLabelText(/stretch last night/i)).toBeTruthy();
  });

  it('CTA navigates to build-a-plate with leftoverMode=true', async () => {
    mockListLeftovers.mockResolvedValue({
      data: { leftovers: [SALMON, FARRO] },
    });
    const { findByText } = render(<StretchHomeCard />);
    const cta = await findByText('Build a plate from leftovers');
    await act(async () => {
      fireEvent.press(cta);
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/build-a-plate',
      params: { leftoverMode: 'true' },
    });
  });

  it('dismiss persists to AsyncStorage with day-keyed key', async () => {
    mockListLeftovers.mockResolvedValue({
      data: { leftovers: [SALMON, FARRO] },
    });
    const { findByLabelText } = render(<StretchHomeCard />);
    const dismiss = await findByLabelText('Dismiss stretch card');
    await act(async () => {
      fireEvent.press(dismiss);
    });
    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalled();
    });
    const setItemArgs = mockSetItem.mock.calls[0];
    expect(setItemArgs[0]).toMatch(/^stretch-card-dismissed-\d{4}-\d{2}-\d{2}$/);
    expect(setItemArgs[1]).toBe('1');
  });

  it('does not render when AsyncStorage already has today dismissal flag', async () => {
    mockListLeftovers.mockResolvedValue({
      data: { leftovers: [SALMON, FARRO] },
    });
    mockGetItem.mockImplementation((key: string) =>
      key.startsWith('stretch-card-dismissed-')
        ? Promise.resolve('1')
        : Promise.resolve(null),
    );
    const { queryByText } = render(<StretchHomeCard />);
    await waitFor(() => {
      expect(queryByText('STRETCH LAST NIGHT')).toBeNull();
    });
  });
});
