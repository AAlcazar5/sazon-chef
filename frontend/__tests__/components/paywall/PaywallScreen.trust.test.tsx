// frontend/__tests__/components/paywall/PaywallScreen.trust.test.tsx
// ROADMAP 4.0 PRC2 — Paywall trust-microcopy audit (TDD).
// Sourced from .context/decisions/accepted/P-005-paywall-trust-microcopy-audit.md.

const mockTrack = jest.fn();
jest.mock('../../../utils/analytics', () => ({
  analytics: {
    track: (...args: unknown[]) => mockTrack(...args),
    initialize: jest.fn(),
    trackScreenView: jest.fn(),
    trackFeatureUsage: jest.fn(),
  },
}));

const mockPurchase = jest.fn();
const mockRestore = jest.fn();
const mockOpenPortal = jest.fn();
jest.mock('../../../hooks/useSubscription', () => ({
  useSubscription: jest.fn(() => ({
    subscription: { isPremium: false, status: 'inactive', loading: false },
    offerings: {
      monthly: { product: { priceString: '$4.99 / mo' } },
      annual: { product: { priceString: '$29.99 / yr' } },
    },
    checkoutLoading: false,
    restoreLoading: false,
    trialDaysLeft: null,
    purchase: mockPurchase,
    restore: mockRestore,
    openPortal: mockOpenPortal,
    showPremiumCelebration: false,
    dismissPremiumCelebration: jest.fn(),
  })),
}));

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: Record<string, unknown>) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../../components/ui/GradientButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  const MockGradientButton = ({ label, onPress, disabled, loading }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean }) => (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} testID={label}>
      <Text>{loading ? 'Loading...' : label}</Text>
    </TouchableOpacity>
  );
  MockGradientButton.displayName = 'GradientButton';
  return {
    __esModule: true,
    default: MockGradientButton,
    GradientPresets: { brand: ['#fa7e12', '#f59e0b'], info: ['#38BDF8', '#6366F1'] },
  };
});

jest.mock('../../../components/mascot', () => ({
  LogoMascot: () => {
    const { View } = require('react-native');
    return <View testID="mascot" />;
  },
}));

jest.mock('../../../components/mascot/Sazon', () => ({
  __esModule: true,
  default: () => {
    const { View } = require('react-native');
    return <View testID="mascot-sazon" />;
  },
}));

jest.mock('../../../components/celebrations', () => ({
  PremiumCelebration: ({ visible }: { visible: boolean }) => {
    const { View } = require('react-native');
    return <View testID="premium-celebration" accessibilityState={{ expanded: visible }} />;
  },
}));

jest.mock('moti', () => ({
  MotiView: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Reanimated = require('react-native-reanimated/mock');
  return {
    ...Reanimated,
    createAnimatedComponent: (c: unknown) => c,
    useReducedMotion: () => false,
  };
});

import React from 'react';
import { render } from '@testing-library/react-native';
import { PaywallScreen } from '../../../components/premium/PaywallScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockTrack.mockReset();
});

describe('PaywallScreen — trust microcopy audit (PRC2)', () => {
  it('renders the canonical trust line "Cancel anytime. No spam." pre-headline', () => {
    const { getByTestId } = render(<PaywallScreen />);
    const trustLine = getByTestId('paywall-trust-line');
    expect(trustLine).toBeTruthy();
    expect(trustLine.props.children).toMatch(/cancel anytime/i);
    expect(trustLine.props.children).toMatch(/no spam/i);
  });

  it('exposes the restore-purchases button with the canonical testID and a11y label', () => {
    const { getByTestId } = render(<PaywallScreen />);
    const restore = getByTestId('paywall-restore-purchases');
    expect(restore).toBeTruthy();
    expect(restore.props.accessibilityLabel).toMatch(/restore/i);
    expect(restore.props.accessibilityRole).toBe('button');
  });

  it('renders the close button when onClose is provided, with testID, and never disabled', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<PaywallScreen onClose={onClose} />);
    const closeBtn = getByTestId('paywall-close');
    expect(closeBtn).toBeTruthy();
    expect(closeBtn.props.disabled).toBeFalsy();
    expect(closeBtn.props.accessibilityRole).toBe('button');
    expect(closeBtn.props.accessibilityLabel).toMatch(/close/i);
  });

  it('regression — copy contains no banned vocabulary', () => {
    const { toJSON } = render(<PaywallScreen onClose={jest.fn()} />);

    const banned = ['limited time', 'only', 'unlock premium', 'crush', 'cut/bulk'];

    const collectText = (node: unknown): string => {
      if (node == null) return '';
      if (typeof node === 'string' || typeof node === 'number') return String(node);
      if (Array.isArray(node)) return node.map(collectText).join(' ');
      if (typeof node === 'object') {
        const obj = node as { children?: unknown; props?: { children?: unknown } };
        if (obj.children !== undefined) return collectText(obj.children);
        if (obj.props?.children !== undefined) return collectText(obj.props.children);
      }
      return '';
    };

    const allText = collectText(toJSON()).toLowerCase();

    for (const phrase of banned) {
      // "only" is the trickiest — soft-match for "only N left" patterns specifically
      if (phrase === 'only') {
        expect(allText).not.toMatch(/only \d+ left/);
      } else {
        expect(allText).not.toContain(phrase);
      }
    }
  });

  // The `peak_subscribe_success` event firing is verified in a dedicated
  // PremiumCelebration test file that exercises the real component without
  // the celebrations-module mock active here.
});
