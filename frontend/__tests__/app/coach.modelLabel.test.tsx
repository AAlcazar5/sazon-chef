// frontend/__tests__/app/coach.modelLabel.test.tsx
// ROADMAP 4.0 S1.3 — header model label reflects (tier, intent).

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockSearchParams: { conversationId?: string; seedMessage?: string } = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useLocalSearchParams: () => mockSearchParams,
}));

const subscriptionState = { tier: 'free' as 'free' | 'premium', isPremium: false };
jest.mock('../../hooks/useSubscription', () => ({
  __esModule: true,
  useSubscription: () => ({ subscription: subscriptionState }),
}));

jest.mock('../../lib/api', () => ({
  coachApi: {
    listConversations: jest.fn().mockResolvedValue([]),
    getConversation: jest.fn(),
    createConversation: jest.fn().mockResolvedValue({ id: 'c-new', title: '' }),
    streamMessage: jest.fn(),
  },
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
    /* immediately complete */
  })();

function setSubscription(tier: 'free' | 'premium', isPremium: boolean) {
  subscriptionState.tier = tier;
  subscriptionState.isPremium = isPremium;
}

describe('CoachScreen header model label (S1.3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.conversationId = 'c-existing';
    mockSearchParams.seedMessage = undefined;
    (coachApi.listConversations as jest.Mock).mockResolvedValue([]);
    (coachApi.getConversation as jest.Mock).mockResolvedValue({
      id: 'c-existing',
      title: 'Active thread',
      messages: [],
    });
    (coachApi.streamMessage as jest.Mock).mockImplementation(fakeStream);
  });

  it('free user renders "Haiku 4.5"', async () => {
    setSubscription('free', false);
    const { findByText } = render(<CoachScreen />);
    expect(await findByText('Haiku 4.5')).toBeTruthy();
  });

  it('premium chat user renders "Sonnet 4.6 ✦ chat" by default', async () => {
    setSubscription('premium', true);
    const { findByText } = render(<CoachScreen />);
    expect(await findByText('Sonnet 4.6 ✦ chat')).toBeTruthy();
  });

  it('premium user with deep-plan chip auto-sends and renders "Opus 4.7 ✦ deep plan"', async () => {
    setSubscription('premium', true);
    mockSearchParams.conversationId = 'c-existing';
    const { findByText, getByPlaceholderText } = render(<CoachScreen />);
    // Wait for active view to render
    await waitFor(() => getByPlaceholderText(/Tell me what you're hungry for/i));
    // Type a deep-plan message into composer manually (simulating user typing)
    // The label updates when intent classifies as deep_plan.
    // Easiest deterministic path: dispatch via an existing chip whose text
    // matches deep-plan classifier. The static fallback chip "Plan something
    // for the week" / equivalent doesn't exist by default — instead, simulate
    // a send through the composer.
    const composer = getByPlaceholderText(/Tell me what you're hungry for/i) as any;
    fireEvent.changeText(composer, 'plan my week');
    // We expect the screen to react to composer text + classifier — render
    // updates synchronously on text change.
    expect(await findByText('Opus 4.7 ✦ deep plan')).toBeTruthy();
  });

  it('free user always renders "Haiku 4.5" even on deep-plan input', async () => {
    setSubscription('free', false);
    const { findByText, getByPlaceholderText } = render(<CoachScreen />);
    await waitFor(() => getByPlaceholderText(/Tell me what you're hungry for/i));
    const composer = getByPlaceholderText(/Tell me what you're hungry for/i) as any;
    fireEvent.changeText(composer, 'plan my week');
    // Free tier never escalates.
    expect(await findByText('Haiku 4.5')).toBeTruthy();
  });
});
