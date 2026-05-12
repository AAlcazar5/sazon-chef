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
    purchase: mockStartCheckout,
    openPortal: mockOpenPortal,
    // Empty offerings → component falls back to '$9 / mo' / '$60 / yr'.
    offerings: { monthly: null, annual: null, lifetime: null },
  })),
}));

// Default lifetime window: closed in tests unless a test overrides it.
jest.mock('../../constants/lifetimeOffer', () => ({
  isLifetimeWindowOpen: jest.fn(() => false),
  LIFETIME_OFFER_END_DATE: new Date('2026-08-15T00:00:00Z'),
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
  LogoMascot: function MockLogoMascot({ expression }: any) {
    const { View } = require('react-native');
    return <View testID={`mascot-${expression}`} />;
  },
}));

// Sazon swap — translate motion back to legacy expression so testID assertions hold.
jest.mock('../../components/mascot/Sazon', () => ({
  __esModule: true,
  default: function MockSazon({ motion, variant }: any) {
    const { View } = require('react-native');
    const expr =
      motion === 'celebrate' ? 'celebrating' :
      motion === 'kiss' ? 'chef-kiss' :
      motion === 'bounce' ? 'excited' :
      motion === 'wobble' ? 'thinking' :
      motion === 'sleep' ? 'sleepy' :
      motion === 'peek' ? 'supportive' :
      motion === 'pulse' ? 'focused' :
      motion === 'jiggle' ? 'surprised' :
      motion === 'wave' ? 'happy' :
      motion === 'idle' ? 'happy' :
      variant || 'mascot';
    return <View testID={`mascot-${expr}`} />;
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
    it('renders the persona-aligned headline ("Past the spreadsheet.")', () => {
      const { getByTestId } = render(<PaywallScreen />);
      expect(getByTestId('paywall-headline').props.children).toBe('Past the spreadsheet.');
    });

    it('renders the celebrating mascot', () => {
      const { getByTestId } = render(<PaywallScreen />);
      expect(getByTestId('mascot-celebrating')).toBeTruthy();
    });

    it('renders only the 3 core feature items by default (no laundry list)', () => {
      const { getByText, queryByText } = render(<PaywallScreen />);
      expect(getByText('Unlimited Build-a-Plate')).toBeTruthy();
      expect(getByText('Personalization that learns you')).toBeTruthy();
      expect(getByText('Smart meal plans + shopping list')).toBeTruthy();
      // Extras collapsed:
      expect(queryByText('Advanced nutrition insights')).toBeNull();
      expect(queryByText('Pantry & expiry tracking')).toBeNull();
      expect(queryByText('Smart reminders & alerts')).toBeNull();
    });

    it('reveals the 3 extra feature items when "See all features" is tapped', () => {
      const { getByText, getByTestId } = render(<PaywallScreen />);
      fireEvent.press(getByTestId('paywall-see-all-features'));
      expect(getByText('Advanced nutrition insights')).toBeTruthy();
      expect(getByText('Pantry & expiry tracking')).toBeTruthy();
      expect(getByText('Smart reminders & alerts')).toBeTruthy();
      // Toggle label flips
      expect(getByText('Show less')).toBeTruthy();
    });

    it('renders monthly price (fallback when offerings undefined)', () => {
      const { getByText } = render(<PaywallScreen />);
      expect(getByText('$9 / mo')).toBeTruthy();
    });

    it('renders annual price (fallback when offerings undefined)', () => {
      const { getByText } = render(<PaywallScreen />);
      expect(getByText('$60 / yr')).toBeTruthy();
    });

    it('renders "Start Free Trial" CTA button', () => {
      const { getByText } = render(<PaywallScreen />);
      expect(getByText('Start Free Trial')).toBeTruthy();
    });

    it('renders 7-day trial badge', () => {
      const { getByText } = render(<PaywallScreen />);
      expect(getByText(/7-day free trial/)).toBeTruthy();
    });

    it('defaults to annual selection (anchors against monthly per persona pricing intent)', () => {
      const { getByText } = render(<PaywallScreen />);
      fireEvent.press(getByText('Start Free Trial'));
      expect(mockStartCheckout).toHaveBeenCalledWith('year');
    });

    it('calls startCheckout with "month" after switching to monthly plan', () => {
      const { getByText } = render(<PaywallScreen />);
      fireEvent.press(getByText('Monthly'));
      fireEvent.press(getByText('Start Free Trial'));
      expect(mockStartCheckout).toHaveBeenCalledWith('month');
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

    it('does NOT render the Lifetime tile when the launch window is closed', () => {
      // Default mock — isLifetimeWindowOpen returns false
      const { queryByTestId } = render(<PaywallScreen />);
      expect(queryByTestId('paywall-lifetime-option')).toBeNull();
    });

    it('does NOT render the Lifetime tile when window is open but RC offering is null', () => {
      const { isLifetimeWindowOpen } = require('../../constants/lifetimeOffer');
      (isLifetimeWindowOpen as jest.Mock).mockReturnValueOnce(true);
      // offerings.lifetime is null by default — third tile must still be hidden
      const { queryByTestId } = render(<PaywallScreen />);
      expect(queryByTestId('paywall-lifetime-option')).toBeNull();
    });

    it('renders the Lifetime tile when window AND RC offering both present', () => {
      const { isLifetimeWindowOpen } = require('../../constants/lifetimeOffer');
      (isLifetimeWindowOpen as jest.Mock).mockReturnValueOnce(true);
      const { useSubscription } = require('../../hooks/useSubscription');
      useSubscription.mockReturnValueOnce({
        subscription: { isPremium: false, status: 'inactive', loading: false },
        checkoutLoading: false,
        trialDaysLeft: null,
        startCheckout: mockStartCheckout,
        purchase: mockStartCheckout,
        openPortal: mockOpenPortal,
        offerings: {
          monthly: null,
          annual: null,
          lifetime: { product: { priceString: '$79.99' } },
        },
      });
      const { getByTestId, getByText } = render(<PaywallScreen />);
      expect(getByTestId('paywall-lifetime-option')).toBeTruthy();
      expect(getByText('$79.99')).toBeTruthy();
    });

    it('calls startCheckout with "lifetime" after selecting the lifetime tile', () => {
      const { isLifetimeWindowOpen } = require('../../constants/lifetimeOffer');
      (isLifetimeWindowOpen as jest.Mock).mockReturnValueOnce(true);
      const { useSubscription } = require('../../hooks/useSubscription');
      useSubscription.mockReturnValueOnce({
        subscription: { isPremium: false, status: 'inactive', loading: false },
        checkoutLoading: false,
        trialDaysLeft: null,
        startCheckout: mockStartCheckout,
        purchase: mockStartCheckout,
        openPortal: mockOpenPortal,
        offerings: {
          monthly: null,
          annual: null,
          lifetime: { product: { priceString: '$79.99' } },
        },
      });
      const { getByTestId, getByText } = render(<PaywallScreen />);
      fireEvent.press(getByTestId('paywall-lifetime-option'));
      fireEvent.press(getByText('Unlock Lifetime'));
      expect(mockStartCheckout).toHaveBeenCalledWith('lifetime');
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
    purchase: mockStartCheckout,
        openPortal: mockOpenPortal,
        offerings: {},
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
    purchase: mockStartCheckout,
        openPortal: mockOpenPortal,
        offerings: {},
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
        purchase: jest.fn(),
        openPortal: jest.fn(),
        offerings: {},
      });
      const { queryByText } = render(<PaywallScreen />);
      expect(queryByText('Unlimited Build-a-Plate')).toBeNull();
    });
  });
});
