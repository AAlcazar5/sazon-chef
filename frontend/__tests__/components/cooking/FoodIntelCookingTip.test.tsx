// Group 10R Surface 2: Step-adjacent Food Intel tip during cooking mode.

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light', setColorScheme: jest.fn(), toggleColorScheme: jest.fn() }),
}));

const memStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k: string) => Promise.resolve(memStore[k] ?? null)),
  setItem: jest.fn((k: string, v: string) => {
    memStore[k] = v;
    return Promise.resolve();
  }),
  removeItem: jest.fn((k: string) => {
    delete memStore[k];
    return Promise.resolve();
  }),
}));

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, onPress, accessibilityLabel, disabled, testID, style }: any) => (
      <TouchableOpacity
        onPress={disabled ? undefined : onPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: !!disabled }}
        testID={testID}
        style={style}
      >
        {children}
      </TouchableOpacity>
    ),
  };
});

jest.mock('../../../lib/foodIntelMatcher', () => ({
  matchFoodIntelTips: jest.fn(),
  recordTipEngagement: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../hooks/useFoodIntelUserState', () => ({
  useFoodIntelUserState: () => ({
    userId: 'user_test',
    cookHistory: { cuisines: [] },
    topAffinityIngredients: [],
    rolling7dNutrientGaps: [],
    skillTier: 'cook',
    goalPhase: 'maintain',
  }),
}));

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import FoodIntelCookingTip, {
  __resetCookingSessionsForTests,
} from '../../../components/cooking/FoodIntelCookingTip';
import { matchFoodIntelTips, recordTipEngagement } from '../../../lib/foodIntelMatcher';

const mockedMatch = matchFoodIntelTips as jest.MockedFunction<typeof matchFoodIntelTips>;
const mockedRecord = recordTipEngagement as jest.MockedFunction<typeof recordTipEngagement>;

const turmericTip = {
  id: 'sf-turmeric-pepper',
  category: 'superfood' as const,
  trigger: 'turmeric',
  title: 'Pair turmeric with black pepper',
  body: 'Black pepper boosts curcumin absorption from turmeric by up to 2,000%.',
  tags: ['turmeric', 'black pepper'],
  personalizationKeys: {
    cuisine: [],
    nutrient: [],
    skillTier: [],
    goalPhase: [],
  },
};

beforeEach(() => {
  mockedMatch.mockReset();
  mockedRecord.mockReset();
  mockedRecord.mockResolvedValue(undefined);
  for (const k of Object.keys(memStore)) delete memStore[k];
  __resetCookingSessionsForTests();
});

describe('FoodIntelCookingTip', () => {
  it('renders when step text contains a trigger keyword', async () => {
    mockedMatch.mockResolvedValueOnce([turmericTip]);

    const { findByTestId } = render(
      <FoodIntelCookingTip
        stepText="add turmeric and black pepper to the pan"
        stepIndex={0}
        sessionId="recipe-1::1000"
        testID="food-intel-tip"
      />,
    );

    await findByTestId('food-intel-tip');
    expect(mockedMatch).toHaveBeenCalledTimes(1);
    const [context] = mockedMatch.mock.calls[0];
    expect(context.screenType).toBe('cooking');
    expect(context.ingredients).toEqual(expect.arrayContaining(['turmeric']));
  });

  it('shows tip on first call but hides on later renders within the same session', async () => {
    mockedMatch
      .mockResolvedValueOnce([turmericTip])
      .mockResolvedValueOnce([turmericTip]);

    const sessionId = 'recipe-1::2000';

    const first = render(
      <FoodIntelCookingTip
        stepText="add turmeric to the pan"
        stepIndex={0}
        sessionId={sessionId}
        testID="food-intel-tip"
      />,
    );

    await first.findByTestId('food-intel-tip');
    first.unmount();

    const second = render(
      <FoodIntelCookingTip
        stepText="add ginger to the pan"
        stepIndex={1}
        sessionId={sessionId}
        testID="food-intel-tip"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(second.queryByTestId('food-intel-tip')).toBeNull();
  });

  it('uses the 💡 icon and a sage/mint background distinct from TechniqueTip orange', async () => {
    mockedMatch.mockResolvedValueOnce([turmericTip]);

    const { findByTestId, findByText } = render(
      <FoodIntelCookingTip
        stepText="stir in turmeric"
        stepIndex={0}
        sessionId="recipe-1::3000"
        testID="food-intel-tip"
      />,
    );

    const container = await findByTestId('food-intel-tip');
    const flatStyle = Array.isArray(container.props.style)
      ? Object.assign({}, ...container.props.style)
      : container.props.style;
    expect(flatStyle.backgroundColor).toBeDefined();
    // TechniqueTip uses 'rgba(249,115,22,0.10)' (orange) — sage tint must be different.
    expect(flatStyle.backgroundColor).not.toBe('rgba(249,115,22,0.10)');

    // 💡 emoji must appear in the toggle label text.
    await findByText(/💡/);
  });

  it('renders nothing when no match', async () => {
    mockedMatch.mockResolvedValueOnce([]);

    const { queryByTestId } = render(
      <FoodIntelCookingTip
        stepText="rinse the pan"
        stepIndex={0}
        sessionId="recipe-1::4000"
        testID="food-intel-tip"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(queryByTestId('food-intel-tip')).toBeNull();
  });

  it('exposes an accessibilityLabel on the toggle', async () => {
    mockedMatch.mockResolvedValueOnce([turmericTip]);

    const { findByTestId } = render(
      <FoodIntelCookingTip
        stepText="add turmeric"
        stepIndex={0}
        sessionId="recipe-1::5000"
        testID="food-intel-tip"
      />,
    );

    const toggle = await findByTestId('food-intel-tip-toggle');
    expect(toggle.props.accessibilityLabel).toBeTruthy();
  });

  it('calls recordTipEngagement(expanded) when toggled open', async () => {
    mockedMatch.mockResolvedValueOnce([turmericTip]);

    const { findByTestId } = render(
      <FoodIntelCookingTip
        stepText="add turmeric"
        stepIndex={0}
        sessionId="recipe-1::6000"
        testID="food-intel-tip"
      />,
    );

    const toggle = await findByTestId('food-intel-tip-toggle');
    fireEvent.press(toggle);

    await waitFor(() => {
      expect(mockedRecord).toHaveBeenCalledWith('user_test', 'sf-turmeric-pepper', 'expanded');
    });
  });
});
