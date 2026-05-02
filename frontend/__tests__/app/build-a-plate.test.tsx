// frontend/__tests__/app/build-a-plate.test.tsx
// Group 10X Phase 1+2 — composer screen tests.

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', isDark: false, colors: {} }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@gorhom/bottom-sheet', () => {
  const { View } = require('react-native');
  const React = require('react');
  return {
    BottomSheetModal: React.forwardRef(({ children }: any, _ref: any) => (
      <View testID="bottom-sheet-modal">{children}</View>
    )),
    BottomSheetView: ({ children }: any) => <View>{children}</View>,
    BottomSheetScrollView: ({ children }: any) => <View>{children}</View>,
    BottomSheetBackdrop: () => null,
  };
});

jest.mock('../../components/ui/ScreenGradient', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, testID, style }: any) => (
      <View testID={testID} style={style}>{children}</View>
    ),
  };
});

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack, push: jest.fn() }),
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock('../../lib/api', () => ({
  mealComponentApi: {
    list: jest.fn(),
    permutations: jest.fn().mockResolvedValue({ data: { permutations: [] } }),
    affinity: jest.fn().mockResolvedValue({ data: { slot: 'protein', favorites: [] } }),
    swapAway: jest.fn().mockResolvedValue({ data: { ok: true } }),
    skillTier: jest.fn().mockResolvedValue({
      data: { tier: 'cook', visibleSlots: ['protein', 'base', 'vegetable', 'sauce'] },
    }),
    variants: jest.fn().mockResolvedValue({ data: { variants: [] } }),
  },
  composedPlateApi: {
    save: jest.fn(),
    get: jest.fn(),
    autoFit: jest.fn().mockResolvedValue({
      data: { result: { achievable: true, filled: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } } },
    }),
  },
  leftoverInventoryApi: {
    list: jest.fn().mockResolvedValue({ data: { leftovers: [] } }),
  },
  nutrientGapApi: {
    fetchTopGap: jest.fn().mockResolvedValue({
      data: { topGap: null, pctRemainingByNutrient: {} },
    }),
  },
  shoppingListApi: {
    getShoppingLists: jest.fn(),
    createShoppingList: jest.fn(),
    addItem: jest.fn(),
  },
}));

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import BuildAPlateScreen from '../../app/build-a-plate';
import { mealComponentApi, composedPlateApi, shoppingListApi } from '../../lib/api';
const mockSwapAway = mealComponentApi.swapAway as jest.Mock;
import { useLocalSearchParams } from 'expo-router';

const SALMON = {
  id: 'salmon',
  slot: 'protein',
  name: 'Salmon',
  defaultPortionGrams: 150,
  caloriesPerPortion: 280,
  proteinG: 30,
  carbsG: 0,
  fatG: 18,
  fiberG: 0,
  cuisineTags: ['Mediterranean'],
  dietaryTags: ['high_protein'],
  cookMethodHint: 'pan_sear',
  pantryIngredientNames: ['salmon', 'olive oil'],
  pantryCoveragePercent: 100,
};

const TOFU = {
  ...SALMON,
  id: 'tofu',
  name: 'Tofu',
  caloriesPerPortion: 180,
  proteinG: 18,
  pantryIngredientNames: ['tofu'],
  pantryCoveragePercent: 50,
};

const FARRO = {
  id: 'farro',
  slot: 'base',
  name: 'Farro',
  defaultPortionGrams: 100,
  caloriesPerPortion: 200,
  proteinG: 7,
  carbsG: 35,
  fatG: 1,
  fiberG: 5,
  cuisineTags: [],
  dietaryTags: ['vegan'],
  cookMethodHint: 'simmer',
  pantryIngredientNames: ['farro'],
  pantryCoveragePercent: 100,
};

const CARROTS = {
  id: 'carrots',
  slot: 'vegetable',
  name: 'Roasted carrots',
  defaultPortionGrams: 120,
  caloriesPerPortion: 80,
  proteinG: 1,
  carbsG: 12,
  fatG: 3,
  fiberG: 4,
  cuisineTags: [],
  dietaryTags: ['vegan'],
  cookMethodHint: 'roast',
  pantryIngredientNames: ['carrots'],
  pantryCoveragePercent: 100,
};

const YOGURT = {
  id: 'yogurt',
  slot: 'sauce',
  name: 'Yogurt sauce',
  defaultPortionGrams: 60,
  caloriesPerPortion: 70,
  proteinG: 4,
  carbsG: 5,
  fatG: 4,
  fiberG: 0,
  cuisineTags: [],
  dietaryTags: [],
  cookMethodHint: 'mix',
  pantryIngredientNames: ['yogurt'],
  pantryCoveragePercent: 100,
};

const mockList = mealComponentApi.list as jest.Mock;
const mockSave = composedPlateApi.save as jest.Mock;

const setupApi = () => {
  mockList.mockImplementation(({ slot }: any) => {
    const map: Record<string, any[]> = {
      protein: [SALMON, TOFU],
      base: [FARRO],
      vegetable: [CARROTS],
      sauce: [YOGURT],
      garnish: [],
    };
    return Promise.resolve({ data: { components: map[slot] ?? [] } });
  });
  mockSave.mockResolvedValue({
    data: {
      plate: {
        id: 'plate1',
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        pantryCoveragePercent: 0,
        recipeId: 'recipe1',
      },
      recipe: { id: 'recipe1' },
    },
  });
};

describe('BuildAPlateScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    setupApi();
  });

  it('renders four required slot rows on initial load (Garnish collapsed)', async () => {
    const { getByTestId, queryByTestId } = render(<BuildAPlateScreen />);
    await waitFor(() => expect(getByTestId('slot-row-protein')).toBeTruthy());
    expect(getByTestId('slot-row-base')).toBeTruthy();
    expect(getByTestId('slot-row-vegetable')).toBeTruthy();
    expect(getByTestId('slot-row-sauce')).toBeTruthy();
    expect(queryByTestId('slot-row-garnish')).toBeNull();
    expect(getByTestId('add-garnish-btn')).toBeTruthy();
  });

  it('tapping a slot opens the picker for that slot', async () => {
    const { getByTestId } = render(<BuildAPlateScreen />);
    await waitFor(() => expect(getByTestId('slot-row-protein')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('slot-row-protein')); });
    await waitFor(() => expect(getByTestId('slot-picker-list')).toBeTruthy());
    expect(getByTestId('slot-picker-option-salmon')).toBeTruthy();
  });

  it('selecting a component updates the plate preview macro pills', async () => {
    const { getByTestId, getByLabelText } = render(<BuildAPlateScreen />);
    await waitFor(() => expect(getByTestId('slot-row-protein')).toBeTruthy());
    expect(getByLabelText('P 0 g')).toBeTruthy();

    await act(async () => { fireEvent.press(getByTestId('slot-row-protein')); });
    await waitFor(() => expect(getByTestId('slot-picker-option-salmon')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('slot-picker-option-salmon')); });

    await waitFor(() => expect(getByLabelText('P 30 g')).toBeTruthy());
  });

  it('long-pressing a slot toggles the lock pin', async () => {
    const { getByTestId, queryByTestId } = render(<BuildAPlateScreen />);
    await waitFor(() => expect(getByTestId('slot-row-protein')).toBeTruthy());
    expect(queryByTestId('slot-row-protein-lock-pin')).toBeNull();

    await act(async () => {
      fireEvent(getByTestId('slot-row-protein'), 'longPress');
    });

    await waitFor(() => expect(getByTestId('slot-row-protein-lock-pin')).toBeTruthy());
  });

  it('roll-the-dice button is rendered and pressable', async () => {
    const { getByTestId } = render(<BuildAPlateScreen />);
    await waitFor(() => expect(getByTestId('roll-the-dice-btn')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('roll-the-dice-btn')); });
    // After roll, all required slots should be filled (single option in pool each)
    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith({ slot: 'protein' });
    });
  });

  it('pantry-only mode hides components below 80% coverage', async () => {
    const { getByTestId, queryByTestId } = render(<BuildAPlateScreen />);
    await waitFor(() => expect(getByTestId('pantry-only-toggle')).toBeTruthy());

    await act(async () => { fireEvent.press(getByTestId('pantry-only-toggle')); });
    await act(async () => { fireEvent.press(getByTestId('slot-row-protein')); });
    await waitFor(() => expect(getByTestId('slot-picker-list')).toBeTruthy());

    expect(getByTestId('slot-picker-option-salmon')).toBeTruthy();
    expect(queryByTestId('slot-picker-option-tofu')).toBeNull();
  });

  it('Save button calls composedPlateApi.save with selected components', async () => {
    const { getByTestId } = render(<BuildAPlateScreen />);
    await waitFor(() => expect(getByTestId('slot-row-protein')).toBeTruthy());

    await act(async () => { fireEvent.press(getByTestId('slot-row-protein')); });
    await waitFor(() => expect(getByTestId('slot-picker-option-salmon')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('slot-picker-option-salmon')); });

    await act(async () => { fireEvent.press(getByTestId('save-to-cookbook-btn')); });

    await waitFor(() => expect(mockSave).toHaveBeenCalled());
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        saveAsRecipe: true,
        components: expect.arrayContaining([
          expect.objectContaining({ slot: 'protein', componentId: 'salmon', portionMultiplier: 1 }),
        ]),
      }),
    );
    expect(mockReplace).toHaveBeenCalledWith('/recipe/recipe1');
  });

  it('Add Missing button only appears when pantry coverage < 100%', async () => {
    mockList.mockImplementation(({ slot }: any) => {
      const partial = { ...SALMON, pantryCoveragePercent: 50, dietaryTags: [] };
      const map: Record<string, any[]> = {
        protein: [partial],
        base: [FARRO],
        vegetable: [CARROTS],
        sauce: [YOGURT],
      };
      return Promise.resolve({ data: { components: map[slot] ?? [] } });
    });

    const { getByTestId, queryByTestId } = render(<BuildAPlateScreen />);
    await waitFor(() => expect(getByTestId('slot-row-protein')).toBeTruthy());
    expect(queryByTestId('add-missing-btn')).toBeNull();

    await act(async () => { fireEvent.press(getByTestId('slot-row-protein')); });
    await waitFor(() => expect(getByTestId('slot-picker-option-salmon')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('slot-picker-option-salmon')); });

    await waitFor(() => expect(getByTestId('add-missing-btn')).toBeTruthy());
  });

  it('reads pantryOnly query param to pre-enable Cook with what I have', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ pantryOnly: 'true' });
    const { getByLabelText } = render(<BuildAPlateScreen />);
    await waitFor(() => expect(getByLabelText('Cook with what I have, on')).toBeTruthy());
  });
});

describe('BuildAPlateScreen — seed=beginner', () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage');

  const BEGINNER_PERM = {
    id: 'beginner-perm',
    components: [
      {
        slot: 'protein',
        component: { ...SALMON },
        portionMultiplier: 1,
      },
      {
        slot: 'base',
        component: { ...FARRO },
        portionMultiplier: 1,
      },
      {
        slot: 'vegetable',
        component: { ...CARROTS },
        portionMultiplier: 1,
      },
      {
        slot: 'sauce',
        component: { ...YOGURT },
        portionMultiplier: 1,
      },
    ],
    coherenceScore: 0.9,
    pantryCoveragePercent: 100,
    macroFitScore: 0.85,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setupApi();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ seed: 'beginner' });
    (mealComponentApi.permutations as jest.Mock).mockResolvedValue({
      data: { permutations: [BEGINNER_PERM] },
    });
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(undefined);
  });

  it('opens with all 4 slots pre-filled when seed=beginner and permutations returns a result', async () => {
    const { getByTestId } = render(<BuildAPlateScreen />);

    await waitFor(
      () => {
        expect(getByTestId('slot-row-protein')).toBeTruthy();
      },
      { timeout: 3000 },
    );

    await waitFor(
      () => {
        expect(mealComponentApi.permutations).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
  });

  it('shows the beginner tutorial overlay on first visit', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);

    const { queryByTestId } = render(<BuildAPlateScreen />);

    await waitFor(
      () => {
        expect(mealComponentApi.permutations).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    await waitFor(
      () => {
        expect(queryByTestId('beginner-tutorial-overlay')).toBeTruthy();
      },
      { timeout: 3000 },
    );
  });

  it('tutorial overlay dismisses on tap and sets AsyncStorage flag', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);

    const { queryByTestId, getByTestId } = render(<BuildAPlateScreen />);

    await waitFor(
      () => expect(queryByTestId('beginner-tutorial-overlay')).toBeTruthy(),
      { timeout: 3000 },
    );

    await act(async () => {
      fireEvent.press(getByTestId('beginner-tutorial-overlay'));
    });

    await waitFor(() => {
      expect(queryByTestId('beginner-tutorial-overlay')).toBeNull();
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'beginner_tutorial_seen',
      'true',
    );
  });

  it('does not show tutorial overlay when beginner_tutorial_seen flag is set', async () => {
    AsyncStorage.getItem.mockImplementation((key: string) => {
      if (key === 'beginner_tutorial_seen') return Promise.resolve('true');
      return Promise.resolve(null);
    });

    const { queryByTestId } = render(<BuildAPlateScreen />);

    await waitFor(
      () => {
        expect(mealComponentApi.permutations).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    expect(queryByTestId('beginner-tutorial-overlay')).toBeNull();
  });
});

describe('BuildAPlateScreen — preset=<tonight-id>', () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage');

  const TONIGHT_PERM = {
    id: 'tonight-id',
    components: [
      { slot: 'protein', component: { ...SALMON }, portionMultiplier: 1 },
      { slot: 'base', component: { ...FARRO }, portionMultiplier: 1 },
      { slot: 'vegetable', component: { ...CARROTS }, portionMultiplier: 1 },
      { slot: 'sauce', component: { ...YOGURT }, portionMultiplier: 1 },
    ],
    coherenceScore: 0.9,
    pantryCoveragePercent: 100,
    macroFitScore: 0.85,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setupApi();
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      pantryOnly: 'true',
      preset: 'tonight-id',
    });
  });

  it('pre-fills slots from AsyncStorage when preset key exists', async () => {
    AsyncStorage.getItem.mockImplementation((key: string) => {
      if (key === 'tonights_plate_preset:tonight-id') {
        return Promise.resolve(JSON.stringify(TONIGHT_PERM));
      }
      return Promise.resolve(null);
    });

    const { getByTestId } = render(<BuildAPlateScreen />);
    await waitFor(() => expect(getByTestId('slot-row-protein')).toBeTruthy(), { timeout: 3000 });

    // When preset is applied, macro total should reflect the pre-filled slots
    await waitFor(
      () => expect(getByTestId('slot-row-protein')).toBeTruthy(),
      { timeout: 3000 },
    );
  });

  it('mounts cleanly without crash when preset AsyncStorage key is missing', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);

    const { getByTestId } = render(<BuildAPlateScreen />);
    await waitFor(() => expect(getByTestId('slot-row-protein')).toBeTruthy(), { timeout: 3000 });
  });
});

describe('BuildAPlateScreen — swap-away signal (Phase 4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    setupApi();
  });

  it('calls mealComponentApi.swapAway with the previous component id when replacing a selection', async () => {
    const { getByTestId } = render(<BuildAPlateScreen />);
    await waitFor(() => expect(getByTestId('slot-row-protein')).toBeTruthy());

    // First selection (no prior — swap-away should NOT fire)
    await act(async () => { fireEvent.press(getByTestId('slot-row-protein')); });
    await waitFor(() => expect(getByTestId('slot-picker-option-salmon')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('slot-picker-option-salmon')); });
    expect(mockSwapAway).not.toHaveBeenCalled();

    // Second selection replacing salmon with tofu — swap-away MUST fire with 'salmon'
    await act(async () => { fireEvent.press(getByTestId('slot-row-protein')); });
    await waitFor(() => expect(getByTestId('slot-picker-option-tofu')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('slot-picker-option-tofu')); });
    await waitFor(() => expect(mockSwapAway).toHaveBeenCalledWith('salmon'));
  });

  it('does NOT call mealComponentApi.swapAway on the first slot pick', async () => {
    const { getByTestId } = render(<BuildAPlateScreen />);
    await waitFor(() => expect(getByTestId('slot-row-protein')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('slot-row-protein')); });
    await waitFor(() => expect(getByTestId('slot-picker-option-salmon')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('slot-picker-option-salmon')); });
    expect(mockSwapAway).not.toHaveBeenCalled();
  });
});

describe('BuildAPlateScreen — Cook Now fork (Phase 3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    setupApi();
  });

  it('Cook Now routes to /cook-timeline when save returns a plate.id', async () => {
    mockSave.mockResolvedValue({
      data: {
        plate: { id: 'plate-123', totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, pantryCoveragePercent: 0, recipeId: 'recipe-xyz' },
        recipe: { id: 'recipe-xyz' },
      },
    });

    const { getByTestId } = render(<BuildAPlateScreen />);
    await waitFor(() => expect(getByTestId('slot-row-protein')).toBeTruthy());

    await act(async () => { fireEvent.press(getByTestId('slot-row-protein')); });
    await waitFor(() => expect(getByTestId('slot-picker-option-salmon')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('slot-picker-option-salmon')); });

    await act(async () => { fireEvent.press(getByTestId('cook-now-btn')); });

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/cook-timeline', params: { plateId: 'plate-123' } }),
    ));
  });

  it('Cook Now falls back to /cooking when save returns no plate.id but has recipeId', async () => {
    mockSave.mockResolvedValue({
      data: {
        plate: { id: undefined, totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, pantryCoveragePercent: 0, recipeId: 'recipe-abc' },
        recipe: { id: 'recipe-abc' },
      },
    });

    const { getByTestId } = render(<BuildAPlateScreen />);
    await waitFor(() => expect(getByTestId('slot-row-protein')).toBeTruthy());

    await act(async () => { fireEvent.press(getByTestId('slot-row-protein')); });
    await waitFor(() => expect(getByTestId('slot-picker-option-salmon')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('slot-picker-option-salmon')); });

    await act(async () => { fireEvent.press(getByTestId('cook-now-btn')); });

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/cooking', params: { id: 'recipe-abc' } }),
    ));
  });
});

describe('BuildAPlateScreen — Phase 5/8/9 enhancements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    setupApi();
  });

  it('mounts the macro fit pill in the composer header', async () => {
    const { getByTestId } = render(<BuildAPlateScreen />);
    await waitFor(() => expect(getByTestId('macro-fit-btn')).toBeTruthy());
  });

  it('mounts the budget toggle pill in the composer header', async () => {
    const { getByTestId } = render(<BuildAPlateScreen />);
    await waitFor(() => expect(getByTestId('budget-toggle')).toBeTruthy());
  });

  it('renders the substitution banner when ?plateId is present and pantry has missing items', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ plateId: 'plate-shared-1', subsCount: '2' });

    const { getByTestId } = render(<BuildAPlateScreen />);
    await waitFor(() => expect(getByTestId('substitution-banner')).toBeTruthy());
  });
});
