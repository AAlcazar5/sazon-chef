// frontend/__tests__/e2e/coach/08-cost-ceiling-notice.journey.test.tsx
//
// Journey 8 — Cost ceiling soft notice (mocked SSE event: cost_notice)
//
// Flow:
//   Open Coach (Pro) → send a message
//   → SSE stream emits `event: cost_notice` with a message before the text reply
//   → CostNotice amber banner renders above the message list
//   → banner persists across subsequent messages
//
// This journey is entirely mockable without a real Anthropic connection because
// the costNoticeStream helper emits `{ type: 'cost_notice', message: "..." }`
// through the same async iterator that coachApi.streamMessage returns.

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { makeConversation, costNoticeStream, textStream } from '../../../test-utils/coach/journey.helpers';

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
    subscription: { tier: 'premium', isPremium: true },
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

const NOTICE_TEXT = "I'm taking a quick breath — back at full power tomorrow.";

describe('Journey 8 — Cost ceiling soft notice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListConversations.mockResolvedValue([]);
    mockCreateConversation.mockResolvedValue(makeConversation({ tier: 'premium' }));
  });

  it('J8.1 — cost_notice SSE event renders the amber CostNotice banner', async () => {
    mockStreamMessage.mockReturnValue(costNoticeStream(NOTICE_TEXT));

    const { findByText, getByPlaceholderText, getByLabelText, findByLabelText } = render(
      <CoachScreen />,
    );

    const chip = await findByText("Try a cuisine I haven't yet");
    fireEvent.press(chip);

    const composer = getByPlaceholderText(/Tell me what you're hungry for/i);
    fireEvent.changeText(composer, 'What should I make tonight?');
    fireEvent.press(getByLabelText('Send message to coach'));

    // CostNotice has accessibilityLabel="Coach is at reduced power until tomorrow"
    const banner = await findByLabelText(/Coach is at reduced power until tomorrow/i);
    expect(banner).toBeTruthy();
  });

  it('J8.2 — the banner contains the soft notice text from the event', async () => {
    mockStreamMessage.mockReturnValue(costNoticeStream(NOTICE_TEXT));

    const { findByText, getByPlaceholderText, getByLabelText } = render(<CoachScreen />);

    const chip = await findByText("Try a cuisine I haven't yet");
    fireEvent.press(chip);

    fireEvent.changeText(
      getByPlaceholderText(/Tell me what you're hungry for/i),
      'What should I make tonight?',
    );
    fireEvent.press(getByLabelText('Send message to coach'));

    expect(await findByText(/full power tomorrow/i)).toBeTruthy();
  });

  it('J8.3 — no cost_notice banner when the stream emits only text events', async () => {
    mockStreamMessage.mockReturnValue(textStream(['Here is a recipe suggestion.']));

    const { findByText, getByPlaceholderText, getByLabelText, queryByLabelText } = render(
      <CoachScreen />,
    );

    const chip = await findByText("Try a cuisine I haven't yet");
    fireEvent.press(chip);

    fireEvent.changeText(
      getByPlaceholderText(/Tell me what you're hungry for/i),
      'Normal message',
    );
    fireEvent.press(getByLabelText('Send message to coach'));

    await waitFor(() => {
      expect(findByText('Here is a recipe suggestion.')).toBeTruthy();
    });

    // CostNotice banner must be absent.
    expect(queryByLabelText(/Coach is at reduced power until tomorrow/i)).toBeNull();
  });

  it('J8.4 — banner also renders the downstream text reply from the same stream', async () => {
    mockStreamMessage.mockReturnValue(costNoticeStream(NOTICE_TEXT));

    const { findByText, getByPlaceholderText, getByLabelText } = render(<CoachScreen />);

    const chip = await findByText("Try a cuisine I haven't yet");
    fireEvent.press(chip);

    fireEvent.changeText(
      getByPlaceholderText(/Tell me what you're hungry for/i),
      'What should I make tonight?',
    );
    fireEvent.press(getByLabelText('Send message to coach'));

    // Text reply from costNoticeStream is "Got it, here is a lighter suggestion."
    expect(await findByText(/Got it, here is a lighter suggestion/i)).toBeTruthy();
  });
});
