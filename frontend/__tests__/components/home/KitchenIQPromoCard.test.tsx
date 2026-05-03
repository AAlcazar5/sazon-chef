// frontend/__tests__/components/home/KitchenIQPromoCard.test.tsx
// Group 10S Surface 4 — Kitchen IQ promo card on home feed.

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

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

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
  useRouter: () => ({ push: mockPush }),
}));

const mockAcknowledgeNewUnlock = jest.fn().mockResolvedValue(undefined);
const mockProgress = {
  totalCards: 32,
  unlockedCount: 1,
  unlockedIds: ['nut-magnesium'],
  newUnlocks: ['nut-magnesium'],
  loading: false,
  error: null,
  isUnlocked: (id: string) => id === 'nut-magnesium',
  refresh: jest.fn(),
  acknowledgeNewUnlock: mockAcknowledgeNewUnlock,
};

const mockUseKitchenIQProgress = jest.fn();
jest.mock('../../../hooks/useKitchenIQProgress', () => ({
  __esModule: true,
  default: () => mockUseKitchenIQProgress(),
  useKitchenIQProgress: () => mockUseKitchenIQProgress(),
}));

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import KitchenIQPromoCard from '../../../components/home/KitchenIQPromoCard';
import { KITCHEN_IQ_CARDS } from '../../../lib/kitchenIQ/cards';

const STORAGE_KEY = 'kitchen_iq_unlocked_at_v1';
const RECENT_CARD = KITCHEN_IQ_CARDS.find((c) => c.id === 'nut-magnesium')!;

function freshState() {
  return {
    ...mockProgress,
    newUnlocks: ['nut-magnesium'],
  };
}

describe('KitchenIQPromoCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    mockUseKitchenIQProgress.mockReturnValue(freshState());
  });

  it('renders when newUnlocks has a recent (within 48h) entry', async () => {
    const { findByText } = render(<KitchenIQPromoCard testID="kiq-promo" />);
    expect(await findByText(RECENT_CARD.title)).toBeTruthy();
  });

  it('shows the "NEW IN KITCHEN IQ" eyebrow', async () => {
    const { findByText } = render(<KitchenIQPromoCard testID="kiq-promo" />);
    expect(await findByText(/new in kitchen iq/i)).toBeTruthy();
  });

  it('shows the correct card title from KITCHEN_IQ_CARDS', async () => {
    const { findByText } = render(<KitchenIQPromoCard testID="kiq-promo" />);
    expect(await findByText(RECENT_CARD.title)).toBeTruthy();
  });

  it('hidden when no new unlocks', async () => {
    mockUseKitchenIQProgress.mockReturnValue({
      ...freshState(),
      newUnlocks: [],
    });
    const { queryByTestId } = render(<KitchenIQPromoCard testID="kiq-promo" />);
    await waitFor(() => {
      expect(queryByTestId('kiq-promo')).toBeNull();
    });
  });

  it('hidden when unlock timestamp is older than 48h', async () => {
    const stale = Date.now() - 49 * 60 * 60 * 1000;
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === STORAGE_KEY) {
        return JSON.stringify({ 'nut-magnesium': stale });
      }
      return null;
    });
    const { queryByTestId, queryByText } = render(<KitchenIQPromoCard testID="kiq-promo" />);
    await waitFor(() => {
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY);
    });
    await waitFor(() => {
      expect(queryByText(RECENT_CARD.title)).toBeNull();
    });
    expect(queryByTestId('kiq-promo')).toBeNull();
  });

  it('has accessibilityLabel on the card', async () => {
    const { findByLabelText } = render(<KitchenIQPromoCard testID="kiq-promo" />);
    expect(await findByLabelText(/new in kitchen iq/i)).toBeTruthy();
  });

  it('tapping the card navigates to /kitchen-iq with the card id and acknowledges', async () => {
    const { findByTestId } = render(<KitchenIQPromoCard testID="kiq-promo" />);
    const body = await findByTestId('kiq-promo-body');
    await act(async () => {
      fireEvent.press(body);
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/kitchen-iq?card=nut-magnesium');
    });
    expect(mockAcknowledgeNewUnlock).toHaveBeenCalledWith('nut-magnesium');
  });

  it('tapping dismiss calls acknowledgeNewUnlock and hides the card', async () => {
    const { findByTestId, queryByText } = render(<KitchenIQPromoCard testID="kiq-promo" />);
    const dismiss = await findByTestId('kiq-promo-dismiss');
    await act(async () => {
      fireEvent.press(dismiss);
    });
    await waitFor(() => {
      expect(mockAcknowledgeNewUnlock).toHaveBeenCalledWith('nut-magnesium');
    });
    await waitFor(() => {
      expect(queryByText(RECENT_CARD.title)).toBeNull();
    });
  });
});
