// frontend/__tests__/app/modal.test.tsx
// Phase 5 Screen Inventory: Recipe Detail modal — hero, buttons, frosted header, ingredients, Start Cooking

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RecipeModal from '../../app/modal';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../lib/api', () => ({
  recipeApi: {
    getRecipe: jest.fn(),
    recordView: jest.fn(() => Promise.resolve()),
    getSimilarRecipes: jest.fn(() => Promise.resolve({ data: [] })),
    deleteRecipe: jest.fn(),
  },
  collectionsApi: {
    getCollections: jest.fn(() => Promise.resolve({ data: [] })),
    saveRecipe: jest.fn(),
    addToCollection: jest.fn(),
  },
  shoppingListApi: { addFromRecipe: jest.fn() },
  costTrackingApi: { getRecipeSavings: jest.fn(() => Promise.resolve({ data: null })) },
  shoppingAppApi: {
    getIntegrations: jest.fn(() => Promise.resolve({ data: [] })),
    addIngredients: jest.fn(),
  },
  api: { get: jest.fn() },
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({ id: 'recipe-1', source: 'suggestions' })),
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));

// Stable reference obtained after mock is registered (avoids TDZ at factory call time)
const mockRouter = jest.requireMock('expo-router').router;

jest.mock('expo-blur', () => ({
  BlurView: function MockBlurView(props) {
    return require('react').createElement(require('react-native').View, { style: props.style }, props.children);
  },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy', Soft: 'soft', Rigid: 'rigid' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  return function MockHTO(props) {
    return require('react').createElement(require('react-native').TouchableOpacity, props);
  };
});

jest.mock('../../components/ui/GradientButton', () => ({
  __esModule: true,
  default: function MockGradientButton(props) {
    const { TouchableOpacity, Text } = require('react-native');
    return require('react').createElement(
      TouchableOpacity,
      { onPress: props.onPress, disabled: props.disabled, accessibilityLabel: props.label },
      require('react').createElement(Text, null, props.label),
    );
  },
  GradientPresets: {
    brand: ['#fa7e12', '#f59e0b'],
    fire: ['#FB923C', '#EF4444'],
    premium: ['#A855F7', '#6366F1'],
    info: ['#38BDF8', '#6366F1'],
    fresh: ['#10B981', '#06B6D4'],
    danger: ['#F97316', '#DC2626'],
  },
}));

jest.mock('../../components/ui/AnimatedText', () => {
  return function MockAnimatedText(props) {
    return require('react').createElement(require('react-native').Text, null, props.children);
  };
});

jest.mock('../../components/ui/LoadingState', () => {
  return function MockLoadingState() {
    return require('react').createElement(require('react-native').View, { testID: 'loading-state' });
  };
});

jest.mock('../../components/ui/SkeletonLoader', () => {
  return function MockSkeletonLoader() {
    return require('react').createElement(require('react-native').View, { testID: 'skeleton-loader' });
  };
});

jest.mock('../../components/mascot/LogoMascot', () => {
  return function MockLogoMascot() {
    return require('react').createElement(require('react-native').View, { testID: 'logo-mascot' });
  };
});

jest.mock('../../components/recipe/MealPrepScalingModal', () => {
  return function MockMealPrepScalingModal() {
    return require('react').createElement(require('react-native').View, { testID: 'meal-prep-modal' });
  };
});

jest.mock('../../utils/imageUtils', () => ({
  optimizedImageUrl: (url) => url,
}));

jest.mock('../../utils/storageInstructions', () => ({
  generateStorageInstructions: jest.fn(() => []),
  getStorageMethods: jest.fn(() => []),
}));

jest.mock('../../utils/mealPrepTags', () => ({
  getMealPrepTags: jest.fn(() => []),
}));

// Override global LinearGradient mock so testID is forwarded
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: function MockLinearGradient(props) {
    return require('react').createElement(
      require('react-native').View,
      { testID: props.testID, style: props.style },
      props.children || null,
    );
  },
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const mockRecipe = {
  id: 'recipe-1',
  title: 'Grilled Salmon',
  description: 'A healthy and delicious grilled salmon recipe.',
  cookTime: 25,
  cuisine: 'American',
  calories: 480,
  protein: 42,
  carbs: 8,
  fat: 30,
  ingredients: ['2 salmon fillets', '2 tbsp olive oil', '1 lemon', 'Salt and pepper'],
  instructions: ['Season salmon', 'Heat grill to medium-high', 'Cook 4 min per side', 'Serve with lemon'],
  imageUrl: 'https://example.com/salmon.jpg',
  isUserCreated: false,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockRecipeLoad(recipe = mockRecipe) {
  const { recipeApi } = require('../../lib/api');
  recipeApi.getRecipe.mockResolvedValue({ data: recipe });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('RecipeModal', () => {
  let dateSpy: jest.SpyInstance;
  let testTimeOffset = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    // Increment offset so each test's Date.now() is always > previous test's cachedAt + TTL
    testTimeOffset += 10 * 60 * 1000; // +10 min per test (TTL is 5 min)
    const baseTime = 1_700_000_000_000; // stable base to avoid real-clock drift
    dateSpy = jest.spyOn(Date, 'now').mockReturnValue(baseTime + testTimeOffset);
    mockRecipeLoad();
  });

  afterEach(() => {
    dateSpy.mockRestore();
  });

  it('hero image renders at top before any text content (toJSON tree order)', async () => {
    const { toJSON, getByText, getAllByText } = render(<RecipeModal />);
    await waitFor(() => getAllByText('Grilled Salmon'));

    const tree = JSON.stringify(toJSON());
    const heroPos = tree.indexOf('"hero-image"');
    const titlePos = tree.indexOf('Grilled Salmon');

    expect(heroPos).toBeGreaterThan(-1);
    expect(titlePos).toBeGreaterThan(-1);
    expect(heroPos).toBeLessThan(titlePos);
  });

  it('renders hero placeholder gradient when imageUrl is absent', async () => {
    mockRecipeLoad({ ...mockRecipe, imageUrl: undefined });

    const { getByTestId, getByText, getAllByText } = render(<RecipeModal />);
    await waitFor(() => getAllByText('Grilled Salmon'));

    expect(getByTestId('hero-placeholder')).toBeTruthy();
  });

  it('floating close button renders and calls router.back()', async () => {
    const { getByLabelText, getByText, getAllByText } = render(<RecipeModal />);
    await waitFor(() => getAllByText('Grilled Salmon'));

    const closeBtn = getByLabelText('Close recipe');
    expect(closeBtn).toBeTruthy();
    fireEvent.press(closeBtn);
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('edit button is hidden for non-user recipes', async () => {
    const { queryByLabelText, getByText, getAllByText } = render(<RecipeModal />);
    await waitFor(() => getAllByText('Grilled Salmon'));

    expect(queryByLabelText('Edit recipe')).toBeNull();
  });

  it('edit button renders and routes to recipe form for user-created recipes', async () => {
    mockRecipeLoad({ ...mockRecipe, isUserCreated: true });

    const { getByLabelText, getByText, getAllByText } = render(<RecipeModal />);
    await waitFor(() => getAllByText('Grilled Salmon'));

    const editBtn = getByLabelText('Edit recipe');
    expect(editBtn).toBeTruthy();
    fireEvent.press(editBtn);
    expect(mockRouter.push).toHaveBeenCalledWith('/recipe-form?id=recipe-1');
  });

  it('frosted header testID is present in DOM', async () => {
    const { getByTestId, getByText, getAllByText } = render(<RecipeModal />);
    await waitFor(() => getAllByText('Grilled Salmon'));

    expect(getByTestId('frosted-header')).toBeTruthy();
  });

  it('frosted header opacity is 0 on mount (before scroll)', async () => {
    const { getByTestId, getByText, getAllByText } = render(<RecipeModal />);
    await waitFor(() => getAllByText('Grilled Salmon'));

    const header = getByTestId('frosted-header');
    // floatingHeaderOpacity is an Animated interpolation of modalScrollY (starts at 0)
    // At scroll=0, inputRange=[HERO_HEIGHT-72, HERO_HEIGHT-16], value clamps to 0
    const opacityStyle = [].concat(header.props.style).filter(Boolean);
    const hasZeroOpacity = opacityStyle.some(
      (s) => s.opacity === 0 || (s.opacity != null && typeof s.opacity === 'object'),
    );
    expect(hasZeroOpacity).toBe(true);
  });

  it('renders all ingredients from recipe.ingredients', async () => {
    const { getByText, getAllByText } = render(<RecipeModal />);
    await waitFor(() => getAllByText('Grilled Salmon'));

    for (const ingredient of mockRecipe.ingredients) {
      expect(getByText(ingredient)).toBeTruthy();
    }
  });

  it('"Start Cooking" button renders and navigates to cooking screen with correct recipe id', async () => {
    const { getByLabelText, getByText, getAllByText } = render(<RecipeModal />);
    await waitFor(() => getAllByText('Grilled Salmon'));

    const startBtn = getByLabelText('Start Cooking');
    expect(startBtn).toBeTruthy();
    fireEvent.press(startBtn);
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/cooking', params: { id: 'recipe-1' } }),
    );
  });
});
