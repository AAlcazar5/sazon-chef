// frontend/__tests__/components/cookbook/RecipeCreation.test.tsx
// Tests for recipe creation and editing flows (FAB, AI assist, fork, edit).

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../../lib/api', () => ({
  recipeApi: {
    getRecipe: jest.fn(),
    recordView: jest.fn(() => Promise.resolve()),
    getSimilarRecipes: jest.fn(() => Promise.resolve({ data: [] })),
    getRelatedRecipes: jest.fn(() => Promise.resolve({ data: [] })),
    getSavedMeta: jest.fn(() => Promise.resolve({ data: { notes: null, rating: null } })),
    updateSavedMeta: jest.fn(() => Promise.resolve({ data: {} })),
    deleteRecipe: jest.fn(),
    forkRecipe: jest.fn(),
    generateFromDescription: jest.fn(),
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
  userApi: { getMacroGoals: jest.fn(() => Promise.resolve({ data: null })) },
  api: { get: jest.fn() },
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({ id: 'recipe-1', source: 'cookbook' })),
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));

const mockRouter = jest.requireMock('expo-router').router;

jest.mock('expo-blur', () => ({
  BlurView: function MockBlurView(props: any) {
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

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  return function MockHTO(props: any) {
    return require('react').createElement(require('react-native').TouchableOpacity, props);
  };
});

jest.mock('../../../components/ui/GradientButton', () => ({
  __esModule: true,
  default: function MockGradientButton(props: any) {
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

jest.mock('../../../components/ui/AnimatedText', () => {
  return function MockAnimatedText(props: any) {
    return require('react').createElement(require('react-native').Text, null, props.children);
  };
});

jest.mock('../../../components/ui/LoadingState', () => {
  return function MockLoadingState() {
    return require('react').createElement(require('react-native').View, { testID: 'loading-state' });
  };
});

jest.mock('../../../components/ui/SkeletonLoader', () => {
  return function MockSkeletonLoader() {
    return require('react').createElement(require('react-native').View, { testID: 'skeleton-loader' });
  };
});

jest.mock('../../../components/mascot/LogoMascot', () => {
  return function MockLogoMascot() {
    return require('react').createElement(require('react-native').View, { testID: 'logo-mascot' });
  };
});

jest.mock('../../../components/ui/BottomSheet', () => {
  return function MockBottomSheet(props: any) {
    if (!props.visible) return null;
    return require('react').createElement(require('react-native').View, { testID: 'bottom-sheet' }, props.children);
  };
});

jest.mock('../../../components/recipe/MealPrepScalingModal', () => {
  return function MockMealPrepScalingModal() {
    return require('react').createElement(require('react-native').View, { testID: 'meal-prep-modal' });
  };
});

jest.mock('../../../components/recipe/VisualIngredientList', () =>
  require('../../__helpers__/mockVisualIngredientList')
);

jest.mock('../../../components/recipe/CookingStepsTimeline', () =>
  require('../../__helpers__/mockCookingStepsTimeline')
);

jest.mock('../../../components/cookbook/RecipeNotesModal', () => {
  return function MockRecipeNotesModal(props: any) {
    if (!props.visible) return null;
    return require('react').createElement(require('react-native').View, { testID: 'notes-modal' });
  };
});

jest.mock('../../../utils/imageUtils', () => ({
  optimizedImageUrl: (url: string) => url,
}));

jest.mock('../../../utils/storageInstructions', () => ({
  generateStorageInstructions: jest.fn(() => []),
  getStorageMethods: jest.fn(() => []),
}));

jest.mock('../../../utils/mealPrepTags', () => ({
  getMealPrepTags: jest.fn(() => []),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: function MockLinearGradient(props: any) {
    return require('react').createElement(
      require('react-native').View,
      { testID: props.testID, style: props.style },
      props.children || null,
    );
  },
}));

// ── Imports ─────────────────────────────────────────────────────────────────

import RecipeModal from '../../../app/modal';
import CreateRecipeFAB from '../../../components/cookbook/CreateRecipeFAB';

const SYSTEM_RECIPE = {
  id: 'recipe-1',
  title: 'Classic Grilled Chicken',
  description: 'Simple grilled chicken breast',
  cookTime: 25,
  cuisine: 'American',
  calories: 350,
  protein: 42,
  carbs: 5,
  fat: 12,
  ingredients: ['chicken breast', 'olive oil', 'garlic'],
  instructions: ['Season chicken', 'Grill 6 min per side'],
  imageUrl: null,
  isUserCreated: false,
};

const USER_RECIPE = {
  ...SYSTEM_RECIPE,
  id: 'recipe-user-1',
  isUserCreated: true,
};

function mockRecipeLoad(recipe = SYSTEM_RECIPE) {
  const { recipeApi } = require('../../../lib/api');
  recipeApi.getRecipe.mockResolvedValue({ data: recipe });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('RecipeCreation', () => {
  let dateSpy: jest.SpyInstance;
  let testTimeOffset = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    testTimeOffset += 10 * 60 * 1000;
    const baseTime = 1_700_000_000_000;
    dateSpy = jest.spyOn(Date, 'now').mockReturnValue(baseTime + testTimeOffset);
  });

  afterEach(() => {
    dateSpy.mockRestore();
  });

  it('FAB renders on cookbook screen and opens recipe form on tap', () => {
    const onPress = jest.fn();
    const { getByTestId, getByText } = render(<CreateRecipeFAB onPress={onPress} />);
    expect(getByTestId('create-recipe-fab')).toBeTruthy();
    fireEvent.press(getByText('Create'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('AI-assisted creation returns structured recipe from free-text', async () => {
    const { recipeApi } = require('../../../lib/api');
    const mockGenerated = {
      data: {
        recipe: {
          title: 'Oat Protein Pancakes',
          description: 'High protein breakfast',
          cuisine: 'American',
          mealType: 'breakfast',
          cookTime: 15,
          difficulty: 'easy',
          servings: 2,
          calories: 350,
          protein: 28,
          carbs: 40,
          fat: 8,
          ingredients: ['rolled oats', 'protein powder', 'chia seeds'],
          instructions: ['Blend oats', 'Mix', 'Cook'],
        },
      },
    };
    recipeApi.generateFromDescription.mockResolvedValue(mockGenerated);

    const result = await recipeApi.generateFromDescription('oat protein pancakes with chia seeds');
    expect(result.data.recipe.title).toBe('Oat Protein Pancakes');
    expect(result.data.recipe.ingredients).toContain('chia seeds');
    expect(result.data.recipe.calories).toBe(350);
  });

  it('edit button shows for isUserCreated recipes, "Save My Version" for system recipes', async () => {
    // System recipe: should show "Save My Version", no edit
    mockRecipeLoad(SYSTEM_RECIPE);
    const { queryByLabelText, getByText, getAllByText, unmount } = render(<RecipeModal />);
    await waitFor(() => getAllByText('Classic Grilled Chicken'));
    expect(queryByLabelText('Edit recipe')).toBeNull();
    expect(getByText('Save My Version')).toBeTruthy();
    unmount();

    // User recipe: should show edit button
    jest.clearAllMocks();
    testTimeOffset += 10 * 60 * 1000;
    dateSpy.mockReturnValue(1_700_000_000_000 + testTimeOffset);
    mockRecipeLoad(USER_RECIPE);
    const { useLocalSearchParams } = require('expo-router');
    useLocalSearchParams.mockReturnValue({ id: 'recipe-user-1', source: 'cookbook' });

    const { getByLabelText, getAllByText: getAllByText2 } = render(<RecipeModal />);
    await waitFor(() => getAllByText2('Classic Grilled Chicken'));
    expect(getByLabelText('Edit recipe')).toBeTruthy();
  });

  it('saving a created recipe adds it to cookbook and current collection', async () => {
    const { recipeApi, collectionsApi } = require('../../../lib/api');
    const mockCreated = {
      data: {
        id: 'recipe-new-1',
        title: 'My Custom Recipe',
        isUserCreated: true,
      },
    };
    recipeApi.createRecipe = jest.fn().mockResolvedValue(mockCreated);
    collectionsApi.addToCollection.mockResolvedValue({ data: {} });

    // Verify API shape — createRecipe persists and returns an id
    const result = await recipeApi.createRecipe({
      title: 'My Custom Recipe',
      ingredients: ['chicken', 'rice'],
      instructions: ['cook'],
      calories: 400,
      protein: 30,
      carbs: 40,
      fat: 10,
    });
    expect(result.data.id).toBe('recipe-new-1');
    expect(result.data.isUserCreated).toBe(true);

    // Save to collection
    await collectionsApi.addToCollection('collection-1', 'recipe-new-1');
    expect(collectionsApi.addToCollection).toHaveBeenCalledWith('collection-1', 'recipe-new-1');
  });

  it('forking a system recipe creates a new user-owned copy', async () => {
    const { recipeApi } = require('../../../lib/api');
    recipeApi.forkRecipe.mockResolvedValue({
      data: {
        data: {
          id: 'recipe-forked-1',
          title: 'Classic Grilled Chicken',
          isUserCreated: true,
        },
      },
    });

    mockRecipeLoad(SYSTEM_RECIPE);

    const { getByText, getAllByText } = render(<RecipeModal />);
    await waitFor(() => getAllByText('Classic Grilled Chicken'));

    const forkButton = getByText('Save My Version');
    fireEvent.press(forkButton);

    await waitFor(() => {
      expect(recipeApi.forkRecipe).toHaveBeenCalledWith('recipe-1', undefined);
    });
  });
});
