// frontend/__tests__/app/coach.test.tsx
// 10Y-B: Coach chat screen — empty state + chips + composer seeding.

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../lib/api', () => ({
  coachApi: {
    listConversations: jest.fn().mockResolvedValue([]),
    getConversation: jest.fn(),
    createConversation: jest.fn(),
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

describe('CoachScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders empty state with mascot when no conversations', async () => {
    const { findByTestId } = render(<CoachScreen />);
    expect(await findByTestId('mascot')).toBeTruthy();
  });

  it('renders quick-start chips by default', async () => {
    const { findByText } = render(<CoachScreen />);
    expect(await findByText("Try a cuisine I haven't yet")).toBeTruthy();
  });

  it('seeds the composer when a chip is tapped', async () => {
    const { findByText, getByPlaceholderText } = render(<CoachScreen />);
    const chip = await findByText("Try a cuisine I haven't yet");
    fireEvent.press(chip);
    await waitFor(() => {
      const composer = getByPlaceholderText(/Tell me what you're hungry for/i) as any;
      expect(composer.props.value).toBe("Try a cuisine I haven't yet");
    });
  });
});
