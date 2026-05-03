// frontend/__tests__/e2e/coach/06-memory-screen-free.journey.test.tsx
//
// Journey 6 — Memory screen (free tier)
//
// Flow:
//   Profile → Coach memory screen (free)
//   → upsell card visible immediately (no loading spinner)
//   → listMemories is never called
//   → CoachPaywallSheet opens automatically with reason="memory"
//   → dismissing the paywall navigates back

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// ─── Module mocks ────────────────────────────────────────────────────────────

const mockListMemories = jest.fn();
const mockRouterBack = jest.fn();

jest.mock('../../../lib/api', () => ({
  coachApi: {
    listMemories: (...a: unknown[]) => mockListMemories(...a),
    updateMemory: jest.fn(),
    deleteMemory: jest.fn(),
  },
}));

jest.mock('../../../hooks/useSubscription', () => ({
  useSubscription: () => ({
    subscription: { tier: 'free', isPremium: false },
    startCheckout: jest.fn(),
  }),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

jest.mock('../../../lib/coachAnalytics', () => ({ emit: jest.fn() }));

jest.mock('expo-router', () => ({
  router: { back: (...a: unknown[]) => mockRouterBack(...a), push: jest.fn() },
}));

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../../components/mascot/Sazon', () => {
  const { Text } = require('react-native');
  return {
    __esModule: true,
    expressionToSazon: () => ({ variant: 'orange', motion: 'kiss', fx: [] }),
    SAZON_SIZE_PX: { tiny: 24, xsmall: 36, small: 48, medium: 96, large: 192, hero: 256 },
    default: function MockSazon() { return <Text testID="mascot">chef-kiss</Text>; },
  };
});

jest.mock('../../../components/mascot/LogoMascot', () => {
  const { View } = require('react-native');
  return function MockLogoMascot() { return <View testID="logo-mascot" />; };
});

import CoachMemoryScreen from '../../../app/profile/coach-memory';

// ─── Journey ─────────────────────────────────────────────────────────────────

describe('Journey 6 — Memory screen (free tier)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('J6.1 — free users see the upsell card without a loading spinner', async () => {
    const { findByText, queryByText } = render(<CoachMemoryScreen />);

    expect(await findByText(/Pro Coach remembers what works/i)).toBeTruthy();
    // The "Pro feature" label in header also appears.
    expect(await findByText(/Pro feature/i)).toBeTruthy();
    // No loading indicator (the screen skips the API call entirely).
    expect(queryByText(/Loading/i)).toBeNull();
  });

  it('J6.2 — listMemories is never called for free users', async () => {
    const { findByText } = render(<CoachMemoryScreen />);
    await findByText(/Pro Coach remembers what works/i);
    expect(mockListMemories).not.toHaveBeenCalled();
  });

  it('J6.3 — paywall sheet opens automatically with memory reason', async () => {
    const { findAllByText } = render(<CoachMemoryScreen />);
    // CoachPaywallSheet is auto-opened with reason="memory".
    const memoryHeadlines = await findAllByText(/remembers what worked/i);
    expect(memoryHeadlines.length).toBeGreaterThan(0);
  });

  it('J6.4 — dismissing the paywall calls router.back for free users', async () => {
    const { findAllByText, getByLabelText } = render(<CoachMemoryScreen />);
    await findAllByText(/remembers what worked/i);

    fireEvent.press(getByLabelText('Maybe later'));

    await waitFor(() => {
      expect(mockRouterBack).toHaveBeenCalled();
    });
  });

  it('J6.5 — tapping "See what Pro unlocks" re-opens the paywall sheet', async () => {
    const { findAllByText, getByLabelText } = render(<CoachMemoryScreen />);
    await findAllByText(/remembers what worked/i);

    // First dismiss the auto-opened paywall.
    fireEvent.press(getByLabelText('Maybe later'));

    // Now tap the upsell card CTA.
    const upgradeBtn = getByLabelText('Open Pro upgrade sheet');
    fireEvent.press(upgradeBtn);

    const sheets = await findAllByText(/remembers what worked/i);
    expect(sheets.length).toBeGreaterThan(0);
  });
});
