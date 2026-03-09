// frontend/__tests__/components/PaywallScreen.test.tsx
// Phase 4: PaywallScreen — feature list, pricing, CTA button, premium/free states

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PaywallScreen } from '../../components/premium/PaywallScreen';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockStartCheckout = jest.fn();
const mockOpenPortal = jest.fn();

jest.mock('../../hooks/useSubscription', () => ({
  useSubscription: jest.fn(() => ({
    subscription: { isPremium: false, status: 'inactive', loading: false },
    checkoutLoading: false,
    trialDaysLeft: null,
    startCheckout: mockStartCheckout,
    openPortal: mockOpenPortal,
  })),
}));

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../components/ui/GradientButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  const MockGradientButton = ({ label, onPress, disabled, loading, testID }: any) => (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} testID={testID || label}>
      <Text>{loading ? 'Loading...' : label}</Text>
    </TouchableOpacity>
  );
  MockGradientButton.displayName = 'GradientButton';
  const GradientPresets = {
    brand: ['#fa7e12', '#f59e0b'],
    premium: ['#A855F7', '#6366F1'],
    info: ['#38BDF8', '#6366F1'],
  };
  return { __esModule: true, default: MockGradientButton, GradientPresets };
});

jest.mock('../../components/mascot', () => ({
  SazonMascot: function MockSazonMascot({ expression }: any) {
    const { View } = require('react-native');
    return <View testID={`mascot-${expression}`} />;
  },
}));

jest.mock('moti', () => ({
  MotiView: function MockMotiView({ children }: any) {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

// ── Tests ────────────────────────────────────────────────────────────────────

describe('PaywallScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('free-tier user', () => {
    it('renders the "Sazon Premium" title', () => {
      const { getByText } = render(<PaywallScreen />);
      expect(getByText('Sazon Premium')).toBeTruthy();
    });

    it('renders the celebrating mascot', () => {
      const { getByTestId } = render(<PaywallScreen />);
      expect(getByTestId('mascot-celebrating')).toBeTruthy();
    });

    it('renders all 6 premium feature items', () => {
      const { getByText } = render(<PaywallScreen />);
      expect(getByText('Unlimited AI meal plans')).toBeTruthy();
      expect(getByText('Smart shopping list generation')).toBeTruthy();
      expect(getByText('Advanced nutrition insights')).toBeTruthy();
      expect(getByText('Cooking mode with timers')).toBeTruthy();
      expect(getByText('Pantry & expiry tracking')).toBeTruthy();
      expect(getByText('Smart reminders & alerts')).toBeTruthy();
    });

    it('renders monthly price', () => {
      const { getByText } = render(<PaywallScreen />);
      expect(getByText('$4.99 / mo')).toBeTruthy();
    });

    it('renders annual price', () => {
      const { getByText } = render(<PaywallScreen />);
      expect(getByText('$39.99 / yr')).toBeTruthy();
    });

    it('renders "Start Free Trial" CTA button', () => {
      const { getByText } = render(<PaywallScreen />);
      expect(getByText('Start Free Trial')).toBeTruthy();
    });

    it('renders 7-day trial badge', () => {
      const { getByText } = render(<PaywallScreen />);
      expect(getByText(/7-day free trial/)).toBeTruthy();
    });

    it('calls startCheckout with "month" when CTA pressed with monthly selected', () => {
      const { getByText } = render(<PaywallScreen />);
      fireEvent.press(getByText('Start Free Trial'));
      expect(mockStartCheckout).toHaveBeenCalledWith('month');
    });

    it('calls startCheckout with "year" after selecting annual plan', () => {
      const { getByText } = render(<PaywallScreen />);
      fireEvent.press(getByText('Annual'));
      fireEvent.press(getByText('Start Free Trial'));
      expect(mockStartCheckout).toHaveBeenCalledWith('year');
    });

    it('calls onClose when close button pressed', () => {
      const onClose = jest.fn();
      const { getByText } = render(<PaywallScreen onClose={onClose} />);
      fireEvent.press(getByText('×'));
      expect(onClose).toHaveBeenCalled();
    });

    it('does not render "Manage Subscription" for free-tier user', () => {
      const { queryByText } = render(<PaywallScreen />);
      expect(queryByText('Manage Subscription')).toBeNull();
    });
  });

  describe('premium user (manageable)', () => {
    beforeEach(() => {
      const { useSubscription } = require('../../hooks/useSubscription');
      useSubscription.mockReturnValue({
        subscription: { isPremium: true, status: 'active', loading: false },
        checkoutLoading: false,
        trialDaysLeft: null,
        startCheckout: mockStartCheckout,
        openPortal: mockOpenPortal,
      });
    });

    it('renders "You have Sazon Premium" status', () => {
      const { getByText } = render(<PaywallScreen />);
      expect(getByText('You have Sazon Premium')).toBeTruthy();
    });

    it('renders "Manage Subscription" button', () => {
      const { getByText } = render(<PaywallScreen />);
      expect(getByText('Manage Subscription')).toBeTruthy();
    });

    it('calls openPortal when "Manage Subscription" is pressed', () => {
      const { getByText } = render(<PaywallScreen />);
      fireEvent.press(getByText('Manage Subscription'));
      expect(mockOpenPortal).toHaveBeenCalled();
    });

    it('does not render "Start Free Trial" for premium user', () => {
      const { queryByText } = render(<PaywallScreen />);
      expect(queryByText('Start Free Trial')).toBeNull();
    });
  });

  describe('trialing user', () => {
    beforeEach(() => {
      const { useSubscription } = require('../../hooks/useSubscription');
      useSubscription.mockReturnValue({
        subscription: { isPremium: true, status: 'trialing', loading: false },
        checkoutLoading: false,
        trialDaysLeft: 5,
        startCheckout: mockStartCheckout,
        openPortal: mockOpenPortal,
      });
    });

    it('shows trial days remaining', () => {
      const { getByText } = render(<PaywallScreen />);
      expect(getByText(/Trial active — 5 days left/)).toBeTruthy();
    });
  });

  describe('loading state', () => {
    it('does not render feature list while subscription data loads', () => {
      const { useSubscription } = require('../../hooks/useSubscription');
      useSubscription.mockReturnValue({
        subscription: { loading: true },
        checkoutLoading: false,
        trialDaysLeft: null,
        startCheckout: jest.fn(),
        openPortal: jest.fn(),
      });
      const { queryByText } = render(<PaywallScreen />);
      expect(queryByText('Unlimited AI meal plans')).toBeNull();
    });
  });
});
