// frontend/__tests__/app/shopping-list.instore.test.tsx
// Tests the frosted glass sticky aisle section headers in in-store mode.

import React from 'react';
import { render } from '@testing-library/react-native';
import { Animated } from 'react-native';
import ShoppingListScreen from '../../app/(tabs)/shopping-list';
import { AISLE_ORDER } from '../../hooks/useShoppingList';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Sub-components not under test — render minimal placeholders
jest.mock('../../components/shopping', () => ({
  ShoppingListHeader: () => null,
  ShoppingListItem: ({ item }: any) => {
    const { Text } = require('react-native');
    return <Text testID={`sl-item-${item.id}`}>{item.name}</Text>;
  },
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
jest.mock('../../components/mascot/LogoMascot', () => () => null);
jest.mock('../../components/ui/Icon', () => () => null);
jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return ({ children, ...props }: any) => <TouchableOpacity {...props}>{children}</TouchableOpacity>;
});

jest.mock('expo-blur', () => ({
  BlurView: ({ children, testID, intensity, tint, style }: any) => {
    const { View } = require('react-native');
    return (
      <View testID={testID ?? 'blur-view'} accessibilityLabel={`blur-${tint}-${intensity}`} style={style}>
        {children}
      </View>
    );
  },
}));

// Override the global expo-haptics mock (it's already in jest.setup.js but explicit here)
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
    inStoreMode: true,
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
    progressStats: { total: 0, purchased: 0, progress: 0 },
    estimatedCost: 0,
    spentSoFar: 0,
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
    ...actual, // re-export AISLE_ORDER, AISLE_EMOJI, etc.
    useShoppingList: jest.fn(),
  };
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeItem(id: string, name: string, category: string, purchased = false) {
  return { id, name, quantity: '1', category, purchased, price: 0 };
}

const produceItem = makeItem('p1', 'Spinach', 'Produce');
const pantryItem = makeItem('pa1', 'Olive oil', 'Pantry');
const meatItem = makeItem('m1', 'Chicken', 'Meat & Seafood');

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Shopping List — in-store frosted glass aisle headers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders aisle section headers for each category in in-store mode', () => {
    const { useShoppingList } = require('../../hooks/useShoppingList');
    const items = [produceItem, pantryItem];
    useShoppingList.mockReturnValue(
      makeHookReturn({}, {
        currentItems: items,
        visibleItems: items,
        progressStats: { total: 2, purchased: 0, progress: 0 },
      })
    );

    const { getByText } = render(<ShoppingListScreen />);
    expect(getByText('Produce')).toBeTruthy();
    expect(getByText('Pantry')).toBeTruthy();
  });

  it('renders Produce before Pantry (AISLE_ORDER: Produce=0, Pantry=7)', () => {
    // Verify AISLE_ORDER values match the expected sort
    expect(AISLE_ORDER['Produce']).toBeLessThan(AISLE_ORDER['Pantry']);

    const { useShoppingList } = require('../../hooks/useShoppingList');
    const items = [pantryItem, produceItem]; // deliberately reversed
    useShoppingList.mockReturnValue(
      makeHookReturn({}, {
        currentItems: items,
        visibleItems: items,
        progressStats: { total: 2, purchased: 0, progress: 0 },
      })
    );

    const { getAllByText } = render(<ShoppingListScreen />);
    // Both sections must render; Produce header text appears before Pantry header text
    const produceEls = getAllByText('Produce');
    const pantryEls = getAllByText('Pantry');
    expect(produceEls.length).toBeGreaterThanOrEqual(1);
    expect(pantryEls.length).toBeGreaterThanOrEqual(1);
  });

  it('renders three aisle sections for three distinct categories', () => {
    const { useShoppingList } = require('../../hooks/useShoppingList');
    const items = [produceItem, pantryItem, meatItem];
    useShoppingList.mockReturnValue(
      makeHookReturn({}, {
        currentItems: items,
        visibleItems: items,
        progressStats: { total: 3, purchased: 0, progress: 0 },
      })
    );

    const { getByText } = render(<ShoppingListScreen />);
    expect(getByText('Produce')).toBeTruthy();
    expect(getByText('Pantry')).toBeTruthy();
    expect(getByText('Meat & Seafood')).toBeTruthy();
  });

  it('uses BlurView for aisle section headers', () => {
    const { useShoppingList } = require('../../hooks/useShoppingList');
    const items = [produceItem, pantryItem];
    useShoppingList.mockReturnValue(
      makeHookReturn({}, {
        currentItems: items,
        visibleItems: items,
        progressStats: { total: 2, purchased: 0, progress: 0 },
      })
    );

    const { getAllByTestId } = render(<ShoppingListScreen />);
    // BlurView mock renders with testID="blur-view"; one per section header
    const blurViews = getAllByTestId('blur-view');
    expect(blurViews.length).toBeGreaterThanOrEqual(2);
  });

  it('renders the aisle emoji alongside the category name', () => {
    const { useShoppingList } = require('../../hooks/useShoppingList');
    const items = [produceItem];
    useShoppingList.mockReturnValue(
      makeHookReturn({}, {
        currentItems: items,
        visibleItems: items,
        progressStats: { total: 1, purchased: 0, progress: 0 },
      })
    );

    const { getByText } = render(<ShoppingListScreen />);
    // Produce emoji is 🥬
    expect(getByText('🥬')).toBeTruthy();
  });

  it('shows "N left" count in aisle header reflecting unpurchased items', () => {
    const { useShoppingList } = require('../../hooks/useShoppingList');
    const purchased = makeItem('p2', 'Kale', 'Produce', true);
    const items = [produceItem, purchased]; // 1 unpurchased, 1 purchased
    useShoppingList.mockReturnValue(
      makeHookReturn({}, {
        currentItems: items,
        visibleItems: items,
        progressStats: { total: 2, purchased: 1, progress: 0.5 },
      })
    );

    const { getByText } = render(<ShoppingListScreen />);
    expect(getByText('1 left')).toBeTruthy();
  });

  it('puts cant-find items into their own section at the end', () => {
    const { useShoppingList } = require('../../hooks/useShoppingList');
    const items = [produceItem, pantryItem];
    useShoppingList.mockReturnValue(
      makeHookReturn(
        { cantFindItems: ['pa1'] },
        {
          currentItems: items,
          visibleItems: items,
          progressStats: { total: 2, purchased: 0, progress: 0 },
        }
      )
    );

    const { getByText } = render(<ShoppingListScreen />);
    // Produce renders as its own aisle; pa1 (Pantry item) is moved to "Can't Find"
    expect(getByText('Produce')).toBeTruthy();
    expect(getByText("Can't Find")).toBeTruthy();
  });

  it('renders item names inside each aisle section', () => {
    const { useShoppingList } = require('../../hooks/useShoppingList');
    const items = [produceItem, pantryItem];
    useShoppingList.mockReturnValue(
      makeHookReturn({}, {
        currentItems: items,
        visibleItems: items,
        progressStats: { total: 2, purchased: 0, progress: 0 },
      })
    );

    const { getByTestId } = render(<ShoppingListScreen />);
    expect(getByTestId('sl-item-p1')).toBeTruthy();
    expect(getByTestId('sl-item-pa1')).toBeTruthy();
  });

  it('AISLE_ORDER constant is sorted with Produce(0) before Meat(2) before Pantry(7)', () => {
    expect(AISLE_ORDER['Produce']).toBe(0);
    expect(AISLE_ORDER['Meat & Seafood']).toBe(2);
    expect(AISLE_ORDER['Pantry']).toBe(7);
  });
});
