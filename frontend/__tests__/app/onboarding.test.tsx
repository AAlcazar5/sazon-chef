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

jest.mock('../../components/ui/GradientButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  const MockGradientButton = ({ label, onPress, disabled, loading }: any) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityState={{ disabled: disabled || loading }}
      testID="gradient-cta"
    >
      <Text>{loading ? 'Setting Up...' : label}</Text>
    </TouchableOpacity>
  );
  return {
    __esModule: true,
    default: MockGradientButton,
    GradientPresets: { brand: ['#fa7e12', '#f59e0b'] },
  };
});

jest.mock('../../components/mascot/LogoMascot', () => {
  const { View } = require('react-native');
  return function MockLogoMascot({ expression }: any) {
    return <View testID={`logo-mascot-${expression}`} />;
  };
});

jest.mock('../../components/mascot/AnimatedLottieMascot', () => {
  const { View } = require('react-native');
  return function MockAnimatedLottieMascot({ expression }: any) {
    return <View testID={`animated-sazon-${expression}`} />;
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
    runOnJS: (fn: any) => fn,
  };
});

jest.mock('moti', () => ({
  MotiView: function MockMotiView({ children }: any) {
    const { View } = require('react-native');
    return <View>{children}</View>;
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

describe('Onboarding', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('Step 0 — Welcome (9N: peach gradient, name prompt)', () => {
    it('renders "What\'s your name?" heading', () => {
      const { getByText } = render(<OnboardingScreen />);
      expect(getByText("What's your name?")).toBeTruthy();
    });

    it('renders the "Continue" CTA button', () => {
      const { getByText } = render(<OnboardingScreen />);
      expect(getByText('Continue')).toBeTruthy();
    });

    it('"Continue" is enabled on the welcome step', () => {
      const { getByTestId } = render(<OnboardingScreen />);
      const btn = getByTestId('gradient-cta');
      expect(btn.props.accessibilityState?.disabled).toBeFalsy();
    });

    it('renders the excited mascot on step 0', () => {
      const { getByTestId } = render(<OnboardingScreen />);
      expect(getByTestId('logo-mascot-excited')).toBeTruthy();
    });

    it('renders welcome subtitle', () => {
      const { getByText } = render(<OnboardingScreen />);
      expect(
        getByText("Let's personalize your experience in just a few quick steps")
      ).toBeTruthy();
    });

    it('renders the "Skip" button', () => {
      const { getByText } = render(<OnboardingScreen />);
      expect(getByText('Skip')).toBeTruthy();
    });
  });

  describe('Step 1 — Dietary Restrictions (9N: sage gradient)', () => {
    it('advances to dietary step after pressing Continue on welcome', async () => {
      const { getByText, getByTestId } = render(<OnboardingScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('gradient-cta'));
      });
      expect(getByText("Anything you can't eat?")).toBeTruthy();
    });

    it('renders the thinking mascot on dietary step', async () => {
      const { getByTestId, getAllByTestId } = render(<OnboardingScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('gradient-cta'));
      });
      expect(getAllByTestId('animated-sazon-thinking').length).toBeGreaterThan(0);
    });

    it('dietary step is optional — "Continue" stays enabled', async () => {
      const { getByTestId } = render(<OnboardingScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('gradient-cta'));
      });
      const btn = getByTestId('gradient-cta');
      expect(btn.props.accessibilityState?.disabled).toBeFalsy();
    });
  });

  describe('Step 2 — Goal (9N: lavender gradient, final step)', () => {
    it('advances to goal step and shows "Finish" label on CTA', async () => {
      const { getByText, getByTestId } = render(<OnboardingScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('gradient-cta'));
      });
      await act(async () => {
        fireEvent.press(getByTestId('gradient-cta'));
      });
      expect(getByText('Finish')).toBeTruthy();
    });
  });
});
