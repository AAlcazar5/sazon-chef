// frontend/__tests__/app/shopping-list.celebration.test.tsx
// Tests the all-done celebration overlay: triggers on purchased===total>0, does not re-trigger.

import React from 'react';
import { Animated } from 'react-native';
import { render, waitFor, act } from '@testing-library/react-native';
import ShoppingListScreen from '../../app/(tabs)/shopping-list';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../components/shopping', () => ({
  ShoppingListHeader: () => null,
  ShoppingListItem: () => null,
  ShoppingListCategory: () => null,
  AddItemModal: () => null,
  MergeListsModal: () => null,
  OfflineBanner: () => null,
}));

jest.mock('../../components/ui/AnimatedActivityIndicator', () => () => null);
jest.mock('../../components/ui/AnimatedEmptyState', () => () => null);
jest.mock('../../components/ui/SwipeableItem', () => {
  return ({ children }: any) => children;
});
jest.mock('../../components/ui/LoadingState', () => () => null);
jest.mock('../../components/ui/Icon', () => () => null);
jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return ({ children, ...props }: any) => <TouchableOpacity {...props}>{children}</TouchableOpacity>;
});

jest.mock('../../components/mascot/LogoMascot', () => {
  const { View } = require('react-native');
  return function MockLogoMascot({ expression }: { expression?: string }) {
    return <View testID={`logo-mascot-${expression ?? 'default'}`} />;
  };
});

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

// ── Hook mock ─────────────────────────────────────────────────────────────────

const noop = jest.fn();

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

const animVal = () => new Animated.Value(0);

function makeHookReturn(stateOverrides = {}, dataOverrides: Record<string, any> = {}) {
  return {
    state: makeState(stateOverrides),
    dispatch: noop,
    currentItems: dataOverrides.currentItems ?? [],
    visibleItems: dataOverrides.visibleItems ?? [],
    itemsByRecipe: { grouped: {}, noRecipe: [] },
    progressStats: dataOverrides.progressStats ?? { total: 0, purchased: 0, progress: 0 },
    estimatedCost: 0,
    spentSoFar: 0,
    purchaseHistoryPriceMap: {},
    pantrySet: new Set<string>(),
    listPickerScale: animVal(),
    listPickerOpacity: animVal(),
    editNameScale: animVal(),
    editNameOpacity: animVal(),
    mergeScale: animVal(),
    mergeOpacity: animVal(),
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
    handleGenerateFromMealPlan: noop,
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

describe('Shopping List — all-done celebration overlay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows celebration when purchased === total > 0 and not loading', async () => {
    const { useShoppingList } = require('../../hooks/useShoppingList');
    useShoppingList.mockReturnValue(
      makeHookReturn({}, {
        currentItems: [{ id: 'i1', name: 'Milk', purchased: true, category: 'Dairy', quantity: '1', price: 0 }],
        visibleItems: [{ id: 'i1', name: 'Milk', purchased: true, category: 'Dairy', quantity: '1', price: 0 }],
        progressStats: { total: 1, purchased: 1, progress: 1 },
      })
    );

    const { getByText } = render(<ShoppingListScreen />);

    await waitFor(() => {
      expect(getByText('All done!')).toBeTruthy();
      expect(getByText('Great shopping trip')).toBeTruthy();
    });
  });

  it('shows chef-kiss mascot in the celebration overlay', async () => {
    const { useShoppingList } = require('../../hooks/useShoppingList');
    useShoppingList.mockReturnValue(
      makeHookReturn({}, {
        progressStats: { total: 2, purchased: 2, progress: 1 },
      })
    );

    const { getByTestId } = render(<ShoppingListScreen />);

    await waitFor(() => {
      expect(getByTestId('logo-mascot-chef-kiss')).toBeTruthy();
    });
  });

  it('does not show celebration when purchased < total', () => {
    const { useShoppingList } = require('../../hooks/useShoppingList');
    useShoppingList.mockReturnValue(
      makeHookReturn({}, {
        progressStats: { total: 3, purchased: 1, progress: 0.33 },
      })
    );

    const { queryByText } = render(<ShoppingListScreen />);
    expect(queryByText('All done!')).toBeNull();
    expect(queryByText('Great shopping trip')).toBeNull();
  });

  it('does not show celebration when total === 0', () => {
    const { useShoppingList } = require('../../hooks/useShoppingList');
    useShoppingList.mockReturnValue(
      makeHookReturn({}, {
        progressStats: { total: 0, purchased: 0, progress: 0 },
      })
    );

    const { queryByText } = render(<ShoppingListScreen />);
    expect(queryByText('All done!')).toBeNull();
  });

  it('does not show celebration when loading is true even if purchased === total > 0', () => {
    const { useShoppingList } = require('../../hooks/useShoppingList');
    useShoppingList.mockReturnValue(
      makeHookReturn({ loading: true }, {
        progressStats: { total: 2, purchased: 2, progress: 1 },
      })
    );

    const { queryByText } = render(<ShoppingListScreen />);
    expect(queryByText('All done!')).toBeNull();
  });

  it('auto-dismisses celebration after 2.8 seconds', async () => {
    const { useShoppingList } = require('../../hooks/useShoppingList');
    useShoppingList.mockReturnValue(
      makeHookReturn({}, {
        progressStats: { total: 1, purchased: 1, progress: 1 },
      })
    );

    const { getByText, queryByText } = render(<ShoppingListScreen />);

    await waitFor(() => {
      expect(getByText('All done!')).toBeTruthy();
    });

    // Advance past the 2800ms auto-dismiss + fade-out duration
    act(() => {
      jest.advanceTimersByTime(3300);
    });

    await waitFor(() => {
      expect(queryByText('All done!')).toBeNull();
    });
  });

  it('does not re-trigger celebration when loading toggles while allDone remains true', async () => {
    const { useShoppingList } = require('../../hooks/useShoppingList');
    const springSpy = jest.spyOn(Animated, 'spring');

    // Initial render: all done → celebration triggered once
    useShoppingList.mockReturnValue(
      makeHookReturn({}, {
        progressStats: { total: 2, purchased: 2, progress: 1 },
      })
    );
    const { rerender } = render(<ShoppingListScreen />);

    await waitFor(() => {
      expect(springSpy).toHaveBeenCalledTimes(1);
    });

    // Simulate loading toggling to true (allDone still true, prevAllDone.current = true)
    useShoppingList.mockReturnValue(
      makeHookReturn({ loading: true }, {
        progressStats: { total: 2, purchased: 2, progress: 1 },
      })
    );
    rerender(<ShoppingListScreen />);

    // Loading back to false: effect re-runs, guard prevAllDone.current blocks re-trigger
    useShoppingList.mockReturnValue(
      makeHookReturn({ loading: false }, {
        progressStats: { total: 2, purchased: 2, progress: 1 },
      })
    );
    rerender(<ShoppingListScreen />);

    await waitFor(() => {
      // spring must still have been called only once — no re-trigger
      expect(springSpy).toHaveBeenCalledTimes(1);
    });

    springSpy.mockRestore();
  });
});
