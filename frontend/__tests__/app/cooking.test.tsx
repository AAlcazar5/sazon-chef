// frontend/__tests__/app/cooking.test.tsx
// Phase 3/4 Screen Inventory: Cooking Mode — step navigation, completion screen

import React from 'react';
import { Animated } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import CookingScreen from '../../app/cooking';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: any) => children,
  Gesture: {
    Pan: () => ({
      activeOffsetX: () => ({
        onEnd: () => ({ runOnJS: () => ({}) }),
      }),
    }),
  },
}));

jest.mock('../../lib/api', () => ({
  recipeApi: {
    getRecipe: jest.fn(),
    recordCook: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../../utils/timerExtraction', () => ({
  extractTimers: jest.fn(() => []),
}));

jest.mock('../../components/recipe/CookingModeTimers', () => () => null);
jest.mock('../../components/recipe/IngredientChecklist', () => () => null);

jest.mock('../../components/mascot/AnimatedLottieMascot', () => {
  const { View } = require('react-native');
  return function MockAnimatedLottieMascot({ expression }: { expression: string }) {
    return <View testID={`sazon-${expression}`} />;
  };
});

jest.mock('../../components/premium/CoffeeBanner', () => ({
  CoffeeBanner: () => null,
  shouldShowCoffeeBanner: jest.fn(() => Promise.resolve(false)),
  recordCoffeeBannerShown: jest.fn(),
}));

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../components/ui/Icon', () => () => null);

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

// Children must render so button labels are visible.
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, style }: any) => {
    const { View } = require('react-native');
    return <View style={style}>{children}</View>;
  },
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const threeStepRecipe = {
  id: 'recipe-1',
  title: 'Test Pasta',
  servings: 4,
  ingredients: [
    { text: 'pasta', order: 1 },
    { text: 'sauce', order: 2 },
  ],
  instructions: [
    { step: 1, text: 'Boil the water' },
    { step: 2, text: 'Add the pasta' },
    { step: 3, text: 'Drain and serve' },
  ],
};

const oneStepRecipe = {
  ...threeStepRecipe,
  instructions: [{ step: 1, text: 'One and only step' }],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function setup(recipeOverride = threeStepRecipe) {
  const { recipeApi } = require('../../lib/api');
  recipeApi.getRecipe.mockResolvedValue({ data: recipeOverride });
  return render(<CookingScreen />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CookingScreen — step navigation', () => {
  let timingSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Make useLocalSearchParams return a valid recipe id
    const routerMock = require('expo-router');
    routerMock.useLocalSearchParams.mockReturnValue({ id: 'recipe-1' });

    // Make Animated.timing synchronous so the step-change callback fires instantly.
    // This is the only way to reliably test step navigation without fighting the
    // native driver mock + fake timer interaction.
    timingSpy = jest
      .spyOn(Animated, 'timing')
      .mockImplementation((value: any, config: any) => ({
        start: (callback?: ((result: { finished: boolean }) => void)) => {
          if (typeof config.toValue === 'number') {
            value.setValue(config.toValue);
          }
          callback?.({ finished: true });
        },
        stop: jest.fn(),
        reset: jest.fn(),
      }));
  });

  afterEach(() => {
    timingSpy.mockRestore();
  });

  it('renders step 1 text after recipe loads', async () => {
    const { getByText } = setup();
    await waitFor(() => expect(getByText('Boil the water')).toBeTruthy());
    expect(getByText('Step 1')).toBeTruthy();
  });

  it('shows step count in top bar (1 / 3)', async () => {
    const { getByText } = setup();
    await waitFor(() => expect(getByText('Boil the water')).toBeTruthy());
    expect(getByText('1 / 3')).toBeTruthy();
  });

  it('pressing Next shows step 2 text and hides step 1 text', async () => {
    const { getByText, queryByText } = setup();
    await waitFor(() => expect(getByText('Boil the water')).toBeTruthy());

    fireEvent.press(getByText('Next'));

    await waitFor(() => {
      expect(getByText('Add the pasta')).toBeTruthy();
      expect(queryByText('Boil the water')).toBeNull();
    });
  });

  it('pressing Next updates the step counter (2 / 3)', async () => {
    const { getByText } = setup();
    await waitFor(() => expect(getByText('1 / 3')).toBeTruthy());

    fireEvent.press(getByText('Next'));

    await waitFor(() => expect(getByText('2 / 3')).toBeTruthy());
  });

  it('pressing Next twice reaches step 3 and shows the "I\'m Done!" label', async () => {
    const { getByText } = setup();
    await waitFor(() => expect(getByText('Boil the water')).toBeTruthy());

    fireEvent.press(getByText('Next'));
    await waitFor(() => expect(getByText('Add the pasta')).toBeTruthy());

    fireEvent.press(getByText('Next'));
    await waitFor(() => {
      expect(getByText('Drain and serve')).toBeTruthy();
      expect(getByText("I'm Done!")).toBeTruthy();
    });
  });

  it('previous step text is absent after pressing Next', async () => {
    const { getByText, queryByText } = setup();
    await waitFor(() => expect(getByText('Boil the water')).toBeTruthy());

    fireEvent.press(getByText('Next'));
    await waitFor(() => expect(getByText('Add the pasta')).toBeTruthy());

    expect(queryByText('Boil the water')).toBeNull();
  });
});

describe('CookingScreen — completion screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const routerMock = require('expo-router');
    routerMock.useLocalSearchParams.mockReturnValue({ id: 'recipe-1' });
  });

  // Navigate to the done screen using a single-step recipe.
  // handleDone() is reached via goNext() on the last step — no animation involved.
  async function reachDoneScreen() {
    const { recipeApi } = require('../../lib/api');
    recipeApi.getRecipe.mockResolvedValue({ data: oneStepRecipe });
    const utils = render(<CookingScreen />);
    await waitFor(() => expect(utils.getByText('One and only step')).toBeTruthy());
    await act(async () => {
      fireEvent.press(utils.getByText("I'm Done!"));
    });
    return utils;
  }

  it('renders the chef-kiss mascot on completion', async () => {
    const { getByTestId } = await reachDoneScreen();
    await waitFor(() => expect(getByTestId('sazon-chef-kiss')).toBeTruthy());
  });

  it('renders "Recipe Complete!" heading on completion', async () => {
    const { getByText } = await reachDoneScreen();
    await waitFor(() => expect(getByText('Recipe Complete!')).toBeTruthy());
  });

  it('renders step count stat on completion', async () => {
    const { getByText } = await reachDoneScreen();
    // oneStepRecipe has 1 instruction → totalSteps = 1
    await waitFor(() => {
      expect(getByText('1')).toBeTruthy();
      expect(getByText('Steps')).toBeTruthy();
    });
  });

  it('renders elapsed time stat on completion', async () => {
    const { getByText } = await reachDoneScreen();
    await waitFor(() => expect(getByText('Time')).toBeTruthy());
  });

  it('renders "Back to Recipe" CTA on completion', async () => {
    const { getByText } = await reachDoneScreen();
    await waitFor(() => expect(getByText('Back to Recipe')).toBeTruthy());
  });

  it('"Back to Recipe" button calls router.back()', async () => {
    const { router } = require('expo-router');
    const { getByText } = await reachDoneScreen();
    await waitFor(() => expect(getByText('Back to Recipe')).toBeTruthy());

    fireEvent.press(getByText('Back to Recipe'));
    expect(router.back).toHaveBeenCalled();
  });

  it('fires success haptic on completion', async () => {
    const Haptics = require('expo-haptics');
    await reachDoneScreen();
    await waitFor(() =>
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      )
    );
  });

  it('calls recordCook with the recipe id on completion', async () => {
    const { recipeApi } = require('../../lib/api');
    await reachDoneScreen();
    await waitFor(() =>
      expect(recipeApi.recordCook).toHaveBeenCalledWith('recipe-1')
    );
  });
});
