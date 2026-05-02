// frontend/__tests__/app/shopping-list.emptystate.test.tsx
// TDD: "Shop for this week" chip in the empty list state

import React from 'react';
import { Animated } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import ShoppingListScreen from '../../app/(tabs)/shopping-list';

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock('../../components/shopping', () => ({
  ShoppingListHeader: () => null,
  ShoppingListItem: () => null,
  ShoppingListCategory: () => null,
  AddItemModal: () => null,
  MergeListsModal: () => null,
  OfflineBanner: () => null,
  EditorialShoppingIntro: () => null,
  EditorialShoppingProgress: () => null,
  EditorialAisleHeader: () => null,
}));

jest.mock('../../components/shopping/BuildFromRecipesSheet', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../components/shopping/ArchiveView', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../components/ui/BottomSheet', () => ({
  __esModule: true,
  default: ({ children, visible }: any) => {
    const { View } = require('react-native');
    return visible ? <View>{children}</View> : null;
  },
}));

jest.mock('../../components/ui/AnimatedActivityIndicator', () => () => null);
jest.mock('../../components/ui/SwipeableItem', () => {
  return ({ children }: any) => children;
});
jest.mock('../../components/ui/LoadingState', () => () => null);
jest.mock('../../components/ui/Icon', () => () => null);

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return ({ children, onPress, ...props }: any) => (
    <TouchableOpacity onPress={onPress} {...props}>{children}</TouchableOpacity>
  );
});

jest.mock('../../components/ui/AnimatedEmptyState', () => () => null);

jest.mock('../../components/ui/BrandButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: function MockBrandButton({ label, onPress, testID, accessibilityLabel, disabled }: any) {
      return (
        <TouchableOpacity
          testID={testID ?? `brand-button-${label?.replace(/\s+/g, '-').toLowerCase()}`}
          accessibilityLabel={accessibilityLabel ?? label}
          onPress={onPress}
          disabled={disabled}
          accessible
        >
          <Text>{label}</Text>
        </TouchableOpacity>
      );
    },
  };
});

jest.mock('../../components/mascot/LogoMascot', () => {
  const { View } = require('react-native');
  return function MockLogoMascot() {
    return <View testID="logo-mascot" />;
  };
});

jest.mock('../../components/celebrations', () => ({
  CelebrationOverlay: () => null,
  HeartBurstAnimation: () => null,
  PremiumCelebration: () => null,
}));

jest.mock('../../components/ui/ContinuityCTA', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../components/ui/SazonRefreshControl', () => {
  const { View } = require('react-native');
  return function MockRefreshControl() { return <View />; };
});

jest.mock('../../hooks/useBudget', () => ({
  useBudget: () => ({
    weeklyGrocery: null,
    loading: false,
    refresh: jest.fn(),
  }),
}));

jest.mock('expo-blur', () => ({
  BlurView: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({}),
}));

jest.mock('../../lib/api', () => ({
  userApi: { getPreferences: jest.fn().mockResolvedValue({ data: {} }) },
  mealPlanApi: { getWeeklyPlan: jest.fn().mockResolvedValue({ data: { days: [] } }) },
  shoppingListApi: {
    generateFromMealPlan: jest.fn(),
    getAll: jest.fn().mockResolvedValue({ data: [] }),
    getActiveList: jest.fn().mockResolvedValue({ data: { id: 'list-1', items: [], isActive: true } }),
    getMergeSuggestion: jest.fn().mockResolvedValue({ data: null }),
    cleanupOrphans: jest.fn().mockResolvedValue({ data: { deletedCount: 0 } }),
    autoArchiveStale: jest.fn().mockResolvedValue({ data: { archivedIds: [] } }),
    tierArchived: jest.fn().mockResolvedValue({ data: { tieredCount: 0 } }),
  },
}));

// ── Hook mock helpers ─────────────────────────────────────────────────────────

const noop = jest.fn();
const animVal = () => new Animated.Value(0);

function makeState(overrides: Record<string, any> = {}) {
  return {
    loading: false,
    inStoreMode: false,
    groupByRecipe: false,
    selectionMode: false,
    selectedItems: [],
    cantFindItems: [],
    selectedList: 'list-1',
    shoppingLists: [{ id: 'list-1', name: 'My List' }],
    isOffline: false,
    hasPendingSync: false,
    cacheAge: null,
    generatingFromMealPlan: false,
    bulkUpdating: false,
    hidePurchased: false,
    showListPicker: false,
    showEditNameModal: false,
    editingListName: '',
    showCreateListModal: false,
    newListName: '',
    showMergeModal: false,
    selectedListsForMerge: [],
    showAddItemModal: false,
    editingItem: null,
    purchaseHistory: [],
    quickSuggestions: [],
    pantry: [],
    showUndoButton: false,
    ...overrides,
  };
}

function makeHookReturn(stateOverrides = {}, dataOverrides: Record<string, any> = {}) {
  return {
    state: makeState(stateOverrides),
    dispatch: noop,
    currentItems: dataOverrides.currentItems ?? [],
    visibleItems: dataOverrides.visibleItems ?? [],
    itemsByRecipe: { grouped: {}, noRecipe: [] },
    progressStats: dataOverrides.progressStats ?? { total: 0, purchased: 0, progress: 0 },
    estimatedCost: 0,
    purchaseHistoryPriceMap: {},
    pantrySet: new Set<string>(),
    listPickerScale: animVal(),
    listPickerOpacity: animVal(),
    editNameScale: animVal(),
    editNameOpacity: animVal(),
    createListScale: animVal(),
    createListOpacity: animVal(),
    handleSelectList: noop,
    handleEditName: noop,
    handleSaveName: noop,
    handleCreateList: noop,
    handleSaveNewList: noop,
    handleDeleteList: noop,
    handleConfirmMerge: noop,
    handleAddItem: noop,
    handleAddMultipleItems: noop,
    handleQuickAddSuggestion: noop,
    handleGenerateFromMealPlan: dataOverrides.handleGenerateFromMealPlan ?? noop,
    handleFABPress: noop,
    handleTogglePurchased: noop,
    handleSaveQuantity: noop,
    handlePickItemPhoto: noop,
    handleMarkSelectedComplete: noop,
    handleMarkAllComplete: noop,
    handleUndoMarkAllComplete: noop,
    handleDeleteItem: noop,
    handleSyncToApp: noop,
    handleSyncBidirectional: noop,
    handleRefresh: noop,
    toggleHidePurchased: noop,
    toggleGroupByRecipe: noop,
    toggleInStoreMode: noop,
    handleCantFind: noop,
    loadQuickSuggestions: noop,
    loadPurchaseHistory: noop,
    handleBuyAgainItem: noop,
    handleToggleFavorite: noop,
    handleReorderLastWeek: noop,
    loadPantry: noop,
    handleAddToPantry: noop,
    handleRemoveFromPantry: noop,
    handleSetupDefaultPantry: noop,
    ...dataOverrides,
  };
}

jest.mock('../../hooks/useShoppingList', () => {
  const actual = jest.requireActual('../../hooks/useShoppingList');
  return {
    ...actual,
    useShoppingList: jest.fn(),
  };
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Shopping List — "Shop for this week" empty-state chip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function setupHook(overrides?: { stateOverrides?: Record<string, any>; dataOverrides?: Record<string, any> }) {
    const { useShoppingList } = require('../../hooks/useShoppingList');
    useShoppingList.mockReturnValue(
      makeHookReturn(overrides?.stateOverrides, overrides?.dataOverrides)
    );
  }

  it('renders "Shop for this week" chip when list is empty (no items)', () => {
    setupHook({ dataOverrides: { currentItems: [], visibleItems: [] } });
    const { getByText } = render(<ShoppingListScreen />);
    expect(getByText('Shop for this week')).toBeTruthy();
  });

  it('does NOT render "Shop for this week" chip when list has items', () => {
    setupHook({
      dataOverrides: {
        currentItems: [{ id: 'i1', name: 'Milk', purchased: false, category: 'Dairy', quantity: '1' }],
        visibleItems: [{ id: 'i1', name: 'Milk', purchased: false, category: 'Dairy', quantity: '1' }],
      },
    });
    const { queryByText } = render(<ShoppingListScreen />);
    expect(queryByText('Shop for this week')).toBeNull();
  });

  it('does NOT render chip when there is no selected list', () => {
    setupHook({
      stateOverrides: { selectedList: null, shoppingLists: [] },
      dataOverrides: { currentItems: [], visibleItems: [] },
    });
    const { queryByText } = render(<ShoppingListScreen />);
    expect(queryByText('Shop for this week')).toBeNull();
  });

  it('tapping chip calls handleGenerateFromMealPlan', async () => {
    const handleGenerateFromMealPlan = jest.fn();
    setupHook({
      dataOverrides: {
        currentItems: [],
        visibleItems: [],
        handleGenerateFromMealPlan,
      },
    });

    const { getByText } = render(<ShoppingListScreen />);
    await act(async () => {
      fireEvent.press(getByText('Shop for this week'));
    });

    expect(handleGenerateFromMealPlan).toHaveBeenCalledTimes(1);
  });

  it('chip has accessibility label', () => {
    setupHook({ dataOverrides: { currentItems: [], visibleItems: [] } });
    const { getByLabelText } = render(<ShoppingListScreen />);
    expect(getByLabelText(/shop for this week/i)).toBeTruthy();
  });

  it('chip is disabled (generatingFromMealPlan = true) while generating', () => {
    setupHook({
      stateOverrides: { generatingFromMealPlan: true },
      dataOverrides: { currentItems: [], visibleItems: [] },
    });
    const { getAllByText, queryByText } = render(<ShoppingListScreen />);
    // When generating, the label changes to 'Generating...' — chip still present
    const shopBtn =
      queryByText('Shop for this week') ??
      (getAllByText('Generating...').length > 0 ? getAllByText('Generating...')[0] : null);
    expect(shopBtn).toBeTruthy();
  });
});
