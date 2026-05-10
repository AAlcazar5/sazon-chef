// frontend/__tests__/app/coach.chip-autosend.test.tsx
// ROADMAP 4.0 S0.1 — chip taps auto-send the message instead of just
// seeding the composer.

import React from 'react';
import { render, fireEvent, waitFor } from '../test-utils/render';

const mockSearchParams: { conversationId?: string; seedMessage?: string } = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useLocalSearchParams: () => mockSearchParams,
}));

jest.mock('../../lib/api', () => ({
  coachApi: {
    listConversations: jest.fn().mockResolvedValue([]),
    getConversation: jest.fn(),
    createConversation: jest.fn().mockResolvedValue({ id: 'c-new', title: '' }),
    streamMessage: jest.fn(),
    getCoachContext: jest.fn().mockRejectedValue(new Error('skip')),
  },
}));

jest.mock('../../hooks/useVoiceInput', () => ({
  useVoiceInput: () => ({
    isListening: false,
    transcript: '',
    error: null,
    permissionDenied: false,
    start: jest.fn(),
    stop: jest.fn(),
    clear: jest.fn(),
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../components/mascot/Sazon', () => {
  const { Text } = require('react-native');
  const expressionToSazon = () => ({ variant: 'orange', motion: 'kiss', fx: ['hearts'] });
  const SAZON_SIZE_PX = { tiny: 24, xsmall: 36, small: 48, medium: 96, large: 192, hero: 256 };
  return {
    __esModule: true,
    expressionToSazon,
    SAZON_SIZE_PX,
    default: function MockSazon() {
      return <Text testID="mascot">chef-kiss</Text>;
    },
  };
});

jest.mock('../../components/mascot/LogoMascot', () => {
  const { View } = require('react-native');
  return function MockLogoMascot() { return <View testID="logo-mascot" />; };
});

jest.mock('../../hooks/useFoodIntelUserState', () => ({
  __esModule: true,
  default: () => ({
    userId: 'u1',
    cookHistory: { cuisines: [] },
    topAffinityIngredients: [],
    rolling7dNutrientGaps: [],
    skillTier: 'cook',
    goalPhase: 'maintain',
    last7DaysIngredients: [],
  }),
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

import CoachScreen from '../../app/(tabs)/coach';
import { coachApi } from '../../lib/api';

const fakeStream = () =>
  (async function* () {
    /* immediately complete — no chunks */
  })();

describe('CoachScreen chip auto-send (S0.1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.conversationId = undefined;
    mockSearchParams.seedMessage = undefined;
    (coachApi.listConversations as jest.Mock).mockResolvedValue([]);
    (coachApi.createConversation as jest.Mock).mockResolvedValue({
      id: 'c-new',
      title: '',
    });
    (coachApi.streamMessage as jest.Mock).mockImplementation(fakeStream);
  });

  it('list-view: chip tap creates conversation AND streams the message', async () => {
    const { findByText } = render(<CoachScreen />);
    const chip = await findByText("Plan tonight's dinner");
    fireEvent.press(chip);

    await waitFor(() => {
      expect(coachApi.createConversation).toHaveBeenCalledWith(
        "Plan tonight's dinner",
      );
    });
    await waitFor(() => {
      expect(coachApi.streamMessage).toHaveBeenCalledTimes(1);
    });
    const callArg = (coachApi.streamMessage as jest.Mock).mock.calls[0][0];
    expect(callArg.message).toBe("Plan tonight's dinner");
  });

  it('active conversation view: chip tap streams the message (no extra createConversation)', async () => {
    // Enter active view via deep-link
    mockSearchParams.conversationId = 'c1';
    (coachApi.getConversation as jest.Mock).mockResolvedValue({
      id: 'c1',
      title: 'Existing thread',
      messages: [],
    });

    const { findByText } = render(<CoachScreen />);
    // Chips render inside the conversation view too (empty messages array).
    const chip = await findByText("Plan tonight's dinner");

    // Reset stream mock so the only call we count is the chip tap.
    (coachApi.streamMessage as jest.Mock).mockClear();
    fireEvent.press(chip);

    await waitFor(() => {
      expect(coachApi.streamMessage).toHaveBeenCalledTimes(1);
    });
    const callArg = (coachApi.streamMessage as jest.Mock).mock.calls[0][0];
    expect(callArg.message).toBe("Plan tonight's dinner");
    expect(callArg.conversationId).toBe('c1');
    // No new conversation created — we're already in one.
    expect(coachApi.createConversation).not.toHaveBeenCalled();
  });
});
