// frontend/__tests__/app/coach.test.tsx
// 10Y-B: Coach chat screen — empty state + chips + composer seeding.
// 10Y entry-points: also covers ?conversationId / ?seedMessage URL params.

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockSearchParams: { conversationId?: string; seedMessage?: string } = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useLocalSearchParams: () => mockSearchParams,
}));

jest.mock('../../lib/api', () => ({
  coachApi: {
    listConversations: jest.fn().mockResolvedValue([]),
    getConversation: jest.fn(),
    createConversation: jest.fn(),
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

describe('CoachScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders empty state with mascot when no conversations', async () => {
    const { findByTestId } = render(<CoachScreen />);
    expect(await findByTestId('mascot')).toBeTruthy();
  });

  it('renders quick-start chips by default', async () => {
    const { findByText } = render(<CoachScreen />);
    expect(await findByText("Plan tonight's dinner")).toBeTruthy();
  });

  it('auto-sends the chip message (Tier S S0.1 — no longer just seeds composer)', async () => {
    const api = require('../../lib/api').coachApi;
    api.createConversation.mockResolvedValue({ id: 'c-new', title: '' });
    api.streamMessage.mockReturnValue((async function* () { /* empty */ })());

    const { findByText } = render(<CoachScreen />);
    const chip = await findByText("Plan tonight's dinner");
    fireEvent.press(chip);

    await waitFor(() => {
      expect(api.createConversation).toHaveBeenCalledWith("Plan tonight's dinner");
    });
    await waitFor(() => {
      expect(api.streamMessage).toHaveBeenCalledTimes(1);
    });
  });
});

describe('CoachScreen URL params (10Y entry-points)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.conversationId = undefined;
    mockSearchParams.seedMessage = undefined;
  });

  it('skips thread-list and shows active conversation when conversationId is present', async () => {
    mockSearchParams.conversationId = 'c1';
    const api = require('../../lib/api').coachApi;
    api.getConversation.mockResolvedValue({
      id: 'c1',
      title: 'Salmon thread',
      messages: [{ id: 'm1', role: 'user', content: 'hello' }],
    });

    const { findByPlaceholderText } = render(<CoachScreen />);
    // Composer is only visible in active-conversation view.
    expect(await findByPlaceholderText(/Tell me what you're hungry for/i)).toBeTruthy();
    await waitFor(() => {
      expect(api.getConversation).toHaveBeenCalledWith('c1');
    });
  });

  it('auto-sends seedMessage after loading conversation', async () => {
    mockSearchParams.conversationId = 'c2';
    mockSearchParams.seedMessage = 'hello';

    const api = require('../../lib/api').coachApi;
    api.getConversation.mockResolvedValue({
      id: 'c2',
      title: 'Seeded thread',
      messages: [],
    });
    api.streamMessage.mockReturnValue((async function* () { /* empty */ })());

    render(<CoachScreen />);
    await waitFor(() => {
      expect(api.streamMessage).toHaveBeenCalledTimes(1);
    });
    const callArg = api.streamMessage.mock.calls[0][0];
    expect(callArg.message).toBe('hello');
    expect(callArg.conversationId).toBe('c2');
  });
});
