// frontend/hooks/useShoppingList.ts
// Custom hook for shopping list state management with useReducer
// Consolidates 29 useState hooks into a single reducer

import { useReducer, useEffect, useMemo, useCallback, useRef } from 'react';
import { Alert, Animated } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { shoppingListApi, shoppingAppApi, mealPlanApi, pantryApi } from '../lib/api';
import { shoppingListCache } from '../lib/shoppingListCache';
import { useNetworkStatus } from './useNetworkStatus';
import { HapticPatterns } from '../constants/Haptics';
import { ShoppingList, ShoppingListItem, ShoppingAppIntegration, SupportedShoppingApp, PurchaseHistoryItem, PantryItem } from '../types';

// ─── State ──────────────────────────────────────────────────────────────

export interface ShoppingListState {
  shoppingLists: ShoppingList[];
  selectedList: ShoppingList | null;
  loading: boolean;
  refreshing: boolean;

  integrations: ShoppingAppIntegration[];
  supportedApps: SupportedShoppingApp[];

  showAddItemModal: boolean;
  newItemName: string;
  newItemQuantity: string;
  quantitySuggestions: string[];

  showEditQuantityModal: boolean;
  selectedItem: ShoppingListItem | null;
  editingQuantity: string;
  editingPrice: string;
  editingNotes: string;
  editingPhotoUrl: string | null;
  uploadingPhoto: boolean;
  updatingQuantity: boolean;

  showListPicker: boolean;

  showEditNameModal: boolean;
  editingListName: string;
  updatingName: boolean;

  showCreateListModal: boolean;
  newListName: string;
  creatingList: boolean;

  showMergeModal: boolean;
  selectedListsForMerge: string[];
  mergingLists: boolean;
  mergeName: string;

  selectionMode: boolean;
  selectedItems: string[];
  bulkUpdating: boolean;

  previousPurchasedState: Record<string, boolean>;
  showUndoButton: boolean;

  quickSuggestions: string[];
  loadingSuggestions: boolean;

  groupByRecipe: boolean;
  hidePurchased: boolean;
  generatingFromMealPlan: boolean;
  inStoreMode: boolean;

  // Buy Again
  purchaseHistory: PurchaseHistoryItem[];
  loadingPurchaseHistory: boolean;

  // Pantry
  pantryItems: PantryItem[];
  loadingPantry: boolean;

  // Offline
  isOffline: boolean;
  hasPendingSync: boolean;
  cacheAge: number | null;

  // In-store mode
  cantFindItems: string[];

  // Overflow menu
  showOverflowMenu: boolean;
}

const initialState: ShoppingListState = {
  shoppingLists: [],
  selectedList: null,
  loading: true,
  refreshing: false,

  integrations: [],
  supportedApps: [],

  showAddItemModal: false,
  newItemName: '',
  newItemQuantity: '',
  quantitySuggestions: [],

  showEditQuantityModal: false,
  selectedItem: null,
  editingQuantity: '',
  editingPrice: '',
  editingNotes: '',
  editingPhotoUrl: null,
  uploadingPhoto: false,
  updatingQuantity: false,

  showListPicker: false,

  showEditNameModal: false,
  editingListName: '',
  updatingName: false,

  showCreateListModal: false,
  newListName: '',
  creatingList: false,

  showMergeModal: false,
  selectedListsForMerge: [],
  mergingLists: false,
  mergeName: 'Weekly Shopping',

  selectionMode: false,
  selectedItems: [],
  bulkUpdating: false,

  previousPurchasedState: {},
  showUndoButton: false,

  quickSuggestions: [],
  loadingSuggestions: false,

  groupByRecipe: false,
  hidePurchased: false,
  generatingFromMealPlan: false,
  inStoreMode: false,

  purchaseHistory: [],
  loadingPurchaseHistory: false,

  pantryItems: [],
  loadingPantry: false,

  isOffline: false,
  hasPendingSync: false,
  cacheAge: null,

  cantFindItems: [],

  showOverflowMenu: false,
};

// ─── Actions ────────────────────────────────────────────────────────────

type ShoppingListAction =
  | { type: 'UPDATE'; payload: Partial<ShoppingListState> }
  | { type: 'TOGGLE_MERGE_SELECTION'; listId: string }
  | { type: 'TOGGLE_ITEM_SELECTION'; itemId: string }
  | { type: 'ENTER_SELECTION_MODE'; itemId: string }
  | { type: 'EXIT_SELECTION_MODE' }
  | { type: 'RESET_MERGE' }
  | { type: 'CLOSE_ADD_ITEM_MODAL' }
  | { type: 'CLOSE_EDIT_QUANTITY_MODAL' }
  | { type: 'OPEN_EDIT_QUANTITY'; item: ShoppingListItem }
  | { type: 'CLEAR_UNDO' }
  | { type: 'OPEN_EDIT_NAME' }
  | { type: 'CLOSE_EDIT_NAME' }
  | { type: 'CLOSE_CREATE_LIST' }
  | { type: 'MARK_CANT_FIND'; itemId: string }
  | { type: 'CLEAR_CANT_FIND' };

function shoppingListReducer(state: ShoppingListState, action: ShoppingListAction): ShoppingListState {
  switch (action.type) {
    case 'UPDATE':
      return { ...state, ...action.payload };

    case 'TOGGLE_MERGE_SELECTION': {
      const set = new Set(state.selectedListsForMerge);
      if (set.has(action.listId)) {
        set.delete(action.listId);
      } else {
        set.add(action.listId);
      }
      return { ...state, selectedListsForMerge: Array.from(set) };
    }

    case 'TOGGLE_ITEM_SELECTION': {
      const set = new Set(state.selectedItems);
      if (set.has(action.itemId)) {
        set.delete(action.itemId);
      } else {
        set.add(action.itemId);
      }
      return { ...state, selectedItems: Array.from(set) };
    }

    case 'ENTER_SELECTION_MODE':
      return { ...state, selectionMode: true, selectedItems: [action.itemId] };

    case 'EXIT_SELECTION_MODE':
      return { ...state, selectionMode: false, selectedItems: [] };

    case 'RESET_MERGE':
      return {
        ...state,
        showMergeModal: false,
        selectedListsForMerge: [],
        mergeName: 'Weekly Shopping',
      };

    case 'CLOSE_ADD_ITEM_MODAL':
      return {
        ...state,
        showAddItemModal: false,
        newItemName: '',
        newItemQuantity: '',
        quantitySuggestions: [],
      };

    case 'OPEN_EDIT_QUANTITY':
      return {
        ...state,
        selectedItem: action.item,
        editingQuantity: action.item.quantity || '',
        editingPrice: action.item.price != null ? action.item.price.toString() : '',
        editingNotes: action.item.notes || '',
        editingPhotoUrl: action.item.photoUrl || null,
        showEditQuantityModal: true,
      };

    case 'CLOSE_EDIT_QUANTITY_MODAL':
      return {
        ...state,
        showEditQuantityModal: false,
        editingQuantity: '',
        editingPrice: '',
        editingNotes: '',
        editingPhotoUrl: null,
        selectedItem: null,
      };

    case 'CLEAR_UNDO':
      return { ...state, showUndoButton: false, previousPurchasedState: {} };

    case 'OPEN_EDIT_NAME':
      return {
        ...state,
        editingListName: state.selectedList?.name || '',
        showEditNameModal: true,
      };

    case 'CLOSE_EDIT_NAME':
      return { ...state, showEditNameModal: false, editingListName: '' };

    case 'CLOSE_CREATE_LIST':
      return { ...state, showCreateListModal: false, newListName: '' };

    case 'MARK_CANT_FIND': {
      if (state.cantFindItems.includes(action.itemId)) return state;
      return { ...state, cantFindItems: [...state.cantFindItems, action.itemId] };
    }

    case 'CLEAR_CANT_FIND':
      return { ...state, cantFindItems: [] };

    default:
      return state;
  }
}

// ─── Utility Functions ──────────────────────────────────────────────────

export function parseQuantity(quantityStr: string): { amount: number; unit: string } | null {
  if (!quantityStr) return null;

  if (quantityStr.includes(' + ')) {
    const parts = quantityStr.split(' + ').map(p => parseQuantity(p.trim())).filter(Boolean);
    if (parts.length === 0) return null;

    const unitCounts = new Map<string, number>();
    parts.forEach(p => {
      if (p) {
        unitCounts.set(p.unit, (unitCounts.get(p.unit) || 0) + p.amount);
      }
    });

    const mostCommonUnit = Array.from(unitCounts.entries())
      .sort((a, b) => b[1] - a[1])[0][0];
    const totalAmount = unitCounts.get(mostCommonUnit) || 0;

    return { amount: totalAmount, unit: mostCommonUnit };
  }

  const match = quantityStr.match(/^([\d.]+(?:\s*\/\s*\d+)?)\s*(.*)$/);
  if (match) {
    let amount: number;
    const amountStr = match[1].trim();

    if (amountStr.includes('/')) {
      const [num, den] = amountStr.split('/').map(n => parseFloat(n.trim()));
      amount = num / den;
    } else {
      amount = parseFloat(amountStr);
    }

    const unit = match[2].trim().toLowerCase() || 'piece';
    return { amount, unit };
  }

  const numMatch = quantityStr.match(/^([\d.]+)/);
  if (numMatch) {
    return { amount: parseFloat(numMatch[1]), unit: 'piece' };
  }

  return null;
}

export function formatQuantity(amount: number, unit: string): string {
  if (amount % 1 === 0) {
    return `${amount} ${unit}`;
  } else if (amount < 1 && amount > 0) {
    const fraction = amount === 0.5 ? '1/2' : amount === 0.25 ? '1/4' : amount === 0.75 ? '3/4' : amount.toFixed(2);
    return `${fraction} ${unit}`;
  } else {
    return `${amount.toFixed(2)} ${unit}`;
  }
}

export function categorizeItem(itemName: string): string | undefined {
  const name = itemName.toLowerCase().trim();

  const produceKeywords = [
    'apple', 'banana', 'orange', 'grape', 'strawberry', 'berry', 'peach', 'pear', 'plum',
    'lettuce', 'spinach', 'kale', 'cabbage', 'broccoli', 'cauliflower', 'carrot', 'celery',
    'onion', 'garlic', 'pepper', 'tomato', 'cucumber', 'zucchini', 'potato', 'sweet potato',
    'avocado', 'mushroom', 'corn', 'pea', 'bean', 'asparagus', 'artichoke', 'beet', 'radish'
  ];
  const meatKeywords = [
    'chicken', 'beef', 'pork', 'turkey', 'lamb', 'bacon', 'sausage', 'ham', 'steak',
    'fish', 'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'scallop', 'tilapia', 'cod',
    'ground beef', 'ground turkey', 'chicken breast', 'chicken thigh', 'ribs'
  ];
  const dairyKeywords = [
    'milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream', 'cottage cheese',
    'mozzarella', 'cheddar', 'parmesan', 'swiss', 'feta', 'ricotta', 'greek yogurt'
  ];
  const bakeryKeywords = [
    'bread', 'bagel', 'muffin', 'croissant', 'roll', 'bun', 'pita', 'tortilla',
    'cake', 'cookie', 'brownie', 'donut', 'pastry', 'pie crust'
  ];
  const pantryKeywords = [
    'rice', 'pasta', 'noodle', 'flour', 'sugar', 'salt', 'pepper', 'spice', 'herb',
    'oil', 'vinegar', 'soy sauce', 'baking powder', 'baking soda', 'yeast',
    'cereal', 'oatmeal', 'quinoa', 'couscous', 'barley', 'lentil', 'chickpea',
    'canned', 'soup', 'broth', 'stock', 'sauce', 'paste', 'jam', 'jelly'
  ];
  const beverageKeywords = [
    'juice', 'soda', 'water', 'coffee', 'tea', 'beer', 'wine', 'smoothie',
    'lemonade', 'sports drink', 'energy drink', 'sparkling'
  ];
  const frozenKeywords = [
    'frozen', 'ice cream', 'frozen vegetable', 'frozen fruit', 'frozen meal'
  ];
  const snackKeywords = [
    'chip', 'cracker', 'pretzel', 'popcorn', 'nut', 'seed', 'trail mix', 'granola bar',
    'candy', 'chocolate', 'snack', 'dip', 'salsa', 'hummus'
  ];

  if (frozenKeywords.some(keyword => name.includes(keyword))) return 'Frozen';
  if (produceKeywords.some(keyword => name.includes(keyword))) return 'Produce';
  if (meatKeywords.some(keyword => name.includes(keyword))) return 'Meat & Seafood';
  if (dairyKeywords.some(keyword => name.includes(keyword))) return 'Dairy';
  if (bakeryKeywords.some(keyword => name.includes(keyword))) return 'Bakery';
  if (beverageKeywords.some(keyword => name.includes(keyword))) return 'Beverages';
  if (snackKeywords.some(keyword => name.includes(keyword))) return 'Snacks';
  if (pantryKeywords.some(keyword => name.includes(keyword))) return 'Pantry';

  return undefined;
}

function estimateItemCost(itemName: string, quantity: string): number {
  const name = itemName.toLowerCase();
  const qtyText = quantity.toLowerCase();

  const qtyMatch = qtyText.match(/(\d+(?:\.\d+)?)/);
  const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 1;

  const priceMap: Record<string, number> = {
    'chicken': 5.99, 'beef': 8.99, 'pork': 6.99, 'fish': 9.99, 'salmon': 12.99,
    'milk': 3.49, 'cheese': 4.99, 'yogurt': 4.49, 'butter': 4.99, 'eggs': 3.99,
    'bread': 3.49, 'flour': 4.99, 'sugar': 3.99, 'rice': 5.99, 'pasta': 2.99,
    'tomato': 2.99, 'onion': 1.99, 'garlic': 2.49, 'potato': 3.99, 'carrot': 2.49,
    'lettuce': 2.99, 'spinach': 3.99, 'broccoli': 3.49, 'pepper': 2.99,
    'apple': 4.99, 'banana': 1.99, 'orange': 4.99, 'strawberry': 5.99,
    'oil': 6.99, 'vinegar': 3.99, 'salt': 1.99, 'spice': 4.99,
  };

  for (const [key, price] of Object.entries(priceMap)) {
    if (name.includes(key) || key.includes(name.split(' ')[0])) {
      return price * qty;
    }
  }

  return 4 * qty;
}

// ─── Aisle Order ────────────────────────────────────────────────────────

export const AISLE_ORDER: Record<string, number> = {
  'Produce': 0,
  'Bakery': 1,
  'Meat & Seafood': 2,
  'Dairy': 3,
  'Frozen': 4,
  'Beverages': 5,
  'Snacks': 6,
  'Pantry': 7,
};
export const DEFAULT_AISLE_ORDER = 8;

export const AISLE_EMOJI: Record<string, string> = {
  'Produce': '🥬',
  'Bakery': '🍞',
  'Meat & Seafood': '🥩',
  'Dairy': '🧀',
  'Frozen': '🧊',
  'Beverages': '🥤',
  'Snacks': '🍿',
  'Pantry': '🥫',
  'Other': '📦',
  "Can't Find": '❓',
};

// ─── Hook ───────────────────────────────────────────────────────────────

export function useShoppingList() {
  const [state, dispatch] = useReducer(shoppingListReducer, initialState);

  // Network status
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const isOnline = isConnected && isInternetReachable;
  const wasOffline = useRef(false);

  // Modal animation refs
  const listPickerScale = useRef(new Animated.Value(0)).current;
  const listPickerOpacity = useRef(new Animated.Value(0)).current;
  const editNameScale = useRef(new Animated.Value(0)).current;
  const editNameOpacity = useRef(new Animated.Value(0)).current;
  const mergeScale = useRef(new Animated.Value(0)).current;
  const mergeOpacity = useRef(new Animated.Value(0)).current;
  const createListScale = useRef(new Animated.Value(0)).current;
  const createListOpacity = useRef(new Animated.Value(0)).current;

  // ─── Computed Values ────────────────────────────────────────────────

  const currentItems = useMemo(() => {
    return state.selectedList?.items || [];
  }, [state.selectedList?.items]);

  const visibleItems = useMemo(() => {
    let items = state.hidePurchased
      ? currentItems.filter(item => !item.purchased)
      : currentItems;

    if (state.inStoreMode) {
      const cantFindSet = new Set(state.cantFindItems);

      items = [...items].sort((a, b) => {
        // Can't-find items go to the very end
        const aCantFind = cantFindSet.has(a.id);
        const bCantFind = cantFindSet.has(b.id);
        if (aCantFind !== bCantFind) return aCantFind ? 1 : -1;

        // Purchased items go after unpurchased
        if (a.purchased !== b.purchased) return a.purchased ? 1 : -1;

        // Sort by aisle category
        const aCategory = a.category || categorizeItem(a.name) || 'Other';
        const bCategory = b.category || categorizeItem(b.name) || 'Other';
        const aOrder = AISLE_ORDER[aCategory] ?? DEFAULT_AISLE_ORDER;
        const bOrder = AISLE_ORDER[bCategory] ?? DEFAULT_AISLE_ORDER;
        if (aOrder !== bOrder) return aOrder - bOrder;

        return 0;
      });
    }

    return items;
  }, [currentItems, state.hidePurchased, state.inStoreMode, state.cantFindItems]);

  const itemsByRecipe = useMemo(() => {
    if (!state.groupByRecipe) return null;

    const grouped: { [recipeId: string]: { recipe: any; items: ShoppingListItem[] } } = {};
    const noRecipe: ShoppingListItem[] = [];

    visibleItems.forEach(item => {
      if (item.recipeId && item.recipe) {
        if (!grouped[item.recipeId]) {
          grouped[item.recipeId] = { recipe: item.recipe, items: [] };
        }
        grouped[item.recipeId].items.push(item);
      } else {
        noRecipe.push(item);
      }
    });

    return { grouped, noRecipe };
  }, [visibleItems, state.groupByRecipe]);

  const progressStats = useMemo(() => {
    const total = currentItems.length;
    const purchased = currentItems.filter(item => item.purchased).length;
    const progress = total > 0 ? (purchased / total) * 100 : 0;
    return { total, purchased, progress };
  }, [currentItems]);

  const estimatedCost = useMemo(() => {
    if (!currentItems.length) return 0;

    const unpurchasedItems = currentItems.filter(item => !item.purchased);
    return unpurchasedItems.reduce((sum, item) => {
      if (item.price != null && item.price > 0) {
        return sum + item.price;
      }
      return sum + estimateItemCost(item.name, item.quantity || '1');
    }, 0);
  }, [currentItems]);

  const spentSoFar = useMemo(() => {
    if (!currentItems.length) return 0;
    return currentItems
      .filter(item => item.purchased && item.price != null && item.price > 0)
      .reduce((sum, item) => sum + (item.price ?? 0), 0);
  }, [currentItems]);

  const purchaseHistoryPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    state.purchaseHistory.forEach(item => {
      if (item.lastPrice != null && item.lastPrice > 0) {
        map.set(item.itemName.toLowerCase().trim(), item.lastPrice);
      }
    });
    return map;
  }, [state.purchaseHistory]);

  const pantrySet = useMemo(() => {
    return new Set(state.pantryItems.map(p => p.name.toLowerCase().trim()));
  }, [state.pantryItems]);

  // ─── Data Loading ───────────────────────────────────────────────────

  const loadShoppingListDetails = useCallback(async (id: string, clearUndoState: boolean = false) => {
    try {
      const response = await shoppingListApi.getShoppingList(id);
      dispatch({ type: 'UPDATE', payload: { selectedList: response.data, cacheAge: null } });
      if (clearUndoState) {
        dispatch({ type: 'CLEAR_UNDO' });
      }
      // Cache fire-and-forget
      shoppingListCache.cacheListDetail(response.data).catch(console.error);
    } catch (error: any) {
      // Fallback to cache
      const cached = await shoppingListCache.getCachedListDetail(id);
      if (cached) {
        dispatch({ type: 'UPDATE', payload: {
          selectedList: cached.data,
          cacheAge: Date.now() - cached.cachedAt,
        }});
        if (clearUndoState) dispatch({ type: 'CLEAR_UNDO' });
      } else {
        console.error('Error loading shopping list details:', error);
      }
    }
  }, []);

  const loadShoppingLists = useCallback(async (selectNewest: boolean = false) => {
    try {
      dispatch({ type: 'UPDATE', payload: { loading: true } });
      const response = await shoppingListApi.getShoppingLists();
      const lists = response.data;
      dispatch({ type: 'UPDATE', payload: { shoppingLists: lists } });

      // Cache fire-and-forget
      shoppingListCache.cacheLists(lists).catch(console.error);

      let listToSelect: ShoppingList | undefined;
      if (selectNewest) {
        listToSelect = lists[0];
      } else {
        listToSelect = lists.find((l: ShoppingList) => l.isActive) || lists[0];
      }

      if (listToSelect) {
        await loadShoppingListDetails(listToSelect.id, true);
      }
    } catch (error: any) {
      // Fallback to cache
      const cachedLists = await shoppingListCache.getCachedLists();
      if (cachedLists && cachedLists.length > 0) {
        dispatch({ type: 'UPDATE', payload: { shoppingLists: cachedLists } });
        const listToSelect = cachedLists.find((l: ShoppingList) => l.isActive) || cachedLists[0];
        if (listToSelect) {
          await loadShoppingListDetails(listToSelect.id, true);
        }
      } else {
        console.error('Error loading shopping lists:', error);
        Alert.alert('Error', 'Failed to load shopping lists');
      }
    } finally {
      dispatch({ type: 'UPDATE', payload: { loading: false } });
    }
  }, [loadShoppingListDetails]);

  const loadSupportedApps = useCallback(async () => {
    try {
      const response = await shoppingAppApi.getSupportedApps();
      dispatch({ type: 'UPDATE', payload: { supportedApps: response.data } });
    } catch (error: any) {
      console.error('Error loading supported apps:', error);
    }
  }, []);

  const loadIntegrations = useCallback(async () => {
    try {
      const response = await shoppingAppApi.getIntegrations();
      dispatch({ type: 'UPDATE', payload: { integrations: response.data } });
    } catch (error: any) {
      console.error('Error loading integrations:', error);
    }
  }, []);

  const loadQuickSuggestions = useCallback(async () => {
    if (!state.selectedList) return;

    dispatch({ type: 'UPDATE', payload: { loadingSuggestions: true } });
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const allLists = await shoppingListApi.getShoppingLists();
      const recentItems = new Set<string>();

      for (const list of allLists.data || []) {
        if (list.items && list.items.length > 0) {
          list.items.forEach((item: ShoppingListItem) => {
            if (new Date(item.createdAt) >= thirtyDaysAgo) {
              recentItems.add(item.name);
            }
          });
        }
      }

      const commonItems = [
        'Milk', 'Eggs', 'Bread', 'Butter', 'Cheese', 'Chicken', 'Beef',
        'Onions', 'Garlic', 'Tomatoes', 'Lettuce', 'Carrots', 'Potatoes',
        'Rice', 'Pasta', 'Olive Oil', 'Salt', 'Pepper', 'Sugar', 'Flour'
      ];

      const currentItemNames = new Set(
        (state.selectedList?.items || []).map(item => item.name.toLowerCase())
      );
      const suggestions = Array.from(recentItems)
        .concat(commonItems)
        .filter(name => !currentItemNames.has(name.toLowerCase()))
        .slice(0, 12);

      dispatch({ type: 'UPDATE', payload: { quickSuggestions: suggestions } });
    } catch (error) {
      console.error('Error loading quick suggestions:', error);
      const currentItemNames = new Set(
        (state.selectedList?.items || []).map(item => item.name.toLowerCase())
      );
      const commonItems = [
        'Milk', 'Eggs', 'Bread', 'Butter', 'Cheese', 'Chicken', 'Beef',
        'Onions', 'Garlic', 'Tomatoes', 'Lettuce', 'Carrots'
      ];
      dispatch({
        type: 'UPDATE',
        payload: { quickSuggestions: commonItems.filter(name => !currentItemNames.has(name.toLowerCase())) },
      });
    } finally {
      dispatch({ type: 'UPDATE', payload: { loadingSuggestions: false } });
    }
  }, [state.selectedList]);

  // ─── Pantry Loading ─────────────────────────────────────────────────

  const loadPantry = useCallback(async () => {
    dispatch({ type: 'UPDATE', payload: { loadingPantry: true } });
    try {
      const response = await pantryApi.getAll();
      dispatch({ type: 'UPDATE', payload: { pantryItems: response.data, loadingPantry: false } });
    } catch (error) {
      console.error('Error loading pantry:', error);
      dispatch({ type: 'UPDATE', payload: { loadingPantry: false } });
    }
  }, []);

  // ─── Sync Queue Flush ──────────────────────────────────────────────

  const flushSyncQueue = useCallback(async () => {
    const queue = await shoppingListCache.getQueue();
    if (queue.length === 0) {
      dispatch({ type: 'UPDATE', payload: { hasPendingSync: false } });
      return;
    }

    const dedupedQueue = shoppingListCache.deduplicateQueue(queue);

    for (const op of dedupedQueue) {
      try {
        if (op.type === 'togglePurchased') {
          await shoppingListApi.updateItem(op.listId, op.itemId, op.payload);
        }
        await shoppingListCache.dequeue(op.id);
      } catch (error: any) {
        if (error.code === 'NETWORK_ERROR') break;
        if (error.code === 'HTTP_404') {
          await shoppingListCache.dequeue(op.id);
          continue;
        }
        break;
      }
    }

    const remaining = await shoppingListCache.getQueue();
    dispatch({ type: 'UPDATE', payload: { hasPendingSync: remaining.length > 0 } });

    if (state.selectedList) {
      await loadShoppingListDetails(state.selectedList.id);
    }
  }, [state.selectedList, loadShoppingListDetails]);

  // ─── Effects ────────────────────────────────────────────────────────

  useEffect(() => {
    loadShoppingLists();
    loadSupportedApps();
    loadIntegrations();
    loadPantry();
    // Check for pending sync on mount
    shoppingListCache.getQueue().then(queue => {
      if (queue.length > 0) {
        dispatch({ type: 'UPDATE', payload: { hasPendingSync: true } });
      }
    });
  }, []);

  // Track network status
  useEffect(() => {
    dispatch({ type: 'UPDATE', payload: { isOffline: !isOnline } });
  }, [isOnline]);

  // Flush sync queue when coming back online
  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
    } else if (wasOffline.current) {
      wasOffline.current = false;
      flushSyncQueue();
    }
  }, [isOnline, flushSyncQueue]);

  useFocusEffect(
    useCallback(() => {
      loadShoppingLists(true);
    }, [])
  );

  useEffect(() => {
    if (state.selectedList) {
      loadQuickSuggestions();
    }
  }, [state.selectedList?.id]);

  // Modal animations
  const animateModal = useCallback((
    show: boolean,
    scaleValue: Animated.Value,
    opacityValue: Animated.Value
  ) => {
    if (show) {
      scaleValue.setValue(0);
      opacityValue.setValue(0);
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1, friction: 8, tension: 40, useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 1, duration: 300, useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 0, duration: 200, useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 0, duration: 200, useNativeDriver: true,
        }),
      ]).start();
    }
  }, []);

  useEffect(() => {
    animateModal(state.showListPicker, listPickerScale, listPickerOpacity);
  }, [state.showListPicker]);

  useEffect(() => {
    animateModal(state.showEditNameModal, editNameScale, editNameOpacity);
  }, [state.showEditNameModal]);

  useEffect(() => {
    animateModal(state.showMergeModal, mergeScale, mergeOpacity);
  }, [state.showMergeModal]);

  useEffect(() => {
    animateModal(state.showCreateListModal, createListScale, createListOpacity);
  }, [state.showCreateListModal]);

  // Quantity suggestions debounce
  useEffect(() => {
    if (state.showAddItemModal && state.newItemName) {
      const timeoutId = setTimeout(() => {
        getQuantitySuggestions(state.newItemName);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      dispatch({ type: 'UPDATE', payload: { quantitySuggestions: [] } });
    }
  }, [state.newItemName, state.showAddItemModal]);

  // ─── Handlers ───────────────────────────────────────────────────────

  const getQuantitySuggestions = useCallback(async (itemName: string) => {
    if (!itemName.trim()) {
      dispatch({ type: 'UPDATE', payload: { quantitySuggestions: [] } });
      return;
    }

    try {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      const weeklyPlanResponse = await mealPlanApi.getWeeklyPlan({
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0],
      });

      const weeklyPlan = weeklyPlanResponse.data;
      if (!weeklyPlan?.weeklyPlan) {
        dispatch({ type: 'UPDATE', payload: { quantitySuggestions: [] } });
        return;
      }

      const suggestions = new Set<string>();
      const itemNameLower = itemName.toLowerCase().trim();

      Object.values(weeklyPlan.weeklyPlan).forEach((day: any) => {
        if (day.meals) {
          ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
            const meal = day.meals[mealType];
            if (meal?.recipe?.ingredients) {
              meal.recipe.ingredients.forEach((ingredient: any) => {
                const ingText = typeof ingredient === 'string' ? ingredient : ingredient.text;
                if (ingText.toLowerCase().includes(itemNameLower) || itemNameLower.includes(ingText.toLowerCase().split(' ')[0])) {
                  const qtyMatch = ingText.match(/^([\d\s\/\.]+(?:\s+(cup|cups|lb|lbs|oz|tbsp|tsp|piece|pieces|clove|cloves|bunch|bunches|fl\s*oz|pint|pints|quart|quarts|gallon|gallons|ml|l|liter|liters|g|gram|grams|kg|kilogram|kilograms))?)/i);
                  if (qtyMatch) {
                    suggestions.add(qtyMatch[1].trim());
                  }
                }
              });
            }
          });

          if (Array.isArray(day.meals.snacks)) {
            day.meals.snacks.forEach((snack: any) => {
              if (snack?.recipe?.ingredients) {
                snack.recipe.ingredients.forEach((ingredient: any) => {
                  const ingText = typeof ingredient === 'string' ? ingredient : ingredient.text;
                  if (ingText.toLowerCase().includes(itemNameLower) || itemNameLower.includes(ingText.toLowerCase().split(' ')[0])) {
                    const qtyMatch = ingText.match(/^([\d\s\/\.]+(?:\s+(cup|cups|lb|lbs|oz|tbsp|tsp|piece|pieces|clove|cloves|bunch|bunches|fl\s*oz|pint|pints|quart|quarts|gallon|gallons|ml|l|liter|liters|g|gram|grams|kg|kilogram|kilograms))?)/i);
                    if (qtyMatch) {
                      suggestions.add(qtyMatch[1].trim());
                    }
                  }
                });
              }
            });
          }
        }
      });

      dispatch({ type: 'UPDATE', payload: { quantitySuggestions: Array.from(suggestions).slice(0, 3) } });
    } catch (error) {
      console.error('Error getting quantity suggestions:', error);
      dispatch({ type: 'UPDATE', payload: { quantitySuggestions: [] } });
    }
  }, []);

  const handleSelectList = useCallback(async (listId: string) => {
    dispatch({ type: 'UPDATE', payload: { showListPicker: false } });
    await loadShoppingListDetails(listId, true);
  }, [loadShoppingListDetails]);

  const handleEditName = useCallback(() => {
    if (!state.selectedList) return;
    dispatch({ type: 'OPEN_EDIT_NAME' });
  }, [state.selectedList]);

  const handleSaveName = useCallback(async () => {
    if (!state.selectedList || !state.editingListName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    dispatch({ type: 'UPDATE', payload: { updatingName: true } });
    try {
      await shoppingListApi.updateShoppingList(state.selectedList.id, {
        name: state.editingListName.trim(),
      });
      await loadShoppingLists();
      await loadShoppingListDetails(state.selectedList.id);
      dispatch({ type: 'CLOSE_EDIT_NAME' });
      HapticPatterns.success();
    } catch (error: any) {
      console.error('Error updating list name:', error);
      Alert.alert('Error', 'Failed to update list name');
    } finally {
      dispatch({ type: 'UPDATE', payload: { updatingName: false } });
    }
  }, [state.selectedList, state.editingListName, loadShoppingLists, loadShoppingListDetails]);

  const handleCreateList = useCallback(() => {
    router.push('/create-shopping-list');
  }, []);

  const handleSaveNewList = useCallback(async () => {
    if (!state.newListName.trim()) {
      Alert.alert('Error', 'Please enter a name for your shopping list');
      return;
    }

    dispatch({ type: 'UPDATE', payload: { creatingList: true } });
    try {
      await shoppingListApi.createShoppingList({ name: state.newListName.trim() });
      await loadShoppingLists();
      dispatch({ type: 'CLOSE_CREATE_LIST' });
      HapticPatterns.success();
    } catch (error: any) {
      console.error('Error creating shopping list:', error);
      Alert.alert('Error', 'Failed to create shopping list');
    } finally {
      dispatch({ type: 'UPDATE', payload: { creatingList: false } });
    }
  }, [state.newListName, loadShoppingLists]);

  const handleDeleteList = useCallback(async () => {
    if (!state.selectedList) return;

    Alert.alert(
      'Delete Shopping List',
      `Are you sure you want to delete "${state.selectedList.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await shoppingListApi.deleteShoppingList(state.selectedList!.id);
              dispatch({ type: 'UPDATE', payload: { selectedList: null } });
              await loadShoppingLists();
              HapticPatterns.success();
            } catch (error: any) {
              console.error('Error deleting shopping list:', error);
              Alert.alert('Error', 'Failed to delete shopping list');
            }
          },
        },
      ]
    );
  }, [state.selectedList, loadShoppingLists]);

  const handleConfirmMerge = useCallback(async () => {
    const finalName = state.mergeName.trim() || 'Weekly Shopping';

    dispatch({ type: 'UPDATE', payload: { mergingLists: true } });
    try {
      const selectedLists = state.shoppingLists.filter(list =>
        state.selectedListsForMerge.includes(list.id)
      );
      const allItems: ShoppingListItem[] = [];

      selectedLists.forEach(list => {
        list.items?.forEach(item => {
          allItems.push(item);
        });
      });

      if (allItems.length === 0) {
        Alert.alert('Error', 'Selected lists have no items to merge');
        dispatch({ type: 'UPDATE', payload: { mergingLists: false } });
        return;
      }

      const response = await shoppingListApi.createShoppingList({ name: finalName });
      const newListId = response.data.id;

      const itemMap = new Map<string, {
        name: string;
        quantities: Array<{ amount: number; unit: string }>;
        category?: string;
      }>();

      allItems.forEach(item => {
        const key = item.name.toLowerCase().trim();
        const parsed = parseQuantity(item.quantity);
        const existing = itemMap.get(key);

        if (existing) {
          if (parsed) existing.quantities.push(parsed);
        } else {
          itemMap.set(key, {
            name: item.name,
            quantities: parsed ? [parsed] : [],
            category: item.category,
          });
        }
      });

      for (const [key, itemData] of itemMap.entries()) {
        if (itemData.quantities.length === 0) {
          const originalItem = allItems.find(item => item.name.toLowerCase().trim() === key);
          if (originalItem) {
            await shoppingListApi.addItem(newListId, {
              name: itemData.name,
              quantity: originalItem.quantity,
              category: itemData.category,
            });
          }
        } else {
          const unitMap = new Map<string, number>();
          itemData.quantities.forEach(qty => {
            unitMap.set(qty.unit, (unitMap.get(qty.unit) || 0) + qty.amount);
          });

          const sortedUnits = Array.from(unitMap.entries()).sort((a, b) => b[1] - a[1]);
          const [primaryUnit, totalAmount] = sortedUnits[0];

          await shoppingListApi.addItem(newListId, {
            name: itemData.name,
            quantity: formatQuantity(totalAmount, primaryUnit),
            category: itemData.category,
          });
        }
      }

      await loadShoppingLists();
      await loadShoppingListDetails(newListId);
      dispatch({ type: 'RESET_MERGE' });
      HapticPatterns.success();
      Alert.alert('Success', 'Lists merged successfully!');
    } catch (error: any) {
      console.error('Error merging lists:', error);
      Alert.alert('Error', 'Failed to merge lists');
    } finally {
      dispatch({ type: 'UPDATE', payload: { mergingLists: false } });
    }
  }, [state.mergeName, state.shoppingLists, state.selectedListsForMerge, loadShoppingLists, loadShoppingListDetails]);

  const handleAddItem = useCallback(async () => {
    if (!state.selectedList || !state.newItemName.trim() || !state.newItemQuantity.trim()) {
      Alert.alert('Error', 'Please enter item name and quantity');
      return;
    }

    const itemNameLower = state.newItemName.trim().toLowerCase();
    const existingItem = currentItems.find(
      item => item.name.toLowerCase().trim() === itemNameLower
    );

    if (existingItem) {
      Alert.alert(
        'Item Already Exists',
        `"${existingItem.name}" is already in your list with quantity "${existingItem.quantity}". Would you like to add it anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add Anyway',
            onPress: async () => {
              try {
                const category = categorizeItem(state.newItemName);
                await shoppingListApi.addItem(state.selectedList!.id, {
                  name: state.newItemName.trim(),
                  quantity: state.newItemQuantity.trim(),
                  category,
                });
                dispatch({ type: 'CLOSE_ADD_ITEM_MODAL' });
                await loadShoppingListDetails(state.selectedList!.id);
                HapticPatterns.success();
              } catch (error: any) {
                console.error('Error adding item:', error);
                Alert.alert('Error', 'Failed to add item');
              }
            },
          },
        ]
      );
      return;
    }

    try {
      const category = categorizeItem(state.newItemName);
      await shoppingListApi.addItem(state.selectedList.id, {
        name: state.newItemName.trim(),
        quantity: state.newItemQuantity.trim(),
        category,
      });
      dispatch({ type: 'CLOSE_ADD_ITEM_MODAL' });
      await loadShoppingListDetails(state.selectedList.id);
      HapticPatterns.success();
    } catch (error: any) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to add item');
    }
  }, [state.selectedList, state.newItemName, state.newItemQuantity, currentItems, loadShoppingListDetails]);

  const handleQuickAddSuggestion = useCallback(async (suggestion: string) => {
    if (!state.selectedList) return;

    try {
      const itemNameLower = suggestion.toLowerCase();
      const existingItem = currentItems.find(
        item => item.name.toLowerCase().trim() === itemNameLower
      );

      if (existingItem) {
        Alert.alert(
          'Item Already Exists',
          `"${existingItem.name}" is already in your list.`,
          [{ text: 'OK' }]
        );
        HapticPatterns.warning();
        return;
      }

      const category = categorizeItem(suggestion);
      await shoppingListApi.addItem(state.selectedList.id, {
        name: suggestion,
        quantity: '1',
        category,
      });

      HapticPatterns.success();
      await loadShoppingListDetails(state.selectedList.id);
      loadQuickSuggestions();
    } catch (error) {
      console.error('Error adding quick suggestion:', error);
      HapticPatterns.error();
    }
  }, [state.selectedList, currentItems, loadShoppingListDetails, loadQuickSuggestions]);

  const handleGenerateFromMealPlan = useCallback(async () => {
    if (!state.selectedList) {
      Alert.alert('Error', 'Please select a shopping list first');
      return;
    }

    dispatch({ type: 'UPDATE', payload: { generatingFromMealPlan: true } });
    try {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      await shoppingListApi.generateFromMealPlan({
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0],
        name: state.selectedList.name,
      });

      await loadShoppingListDetails(state.selectedList.id);
      HapticPatterns.success();
    } catch (error: any) {
      console.error('Error generating from meal plan:', error);
      Alert.alert('Error', 'Failed to generate shopping list from meal plan');
      HapticPatterns.error();
    } finally {
      dispatch({ type: 'UPDATE', payload: { generatingFromMealPlan: false } });
    }
  }, [state.selectedList, loadShoppingListDetails]);

  const handleFABPress = useCallback(() => {
    if (!state.selectedList) {
      Alert.alert('Error', 'Please select a shopping list first');
      return;
    }

    HapticPatterns.buttonPressPrimary();
    dispatch({ type: 'UPDATE', payload: { showAddItemModal: true } });
  }, [state.selectedList]);

  const handleTogglePurchased = useCallback(async (item: ShoppingListItem) => {
    if (!state.selectedList) return;

    if (state.showUndoButton) {
      dispatch({ type: 'CLEAR_UNDO' });
    }

    // Optimistic local update
    const updatedItems = currentItems.map(i =>
      i.id === item.id ? { ...i, purchased: !i.purchased } : i
    );
    dispatch({ type: 'UPDATE', payload: { selectedList: { ...state.selectedList, items: updatedItems } } });

    // If offline, queue the operation and update cache
    if (state.isOffline) {
      const op = {
        type: 'togglePurchased' as const,
        listId: state.selectedList.id,
        itemId: item.id,
        payload: { purchased: !item.purchased },
      };
      await shoppingListCache.enqueue(op);
      await shoppingListCache.applyOperationToCache({
        ...op,
        id: '',
        timestamp: Date.now(),
      });
      dispatch({ type: 'UPDATE', payload: { hasPendingSync: true } });
      HapticPatterns.success();
      return;
    }

    // Online path
    try {
      await shoppingListApi.updateItem(state.selectedList.id, item.id, {
        purchased: !item.purchased,
      });
      await loadShoppingListDetails(state.selectedList.id);
      HapticPatterns.success();
    } catch (error: any) {
      // If network error, queue for later
      if (error.code === 'NETWORK_ERROR') {
        await shoppingListCache.enqueue({
          type: 'togglePurchased',
          listId: state.selectedList.id,
          itemId: item.id,
          payload: { purchased: !item.purchased },
        });
        dispatch({ type: 'UPDATE', payload: { hasPendingSync: true, isOffline: true } });
        HapticPatterns.success();
      } else {
        console.error('Error updating item:', error);
        await loadShoppingListDetails(state.selectedList.id);
        Alert.alert('Error', 'Failed to update item');
      }
    }
  }, [state.selectedList, state.showUndoButton, state.isOffline, currentItems, loadShoppingListDetails]);

  const handleSaveQuantity = useCallback(async () => {
    if (!state.selectedList || !state.selectedItem) return;

    dispatch({ type: 'UPDATE', payload: { updatingQuantity: true } });
    try {
      const priceValue = state.editingPrice.trim()
        ? parseFloat(state.editingPrice.trim())
        : null;

      await shoppingListApi.updateItem(state.selectedList.id, state.selectedItem.id, {
        quantity: state.editingQuantity.trim() || undefined,
        price: priceValue !== null && !isNaN(priceValue) && priceValue >= 0 ? priceValue : null,
        notes: state.editingNotes.trim() || null,
        photoUrl: state.editingPhotoUrl,
      });
      await loadShoppingListDetails(state.selectedList.id);
      dispatch({ type: 'CLOSE_EDIT_QUANTITY_MODAL' });
      HapticPatterns.success();
    } catch (error: any) {
      console.error('Error updating item:', error);
      Alert.alert('Error', 'Failed to update item');
    } finally {
      dispatch({ type: 'UPDATE', payload: { updatingQuantity: false } });
    }
  }, [state.selectedList, state.selectedItem, state.editingQuantity, state.editingPrice, state.editingNotes, state.editingPhotoUrl, loadShoppingListDetails]);

  const handlePickItemPhoto = useCallback(async (imageUri: string) => {
    dispatch({ type: 'UPDATE', payload: { uploadingPhoto: true } });
    try {
      const response = await shoppingListApi.uploadItemPhoto(imageUri);
      const url = response.data?.url;
      if (url) {
        dispatch({ type: 'UPDATE', payload: { editingPhotoUrl: url } });
      }
    } catch (error) {
      console.error('Error uploading item photo:', error);
      Alert.alert('Upload Failed', 'Could not upload the photo. Please try again.');
    } finally {
      dispatch({ type: 'UPDATE', payload: { uploadingPhoto: false } });
    }
  }, []);

  const handleMarkSelectedComplete = useCallback(async () => {
    if (!state.selectedList || state.selectedItems.length === 0) return;

    dispatch({ type: 'UPDATE', payload: { bulkUpdating: true } });
    try {
      const selectedItemsSet = new Set(state.selectedItems);
      const updatedItems = currentItems.map(item =>
        selectedItemsSet.has(item.id) ? { ...item, purchased: true } : item
      );
      dispatch({ type: 'UPDATE', payload: { selectedList: { ...state.selectedList, items: updatedItems } } });

      await shoppingListApi.batchUpdateItems(
        state.selectedList.id,
        state.selectedItems.map(itemId => ({ itemId, purchased: true }))
      );

      await loadShoppingListDetails(state.selectedList.id);
      dispatch({ type: 'EXIT_SELECTION_MODE' });
      HapticPatterns.success();
    } catch (error: any) {
      console.error('Error marking items as complete:', error);
      await loadShoppingListDetails(state.selectedList.id);
      Alert.alert('Error', 'Failed to mark items as complete');
    } finally {
      dispatch({ type: 'UPDATE', payload: { bulkUpdating: false } });
    }
  }, [state.selectedList, state.selectedItems, currentItems, loadShoppingListDetails]);

  const handleMarkAllComplete = useCallback(async () => {
    if (!state.selectedList || currentItems.length === 0) return;

    const unpurchasedItems = currentItems.filter(item => !item.purchased);
    if (unpurchasedItems.length === 0) return;

    const previousState: Record<string, boolean> = {};
    currentItems.forEach(item => {
      previousState[item.id] = item.purchased;
    });
    dispatch({ type: 'UPDATE', payload: { previousPurchasedState: previousState, showUndoButton: true, bulkUpdating: true } });

    try {
      const updatedItems = currentItems.map(item => ({ ...item, purchased: true }));
      dispatch({ type: 'UPDATE', payload: { selectedList: { ...state.selectedList, items: updatedItems } } });

      const response = await shoppingListApi.batchUpdateItems(
        state.selectedList.id,
        unpurchasedItems.map(item => ({ itemId: item.id, purchased: true }))
      );

      if (response.data?.updated !== undefined && response.data.updated < unpurchasedItems.length) {
        await loadShoppingListDetails(state.selectedList.id);
      }

      dispatch({ type: 'EXIT_SELECTION_MODE' });
      HapticPatterns.success();
    } catch (error: any) {
      console.error('Error marking all as complete:', error);
      await loadShoppingListDetails(state.selectedList.id);
      dispatch({ type: 'CLEAR_UNDO' });
      if (error.code !== 'HTTP_404') {
        Alert.alert('Error', 'Failed to mark all items as complete');
      }
    } finally {
      dispatch({ type: 'UPDATE', payload: { bulkUpdating: false } });
    }
  }, [state.selectedList, currentItems, loadShoppingListDetails]);

  const handleUndoMarkAllComplete = useCallback(async () => {
    if (!state.selectedList || Object.keys(state.previousPurchasedState).length === 0) return;

    dispatch({ type: 'UPDATE', payload: { bulkUpdating: true } });
    try {
      const updatedItems = currentItems.map(item => ({
        ...item,
        purchased: state.previousPurchasedState[item.id] ?? item.purchased,
      }));
      dispatch({ type: 'UPDATE', payload: { selectedList: { ...state.selectedList, items: updatedItems } } });

      const itemsToRevert = currentItems.filter(item => {
        const prev = state.previousPurchasedState[item.id];
        return prev !== undefined && prev !== item.purchased;
      });

      await shoppingListApi.batchUpdateItems(
        state.selectedList.id,
        itemsToRevert.map(item => ({
          itemId: item.id,
          purchased: state.previousPurchasedState[item.id] ?? false,
        }))
      );

      dispatch({ type: 'CLEAR_UNDO' });
      HapticPatterns.success();
    } catch (error: any) {
      console.error('Error undoing mark all complete:', error);
      const response = await shoppingListApi.getShoppingList(state.selectedList.id);
      dispatch({ type: 'UPDATE', payload: { selectedList: response.data } });
      dispatch({ type: 'CLEAR_UNDO' });
      Alert.alert('Error', 'Failed to undo mark all complete');
    } finally {
      dispatch({ type: 'UPDATE', payload: { bulkUpdating: false } });
    }
  }, [state.selectedList, state.previousPurchasedState, currentItems]);

  const handleDeleteItem = useCallback(async (item: ShoppingListItem) => {
    if (!state.selectedList) return;

    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await shoppingListApi.deleteItem(state.selectedList!.id, item.id);
              await loadShoppingListDetails(state.selectedList!.id);
              HapticPatterns.success();
            } catch (error: any) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  }, [state.selectedList, loadShoppingListDetails]);

  const handleSyncToApp = useCallback(async (appName: string) => {
    if (!state.selectedList) {
      Alert.alert('Error', 'Please select a shopping list');
      return;
    }

    try {
      const response = await shoppingAppApi.syncToExternalApp(appName, state.selectedList.id);
      if (response.data.success) {
        Alert.alert('Success', response.data.message || `Items synced to ${appName}`);
        HapticPatterns.success();
      } else {
        Alert.alert('Error', response.data.message || 'Failed to sync items');
      }
    } catch (error: any) {
      console.error('Error syncing to app:', error);
      Alert.alert('Error', 'Failed to sync to shopping app. Please connect your account first.');
    }
  }, [state.selectedList]);

  const handleSyncBidirectional = useCallback(async () => {
    if (!state.selectedList || state.integrations.length === 0) return;

    try {
      HapticPatterns.buttonPressPrimary();

      const syncPromises = state.integrations.map(integration =>
        shoppingAppApi.syncBidirectional(integration.appName, state.selectedList!.id)
      );

      const results = await Promise.allSettled(syncPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      HapticPatterns.success();
      Alert.alert(
        'Sync Complete',
        `Synced to ${successful} of ${state.integrations.length} shopping app(s)`
      );
    } catch (error: any) {
      console.error('Error syncing bidirectionally:', error);
      HapticPatterns.error();
      Alert.alert('Sync Failed', 'Failed to sync shopping list');
    }
  }, [state.selectedList, state.integrations]);

  const handleRefresh = useCallback(async () => {
    dispatch({ type: 'UPDATE', payload: { refreshing: true } });
    await loadShoppingLists();
    await loadIntegrations();
    if (state.selectedList) {
      await loadShoppingListDetails(state.selectedList.id);
    }
    dispatch({ type: 'UPDATE', payload: { refreshing: false } });
  }, [state.selectedList, loadShoppingLists, loadIntegrations, loadShoppingListDetails]);

  const toggleHidePurchased = useCallback(() => {
    dispatch({ type: 'UPDATE', payload: { hidePurchased: !state.hidePurchased } });
    HapticPatterns.buttonPress();
  }, [state.hidePurchased]);

  const toggleGroupByRecipe = useCallback(() => {
    dispatch({ type: 'UPDATE', payload: { groupByRecipe: !state.groupByRecipe } });
  }, [state.groupByRecipe]);

  const toggleInStoreMode = useCallback(() => {
    const entering = !state.inStoreMode;
    dispatch({
      type: 'UPDATE',
      payload: {
        inStoreMode: entering,
        ...(entering ? { hidePurchased: true } : {}),
      },
    });
    if (!entering) {
      dispatch({ type: 'CLEAR_CANT_FIND' });
    }
    HapticPatterns.buttonPress();
  }, [state.inStoreMode]);

  const handleCantFind = useCallback((itemId: string) => {
    dispatch({ type: 'MARK_CANT_FIND', itemId });
    HapticPatterns.warning();
  }, []);

  // ─── Buy Again Handlers ──────────────────────────────────────────────

  const loadPurchaseHistory = useCallback(async () => {
    dispatch({ type: 'UPDATE', payload: { loadingPurchaseHistory: true } });
    try {
      const response = await shoppingListApi.getPurchaseHistory({ limit: 20 });
      dispatch({ type: 'UPDATE', payload: { purchaseHistory: response.data, loadingPurchaseHistory: false } });
    } catch (error) {
      console.error('Error loading purchase history:', error);
      dispatch({ type: 'UPDATE', payload: { loadingPurchaseHistory: false } });
    }
  }, []);

  const handleBuyAgainItem = useCallback(async (historyItem: PurchaseHistoryItem) => {
    if (!state.selectedList) return;

    const existingItem = currentItems.find(
      item => item.name.toLowerCase().trim() === historyItem.itemName.toLowerCase().trim()
    );
    if (existingItem) {
      Alert.alert('Item Already Exists', `"${existingItem.name}" is already in your list.`);
      HapticPatterns.warning();
      return;
    }

    try {
      const category = categorizeItem(historyItem.itemName);
      await shoppingListApi.addItem(state.selectedList.id, {
        name: historyItem.itemName.charAt(0).toUpperCase() + historyItem.itemName.slice(1),
        quantity: historyItem.quantity,
        category: category || historyItem.category,
        price: historyItem.lastPrice ?? undefined,
      });
      HapticPatterns.success();
      await loadShoppingListDetails(state.selectedList.id);
    } catch (error) {
      console.error('Error adding buy again item:', error);
      HapticPatterns.error();
    }
  }, [state.selectedList, currentItems, loadShoppingListDetails]);

  const handleToggleFavorite = useCallback(async (historyItem: PurchaseHistoryItem) => {
    try {
      await shoppingListApi.togglePurchaseHistoryFavorite(historyItem.id);
      HapticPatterns.buttonPress();
      await loadPurchaseHistory();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, [loadPurchaseHistory]);

  const handleReorderLastWeek = useCallback(async () => {
    if (!state.selectedList) return;

    try {
      const response = await shoppingListApi.getRecentPurchases(7);
      const recentItems: PurchaseHistoryItem[] = response.data;

      if (!recentItems || recentItems.length === 0) {
        Alert.alert('No Recent Purchases', 'No items purchased in the last 7 days.');
        return;
      }

      const currentItemNames = new Set(
        currentItems.map(item => item.name.toLowerCase().trim())
      );

      const itemsToAdd = recentItems.filter(
        item => !currentItemNames.has(item.itemName.toLowerCase().trim())
      );

      if (itemsToAdd.length === 0) {
        Alert.alert('All Items Present', 'All recently purchased items are already in your list.');
        return;
      }

      for (const item of itemsToAdd) {
        const category = categorizeItem(item.itemName);
        await shoppingListApi.addItem(state.selectedList.id, {
          name: item.itemName.charAt(0).toUpperCase() + item.itemName.slice(1),
          quantity: item.quantity,
          category: category || item.category,
        });
      }

      HapticPatterns.success();
      await loadShoppingListDetails(state.selectedList.id);
      Alert.alert('Success', `Added ${itemsToAdd.length} items from last week.`);
    } catch (error) {
      console.error('Error reordering last week:', error);
      Alert.alert('Error', "Failed to reorder last week's items.");
      HapticPatterns.error();
    }
  }, [state.selectedList, currentItems, loadShoppingListDetails]);

  // ─── Pantry Handlers ────────────────────────────────────────────────

  const handleAddToPantry = useCallback(async (itemName: string, category?: string) => {
    try {
      await pantryApi.addItem({ name: itemName, category });
      HapticPatterns.success();
      await loadPantry();
    } catch (error) {
      console.error('Error adding to pantry:', error);
      HapticPatterns.error();
    }
  }, [loadPantry]);

  const handleRemoveFromPantry = useCallback(async (itemId: string) => {
    try {
      await pantryApi.removeItem(itemId);
      HapticPatterns.success();
      await loadPantry();
    } catch (error) {
      console.error('Error removing from pantry:', error);
      HapticPatterns.error();
    }
  }, [loadPantry]);

  const handleSetupDefaultPantry = useCallback(async () => {
    try {
      await pantryApi.addMany([
        { name: 'salt', category: 'Pantry' },
        { name: 'pepper', category: 'Pantry' },
        { name: 'olive oil', category: 'Pantry' },
        { name: 'vegetable oil', category: 'Pantry' },
        { name: 'butter', category: 'Dairy' },
        { name: 'sugar', category: 'Pantry' },
        { name: 'flour', category: 'Pantry' },
        { name: 'garlic', category: 'Produce' },
        { name: 'onion', category: 'Produce' },
      ]);
      HapticPatterns.success();
      await loadPantry();
    } catch (error) {
      console.error('Error setting up default pantry:', error);
      HapticPatterns.error();
    }
  }, [loadPantry]);

  // Load purchase history when a list is selected
  useEffect(() => {
    if (state.selectedList) {
      loadPurchaseHistory();
    }
  }, [state.selectedList?.id, loadPurchaseHistory]);

  return {
    state,
    dispatch,

    // Computed values
    currentItems,
    visibleItems,
    itemsByRecipe,
    progressStats,
    estimatedCost,
    spentSoFar,
    purchaseHistoryPriceMap,
    pantrySet,

    // Animation values
    listPickerScale,
    listPickerOpacity,
    editNameScale,
    editNameOpacity,
    mergeScale,
    mergeOpacity,
    createListScale,
    createListOpacity,

    // Handlers
    handleSelectList,
    handleEditName,
    handleSaveName,
    handleCreateList,
    handleSaveNewList,
    handleDeleteList,
    handleConfirmMerge,
    handleAddItem,
    handleQuickAddSuggestion,
    handleGenerateFromMealPlan,
    handleFABPress,
    handleTogglePurchased,
    handleSaveQuantity,
    handlePickItemPhoto,
    handleMarkSelectedComplete,
    handleMarkAllComplete,
    handleUndoMarkAllComplete,
    handleDeleteItem,
    handleSyncToApp,
    handleSyncBidirectional,
    handleRefresh,
    toggleHidePurchased,
    toggleGroupByRecipe,
    toggleInStoreMode,
    handleCantFind,
    loadQuickSuggestions,
    loadPurchaseHistory,
    handleBuyAgainItem,
    handleToggleFavorite,
    handleReorderLastWeek,
    loadPantry,
    handleAddToPantry,
    handleRemoveFromPantry,
    handleSetupDefaultPantry,
    flushSyncQueue,
  };
}
