// Group 10R Surface 4: Bottom-pinned Food Intel toast on shopping check-off.
// TDD: written before the component exists (RED).

const memStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((k: string) => Promise.resolve(memStore[k] ?? null)),
    setItem: jest.fn((k: string, v: string) => {
      memStore[k] = v;
      return Promise.resolve();
    }),
    removeItem: jest.fn((k: string) => {
      delete memStore[k];
      return Promise.resolve();
    }),
  },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('react-native-reanimated', () => {
  const actual = require('react-native-reanimated/mock');
  return {
    ...actual,
    useAnimatedStyle: (fn: any) => fn(),
    useSharedValue: (v: any) => ({ value: v }),
    withTiming: (v: any) => v,
    withSpring: (v: any) => v,
    useReducedMotion: () => false,
  };
});

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => (
      <TouchableOpacity ref={ref} {...props} />
    )),
  };
});

jest.mock('../../../lib/foodIntelMatcher', () => ({
  matchFoodIntelTips: jest.fn(),
  recordTipEngagement: jest.fn(() => Promise.resolve()),
}));

// `{ virtual: true }` is for modules that don't exist on disk; this hook
// is a real file. Without that flag jest correctly replaces the module
// and the test gets the deterministic `user_test` userId it asserts on.
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
import * as Haptics from 'expo-haptics';
import FoodIntelToast, {
  __resetShoppingSessionForTests,
} from '../../../components/shopping/FoodIntelToast';
import { matchFoodIntelTips, recordTipEngagement } from '../../../lib/foodIntelMatcher';

const mockedMatch = matchFoodIntelTips as jest.MockedFunction<typeof matchFoodIntelTips>;
const mockedRecord = recordTipEngagement as jest.MockedFunction<typeof recordTipEngagement>;

const tip = (id: string, category: any, trigger: string) => ({
  id,
  category,
  trigger,
  title: `Tip about ${trigger}`,
  body: `Body of tip about ${trigger} (${category}).`,
  tags: [trigger],
  personalizationKeys: {
    cuisine: [],
    nutrient: [],
    skillTier: [],
    goalPhase: [],
  },
});

const spinachSuperfood = tip('sf-spinach-iron', 'superfood', 'spinach');
const spinachTechnique = tip('tech-spinach-blanch', 'technique', 'spinach');
const spinachPairing = tip('pair-spinach-lemon', 'pairing', 'spinach');
const spinachNutrient = tip('nut-spinach-folate', 'nutrient', 'spinach');

beforeEach(() => {
  jest.clearAllMocks();
  for (const k of Object.keys(memStore)) delete memStore[k];
  __resetShoppingSessionForTests();
});

describe('FoodIntelToast', () => {
  it('renders nothing when itemName is null', async () => {
    const { queryByTestId } = render(
      <FoodIntelToast itemName={null} onHide={jest.fn()} testID="food-intel-toast" />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(queryByTestId('food-intel-toast')).toBeNull();
    expect(mockedMatch).not.toHaveBeenCalled();
  });

  it('appears on matching item check-off and queries matcher with shopping context', async () => {
    mockedMatch.mockResolvedValueOnce([spinachSuperfood]);

    const { findByTestId } = render(
      <FoodIntelToast
        itemName="spinach"
        purchaseCount={1}
        onHide={jest.fn()}
        testID="food-intel-toast"
      />,
    );

    await findByTestId('food-intel-toast');
    expect(mockedMatch).toHaveBeenCalledTimes(1);
    const [context] = mockedMatch.mock.calls[0];
    expect(context.screenType).toBe('shopping');
    expect(context.trigger).toBe('spinach');
    expect(context.ingredients).toEqual(['spinach']);
  });

  it('renders nothing when matcher returns no tips', async () => {
    mockedMatch.mockResolvedValueOnce([]);

    const { queryByTestId } = render(
      <FoodIntelToast
        itemName="ketchup"
        purchaseCount={1}
        onHide={jest.fn()}
        testID="food-intel-toast"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(queryByTestId('food-intel-toast')).toBeNull();
  });

  it('auto-dismisses after 5s and records ignored engagement (not dismissed — user did not interact)', async () => {
    jest.useFakeTimers();
    try {
      mockedMatch.mockResolvedValueOnce([spinachSuperfood]);
      const onHide = jest.fn();

      const { findByTestId } = render(
        <FoodIntelToast
          itemName="spinach"
          purchaseCount={1}
          onHide={onHide}
          testID="food-intel-toast"
        />,
      );

      await findByTestId('food-intel-toast');
      expect(onHide).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(onHide).toHaveBeenCalledTimes(1);
      });
      expect(mockedRecord).toHaveBeenCalledWith('user_test', 'sf-spinach-iron', 'ignored');
    } finally {
      jest.useRealTimers();
    }
  });

  it('tap to dismiss calls onHide and records expanded engagement', async () => {
    mockedMatch.mockResolvedValueOnce([spinachSuperfood]);
    const onHide = jest.fn();

    const { findByTestId } = render(
      <FoodIntelToast
        itemName="spinach"
        purchaseCount={1}
        onHide={onHide}
        testID="food-intel-toast"
      />,
    );

    const toast = await findByTestId('food-intel-toast');
    fireEvent.press(toast);

    await waitFor(() => {
      expect(onHide).toHaveBeenCalledTimes(1);
    });
    expect(mockedRecord).toHaveBeenCalledWith('user_test', 'sf-spinach-iron', 'expanded');
  });

  it('fires a light haptic on appear', async () => {
    mockedMatch.mockResolvedValueOnce([spinachSuperfood]);

    const { findByTestId } = render(
      <FoodIntelToast
        itemName="spinach"
        purchaseCount={1}
        onHide={jest.fn()}
        testID="food-intel-toast"
      />,
    );

    await findByTestId('food-intel-toast');
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('limits to one toast per shopping session', async () => {
    mockedMatch.mockResolvedValue([spinachSuperfood]);

    const first = render(
      <FoodIntelToast
        itemName="spinach"
        purchaseCount={1}
        onHide={jest.fn()}
        testID="food-intel-toast"
      />,
    );

    await first.findByTestId('food-intel-toast');
    first.unmount();

    const second = render(
      <FoodIntelToast
        itemName="kale"
        purchaseCount={1}
        onHide={jest.fn()}
        testID="food-intel-toast"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(second.queryByTestId('food-intel-toast')).toBeNull();
  });

  it('tiers by purchaseCount: low count prefers superfood/nutrient over technique/pairing', async () => {
    mockedMatch.mockResolvedValueOnce([
      spinachTechnique,
      spinachPairing,
      spinachNutrient,
      spinachSuperfood,
    ]);

    const { findByText, queryByText } = render(
      <FoodIntelToast
        itemName="spinach"
        purchaseCount={1}
        onHide={jest.fn()}
        testID="food-intel-toast"
      />,
    );

    // Picks superfood (first preferred category) — not technique or pairing
    await findByText('superfood');
    expect(queryByText('technique')).toBeNull();
    expect(queryByText('pairing')).toBeNull();
  });

  it('tiers by purchaseCount: count 5-9 prefers technique', async () => {
    mockedMatch.mockResolvedValueOnce([
      spinachSuperfood,
      spinachTechnique,
      spinachPairing,
    ]);

    const { findByText, queryByText } = render(
      <FoodIntelToast
        itemName="spinach"
        purchaseCount={6}
        onHide={jest.fn()}
        testID="food-intel-toast"
      />,
    );

    await findByText('technique');
    expect(queryByText('superfood')).toBeNull();
    expect(queryByText('pairing')).toBeNull();
  });

  it('tiers by purchaseCount: count >= 10 prefers pairing', async () => {
    mockedMatch.mockResolvedValueOnce([
      spinachSuperfood,
      spinachTechnique,
      spinachPairing,
    ]);

    const { findByText, queryByText } = render(
      <FoodIntelToast
        itemName="spinach"
        purchaseCount={12}
        onHide={jest.fn()}
        testID="food-intel-toast"
      />,
    );

    await findByText('pairing');
    expect(queryByText('superfood')).toBeNull();
    expect(queryByText('technique')).toBeNull();
  });

  it('falls back across categories when preferred tier is empty', async () => {
    // Only superfood available; user is at chef tier (purchaseCount=12) which prefers pairing
    mockedMatch.mockResolvedValueOnce([spinachSuperfood]);

    const { findByText } = render(
      <FoodIntelToast
        itemName="spinach"
        purchaseCount={12}
        onHide={jest.fn()}
        testID="food-intel-toast"
      />,
    );

    await findByText(/Tip about spinach/);
  });

  it('exposes an accessibilityLabel', async () => {
    mockedMatch.mockResolvedValueOnce([spinachSuperfood]);

    const { findByTestId } = render(
      <FoodIntelToast
        itemName="spinach"
        purchaseCount={1}
        onHide={jest.fn()}
        testID="food-intel-toast"
      />,
    );

    const toast = await findByTestId('food-intel-toast');
    expect(toast.props.accessibilityLabel).toBeTruthy();
  });
});
