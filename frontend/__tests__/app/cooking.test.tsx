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
    getSavedMeta: jest.fn(() => Promise.resolve({ data: { notes: null, rating: null } })),
    updateSavedMeta: jest.fn(() => Promise.resolve({ data: { notes: null, rating: null } })),
  },
  mealPlanApi: {
    getWeeklyPlan: jest.fn(() => Promise.resolve({ data: { days: [] } })),
  },
}));

jest.mock('../../utils/timerExtraction', () => ({
  extractTimers: jest.fn(() => []),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('../../components/recipe/CookingModeTimers', () => () => null);
jest.mock('../../components/recipe/IngredientChecklist', () => () => null);
jest.mock('../../components/cooking/ConsumeIngredientsSheet', () => ({
  __esModule: true,
  default: () => null,
}));
// Sheets / overlays that mount their own BottomSheet (which needs a
// BottomSheetModalProvider context). In unit tests they don't add value —
// stub to render nothing.
jest.mock('../../components/recipe/TasteSurveySheet', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../components/cooking/LeftoverIdeasSheet', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../components/cooking/CookCompleteCelebration', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../components/cooking/PostCookRating', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../components/recipe/CulturalPrimerModal', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../components/celebrations/FirstCuisineStamp', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../components/celebrations/DiscoveryMilestoneInline', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../components/cooking/TechniqueTip', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../components/cooking/FoodIntelCookingTip', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../components/mascot/AnimatedLottieMascot', () => {
  const { View } = require('react-native');
  return function MockAnimatedLottieMascot({ expression }: { expression: string }) {
    return <View testID={`sazon-${expression}`} />;
  };
});

// CelebrationOverlay renders title, expression mascot, stats, and CTAs from
// props. The done-screen tests assert these — render a minimal skeleton.
jest.mock('../../components/celebrations', () => ({
  CelebrationOverlay: function MockCelebrationOverlay({
    visible,
    title,
    subtitle,
    expression,
    stats,
    primaryCTA,
    secondaryCTA,
    children,
  }: any) {
    const { View, Text, TouchableOpacity } = require('react-native');
    if (visible === false) return null;
    return (
      <View testID="celebration-overlay">
        {title ? <Text>{title}</Text> : null}
        {subtitle ? <Text>{subtitle}</Text> : null}
        {expression ? <View testID={`sazon-${expression}`} /> : null}
        {Array.isArray(stats)
          ? stats.map((s: any, i: number) => (
              <View key={`stat-${i}`}>
                <Text>{s.value}</Text>
                <Text>{s.label}</Text>
              </View>
            ))
          : null}
        {primaryCTA ? (
          <TouchableOpacity onPress={primaryCTA.onPress}>
            <Text>{primaryCTA.label}</Text>
          </TouchableOpacity>
        ) : null}
        {secondaryCTA ? (
          <TouchableOpacity onPress={secondaryCTA.onPress}>
            <Text>{secondaryCTA.label}</Text>
          </TouchableOpacity>
        ) : null}
        {children}
      </View>
    );
  },
}));

jest.mock('../../components/celebrations/ShareCardCapture', () => {
  const React = require('react');
  return React.forwardRef(function MockShareCardCapture() { return null; });
});

jest.mock('../../utils/hapticChoreography', () => ({
  HapticChoreography: { cookingComplete: jest.fn() },
}));

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

  it('renders celebration heading on completion', async () => {
    const { getByText } = await reachDoneScreen();
    await waitFor(() => expect(getByText('You nailed it!')).toBeTruthy());
  });

  it('renders step count stat on completion', async () => {
    const { getByText } = await reachDoneScreen();
    // oneStepRecipe has 1 instruction → totalSteps = 1, value rendered as "1/1"
    await waitFor(() => {
      expect(getByText('1/1')).toBeTruthy();
      expect(getByText('Steps')).toBeTruthy();
    });
  });

  it('renders elapsed time stat on completion', async () => {
    const { getByText } = await reachDoneScreen();
    await waitFor(() => expect(getByText('Cook Time')).toBeTruthy());
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

  it('fires the cookingComplete haptic choreography on completion', async () => {
    const { HapticChoreography } = require('../../utils/hapticChoreography');
    await reachDoneScreen();
    await waitFor(() => expect(HapticChoreography.cookingComplete).toHaveBeenCalled());
  });

  it('calls recordCook with the recipe id on completion', async () => {
    const { recipeApi } = require('../../lib/api');
    await reachDoneScreen();
    await waitFor(() =>
      expect(recipeApi.recordCook).toHaveBeenCalledWith('recipe-1')
    );
  });
});

describe('CookingScreen — Add Note button', () => {
  let timingSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    const routerMock = require('expo-router');
    routerMock.useLocalSearchParams.mockReturnValue({ id: 'recipe-1' });

    timingSpy = jest
      .spyOn(Animated, 'timing')
      .mockImplementation((value: any, config: any) => ({
        start: (callback?: ((result: { finished: boolean }) => void)) => {
          if (typeof config.toValue === 'number') value.setValue(config.toValue);
          callback?.({ finished: true });
        },
        stop: jest.fn(),
        reset: jest.fn(),
      }));
  });

  afterEach(() => {
    timingSpy.mockRestore();
  });

  it('renders "Add Note" button in the bottom bar during cooking', async () => {
    const { getByText, getByLabelText } = setup();
    await waitFor(() => expect(getByText('Boil the water')).toBeTruthy());

    expect(getByLabelText('Add note')).toBeTruthy();
  });

  it('opens note input overlay when "Add Note" is pressed', async () => {
    const { getByText, getByLabelText, getByPlaceholderText } = setup();
    await waitFor(() => expect(getByText('Boil the water')).toBeTruthy());

    fireEvent.press(getByLabelText('Add note'));

    await waitFor(() => expect(getByPlaceholderText("Jot down a quick note…")).toBeTruthy());
  });

  it('saves note via API when submitted', async () => {
    const { recipeApi } = require('../../lib/api');
    const { getByText, getByLabelText, getByPlaceholderText } = setup();
    await waitFor(() => expect(getByText('Boil the water')).toBeTruthy());

    fireEvent.press(getByLabelText('Add note'));
    await waitFor(() => getByPlaceholderText("Jot down a quick note…"));

    fireEvent.changeText(getByPlaceholderText("Jot down a quick note…"), 'Needs more salt');
    fireEvent.press(getByLabelText('Save note'));

    await waitFor(() =>
      expect(recipeApi.updateSavedMeta).toHaveBeenCalledWith('recipe-1', expect.objectContaining({
        notes: expect.stringContaining('Needs more salt'),
      }))
    );
  });
});
