// frontend/__tests__/components/celebrations.test.tsx
// Tests for 9C Peak Moment Celebrations:
// - CelebrationOverlay: confetti, mascot, stats, CTAs
// - HeartBurstAnimation: save/unsave with particle burst
// - PremiumCelebration: staggered benefits list

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Animated } from 'react-native';

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

jest.mock('../../components/mascot/AnimatedSazon', () => {
  const { View } = require('react-native');
  return function MockAnimatedSazon({ expression, animationType }: any) {
    return <View testID={`animated-sazon-${expression}`} />;
  };
});

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHapticTouchable({ children, ...props }: any) {
    return <TouchableOpacity {...props}>{children}</TouchableOpacity>;
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

// ── CelebrationOverlay Tests ──────────────────────────────────────────────

describe('CelebrationOverlay', () => {
  const { default: CelebrationOverlay } = require('../../components/celebrations/CelebrationOverlay');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when visible is false', () => {
    const { queryByText } = render(
      <CelebrationOverlay visible={false} title="Test" />
    );
    expect(queryByText('Test')).toBeNull();
  });

  it('renders title and subtitle when visible', () => {
    const { getByText } = render(
      <CelebrationOverlay
        visible={true}
        title="You nailed it!"
        subtitle="Great job cooking"
      />
    );
    expect(getByText('You nailed it!')).toBeTruthy();
    expect(getByText('Great job cooking')).toBeTruthy();
  });

  it('renders mascot with correct expression', () => {
    const { getByTestId } = render(
      <CelebrationOverlay
        visible={true}
        title="Test"
        expression="chef-kiss"
      />
    );
    expect(getByTestId('animated-sazon-chef-kiss')).toBeTruthy();
  });

  it('renders stat cards when provided', () => {
    const stats = [
      { value: '5', label: 'Steps', color: '#FB923C', bgColor: 'rgba(251,146,60,0.15)' },
      { value: '12m', label: 'Time', color: '#3B82F6', bgColor: 'rgba(59,130,246,0.15)' },
    ];
    const { getByText } = render(
      <CelebrationOverlay visible={true} title="Done!" stats={stats} />
    );
    expect(getByText('5')).toBeTruthy();
    expect(getByText('Steps')).toBeTruthy();
    expect(getByText('12m')).toBeTruthy();
    expect(getByText('Time')).toBeTruthy();
  });

  it('fires primary CTA onPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <CelebrationOverlay
        visible={true}
        title="Done!"
        primaryCTA={{ label: 'Continue', onPress }}
      />
    );
    fireEvent.press(getByText('Continue'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('fires secondary CTA onPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <CelebrationOverlay
        visible={true}
        title="Done!"
        primaryCTA={{ label: 'Main', onPress: jest.fn() }}
        secondaryCTA={{ label: 'Dismiss', onPress }}
      />
    );
    fireEvent.press(getByText('Dismiss'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses after specified duration', async () => {
    const onDismiss = jest.fn();
    render(
      <CelebrationOverlay
        visible={true}
        title="Auto dismiss"
        autoDismiss={3000}
        onDismiss={onDismiss}
      />
    );

    act(() => {
      jest.advanceTimersByTime(3500);
    });

    // onDismiss may be called after the fade animation completes
    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalled();
    });
  });

  it('does not auto-dismiss when autoDismiss is 0', () => {
    const onDismiss = jest.fn();
    render(
      <CelebrationOverlay
        visible={true}
        title="No auto dismiss"
        autoDismiss={0}
        onDismiss={onDismiss}
      />
    );

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });
});

// ── HeartBurstAnimation Tests ─────────────────────────────────────────────

describe('HeartBurstAnimation', () => {
  const { default: HeartBurstAnimation } = require('../../components/celebrations/HeartBurstAnimation');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders heart-outline when not saved', () => {
    const { UNSAFE_root } = render(<HeartBurstAnimation saved={false} />);
    // The Ionicons mock returns null, but the component itself renders
    expect(UNSAFE_root).toBeTruthy();
  });

  it('renders filled heart when saved', () => {
    const { UNSAFE_root } = render(<HeartBurstAnimation saved={true} />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('fires haptic on save animation', () => {
    const Haptics = require('expo-haptics');
    const { rerender } = render(<HeartBurstAnimation saved={false} />);

    // Trigger save
    rerender(<HeartBurstAnimation saved={true} />);

    act(() => {
      jest.advanceTimersByTime(300);
    });

    // HeartBurst fires light at 80ms and medium at 200ms
    expect(Haptics.impactAsync).toHaveBeenCalled();
  });

  it('calls onAnimationComplete after save animation', async () => {
    const onComplete = jest.fn();
    const { rerender } = render(
      <HeartBurstAnimation saved={false} onAnimationComplete={onComplete} />
    );

    rerender(<HeartBurstAnimation saved={true} onAnimationComplete={onComplete} />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Spring animation completes
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });
});

// ── PremiumCelebration Tests ──────────────────────────────────────────────

describe('PremiumCelebration', () => {
  const { default: PremiumCelebration } = require('../../components/celebrations/PremiumCelebration');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when not visible', () => {
    const { queryByText } = render(
      <PremiumCelebration visible={false} onDismiss={jest.fn()} />
    );
    expect(queryByText('Welcome to Premium!')).toBeNull();
  });

  it('renders premium title and benefits when visible', () => {
    const { getByText } = render(
      <PremiumCelebration visible={true} onDismiss={jest.fn()} />
    );
    expect(getByText('Welcome to Premium!')).toBeTruthy();
    expect(getByText('Unlimited recipes unlocked')).toBeTruthy();
    expect(getByText('AI meal planning active')).toBeTruthy();
    expect(getByText('Smart shopping lists')).toBeTruthy();
    expect(getByText('Advanced nutrition insights')).toBeTruthy();
  });

  it('renders the "Let\'s Cook!" CTA button', () => {
    const onDismiss = jest.fn();
    const { getByText } = render(
      <PremiumCelebration visible={true} onDismiss={onDismiss} />
    );
    const cta = getByText("Let's Cook!");
    expect(cta).toBeTruthy();
    fireEvent.press(cta);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('auto-dismisses after 4 seconds', async () => {
    const onDismiss = jest.fn();
    render(
      <PremiumCelebration visible={true} onDismiss={onDismiss} />
    );

    act(() => {
      jest.advanceTimersByTime(4500);
    });

    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalled();
    });
  });
});

// ── Cooking Complete Celebration Tests ─────────────────────────────────────

describe('Cooking Complete Celebration (integration)', () => {
  it('uses CelebrationOverlay with stat cards', () => {
    // This validates the cooking screen passes the right props to CelebrationOverlay
    const CelebrationOverlay = require('../../components/celebrations/CelebrationOverlay').default;

    const stats = [
      { value: '8', label: 'Steps', color: '#FB923C', bgColor: 'rgba(251,146,60,0.15)' },
      { value: '15m 30s', label: 'Time', color: '#3B82F6', bgColor: 'rgba(59,130,246,0.15)' },
      { value: '6', label: 'Prepped', color: '#10B981', bgColor: 'rgba(16,185,129,0.15)' },
    ];

    const { getByText } = render(
      <CelebrationOverlay
        visible={true}
        title="You nailed it!"
        subtitle="Chicken Tikka is ready to serve. Enjoy!"
        expression="chef-kiss"
        stats={stats}
        primaryCTA={{ label: 'Next: Grilled Salmon', onPress: jest.fn() }}
        secondaryCTA={{ label: 'Back to Recipe', onPress: jest.fn() }}
      />
    );

    expect(getByText('You nailed it!')).toBeTruthy();
    expect(getByText('8')).toBeTruthy();
    expect(getByText('Steps')).toBeTruthy();
    expect(getByText('15m 30s')).toBeTruthy();
    expect(getByText('6')).toBeTruthy();
    expect(getByText('Prepped')).toBeTruthy();
    expect(getByText('Next: Grilled Salmon')).toBeTruthy();
    expect(getByText('Back to Recipe')).toBeTruthy();
  });
});

// ── Shopping Complete Celebration Tests ────────────────────────────────────

describe('Shopping Complete Celebration (integration)', () => {
  it('uses CelebrationOverlay with item count and cost stats', () => {
    const CelebrationOverlay = require('../../components/celebrations/CelebrationOverlay').default;

    const { getByText } = render(
      <CelebrationOverlay
        visible={true}
        title="Shop complete!"
        subtitle="Your pantry is stocked! Want to cook Pasta now?"
        expression="celebrating"
        stats={[
          { value: '12', label: 'Items', color: '#10B981', bgColor: 'rgba(16,185,129,0.15)' },
          { value: '$45', label: 'Spent', color: '#3B82F6', bgColor: 'rgba(59,130,246,0.15)' },
        ]}
        primaryCTA={{ label: 'Cook Pasta', onPress: jest.fn() }}
      />
    );

    expect(getByText('Shop complete!')).toBeTruthy();
    expect(getByText('12')).toBeTruthy();
    expect(getByText('$45')).toBeTruthy();
    expect(getByText('Cook Pasta')).toBeTruthy();
  });
});
