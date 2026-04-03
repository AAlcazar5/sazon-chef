// frontend/__tests__/components/LottieMascot.test.tsx
// Tests for 9G Lottie Mascot Animations:
// - LottieMascot: renders with fallback to LogoMascot when no Lottie asset
// - AnimatedLottieMascot: animated wrapper renders without crash
// - Lottie plays on peak moments (via CelebrationOverlay)

import React from 'react';
import { render } from '@testing-library/react-native';

// ── Mocks ─────────────────────────────────────────────────────────────────

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHapticTouchable({ children, ...props }: any) {
    return <TouchableOpacity {...props}>{children}</TouchableOpacity>;
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

// Mock LogoMascot (the fallback)
jest.mock('../../components/mascot/LogoMascot', () => {
  const { View } = require('react-native');
  return function MockLogoMascot({ expression, size }: any) {
    return <View testID={`logo-mascot-${expression}`} />;
  };
});

// ── LottieMascot Tests ───────────────────────────────────────────────────

describe('LottieMascot', () => {
  const { default: LottieMascot } = require('../../components/mascot/LottieMascot');

  it('renders without crash', () => {
    const { getByTestId } = render(<LottieMascot />);
    // Falls back to LogoMascot since no Lottie assets exist yet
    expect(getByTestId('logo-mascot-happy')).toBeTruthy();
  });

  it('falls back to LogoMascot when no Lottie asset exists', () => {
    const { getByTestId } = render(<LottieMascot expression="thinking" />);
    expect(getByTestId('logo-mascot-thinking')).toBeTruthy();
  });

  it('passes expression to fallback LogoMascot', () => {
    const expressions = ['happy', 'excited', 'chef-kiss', 'celebrating', 'thinking', 'sleepy'] as const;
    expressions.forEach((expr) => {
      const { getByTestId } = render(<LottieMascot expression={expr} />);
      expect(getByTestId(`logo-mascot-${expr}`)).toBeTruthy();
    });
  });

  it('passes size to fallback LogoMascot', () => {
    // Should not crash with any size
    const sizes = ['tiny', 'small', 'medium', 'large', 'hero'] as const;
    sizes.forEach((size) => {
      const { getByTestId } = render(<LottieMascot size={size} />);
      expect(getByTestId('logo-mascot-happy')).toBeTruthy();
    });
  });
});

// ── AnimatedLottieMascot Tests ────────────────────────────────────────────

describe('AnimatedLottieMascot', () => {
  const { default: AnimatedLottieMascot } = require('../../components/mascot/AnimatedLottieMascot');

  it('renders without crash', () => {
    const { getByTestId } = render(<AnimatedLottieMascot />);
    expect(getByTestId('logo-mascot-happy')).toBeTruthy();
  });

  it('renders with celebrate animation type', () => {
    const { getByTestId } = render(
      <AnimatedLottieMascot expression="chef-kiss" animationType="celebrate" />
    );
    expect(getByTestId('logo-mascot-chef-kiss')).toBeTruthy();
  });

  it('renders with all animation types without crash', () => {
    const types = ['idle', 'bounce', 'pulse', 'wave', 'celebrate', 'none'] as const;
    types.forEach((type) => {
      const { getByTestId } = render(
        <AnimatedLottieMascot animationType={type} />
      );
      expect(getByTestId('logo-mascot-happy')).toBeTruthy();
    });
  });

  it('renders with custom style', () => {
    const { getByTestId } = render(
      <AnimatedLottieMascot style={{ marginTop: 20 }} />
    );
    expect(getByTestId('logo-mascot-happy')).toBeTruthy();
  });
});

// ── CelebrationOverlay Lottie Integration ─────────────────────────────────

describe('CelebrationOverlay with Lottie mascot', () => {
  // Mock AnimatedLottieMascot for this test suite
  jest.mock('../../components/mascot/AnimatedLottieMascot', () => {
    const { View } = require('react-native');
    return function MockAnimatedLottieMascot({ expression, animationType }: any) {
      return <View testID={`lottie-mascot-${expression}-${animationType}`} />;
    };
  });

  const { default: CelebrationOverlay } = require('../../components/celebrations/CelebrationOverlay');

  it('renders Lottie mascot in celebration overlay', () => {
    const { getByTestId } = render(
      <CelebrationOverlay
        visible={true}
        title="Cooking Complete!"
        expression="chef-kiss"
      />
    );
    expect(getByTestId('lottie-mascot-chef-kiss-celebrate')).toBeTruthy();
  });

  it('renders Lottie mascot for shopping complete celebration', () => {
    const { getByTestId } = render(
      <CelebrationOverlay
        visible={true}
        title="Shopping Done!"
        expression="celebrating"
      />
    );
    expect(getByTestId('lottie-mascot-celebrating-celebrate')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByTestId } = render(
      <CelebrationOverlay
        visible={false}
        title="Test"
        expression="chef-kiss"
      />
    );
    expect(queryByTestId('lottie-mascot-chef-kiss-celebrate')).toBeNull();
  });
});
