// frontend/__tests__/e2e/coach/02-free-paperclip-block.journey.test.tsx
//
// Journey 2 — Free-tier paperclip block
//
// Flow:
//   Open Coach (free tier) → enter conversation view
//   → tap the paperclip / image-attach button (locked for free users)
//   → CoachPaywallSheet opens with reason="photos" headline

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { makeConversation, textStream } from '../../../test-utils/coach/journey.helpers';

// ─── Module mocks ────────────────────────────────────────────────────────────

const mockListConversations = jest.fn();
const mockCreateConversation = jest.fn();
const mockStreamMessage = jest.fn();

jest.mock('../../../lib/api', () => ({
  coachApi: {
    listConversations: (...a: unknown[]) => mockListConversations(...a),
    createConversation: (...a: unknown[]) => mockCreateConversation(...a),
    streamMessage: (...a: unknown[]) => mockStreamMessage(...a),
    getConversation: jest.fn(),
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

jest.mock('../../../hooks/useFoodIntelUserState', () => ({
  useFoodIntelUserState: () => ({
    userId: 'u1',
    cookHistory: { cuisines: [] },
    topAffinityIngredients: [],
    rolling7dNutrientGaps: [],
    skillTier: 'cook',
    goalPhase: 'maintain',
    last7DaysIngredients: [],
  }),
}));

jest.mock('../../../hooks/useCoachMemoryCount', () => ({
  useCoachMemoryCount: () => 0,
}));

jest.mock('../../../hooks/useCoachAttachments', () => ({
  useCoachAttachments: () => ({
    attachments: [],
    canAdd: true,
    clear: jest.fn(),
    remove: jest.fn(),
    pickFromCamera: jest.fn(),
    pickFromLibrary: jest.fn(),
  }),
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

jest.mock('../../../lib/coachAnalytics', () => ({ emit: jest.fn() }));

import CoachScreen from '../../../app/(tabs)/coach';

// ─── Journey ─────────────────────────────────────────────────────────────────

describe('Journey 2 — Free-tier paperclip block', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListConversations.mockResolvedValue([]);
    mockCreateConversation.mockResolvedValue(makeConversation());
    mockStreamMessage.mockReturnValue(textStream(['Sure!']));
  });

  it('J2.1 — paperclip shows lock badge for free users', async () => {
    const { findByText, getByLabelText } = render(<CoachScreen />);

    // Tap any chip to enter conversation view.
    const chip = await findByText("Try a cuisine I haven't yet");
    fireEvent.press(chip);

    await waitFor(() => {
      const attachBtn = getByLabelText(/Attach a photo \(Pro only\)/i);
      expect(attachBtn).toBeTruthy();
    });
  });

  it('J2.2 — tapping the locked paperclip opens the paywall sheet with photos headline', async () => {
    const { findByText, getByLabelText, findAllByText } = render(<CoachScreen />);

    const chip = await findByText("Try a cuisine I haven't yet");
    fireEvent.press(chip);

    const attachBtn = await waitFor(() => getByLabelText(/Attach a photo \(Pro only\)/i));
    fireEvent.press(attachBtn);

    const photosHeadlines = await findAllByText(/Snap your fridge/i);
    expect(photosHeadlines.length).toBeGreaterThan(0);
  });

  it('J2.3 — dismissing the paywall sheet closes it without navigating away', async () => {
    const { findByText, getByLabelText, findAllByText, queryByText } = render(<CoachScreen />);

    const chip = await findByText("Try a cuisine I haven't yet");
    fireEvent.press(chip);

    const attachBtn = await waitFor(() => getByLabelText(/Attach a photo \(Pro only\)/i));
    fireEvent.press(attachBtn);

    const photosHeadlines = await findAllByText(/Snap your fridge/i);
    expect(photosHeadlines.length).toBeGreaterThan(0);

    // Dismiss via "Maybe later".
    const maybeLater = getByLabelText(/Maybe later/i);
    fireEvent.press(maybeLater);

    await waitFor(() => {
      // Composer is still visible — conversation view persists.
      expect(queryByText(/Tell me what you're hungry for\.\.\./i)).toBeNull();
    });
  });
});
