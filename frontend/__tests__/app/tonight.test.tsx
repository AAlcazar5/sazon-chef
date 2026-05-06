// frontend/__tests__/app/tonight.test.tsx
// ROADMAP 4.0 T2.1 — Tonight Mode hero screen.

jest.mock('../../global.css', () => ({}));

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => mockRouter),
  router: mockRouter,
  useLocalSearchParams: jest.fn(() => ({})),
}));

const mockProposalApi = jest.fn();
jest.mock('../../lib/api', () => ({
  apiClient: {
    post: (...args: any[]) => mockProposalApi(...args),
  },
}));

jest.mock('../../components/tonight/TonightSwapSheet', () => {
  const { View, Text } = require('react-native');
  return ({ visible, alternatives, onSwap }: any) =>
    visible ? (
      <View testID="mock-swap-sheet">
        <Text>Swap sheet open</Text>
        <Text testID="mock-swap-trigger" onPress={() => onSwap('alt-1')}>Swap</Text>
      </View>
    ) : null;
});

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return ({ children, ...props }: any) => (
    <TouchableOpacity {...props}>{children}</TouchableOpacity>
  );
});

jest.mock('../../components/ui/LoadingState', () => {
  const { View, Text } = require('react-native');
  return () => (
    <View testID="loading-state">
      <Text>Sazon is thinking</Text>
    </View>
  );
});

jest.mock('../../components/ui/ScreenGradient', () => {
  const { View } = require('react-native');
  return ({ children }: any) => <View>{children}</View>;
});

jest.mock('../../lib/analytics', () => ({
  track: jest.fn(),
  trackTonightProposalShown: jest.fn(),
  trackTonightProposalAccepted: jest.fn(),
  trackTonightProposalSwapped: jest.fn(),
  trackTonightProposalEscaped: jest.fn(),
  trackTonightModeDisabled: jest.fn(),
  TONIGHT_EVENTS: {
    shown: 'tonight_proposal_shown',
    accepted: 'tonight_proposal_accepted',
    swapped: 'tonight_proposal_swapped',
    escaped: 'tonight_proposal_escaped',
    disabled: 'tonight_mode_disabled',
  },
}));

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import TonightScreen from '../../app/tonight';

const proposalFixture = {
  recipe: {
    id: 'r-hero',
    title: 'Doenjang Jjigae',
    cuisine: 'korean',
    cookTime: 22,
    imageUrl: 'https://img.example/d.jpg',
    description: 'Stew',
    calories: 420,
    protein: 28,
    carbs: 35,
    fat: 18,
    ingredients: [],
    instructions: [],
  },
  copyLine: "Cold night. Haven't had Korean in 11 days — 22 minutes.",
  alternatives: [
    { id: 'alt-1', title: 'Bibimbap', cuisine: 'korean', cookTime: 25, imageUrl: 'a.png' },
    { id: 'alt-2', title: 'Kimchi Jjigae', cuisine: 'korean', cookTime: 20, imageUrl: 'b.png' },
    { id: 'alt-3', title: 'Sundubu', cuisine: 'korean', cookTime: 18, imageUrl: 'c.png' },
  ],
  context: { pantryHits: 6, pantryCoveragePct: 0.78 },
};

describe('<TonightScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProposalApi.mockResolvedValue({ data: proposalFixture });
  });

  it('renders the proposal copy line and CTA after loading', async () => {
    const { getByText, queryByTestId } = render(<TonightScreen />);
    // Loading shown initially.
    expect(queryByTestId('loading-state')).toBeTruthy();

    await waitFor(() => {
      expect(getByText(proposalFixture.copyLine)).toBeTruthy();
      expect(getByText(/cook this/i)).toBeTruthy();
    });
    expect(mockProposalApi).toHaveBeenCalledWith('/tonight/proposal', expect.anything());
  });

  it('CTA tap navigates to the cook flow with the recipe id', async () => {
    const { getByText } = render(<TonightScreen />);
    await waitFor(() => getByText(/cook this/i));
    fireEvent.press(getByText(/cook this/i));
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.stringMatching(/cooking|recipe/i)
    );
  });

  it('long-press on the hero opens the swap sheet', async () => {
    const { getByTestId, queryByTestId } = render(<TonightScreen />);
    await waitFor(() => getByTestId('tonight-hero'));
    expect(queryByTestId('mock-swap-sheet')).toBeNull();
    fireEvent(getByTestId('tonight-hero'), 'longPress');
    expect(getByTestId('mock-swap-sheet')).toBeTruthy();
  });

  it('"More" affordance opens the tabs stack', async () => {
    const { getByLabelText } = render(<TonightScreen />);
    await waitFor(() => getByLabelText(/more/i));
    fireEvent.press(getByLabelText(/more/i));
    expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)');
  });

  it('shows Sazon-voice empty/error state on API failure', async () => {
    mockProposalApi.mockRejectedValueOnce(new Error('network'));
    const { findByText, queryByText } = render(<TonightScreen />);
    const text = await findByText(/(sazon|hmm|let.s try again|no plate)/i);
    expect(text).toBeTruthy();
    // Banned strings must NOT appear.
    expect(queryByText(/^Error/i)).toBeNull();
    expect(queryByText(/failed to/i)).toBeNull();
  });
});
