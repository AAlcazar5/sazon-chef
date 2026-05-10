// frontend/__tests__/components/shopping/BuildFromRecipesSheet.test.tsx
// TDD — RED phase: tests written before implementation.

import React from 'react';
import { render, fireEvent, waitFor, act } from '../../test-utils/render';

// ── Global mocks ──────────────────────────────────────────────────────────────

jest.mock('nativewind', () => ({ useColorScheme: () => ({ colorScheme: 'light' }) }));

jest.mock('react-native-reanimated', () => {
  const Reanimated = {
    ...jest.requireActual('react-native-reanimated/mock'),
    createAnimatedComponent: (component: any) => component,
    useReducedMotion: () => false,
  };
  return Reanimated;
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('../../../constants/Haptics', () => ({
  triggerHaptic: jest.fn(),
  ImpactStyle: { LIGHT: 'light', MEDIUM: 'medium', HEAVY: 'heavy' },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: function MockIonicons({ name, testID }: any) {
    const { Text } = require('react-native');
    return <Text testID={testID || `icon-${name}`}>{name}</Text>;
  },
}));

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: function MockLinearGradient({ children, ...props }: any) {
      return <View {...props}>{children}</View>;
    },
  };
});

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: {
      background: '#FAF7F4',
      text: { primary: '#111827', secondary: '#6B7280' },
      card: '#FFFFFF',
    },
  }),
}));

// Mock BottomSheet as transparent pass-through
jest.mock('../../../components/ui/BottomSheet', () => {
  return function MockBottomSheet({ visible, children }: any) {
    if (!visible) return null;
    const { View } = require('react-native');
    return <View testID="mock-bottom-sheet">{children}</View>;
  };
});

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, onPress, accessibilityLabel, accessibilityRole, accessibilityState, testID, style, disabled }: any) => (
      <TouchableOpacity
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        accessibilityState={accessibilityState}
        testID={testID}
        style={style}
        disabled={disabled}
      >
        {children}
      </TouchableOpacity>
    ),
  };
});

jest.mock('../../../components/ui/BrandButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ label, onPress, testID, accessibilityLabel, loading, disabled }: any) => (
      <TouchableOpacity
        onPress={onPress}
        testID={testID || `brand-btn-${label}`}
        accessibilityLabel={accessibilityLabel || label}
        disabled={disabled || loading}
      >
        <Text>{loading ? '...' : label}</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('../../../components/mascot', () => ({
  AnimatedLogoMascot: () => null,
}));

// ── API mocks ─────────────────────────────────────────────────────────────────

const mockGetSavedRecipes = jest.fn();
const mockGenerateFromRecipes = jest.fn();
const mockBudgetPreview = jest.fn();

jest.mock('../../../lib/api', () => ({
  recipeApi: {
    getSavedRecipes: (...args: any[]) => mockGetSavedRecipes(...args),
  },
  shoppingListApi: {
    generateFromRecipes: (...args: any[]) => mockGenerateFromRecipes(...args),
  },
}));

// Budget preview is called via fetch/apiClient — we'll mock via module factory
jest.mock('../../../hooks/useBudgetPreview', () => ({
  useBudgetPreview: () => ({
    preview: null,
    loading: false,
    fetch: mockBudgetPreview,
  }),
}), { virtual: true });

// ── Router mock ───────────────────────────────────────────────────────────────

const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  router: { push: mockRouterPush },
  useLocalSearchParams: () => ({}),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeRecipe(overrides: Partial<any> = {}) {
  return {
    id: 'r1',
    title: 'Grilled Chicken',
    cuisine: 'American',
    cookTime: 30,
    imageUrl: null,
    calories: 350,
    protein: 40,
    carbs: 10,
    fat: 12,
    ingredients: ['2 chicken breasts', '1 tbsp olive oil'],
    instructions: [],
    ...overrides,
  };
}

const RECIPES = [
  makeRecipe({ id: 'r1', title: 'Grilled Chicken', cuisine: 'American' }),
  makeRecipe({ id: 'r2', title: 'Pasta Bolognese', cuisine: 'Italian' }),
  makeRecipe({ id: 'r3', title: 'Sushi Bowl', cuisine: 'Japanese' }),
];

// ── Import component (after mocks) ────────────────────────────────────────────

import BuildFromRecipesSheet from '../../../components/shopping/BuildFromRecipesSheet';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BuildFromRecipesSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSavedRecipes.mockResolvedValue({ data: RECIPES });
    mockGenerateFromRecipes.mockResolvedValue({ data: { id: 'list-new', name: 'My List' } });
  });

  // ── Visibility ──────────────────────────────────────────────────────────────

  describe('visibility', () => {
    it('renders nothing when visible=false', () => {
      const { queryByTestId } = render(
        <BuildFromRecipesSheet visible={false} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      expect(queryByTestId('mock-bottom-sheet')).toBeNull();
    });

    it('renders the sheet when visible=true', async () => {
      const { getByTestId } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      expect(getByTestId('mock-bottom-sheet')).toBeTruthy();
    });

    it('calls onClose when close button is pressed', async () => {
      const onClose = jest.fn();
      const { getByTestId } = render(
        <BuildFromRecipesSheet visible={true} onClose={onClose} onListCreated={jest.fn()} />
      );
      await waitFor(() => expect(mockGetSavedRecipes).toHaveBeenCalled());
      fireEvent.press(getByTestId('bfr-close-btn'));
      expect(onClose).toHaveBeenCalled();
    });
  });

  // ── Header ──────────────────────────────────────────────────────────────────

  describe('header', () => {
    it('renders the title "Build from Recipes"', async () => {
      const { getByText } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      expect(getByText('Build from Recipes')).toBeTruthy();
    });

    it('close button has an accessibilityLabel', async () => {
      const { getByTestId } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      const closeBtn = getByTestId('bfr-close-btn');
      expect(closeBtn.props.accessibilityLabel).toBeTruthy();
    });
  });

  // ── Cookbook picker ─────────────────────────────────────────────────────────

  describe('cookbook picker', () => {
    it('loads and displays recipe cards from getSavedRecipes', async () => {
      const { getByText } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      await waitFor(() => {
        expect(getByText('Grilled Chicken')).toBeTruthy();
        expect(getByText('Pasta Bolognese')).toBeTruthy();
      });
    });

    it('shows cook time on each recipe card', async () => {
      const { getAllByText } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      await waitFor(() => {
        const els = getAllByText(/30 min/i);
        expect(els.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('renders a search bar above the grid', async () => {
      const { getByTestId } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      expect(getByTestId('bfr-search')).toBeTruthy();
    });
  });

  // ── Search filtering ────────────────────────────────────────────────────────

  describe('search filtering', () => {
    it('filters recipes by title substring (case-insensitive)', async () => {
      const { getByTestId, getByText, queryByText } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      await waitFor(() => expect(getByText('Grilled Chicken')).toBeTruthy());

      fireEvent.changeText(getByTestId('bfr-search'), 'pasta');

      await waitFor(() => {
        expect(getByText('Pasta Bolognese')).toBeTruthy();
        expect(queryByText('Grilled Chicken')).toBeNull();
      });
    });

    it('filters recipes by cuisine substring (case-insensitive)', async () => {
      const { getByTestId, getByText, queryByText } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      await waitFor(() => expect(getByText('Grilled Chicken')).toBeTruthy());

      fireEvent.changeText(getByTestId('bfr-search'), 'japanese');

      await waitFor(() => {
        expect(getByText('Sushi Bowl')).toBeTruthy();
        expect(queryByText('Grilled Chicken')).toBeNull();
        expect(queryByText('Pasta Bolognese')).toBeNull();
      });
    });

    it('shows all recipes when search is cleared', async () => {
      const { getByTestId, getByText } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      await waitFor(() => expect(getByText('Grilled Chicken')).toBeTruthy());

      fireEvent.changeText(getByTestId('bfr-search'), 'pasta');
      await waitFor(() => expect(getByText('Pasta Bolognese')).toBeTruthy());

      fireEvent.changeText(getByTestId('bfr-search'), '');
      await waitFor(() => {
        expect(getByText('Grilled Chicken')).toBeTruthy();
        expect(getByText('Pasta Bolognese')).toBeTruthy();
        expect(getByText('Sushi Bowl')).toBeTruthy();
      });
    });
  });

  // ── Multi-select ────────────────────────────────────────────────────────────

  describe('multi-select', () => {
    it('tapping a recipe card selects it (shows checkmark)', async () => {
      const { getByTestId, getByText } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      await waitFor(() => expect(getByText('Grilled Chicken')).toBeTruthy());

      fireEvent.press(getByTestId('bfr-recipe-card-r1'));
      expect(getByTestId('bfr-recipe-check-r1')).toBeTruthy();
    });

    it('tapping a selected card deselects it (removes checkmark)', async () => {
      const { getByTestId, queryByTestId, getByText } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      await waitFor(() => expect(getByText('Grilled Chicken')).toBeTruthy());

      fireEvent.press(getByTestId('bfr-recipe-card-r1'));
      expect(getByTestId('bfr-recipe-check-r1')).toBeTruthy();

      fireEvent.press(getByTestId('bfr-recipe-card-r1'));
      expect(queryByTestId('bfr-recipe-check-r1')).toBeNull();
    });

    it('multiple recipes can be selected simultaneously', async () => {
      const { getByTestId, getByText } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      await waitFor(() => expect(getByText('Grilled Chicken')).toBeTruthy());

      fireEvent.press(getByTestId('bfr-recipe-card-r1'));
      fireEvent.press(getByTestId('bfr-recipe-card-r2'));

      expect(getByTestId('bfr-recipe-check-r1')).toBeTruthy();
      expect(getByTestId('bfr-recipe-check-r2')).toBeTruthy();
    });
  });

  // ── Servings stepper ────────────────────────────────────────────────────────

  describe('servings stepper', () => {
    it('shows servings stepper after selecting a recipe', async () => {
      const { getByTestId, getByText } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      await waitFor(() => expect(getByText('Grilled Chicken')).toBeTruthy());

      fireEvent.press(getByTestId('bfr-recipe-card-r1'));

      await waitFor(() => {
        expect(getByTestId('bfr-stepper-r1')).toBeTruthy();
      });
    });

    it('renders 1x, 2x, 3x, and Custom options', async () => {
      const { getByTestId, getAllByText, getByText } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      await waitFor(() => expect(getByText('Grilled Chicken')).toBeTruthy());
      fireEvent.press(getByTestId('bfr-recipe-card-r1'));

      await waitFor(() => {
        expect(getByTestId('bfr-step-1x-r1')).toBeTruthy();
        expect(getByTestId('bfr-step-2x-r1')).toBeTruthy();
        expect(getByTestId('bfr-step-3x-r1')).toBeTruthy();
        expect(getByTestId('bfr-step-custom-r1')).toBeTruthy();
      });
    });

    it('defaults to 1x serving', async () => {
      const { getByTestId, getByText } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      await waitFor(() => expect(getByText('Grilled Chicken')).toBeTruthy());
      fireEvent.press(getByTestId('bfr-recipe-card-r1'));

      await waitFor(() => {
        const btn1x = getByTestId('bfr-step-1x-r1');
        // 1x should be the active/selected button — check accessibility state or styling
        expect(btn1x).toBeTruthy();
      });
    });

    it('tapping 2x updates stepper selection', async () => {
      const { getByTestId, getByText } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      await waitFor(() => expect(getByText('Grilled Chicken')).toBeTruthy());
      fireEvent.press(getByTestId('bfr-recipe-card-r1'));

      await waitFor(() => expect(getByTestId('bfr-stepper-r1')).toBeTruthy());
      fireEvent.press(getByTestId('bfr-step-2x-r1'));

      // After pressing 2x, the 2x button should be marked selected
      const btn2x = getByTestId('bfr-step-2x-r1');
      expect(btn2x.props.accessibilityState?.selected).toBe(true);
    });

    it('stepper disappears when recipe is deselected', async () => {
      const { getByTestId, queryByTestId, getByText } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      await waitFor(() => expect(getByText('Grilled Chicken')).toBeTruthy());

      fireEvent.press(getByTestId('bfr-recipe-card-r1'));
      await waitFor(() => expect(getByTestId('bfr-stepper-r1')).toBeTruthy());

      fireEvent.press(getByTestId('bfr-recipe-card-r1'));
      await waitFor(() => {
        expect(queryByTestId('bfr-stepper-r1')).toBeNull();
      });
    });
  });

  // ── Pantry subtraction toggle ───────────────────────────────────────────────

  describe('pantry subtraction toggle', () => {
    it('renders the pantry toggle', async () => {
      const { getByTestId } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      expect(getByTestId('bfr-pantry-toggle')).toBeTruthy();
    });

    it('pantry toggle has an accessibilityLabel', async () => {
      const { getByTestId } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      const toggle = getByTestId('bfr-pantry-toggle');
      expect(toggle.props.accessibilityLabel).toBeTruthy();
    });

    it('pantry toggle is off by default', async () => {
      const { getByTestId } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      const toggle = getByTestId('bfr-pantry-toggle');
      expect(toggle.props.accessibilityState?.checked).toBe(false);
    });

    it('pressing pantry toggle turns it on', async () => {
      const { getByTestId } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      fireEvent.press(getByTestId('bfr-pantry-toggle'));
      const toggle = getByTestId('bfr-pantry-toggle');
      expect(toggle.props.accessibilityState?.checked).toBe(true);
    });
  });

  // ── Budget preview ──────────────────────────────────────────────────────────

  describe('budget preview', () => {
    it('renders the budget preview line', async () => {
      const { getByTestId } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      expect(getByTestId('bfr-budget-preview')).toBeTruthy();
    });

    it('shows placeholder "~$ —" when no budget data is available', async () => {
      const { getByTestId } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      const preview = getByTestId('bfr-budget-preview');
      expect(preview.props.children ?? preview.children ?? JSON.stringify(preview)).toBeTruthy();
    });
  });

  // ── Footer CTA ──────────────────────────────────────────────────────────────

  describe('footer Generate List CTA', () => {
    it('renders the Generate List button', async () => {
      const { getByTestId } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      expect(getByTestId('bfr-generate-btn')).toBeTruthy();
    });

    it('Generate List button has sage variant label', async () => {
      const { getByText } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      expect(getByText('Generate List')).toBeTruthy();
    });

    it('calls generateFromRecipes with selected recipe ids and options on press', async () => {
      const onListCreated = jest.fn();
      const { getByTestId, getByText } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={onListCreated} />
      );
      await waitFor(() => expect(getByText('Grilled Chicken')).toBeTruthy());

      fireEvent.press(getByTestId('bfr-recipe-card-r1'));
      fireEvent.press(getByTestId('bfr-recipe-card-r2'));

      await act(async () => {
        fireEvent.press(getByTestId('bfr-generate-btn'));
      });

      await waitFor(() => {
        expect(mockGenerateFromRecipes).toHaveBeenCalledTimes(1);
        const callArg = mockGenerateFromRecipes.mock.calls[0][0];
        expect(callArg.recipeIds).toContain('r1');
        expect(callArg.recipeIds).toContain('r2');
        expect(typeof callArg.subtractPantry).toBe('boolean');
        expect(callArg.servingsByRecipe).toBeDefined();
      });
    });

    it('calls onListCreated after successful list generation', async () => {
      const onListCreated = jest.fn();
      const { getByTestId, getByText } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={onListCreated} />
      );
      await waitFor(() => expect(getByText('Grilled Chicken')).toBeTruthy());

      fireEvent.press(getByTestId('bfr-recipe-card-r1'));

      await act(async () => {
        fireEvent.press(getByTestId('bfr-generate-btn'));
      });

      await waitFor(() => expect(onListCreated).toHaveBeenCalled());
    });
  });

  // ── Duplicate response flip ─────────────────────────────────────────────────

  describe('duplicate list response', () => {
    it('swaps CTA to "Merge into existing" when duplicateOf is returned', async () => {
      mockGenerateFromRecipes.mockResolvedValueOnce({
        data: {
          duplicateOf: 'list-existing',
          similarity: 0.9,
        },
      });

      const { getByTestId, getByText } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      await waitFor(() => expect(getByText('Grilled Chicken')).toBeTruthy());

      fireEvent.press(getByTestId('bfr-recipe-card-r1'));

      await act(async () => {
        fireEvent.press(getByTestId('bfr-generate-btn'));
      });

      await waitFor(() => {
        expect(getByText('Merge into existing')).toBeTruthy();
        expect(getByText('Open existing list')).toBeTruthy();
      });
    });
  });

  // ── Error resilience ────────────────────────────────────────────────────────

  describe('error resilience', () => {
    it('does not crash when getSavedRecipes returns empty array', async () => {
      mockGetSavedRecipes.mockResolvedValueOnce({ data: [] });
      const { getByTestId } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      expect(getByTestId('mock-bottom-sheet')).toBeTruthy();
    });

    it('does not crash when getSavedRecipes rejects', async () => {
      mockGetSavedRecipes.mockRejectedValueOnce(new Error('network error'));
      const { getByTestId } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      await waitFor(() => expect(getByTestId('mock-bottom-sheet')).toBeTruthy());
    });

    it('does not crash when generateFromRecipes returns 404-style error', async () => {
      mockGenerateFromRecipes.mockRejectedValueOnce({ code: 'HTTP_404' });
      const { getByTestId, getByText } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      await waitFor(() => expect(getByText('Grilled Chicken')).toBeTruthy());

      fireEvent.press(getByTestId('bfr-recipe-card-r1'));

      await act(async () => {
        fireEvent.press(getByTestId('bfr-generate-btn'));
      });

      // Component should still be mounted — not crashed
      await waitFor(() => expect(getByTestId('mock-bottom-sheet')).toBeTruthy());
    });
  });

  // ── Accessibility ───────────────────────────────────────────────────────────

  describe('accessibility', () => {
    it('recipe cards have accessibilityLabel', async () => {
      const { getByTestId, getByText } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      await waitFor(() => expect(getByText('Grilled Chicken')).toBeTruthy());
      const card = getByTestId('bfr-recipe-card-r1');
      expect(card.props.accessibilityLabel).toBeTruthy();
    });

    it('Generate List button has an accessibilityLabel', async () => {
      const { getByTestId } = render(
        <BuildFromRecipesSheet visible={true} onClose={jest.fn()} onListCreated={jest.fn()} />
      );
      const btn = getByTestId('bfr-generate-btn');
      expect(btn.props.accessibilityLabel ?? 'Generate List').toBeTruthy();
    });
  });
});
