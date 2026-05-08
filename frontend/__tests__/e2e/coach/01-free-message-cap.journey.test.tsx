// frontend/__tests__/e2e/coach/01-free-message-cap.journey.test.tsx
//
// Journey 1 — Free-tier message + cap
//
// Flow:
//   Open Coach tab (empty state, mascot visible, 4 chips rendered)
//   → tap a quick-start chip → chip text seeds the composer
//   → send message → assistant streams reply
//   → simulate the 11th message of the day hitting COACH_DAILY_CAP
//   → CoachPaywallSheet appears with reason="cap" headline

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { makeConversation, textStream, paywallCapStream } from '../../../test-utils/coach/journey.helpers';

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

// Provide a deterministic chip context so chipsFromCoachContext returns
// the chips the test asserts on (otherwise the hook fetches /api/coach/
// context and times out, and only FALLBACK_CHIPS render).
jest.mock('../../../hooks/useCoachQuickChipContext', () => ({
  __esModule: true,
  useCoachQuickChipContext: () => ({
    pantryExpiringSoon: ['rice'],
    remainingMacros: { calories: 320, protein: 0, carbs: 0, fat: 0 },
    leftoverInventory: [],
    topAdjacentCuisine: 'persian',
  }),
  default: () => ({
    pantryExpiringSoon: ['rice'],
    remainingMacros: { calories: 320, protein: 0, carbs: 0, fat: 0 },
    leftoverInventory: [],
    topAdjacentCuisine: 'persian',
  }),
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

describe('Journey 1 — Free-tier message cap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListConversations.mockResolvedValue([]);
    mockCreateConversation.mockResolvedValue(makeConversation());
  });

  it('J1.1 — empty state renders mascot and 4 quick-start chips', async () => {
    const { findByTestId, findByText } = render(<CoachScreen />);

    expect(await findByTestId('mascot')).toBeTruthy();
    // Context-driven chips (mock injects pantry + macros + cuisine).
    expect(await findByText("I have leftover rice — bridge it forward")).toBeTruthy();
    expect(await findByText("320 cal left — what should I eat?")).toBeTruthy();
    expect(await findByText("Try a persian dish I haven't yet")).toBeTruthy();
  });

  it('J1.2 — tapping a chip auto-sends the chip text (S0.1)', async () => {
    // Tier S S0.1 changed chip-tap behavior: tapping a chip now AUTO-SENDS
    // the chip text instead of just seeding the composer. The composer
    // clears (back to empty) once the send fires.
    mockStreamMessage.mockReturnValue(textStream(['ok']));
    const { findByText, getByPlaceholderText } = render(<CoachScreen />);

    const chip = await findByText("Try a persian dish I haven't yet");
    fireEvent.press(chip);

    await waitFor(() => {
      expect(mockStreamMessage).toHaveBeenCalled();
    });
    const composer = getByPlaceholderText(/Tell me what you're hungry for/i) as any;
    expect(composer.props.value).toBe('');
  });

  it('J1.3 — sending a message streams a reply and clears the composer', async () => {
    mockStreamMessage.mockReturnValue(textStream(['Here is a great Thai option', ' for tonight!']));

    const { findByText, getByPlaceholderText, getByLabelText } = render(<CoachScreen />);
    const chip = await findByText("Try a persian dish I haven't yet");
    fireEvent.press(chip);

    const sendBtn = getByLabelText('Send message to coach');
    fireEvent.press(sendBtn);

    await waitFor(() => {
      expect(mockStreamMessage).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      const composer = getByPlaceholderText(/Tell me what you're hungry for/i) as any;
      expect(composer.props.value).toBe('');
    });
  });

  it('J1.4 — 11th message throws COACH_DAILY_CAP → CoachPaywallSheet with cap headline', async () => {
    // First 10 sends succeed; 11th throws the cap error.
    mockStreamMessage
      .mockReturnValueOnce(textStream(['Reply 1']))
      .mockReturnValueOnce(textStream(['Reply 2']))
      .mockReturnValueOnce(textStream(['Reply 3']))
      .mockReturnValueOnce(textStream(['Reply 4']))
      .mockReturnValueOnce(textStream(['Reply 5']))
      .mockReturnValueOnce(textStream(['Reply 6']))
      .mockReturnValueOnce(textStream(['Reply 7']))
      .mockReturnValueOnce(textStream(['Reply 8']))
      .mockReturnValueOnce(textStream(['Reply 9']))
      .mockReturnValueOnce(textStream(['Reply 10']))
      .mockReturnValue(paywallCapStream());

    const { findByText, getByPlaceholderText, getByLabelText, findAllByText } = render(<CoachScreen />);

    // Navigate to conversation view via a chip tap.
    const chip = await findByText("Try a persian dish I haven't yet");
    fireEvent.press(chip);

    const composer = getByPlaceholderText(/Tell me what you're hungry for/i);
    const sendBtn = getByLabelText('Send message to coach');

    // Send 10 successful messages.
    for (let i = 1; i <= 10; i++) {
      fireEvent.changeText(composer, `Message ${i}`);
      fireEvent.press(sendBtn);
      await waitFor(() => expect(mockStreamMessage).toHaveBeenCalledTimes(i));
    }

    // 11th message hits the cap.
    fireEvent.changeText(composer, 'Message 11');
    fireEvent.press(sendBtn);

    // The cap paywall headline must appear.
    const capHeadlines = await findAllByText(/no daily cap/i);
    expect(capHeadlines.length).toBeGreaterThan(0);
  });
});
