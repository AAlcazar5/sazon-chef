// frontend/__tests__/app/onboarding.test.tsx
// Phase 4: Onboarding — welcome step, progress dots, Continue/Finish button, cuisine step

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import OnboardingScreen from '../../app/onboarding';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../components/mascot/LogoMascot', () => {
  const { View } = require('react-native');
  return function MockLogoMascot({ expression }: any) {
    return <View testID={`logo-mascot-${expression}`} />;
  };
});

// Sazon replaced LogoMascot in onboarding's hero — translate variant→legacy expression
// so existing logo-mascot-{excited|thinking|chef-kiss} testIDs keep working.
jest.mock('../../components/mascot/Sazon', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: function MockSazon({ variant, motion }: any) {
      const expr =
        motion === 'bounce' ? 'excited' :
        motion === 'wobble' ? 'thinking' :
        motion === 'celebrate' ? 'chef-kiss' :
        variant || 'mascot';
      return <View testID={`logo-mascot-${expr}`} />;
    },
  };
});

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: function MockLG(props: any) {
      return <View testID="onboarding-gradient" {...props} />;
    },
  };
});

jest.mock('../../components/ui/LoadingState', () => {
  const { View } = require('react-native');
  return function MockLoadingState() { return <View testID="loading-state" />; };
});

jest.mock('../../components/ui/SuccessModal', () => {
  return function MockSuccessModal({ visible }: any) {
    if (!visible) return null;
    const { View } = require('react-native');
    return <View testID="success-modal" />;
  };
});

jest.mock('../../components/recipe/RecipeRoulette', () => {
  const { View } = require('react-native');
  return function MockRecipeRoulette() { return <View testID="recipe-roulette" />; };
});

// Execute reanimated callbacks synchronously so visibleStep advances on press.
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated/mock');
  return {
    ...actual,
    withTiming: (_toValue: any, _config: any, cb?: (f: boolean) => void) => {
      if (cb) cb(true);
      return _toValue;
    },
    withSpring: (_toValue: any, _config: any, cb?: (f: boolean) => void) => {
      if (cb) cb(true);
      return _toValue;
    },
    withRepeat: (v: any) => v,
    withSequence: (v: any) => v,
    runOnJS: (fn: any) => fn,
    useReducedMotion: () => false,
  };
});

jest.mock('moti', () => ({
  MotiView: function MockMotiView({ children, testID, style }: any) {
    const { View } = require('react-native');
    return <View testID={testID} style={style}>{children}</View>;
  },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: function MockIonicons() {
    const { Text } = require('react-native');
    return <Text>icon</Text>;
  },
}));

jest.mock('../../lib/api', () => ({
  userApi: {
    getProfile: jest.fn().mockResolvedValue({ data: null }),
    saveOnboardingData: jest.fn().mockResolvedValue({ data: {} }),
    updatePreferences: jest.fn().mockResolvedValue({ data: {} }),
    updateProfile: jest.fn().mockResolvedValue({ data: {} }),
  },
  recipeApi: {
    getRecommendations: jest.fn().mockResolvedValue({ data: { recipes: [] } }),
  },
}));

jest.mock('../../constants/Superfoods', () => ({
  SUPERFOOD_CATEGORIES: [],
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn().mockReturnValue({}),
  useNavigation: jest.fn().mockReturnValue({ navigate: jest.fn(), goBack: jest.fn(), addListener: jest.fn(() => jest.fn()), dispatch: jest.fn() }),
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Onboarding (editorial revamp)', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('Step 0 — Welcome (peach editorial)', () => {
    it('renders "WELCOME" eyebrow', () => {
      const { getByText } = render(<OnboardingScreen />);
      expect(getByText('WELCOME')).toBeTruthy();
    });

    it('renders the editorial title parts ("Let\'s find" + "recipes")', () => {
      const { getByText } = render(<OnboardingScreen />);
      expect(getByText(/Let's find/)).toBeTruthy();
      expect(getByText('recipes')).toBeTruthy();
    });

    it('renders the "Get started" CTA on step 0', () => {
      const { getByText } = render(<OnboardingScreen />);
      expect(getByText('Get started')).toBeTruthy();
    });

    it('CTA is enabled on the welcome step', () => {
      const { getByTestId } = render(<OnboardingScreen />);
      const btn = getByTestId('onboarding-cta');
      expect(btn.props.accessibilityState?.disabled).toBeFalsy();
    });

    it('renders the excited mascot on step 0', () => {
      const { getByTestId } = render(<OnboardingScreen />);
      expect(getByTestId('logo-mascot-excited')).toBeTruthy();
    });

    it('renders welcome subtitle', () => {
      const { getByText } = render(<OnboardingScreen />);
      expect(
        getByText(/Sazon tailors every recipe to your macros/)
      ).toBeTruthy();
    });

    it('renders the "Skip" button', () => {
      const { getByText } = render(<OnboardingScreen />);
      expect(getByText('Skip')).toBeTruthy();
    });
  });

  describe('Step 1 — Diet (sage editorial)', () => {
    it('advances to diet step and shows "STEP 1 OF 9" eyebrow', async () => {
      const { getByText, getByTestId } = render(<OnboardingScreen />);
      await act(async () => { fireEvent.press(getByTestId('onboarding-cta')); });
      expect(getByText('STEP 1 OF 9')).toBeTruthy();
    });

    it('renders editorial title ("Any foods" + "to avoid")', async () => {
      const { getByText, getByTestId } = render(<OnboardingScreen />);
      await act(async () => { fireEvent.press(getByTestId('onboarding-cta')); });
      expect(getByText(/Any foods/)).toBeTruthy();
      expect(getByText('to avoid')).toBeTruthy();
    });

    it('renders the thinking mascot on diet step', async () => {
      const { getByTestId } = render(<OnboardingScreen />);
      await act(async () => { fireEvent.press(getByTestId('onboarding-cta')); });
      expect(getByTestId('logo-mascot-thinking')).toBeTruthy();
    });

    it('renders the 6 dietary option cards', async () => {
      const { getByText, getByTestId } = render(<OnboardingScreen />);
      await act(async () => { fireEvent.press(getByTestId('onboarding-cta')); });
      expect(getByText('Vegetarian')).toBeTruthy();
      expect(getByText('Vegan')).toBeTruthy();
      expect(getByText('Gluten-free')).toBeTruthy();
      expect(getByText('Dairy-free')).toBeTruthy();
      expect(getByText('Nut-free')).toBeTruthy();
      expect(getByText('Keto')).toBeTruthy();
    });

    it('CTA stays enabled on diet step (optional)', async () => {
      const { getByTestId } = render(<OnboardingScreen />);
      await act(async () => { fireEvent.press(getByTestId('onboarding-cta')); });
      expect(getByTestId('onboarding-cta').props.accessibilityState?.disabled).toBeFalsy();
    });

    it('CTA shows "Continue" on diet step', async () => {
      const { getByText, getByTestId } = render(<OnboardingScreen />);
      await act(async () => { fireEvent.press(getByTestId('onboarding-cta')); });
      expect(getByText('Continue')).toBeTruthy();
    });
  });

  describe('Step 2 — Goal (lavender editorial)', () => {
    it('advances to lifestyle step and shows "STEP 2 OF 9" eyebrow', async () => {
      const { getByText, getByTestId } = render(<OnboardingScreen />);
      await act(async () => { fireEvent.press(getByTestId('onboarding-cta')); });
      await act(async () => { fireEvent.press(getByTestId('onboarding-cta')); });
      expect(getByText('STEP 2 OF 9')).toBeTruthy();
    });

    it('CTA shows "Continue" label on the lifestyle step', async () => {
      const { getByText, getByTestId } = render(<OnboardingScreen />);
      await act(async () => { fireEvent.press(getByTestId('onboarding-cta')); });
      await act(async () => { fireEvent.press(getByTestId('onboarding-cta')); });
      expect(getByText('Continue')).toBeTruthy();
    });

    it('renders the lifestyle multi-select options (A5-a)', async () => {
      const { getByText, getByTestId } = render(<OnboardingScreen />);
      await act(async () => { fireEvent.press(getByTestId('onboarding-cta')); });
      await act(async () => { fireEvent.press(getByTestId('onboarding-cta')); });
      expect(getByText('Try new cuisines')).toBeTruthy();
      expect(getByText('Eat seasonally')).toBeTruthy();
      expect(getByText('Avoid processed food')).toBeTruthy();
      expect(getByText('Balance health & pleasure')).toBeTruthy();
      expect(getByText('Specific health goals')).toBeTruthy();
    });

    it('does NOT render the banned cut/bulk/maintain vocabulary anywhere on the lifestyle step', async () => {
      const { queryByText, getByTestId } = render(<OnboardingScreen />);
      await act(async () => { fireEvent.press(getByTestId('onboarding-cta')); });
      await act(async () => { fireEvent.press(getByTestId('onboarding-cta')); });
      // Banned in lifestyle voice; replaced by affective question.
      expect(queryByText(/lose weight/i)).toBeNull();
      expect(queryByText(/build muscle/i)).toBeNull();
      // 'Maintain' alone is too generic; we just check the goal-step substrings.
    });
  });

  describe('Final step — Build your first plate (Group 10X Phase 1)', () => {
    // ROADMAP 4.0 A5 — build-first-plate is now step 9 (was step 3).
    const advanceTo = async (getByTestId: any) => {
      // 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 = 9 CTA presses.
      for (let i = 0; i < 9; i++) {
        await act(async () => { fireEvent.press(getByTestId('onboarding-cta')); });
      }
    };

    it('renders "ONE MORE THING" eyebrow on the final step', async () => {
      const { getByText, getByTestId } = render(<OnboardingScreen />);
      await advanceTo(getByTestId);
      expect(getByText('ONE MORE THING')).toBeTruthy();
    });

    it('renders the final-step seed prompt ("Pick a few" + "cook tonight")', async () => {
      const { getByText, getByTestId } = render(<OnboardingScreen />);
      await advanceTo(getByTestId);
      // P0 retention — final step seeds the recommender via /quick-start, not
      // straight into build-a-plate. Copy reflects the pick-three ritual.
      expect(getByText(/Pick a few/)).toBeTruthy();
      expect(getByText('cook tonight')).toBeTruthy();
    });

    it('renders the primary "Build my first plate" CTA', async () => {
      const { getByTestId } = render(<OnboardingScreen />);
      await advanceTo(getByTestId);
      expect(getByTestId('onboarding-build-plate-cta')).toBeTruthy();
    });

    it('renders the secondary "Skip for now" ghost CTA', async () => {
      const { getByTestId } = render(<OnboardingScreen />);
      await advanceTo(getByTestId);
      expect(getByTestId('onboarding-skip-plate')).toBeTruthy();
    });

    it('tapping primary CTA routes to /quick-start (seeds recommender before /(tabs))', async () => {
      const { router } = require('expo-router');
      const { getByTestId } = render(<OnboardingScreen />);
      await advanceTo(getByTestId);
      fireEvent.press(getByTestId('onboarding-build-plate-cta'));
      expect(router.replace).toHaveBeenCalledWith('/quick-start');
    });

    it('tapping skip emits skipped_first_plate analytics event and advances to home', async () => {
      const analytics = require('../../lib/analytics');
      const trackSpy = jest.spyOn(analytics, 'track');
      const { router } = require('expo-router');
      const { getByTestId } = render(<OnboardingScreen />);
      await advanceTo(getByTestId);
      await act(async () => { fireEvent.press(getByTestId('onboarding-skip-plate')); });
      expect(trackSpy).toHaveBeenCalledWith('skipped_first_plate');
      expect(router.replace).toHaveBeenCalledWith('/(tabs)');
      trackSpy.mockRestore();
    });
  });

  describe('Progress dots', () => {
    it('renders 4 dots', () => {
      const { getByTestId } = render(<OnboardingScreen />);
      expect(getByTestId('onboarding-dot-0')).toBeTruthy();
      expect(getByTestId('onboarding-dot-1')).toBeTruthy();
      expect(getByTestId('onboarding-dot-2')).toBeTruthy();
      expect(getByTestId('onboarding-dot-3')).toBeTruthy();
    });
  });
});
