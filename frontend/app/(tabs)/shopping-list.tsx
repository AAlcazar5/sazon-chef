// frontend/app/(tabs)/shopping-list.tsx
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';
// Shopping list screen

import { View, Text, ScrollView, TextInput, Alert, Modal, Animated, Switch, Easing } from 'react-native';
import AnimatedActivityIndicator from '../../components/ui/AnimatedActivityIndicator';
import AnimatedEmptyState from '../../components/ui/AnimatedEmptyState';
import SwipeableItem from '../../components/ui/SwipeableItem';
import AnimatedProgressBar from '../../components/ui/AnimatedProgressBar';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Icon from '../../components/ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { FontSize } from '../../constants/Typography';
import { Duration, Spring } from '../../constants/Animations';
import { HapticPatterns } from '../../constants/Haptics';
import { ShoppingListEmptyStates } from '../../constants/EmptyStates';
import { ShoppingListLoadingStates } from '../../constants/LoadingStates';
import LoadingState from '../../components/ui/LoadingState';
import { buttonAccessibility, iconButtonAccessibility, inputAccessibility, switchAccessibility, checkboxAccessibility } from '../../utils/accessibility';
import { useColorScheme } from 'nativewind';
import { shoppingListApi, shoppingAppApi, mealPlanApi } from '../../lib/api';
import { ShoppingList, ShoppingListItem, ShoppingAppIntegration, SupportedShoppingApp, Recipe } from '../../types';

export default function ShoppingListScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [integrations, setIntegrations] = useState<ShoppingAppIntegration[]>([]);
  const [supportedApps, setSupportedApps] = useState<SupportedShoppingApp[]>([]);
  const [showListPicker, setShowListPicker] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editingListName, setEditingListName] = useState('');
  const [updatingName, setUpdatingName] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [selectedListsForMerge, setSelectedListsForMerge] = useState<Set<string>>(new Set());
  const [mergingLists, setMergingLists] = useState(false);
  const [mergeName, setMergeName] = useState('Weekly Shopping');
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShoppingListItem | null>(null);
  const [showEditQuantityModal, setShowEditQuantityModal] = useState(false);
  const [editingQuantity, setEditingQuantity] = useState('');
  const [updatingQuantity, setUpdatingQuantity] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [previousPurchasedState, setPreviousPurchasedState] = useState<Map<string, boolean>>(new Map());
  const [showUndoButton, setShowUndoButton] = useState(false);
  const [quickSuggestions, setQuickSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [groupByRecipe, setGroupByRecipe] = useState(false);
  const [quantitySuggestions, setQuantitySuggestions] = useState<string[]>([]);
  const [generatingFromMealPlan, setGeneratingFromMealPlan] = useState(false);
  const [hidePurchased, setHidePurchased] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  
  // FAB animation values
  const fabScale = useRef(new Animated.Value(1)).current;
  const fabRotation = useRef(new Animated.Value(0)).current;
  
  // Header collapse animation
  const headerHeight = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(0);
  const lastScrollY = useRef(0);
  
  useEffect(() => {
    Animated.timing(headerHeight, {
      toValue: headerCollapsed ? 0 : 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [headerCollapsed]);

  // Handle scroll to auto-collapse header
  const handleScroll = useCallback((event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const scrollDifference = currentScrollY - lastScrollY.current;
    
    // Only trigger if scrolling more than 15 pixels to avoid jitter and make it smoother
    if (Math.abs(scrollDifference) > 15) {
      if (scrollDifference > 0 && !headerCollapsed && currentScrollY > 80) {
        // Scrolling down and header not collapsed - collapse it
        setHeaderCollapsed(true);
      } else if (scrollDifference < 0 && headerCollapsed && currentScrollY < 150) {
        // Scrolling up near top and header collapsed - expand it
        setHeaderCollapsed(false);
      }
    }
    
    lastScrollY.current = currentScrollY;
    scrollY.current = currentScrollY;
  }, [headerCollapsed]);

  // Animation values for modals
  const listPickerScale = useRef(new Animated.Value(0)).current;
  const listPickerOpacity = useRef(new Animated.Value(0)).current;
  const editNameScale = useRef(new Animated.Value(0)).current;
  const editNameOpacity = useRef(new Animated.Value(0)).current;
  const mergeScale = useRef(new Animated.Value(0)).current;
  const mergeOpacity = useRef(new Animated.Value(0)).current;
  const createListScale = useRef(new Animated.Value(0)).current;
  const createListOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadShoppingLists();
    loadSupportedApps();
    loadIntegrations();
  }, []);

  // Refresh data when screen comes into focus (e.g., after creating a new list)
  // Select newest list to show the just-created list
  useFocusEffect(
    useCallback(() => {
      loadShoppingLists(true); // Select newest list on focus
    }, [])
  );

  // Animate list picker modal
  useEffect(() => {
    if (showListPicker) {
      listPickerScale.setValue(0);
      listPickerOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(listPickerScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(listPickerOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(listPickerScale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(listPickerOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showListPicker]);

  // Animate edit name modal
  useEffect(() => {
    if (showEditNameModal) {
      editNameScale.setValue(0);
      editNameOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(editNameScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(editNameOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(editNameScale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(editNameOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showEditNameModal]);

  // Animate create list modal
  useEffect(() => {
    if (showCreateListModal) {
      createListScale.setValue(0);
      createListOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(createListScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(createListOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(createListScale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(createListOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showCreateListModal]);

  // Animate merge modal
  useEffect(() => {
    if (showMergeModal) {
      mergeScale.setValue(0);
      mergeOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(mergeScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(mergeOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(mergeScale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(mergeOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showMergeModal]);

  const loadShoppingLists = async (selectNewest: boolean = false) => {
    try {
      setLoading(true);
      const response = await shoppingListApi.getShoppingLists();
      const lists = response.data;
      setShoppingLists(lists);

      // If selectNewest is true (e.g., after creating a new list), select the first list (newest)
      // Otherwise, select the active list or first list
      let listToSelect: ShoppingList | undefined;
      if (selectNewest) {
        listToSelect = lists[0]; // Lists are sorted by createdAt desc
      } else {
        listToSelect = lists.find((l: ShoppingList) => l.isActive) || lists[0];
      }

      if (listToSelect) {
        await loadShoppingListDetails(listToSelect.id, true); // Clear undo when initially loading
      }
    } catch (error: any) {
      console.error('Error loading shopping lists:', error);
      Alert.alert('Error', 'Failed to load shopping lists');
    } finally {
      setLoading(false);
    }
  };

  const loadShoppingListDetails = async (id: string, clearUndoState: boolean = false) => {
    try {
      const response = await shoppingListApi.getShoppingList(id);
      setSelectedList(response.data);
      // Clear undo state only when explicitly requested (e.g., switching lists)
      if (clearUndoState) {
        setShowUndoButton(false);
        setPreviousPurchasedState(new Map());
      }
    } catch (error: any) {
      console.error('Error loading shopping list details:', error);
    }
  };

  const handleSelectList = async (listId: string) => {
    setShowListPicker(false);
    await loadShoppingListDetails(listId, true); // Clear undo when switching lists
  };

  // Load quick add suggestions
  const loadQuickSuggestions = useCallback(async () => {
    if (!selectedList) return;
    
    setLoadingSuggestions(true);
    try {
      // Get recent items from all shopping lists (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const allLists = await shoppingListApi.getShoppingLists();
      const recentItems = new Set<string>();
      
      // Collect unique item names from recent lists
      for (const list of allLists.data || []) {
        if (list.items && list.items.length > 0) {
          list.items.forEach((item: ShoppingListItem) => {
            if (new Date(item.createdAt) >= thirtyDaysAgo) {
              recentItems.add(item.name);
            }
          });
        }
      }
      
      // Common shopping items
      const commonItems = [
        'Milk', 'Eggs', 'Bread', 'Butter', 'Cheese', 'Chicken', 'Beef',
        'Onions', 'Garlic', 'Tomatoes', 'Lettuce', 'Carrots', 'Potatoes',
        'Rice', 'Pasta', 'Olive Oil', 'Salt', 'Pepper', 'Sugar', 'Flour'
      ];
      
      // Combine and filter out items already in current list
      const currentItems = selectedList?.items || [];
      const currentItemNames = new Set(currentItems.map(item => item.name.toLowerCase()));
      const suggestions = Array.from(recentItems)
        .concat(commonItems)
        .filter(name => !currentItemNames.has(name.toLowerCase()))
        .slice(0, 12); // Limit to 12 suggestions
      
      setQuickSuggestions(suggestions);
    } catch (error) {
      console.error('Error loading quick suggestions:', error);
      // Fallback to common items only
      const currentItems = selectedList?.items || [];
      const currentItemNames = new Set(currentItems.map(item => item.name.toLowerCase()));
      const commonItems = [
        'Milk', 'Eggs', 'Bread', 'Butter', 'Cheese', 'Chicken', 'Beef',
        'Onions', 'Garlic', 'Tomatoes', 'Lettuce', 'Carrots'
      ];
      setQuickSuggestions(commonItems.filter(name => !currentItemNames.has(name.toLowerCase())));
    } finally {
      setLoadingSuggestions(false);
    }
  }, [selectedList]);
  
  // Reload suggestions when list changes
  useEffect(() => {
    if (selectedList) {
      loadQuickSuggestions();
    }
  }, [selectedList?.id, loadQuickSuggestions]);

  // Helper function to parse quantity string (e.g., "1 lb", "2 cups", "1.5 oz")
  const parseQuantity = (quantityStr: string): { amount: number; unit: string } | null => {
    if (!quantityStr) return null;
    
    // Handle already combined quantities (e.g., "1 lb + 1 lb")
    if (quantityStr.includes(' + ')) {
      // Split and parse each part
      const parts = quantityStr.split(' + ').map(p => parseQuantity(p.trim())).filter(Boolean);
      if (parts.length === 0) return null;
      
      // Sum amounts if same unit
      const unitCounts = new Map<string, number>();
      parts.forEach(p => {
        if (p) {
          unitCounts.set(p.unit, (unitCounts.get(p.unit) || 0) + p.amount);
        }
      });
      
      // Use the most common unit
      const mostCommonUnit = Array.from(unitCounts.entries())
        .sort((a, b) => b[1] - a[1])[0][0];
      const totalAmount = unitCounts.get(mostCommonUnit) || 0;
      
      return { amount: totalAmount, unit: mostCommonUnit };
    }
    
    // Parse simple quantity: "1 lb", "2 cups", "1.5 oz", etc.
    const match = quantityStr.match(/^([\d.]+(?:\s*\/\s*\d+)?)\s*(.*)$/);
    if (match) {
      let amount: number;
      const amountStr = match[1].trim();
      
      // Handle fractions
      if (amountStr.includes('/')) {
        const [num, den] = amountStr.split('/').map(n => parseFloat(n.trim()));
        amount = num / den;
      } else {
        amount = parseFloat(amountStr);
      }
      
      const unit = match[2].trim().toLowerCase() || 'piece';
      return { amount, unit };
    }
    
    // Try to extract just a number
    const numMatch = quantityStr.match(/^([\d.]+)/);
    if (numMatch) {
      return { amount: parseFloat(numMatch[1]), unit: 'piece' };
    }
    
    return null;
  };

  // Helper function to format quantity
  const formatQuantity = (amount: number, unit: string): string => {
    if (amount % 1 === 0) {
      return `${amount} ${unit}`;
    } else if (amount < 1 && amount > 0) {
      // Convert to fraction for small amounts
      const fraction = amount === 0.5 ? '1/2' : amount === 0.25 ? '1/4' : amount === 0.75 ? '3/4' : amount.toFixed(2);
      return `${fraction} ${unit}`;
    } else {
      return `${amount.toFixed(2)} ${unit}`;
    }
  };

  const handleMergeLists = () => {
    if (selectedListsForMerge.size < 2) {
      Alert.alert('Error', 'Please select at least 2 lists to merge');
      return;
    }
    setShowMergeModal(true);
  };

  const handleConfirmMerge = async () => {
    const finalName = mergeName.trim() || 'Weekly Shopping';
    
    setMergingLists(true);
    try {
      // Get all items from selected lists
      const selectedLists = shoppingLists.filter(list => selectedListsForMerge.has(list.id));
      const allItems: ShoppingListItem[] = [];
      
      selectedLists.forEach(list => {
        list.items?.forEach(item => {
          allItems.push(item);
        });
      });

      if (allItems.length === 0) {
        Alert.alert('Error', 'Selected lists have no items to merge');
        setMergingLists(false);
        return;
      }

      // Create new list with merged name
      const response = await shoppingListApi.createShoppingList({ name: finalName });
      const newListId = response.data.id;

      // Add all items to the new list (aggregate duplicates with proper quantity math)
      const itemMap = new Map<string, { 
        name: string; 
        quantities: Array<{ amount: number; unit: string }>; 
        category?: string 
      }>();
      
      allItems.forEach(item => {
        const key = item.name.toLowerCase().trim();
        const parsed = parseQuantity(item.quantity);
        const existing = itemMap.get(key);
        
        if (existing) {
          // Add quantity to existing item
          if (parsed) {
            existing.quantities.push(parsed);
          }
        } else {
          // Create new entry
          itemMap.set(key, {
            name: item.name,
            quantities: parsed ? [parsed] : [],
            category: item.category,
          });
        }
      });

      // Aggregate quantities and add items to new list
      for (const [key, itemData] of itemMap.entries()) {
        if (itemData.quantities.length === 0) {
          // Can't parse quantity, use original
          const originalItem = allItems.find(item => item.name.toLowerCase().trim() === key);
          if (originalItem) {
            await shoppingListApi.addItem(newListId, {
              name: itemData.name,
              quantity: originalItem.quantity,
              category: itemData.category,
            });
          }
        } else {
          // Group by unit and sum
          const unitMap = new Map<string, number>();
          itemData.quantities.forEach(qty => {
            unitMap.set(qty.unit, (unitMap.get(qty.unit) || 0) + qty.amount);
          });
          
          // Use the most common unit (or first if tied)
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
      setShowMergeModal(false);
      setSelectedListsForMerge(new Set());
      setMergeName('Weekly Shopping');
      HapticPatterns.success();
      Alert.alert('Success', 'Lists merged successfully!');
    } catch (error: any) {
      console.error('Error merging lists:', error);
      Alert.alert('Error', 'Failed to merge lists');
    } finally {
      setMergingLists(false);
    }
  };

  const handleEditName = () => {
    if (!selectedList) return;
    setEditingListName(selectedList.name);
    setShowEditNameModal(true);
  };

  const handleSaveName = async () => {
    if (!selectedList || !editingListName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    setUpdatingName(true);
    try {
      await shoppingListApi.updateShoppingList(selectedList.id, {
        name: editingListName.trim(),
      });
      await loadShoppingLists();
      await loadShoppingListDetails(selectedList.id);
      setShowEditNameModal(false);
      HapticPatterns.success();
    } catch (error: any) {
      console.error('Error updating list name:', error);
      Alert.alert('Error', 'Failed to update list name');
    } finally {
      setUpdatingName(false);
    }
  };

  const loadSupportedApps = async () => {
    try {
      const response = await shoppingAppApi.getSupportedApps();
      setSupportedApps(response.data);
    } catch (error: any) {
      console.error('Error loading supported apps:', error);
    }
  };

  const loadIntegrations = async () => {
    try {
      const response = await shoppingAppApi.getIntegrations();
      setIntegrations(response.data);
    } catch (error: any) {
      console.error('Error loading integrations:', error);
    }
  };


  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadShoppingLists();
    await loadIntegrations();
    if (selectedList) {
      await loadShoppingListDetails(selectedList.id);
    }
    setRefreshing(false);
  }, [selectedList, loadShoppingLists, loadIntegrations]);


  const handleCreateList = () => {
    // Navigate to the create shopping list screen
    router.push('/create-shopping-list');
  };

  const handleSaveNewList = async () => {
    if (!newListName.trim()) {
      Alert.alert('Error', 'Please enter a name for your shopping list');
      return;
    }

    setCreatingList(true);
    try {
      await shoppingListApi.createShoppingList({ name: newListName.trim() });
      await loadShoppingLists();
      setShowCreateListModal(false);
      setNewListName('');
      HapticPatterns.success();
    } catch (error: any) {
      console.error('Error creating shopping list:', error);
      Alert.alert('Error', 'Failed to create shopping list');
    } finally {
      setCreatingList(false);
    }
  };

  const handleDeleteList = async () => {
    if (!selectedList) return;

    Alert.alert(
      'Delete Shopping List',
      `Are you sure you want to delete "${selectedList.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await shoppingListApi.deleteShoppingList(selectedList.id);
              setSelectedList(null);
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
  };

  // Auto-categorize items based on name
  const categorizeItem = useCallback((itemName: string): string | undefined => {
    const name = itemName.toLowerCase().trim();
    
    // Produce / Fruits & Vegetables
    const produceKeywords = [
      'apple', 'banana', 'orange', 'grape', 'strawberry', 'berry', 'peach', 'pear', 'plum',
      'lettuce', 'spinach', 'kale', 'cabbage', 'broccoli', 'cauliflower', 'carrot', 'celery',
      'onion', 'garlic', 'pepper', 'tomato', 'cucumber', 'zucchini', 'potato', 'sweet potato',
      'avocado', 'mushroom', 'corn', 'pea', 'bean', 'asparagus', 'artichoke', 'beet', 'radish'
    ];
    
    // Meat & Seafood
    const meatKeywords = [
      'chicken', 'beef', 'pork', 'turkey', 'lamb', 'bacon', 'sausage', 'ham', 'steak',
      'fish', 'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'scallop', 'tilapia', 'cod',
      'ground beef', 'ground turkey', 'chicken breast', 'chicken thigh', 'ribs'
    ];
    
    // Dairy
    const dairyKeywords = [
      'milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream', 'cottage cheese',
      'mozzarella', 'cheddar', 'parmesan', 'swiss', 'feta', 'ricotta', 'greek yogurt'
    ];
    
    // Bakery
    const bakeryKeywords = [
      'bread', 'bagel', 'muffin', 'croissant', 'roll', 'bun', 'pita', 'tortilla',
      'cake', 'cookie', 'brownie', 'donut', 'pastry', 'pie crust'
    ];
    
    // Pantry / Dry Goods
    const pantryKeywords = [
      'rice', 'pasta', 'noodle', 'flour', 'sugar', 'salt', 'pepper', 'spice', 'herb',
      'oil', 'vinegar', 'soy sauce', 'baking powder', 'baking soda', 'yeast',
      'cereal', 'oatmeal', 'quinoa', 'couscous', 'barley', 'lentil', 'chickpea',
      'canned', 'soup', 'broth', 'stock', 'sauce', 'paste', 'jam', 'jelly'
    ];
    
    // Beverages
    const beverageKeywords = [
      'juice', 'soda', 'water', 'coffee', 'tea', 'beer', 'wine', 'smoothie',
      'lemonade', 'sports drink', 'energy drink', 'sparkling'
    ];
    
    // Frozen
    const frozenKeywords = [
      'frozen', 'ice cream', 'frozen vegetable', 'frozen fruit', 'frozen meal'
    ];
    
    // Snacks
    const snackKeywords = [
      'chip', 'cracker', 'pretzel', 'popcorn', 'nut', 'seed', 'trail mix', 'granola bar',
      'candy', 'chocolate', 'snack', 'dip', 'salsa', 'hummus'
    ];
    
    // Check categories in order of specificity
    if (frozenKeywords.some(keyword => name.includes(keyword))) {
      return 'Frozen';
    }
    if (produceKeywords.some(keyword => name.includes(keyword))) {
      return 'Produce';
    }
    if (meatKeywords.some(keyword => name.includes(keyword))) {
      return 'Meat & Seafood';
    }
    if (dairyKeywords.some(keyword => name.includes(keyword))) {
      return 'Dairy';
    }
    if (bakeryKeywords.some(keyword => name.includes(keyword))) {
      return 'Bakery';
    }
    if (beverageKeywords.some(keyword => name.includes(keyword))) {
      return 'Beverages';
    }
    if (snackKeywords.some(keyword => name.includes(keyword))) {
      return 'Snacks';
    }
    if (pantryKeywords.some(keyword => name.includes(keyword))) {
      return 'Pantry';
    }
    
    return undefined; // No category found
  }, []);

  // Get quantity suggestions based on meal plan recipes
  const getQuantitySuggestions = useCallback(async (itemName: string) => {
    if (!itemName.trim()) {
      setQuantitySuggestions([]);
      return;
    }

    try {
      // Get current weekly meal plan
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      
      const weeklyPlanResponse = await mealPlanApi.getWeeklyPlan({
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0],
      });
      
      const weeklyPlan = weeklyPlanResponse.data;
      if (!weeklyPlan?.weeklyPlan) {
        setQuantitySuggestions([]);
        return;
      }

      const suggestions = new Set<string>();
      const itemNameLower = itemName.toLowerCase().trim();
      
      // Search through all meals in the weekly plan
      Object.values(weeklyPlan.weeklyPlan).forEach((day: any) => {
        if (day.meals) {
          // Check breakfast, lunch, dinner
          ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
            const meal = day.meals[mealType];
            if (meal?.recipe?.ingredients) {
              meal.recipe.ingredients.forEach((ingredient: any) => {
                const ingText = typeof ingredient === 'string' ? ingredient : ingredient.text;
                if (ingText.toLowerCase().includes(itemNameLower) || itemNameLower.includes(ingText.toLowerCase().split(' ')[0])) {
                  // Extract quantity from ingredient text
                  const qtyMatch = ingText.match(/^([\d\s\/\.]+(?:\s+(cup|cups|lb|lbs|oz|tbsp|tsp|piece|pieces|clove|cloves|bunch|bunches|fl\s*oz|pint|pints|quart|quarts|gallon|gallons|ml|l|liter|liters|g|gram|grams|kg|kilogram|kilograms))?)/i);
                  if (qtyMatch) {
                    suggestions.add(qtyMatch[1].trim());
                  }
                }
              });
            }
          });
          
          // Check snacks array
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
      
      setQuantitySuggestions(Array.from(suggestions).slice(0, 3)); // Limit to 3 suggestions
    } catch (error) {
      console.error('Error getting quantity suggestions:', error);
      setQuantitySuggestions([]);
    }
  }, []);

  // Update quantity suggestions when item name changes
  useEffect(() => {
    if (showAddItemModal && newItemName) {
      const timeoutId = setTimeout(() => {
        getQuantitySuggestions(newItemName);
      }, 500); // Debounce by 500ms
      
      return () => clearTimeout(timeoutId);
    } else {
      setQuantitySuggestions([]);
    }
  }, [newItemName, showAddItemModal, getQuantitySuggestions]);

  const handleAddItem = async () => {
    if (!selectedList || !newItemName.trim() || !newItemQuantity.trim()) {
      Alert.alert('Error', 'Please enter item name and quantity');
      return;
    }

    // Check for duplicates
    const itemNameLower = newItemName.trim().toLowerCase();
    const existingItem = currentItems.find(
      item => item.name.toLowerCase().trim() === itemNameLower
    );

    if (existingItem) {
      // Show confirmation dialog for duplicate
      Alert.alert(
        'Item Already Exists',
        `"${existingItem.name}" is already in your list with quantity "${existingItem.quantity}". Would you like to add it anyway?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Add Anyway',
            onPress: async () => {
              try {
                const category = categorizeItem(newItemName);
                await shoppingListApi.addItem(selectedList.id, {
                  name: newItemName.trim(),
                  quantity: newItemQuantity.trim(),
                  category: category,
                });
                
                setNewItemName('');
                setNewItemQuantity('');
                setQuantitySuggestions([]);
                setShowAddItemModal(false);
                await loadShoppingListDetails(selectedList.id);
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
      const category = categorizeItem(newItemName);
      await shoppingListApi.addItem(selectedList.id, {
        name: newItemName.trim(),
        quantity: newItemQuantity.trim(),
        category: category,
      });
      
      setNewItemName('');
      setNewItemQuantity('');
      setQuantitySuggestions([]);
      setShowAddItemModal(false);
      await loadShoppingListDetails(selectedList.id);
      HapticPatterns.success();
    } catch (error: any) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to add item');
    }
  };

  const handleGenerateFromMealPlan = async () => {
    if (!selectedList) {
      Alert.alert('Error', 'Please select a shopping list first');
      return;
    }

    setGeneratingFromMealPlan(true);
    try {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      await shoppingListApi.generateFromMealPlan({
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0],
        name: selectedList.name,
      });

      await loadShoppingListDetails(selectedList.id);
      HapticPatterns.success();
    } catch (error: any) {
      console.error('Error generating from meal plan:', error);
      Alert.alert('Error', 'Failed to generate shopping list from meal plan');
      HapticPatterns.error();
    } finally {
      setGeneratingFromMealPlan(false);
    }
  };
  
  const handleFABPress = () => {
    if (!selectedList) {
      Alert.alert('Error', 'Please select a shopping list first');
      return;
    }
    
    // Animate FAB
    Animated.sequence([
      Animated.timing(fabRotation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fabRotation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    
    Animated.sequence([
      Animated.spring(fabScale, {
        toValue: 0.9,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(fabScale, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    
    HapticPatterns.buttonPressPrimary();
    setShowAddItemModal(true);
  };


  const handleTogglePurchased = async (item: ShoppingListItem) => {
    if (!selectedList) return;

    // Clear undo button if user manually toggles an item
    if (showUndoButton) {
      setShowUndoButton(false);
      setPreviousPurchasedState(new Map());
    }

    try {
      // Update optimistically for immediate UI feedback
      const updatedItems = currentItems.map(i => 
        i.id === item.id ? { ...i, purchased: !i.purchased } : i
      );
      setSelectedList({ ...selectedList, items: updatedItems });

      await shoppingListApi.updateItem(selectedList.id, item.id, {
        purchased: !item.purchased,
      });
      // Reload to ensure sync with backend
      await loadShoppingListDetails(selectedList.id);
      HapticPatterns.success();
    } catch (error: any) {
      console.error('Error updating item:', error);
      // Revert on error
      await loadShoppingListDetails(selectedList.id);
      Alert.alert('Error', 'Failed to update item');
    }
  };

  const handleEditQuantity = (item: ShoppingListItem) => {
    setSelectedItem(item);
    setEditingQuantity(item.quantity || '');
    setShowEditQuantityModal(true);
  };

  const handleSaveQuantity = async () => {
    if (!selectedList || !selectedItem) return;

    setUpdatingQuantity(true);
    try {
      await shoppingListApi.updateItem(selectedList.id, selectedItem.id, {
        quantity: editingQuantity.trim() || undefined,
      });
      await loadShoppingListDetails(selectedList.id);
      setShowEditQuantityModal(false);
      setEditingQuantity('');
      setSelectedItem(null);
      HapticPatterns.success();
    } catch (error: any) {
      console.error('Error updating quantity:', error);
      Alert.alert('Error', 'Failed to update quantity');
    } finally {
      setUpdatingQuantity(false);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
    HapticPatterns.buttonPress();
  };

  const handleMarkSelectedComplete = async () => {
    if (!selectedList || selectedItems.size === 0) return;

    setBulkUpdating(true);
    try {
      // Update optimistically
      const updatedItems = currentItems.map(item =>
        selectedItems.has(item.id) ? { ...item, purchased: true } : item
      );
      setSelectedList({ ...selectedList, items: updatedItems });

      // Batch update all selected items in a single API call
      await shoppingListApi.batchUpdateItems(
        selectedList.id,
        Array.from(selectedItems).map(itemId => ({ itemId, purchased: true }))
      );

      await loadShoppingListDetails(selectedList.id);
      setSelectedItems(new Set());
      setSelectionMode(false);
      HapticPatterns.success();
    } catch (error: any) {
      console.error('Error marking items as complete:', error);
      await loadShoppingListDetails(selectedList.id);
      Alert.alert('Error', 'Failed to mark items as complete');
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleMarkAllComplete = async () => {
    if (!selectedList || currentItems.length === 0) return;

    const unpurchasedItems = currentItems.filter(item => !item.purchased);
    if (unpurchasedItems.length === 0) return;

    // Store previous state for undo
    const previousState = new Map<string, boolean>();
    currentItems.forEach(item => {
      previousState.set(item.id, item.purchased);
    });
    setPreviousPurchasedState(previousState);
    setShowUndoButton(true);

    setBulkUpdating(true);
    try {
      // Update optimistically
      const updatedItems = currentItems.map(item => ({ ...item, purchased: true }));
      setSelectedList({ ...selectedList, items: updatedItems });

      // Batch update all unpurchased items in a single API call
      const response = await shoppingListApi.batchUpdateItems(
        selectedList.id,
        unpurchasedItems.map(item => ({ itemId: item.id, purchased: true }))
      );

      // If some items failed to update (e.g., deleted), reload to sync state
      if (response.data?.updated !== undefined && response.data.updated < unpurchasedItems.length) {
        console.log(`[SHOPPING_LIST] Some items failed to update. Expected: ${unpurchasedItems.length}, Updated: ${response.data.updated}`);
        await loadShoppingListDetails(selectedList.id);
      }

      // No need to reload - we already updated optimistically and undo state is preserved
      setSelectedItems(new Set());
      setSelectionMode(false);
      HapticPatterns.success();
    } catch (error: any) {
      console.error('Error marking all as complete:', error);
      // If it's a 404 error, some items may have been deleted - reload to sync
      if (error.code === 'HTTP_404' || error.message?.includes('not found')) {
        console.log('[SHOPPING_LIST] Some items not found, reloading list to sync state');
        await loadShoppingListDetails(selectedList.id);
      } else {
        // For other errors, reload to ensure sync
        await loadShoppingListDetails(selectedList.id);
      }
      setShowUndoButton(false);
      setPreviousPurchasedState(new Map());
      // Don't show alert for 404s - items may have been deleted, which is fine
      if (error.code !== 'HTTP_404') {
        Alert.alert('Error', 'Failed to mark all items as complete');
      }
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleUndoMarkAllComplete = async () => {
    if (!selectedList || previousPurchasedState.size === 0) return;

    setBulkUpdating(true);
    try {
      // Restore previous state optimistically
      const updatedItems = currentItems.map(item => ({
        ...item,
        purchased: previousPurchasedState.get(item.id) ?? item.purchased
      }));
      setSelectedList({ ...selectedList, items: updatedItems });

      // Update items that changed back to their previous state
      const itemsToRevert = currentItems.filter(item => {
        const previousState = previousPurchasedState.get(item.id);
        return previousState !== undefined && previousState !== item.purchased;
      });

      // Batch update items to their previous state in a single API call
      await shoppingListApi.batchUpdateItems(
        selectedList.id,
        itemsToRevert.map(item => {
          const previousState = previousPurchasedState.get(item.id);
          return { itemId: item.id, purchased: previousState ?? false };
        })
      );

      // Clear undo state - no need to reload since we already updated optimistically
      setShowUndoButton(false);
      setPreviousPurchasedState(new Map());
      HapticPatterns.success();
    } catch (error: any) {
      console.error('Error undoing mark all complete:', error);
      // Revert optimistic update on error
      const response = await shoppingListApi.getShoppingList(selectedList.id);
      setSelectedList(response.data);
      setShowUndoButton(false);
      setPreviousPurchasedState(new Map());
      Alert.alert('Error', 'Failed to undo mark all complete');
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleDeleteItem = async (item: ShoppingListItem) => {
    if (!selectedList) return;

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
              await shoppingListApi.deleteItem(selectedList.id, item.id);
              await loadShoppingListDetails(selectedList.id);
              HapticPatterns.success();
            } catch (error: any) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  // Render a shopping list item
  const renderShoppingListItem = (item: ShoppingListItem) => (
    <View className={`flex-row items-center justify-between p-4 rounded-xl mb-3 ${
      item.purchased ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-800'
    } ${selectionMode && selectedItems.has(item.id) ? 'border-2' : ''} ${!item.purchased ? 'border border-gray-200 dark:border-gray-700' : ''}`}
    style={selectionMode && selectedItems.has(item.id) ? {
      borderColor: isDark ? DarkColors.primary : Colors.primary,
      backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight,
    } : item.purchased ? {
      opacity: 0.6,
    } : undefined}
    >
      <HapticTouchableOpacity
        onPress={() => {
          if (selectionMode) {
            toggleItemSelection(item.id);
          } else {
            handleTogglePurchased(item);
          }
        }}
        onLongPress={() => {
          if (!selectionMode) {
            setSelectionMode(true);
            setSelectedItems(new Set([item.id]));
            HapticPatterns.buttonPressPrimary();
          }
        }}
        className="flex-1 flex-row items-center"
      >
        {selectionMode ? (
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              borderWidth: 2,
              borderColor: selectedItems.has(item.id) 
                ? (isDark ? DarkColors.primary : Colors.primary)
                : '#D1D5DB',
              backgroundColor: selectedItems.has(item.id)
                ? (isDark ? DarkColors.primary : Colors.primary)
                : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {selectedItems.has(item.id) && (
              <Icon
                name={Icons.CHECKMARK}
                size={18}
                color="white"
                accessibilityLabel="Selected"
              />
            )}
          </View>
        ) : (
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              borderWidth: 2.5,
              borderColor: item.purchased
                ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
                : '#D1D5DB',
              backgroundColor: item.purchased
                ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
                : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {item.purchased && (
              <Icon
                name={Icons.CHECKMARK}
                size={18}
                color="white"
                accessibilityLabel="Purchased"
              />
            )}
          </View>
        )}
        <View className="ml-4 flex-1">
          <Text
            className={`text-base font-semibold ${
              item.purchased
                ? 'text-gray-500 dark:text-gray-400 line-through'
                : 'text-gray-900 dark:text-gray-100'
            }`}
          >
            {item.name}
          </Text>
          {item.quantity && (
            <Text className={`text-sm mt-1 ${
              item.purchased
                ? 'text-gray-500 dark:text-gray-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {item.quantity}
            </Text>
          )}
          {item.recipe && !groupByRecipe && (
            <HapticTouchableOpacity
              onPress={() => router.push(`/recipe/${item.recipeId}`)}
              className="flex-row items-center mt-1"
            >
              <Icon name={Icons.RESTAURANT_OUTLINE} size={12} color={isDark ? DarkColors.primary : Colors.primary} accessibilityLabel="View recipe" style={{ marginRight: 4 }} />
              <Text className="text-xs" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
                {item.recipe.title}
              </Text>
            </HapticTouchableOpacity>
          )}
        </View>
      </HapticTouchableOpacity>
      {!selectionMode && (
        <HapticTouchableOpacity
          onPress={() => handleEditQuantity(item)}
          className="p-2 ml-2"
        >
          <Icon
            name={Icons.EDIT_OUTLINE}
            size={IconSizes.MD}
            color={isDark ? "#9CA3AF" : "#6B7280"}
            accessibilityLabel="Edit quantity"
          />
        </HapticTouchableOpacity>
      )}
    </View>
  );

  const handleSyncToApp = async (appName: string) => {
    if (!selectedList) {
      Alert.alert('Error', 'Please select a shopping list');
      return;
    }

    try {
      const response = await shoppingAppApi.syncToExternalApp(appName, selectedList.id);
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
  };

  const handleSyncBidirectional = async () => {
    if (!selectedList || integrations.length === 0) return;

    try {
      HapticPatterns.buttonPressPrimary();
      
      // Sync to all connected apps
      const syncPromises = integrations.map(integration =>
        shoppingAppApi.syncBidirectional(integration.appName, selectedList.id)
      );

      const results = await Promise.allSettled(syncPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      HapticPatterns.success();
      Alert.alert(
        '✅ Sync Complete',
        `Synced to ${successful} of ${integrations.length} shopping app(s)`
      );
    } catch (error: any) {
      console.error('Error syncing bidirectionally:', error);
      HapticPatterns.error();
      Alert.alert('Sync Failed', 'Failed to sync shopping list');
    }
  };

  // Get items from selected list - memoized to prevent re-computation
  const currentItems = useMemo(() => {
    return selectedList?.items || [];
  }, [selectedList?.items]);

  // Filter items based on hidePurchased state
  const visibleItems = useMemo(() => {
    if (hidePurchased) {
      return currentItems.filter(item => !item.purchased);
    }
    return currentItems;
  }, [currentItems, hidePurchased]);

  // Group items by recipe (using visibleItems)
  const itemsByRecipe = useMemo(() => {
    if (!groupByRecipe) return null;
    
    const grouped: { [recipeId: string]: { recipe: any; items: ShoppingListItem[] } } = {};
    const noRecipe: ShoppingListItem[] = [];
    
    visibleItems.forEach(item => {
      if (item.recipeId && item.recipe) {
        if (!grouped[item.recipeId]) {
          grouped[item.recipeId] = {
            recipe: item.recipe,
            items: [],
          };
        }
        grouped[item.recipeId].items.push(item);
      } else {
        noRecipe.push(item);
      }
    });
    
    return { grouped, noRecipe };
  }, [visibleItems, groupByRecipe]);

  // Calculate progress stats
  const progressStats = useMemo(() => {
    const total = currentItems.length;
    const purchased = currentItems.filter(item => item.purchased).length;
    const progress = total > 0 ? (purchased / total) * 100 : 0;
    return { total, purchased, progress };
  }, [currentItems]);

  // Simple cost estimation based on common ingredient prices
  const estimateItemCost = useCallback((itemName: string, quantity: string): number => {
    const name = itemName.toLowerCase();
    const qtyText = quantity.toLowerCase();
    
    // Extract numeric quantity
    const qtyMatch = qtyText.match(/(\d+(?:\.\d+)?)/);
    const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 1;
    
    // Common ingredient price estimates (per unit)
    const priceMap: Record<string, number> = {
      'chicken': 5.99, 'beef': 8.99, 'pork': 6.99, 'fish': 9.99, 'salmon': 12.99,
      'milk': 3.49, 'cheese': 4.99, 'yogurt': 4.49, 'butter': 4.99, 'eggs': 3.99,
      'bread': 3.49, 'flour': 4.99, 'sugar': 3.99, 'rice': 5.99, 'pasta': 2.99,
      'tomato': 2.99, 'onion': 1.99, 'garlic': 2.49, 'potato': 3.99, 'carrot': 2.49,
      'lettuce': 2.99, 'spinach': 3.99, 'broccoli': 3.49, 'pepper': 2.99,
      'apple': 4.99, 'banana': 1.99, 'orange': 4.99, 'strawberry': 5.99,
      'oil': 6.99, 'vinegar': 3.99, 'salt': 1.99, 'pepper': 4.99, 'spice': 4.99,
    };
    
    // Try to match ingredient name
    for (const [key, price] of Object.entries(priceMap)) {
      if (name.includes(key) || key.includes(name.split(' ')[0])) {
        return price * qty;
      }
    }
    
    // Default estimate: $3-5 per item
    return 4 * qty;
  }, []);

  // Calculate estimated total cost
  const estimatedCost = useMemo(() => {
    if (!currentItems.length) return 0;
    
    const unpurchasedItems = currentItems.filter(item => !item.purchased);
    const total = unpurchasedItems.reduce((sum, item) => {
      return sum + estimateItemCost(item.name, item.quantity || '1');
    }, 0);
    
    return total;
  }, [currentItems, estimateItemCost]);

  // Swipe gesture to toggle hidePurchased
  const toggleHidePurchased = useCallback(() => {
    setHidePurchased(prev => !prev);
    HapticPatterns.buttonPress();
  }, []);

  // Swipe gesture to collapse/expand header
  const toggleHeaderCollapsed = useCallback(() => {
    setHeaderCollapsed(prev => !prev);
    HapticPatterns.buttonPress();
  }, []);

  const panGesture = Gesture.Pan()
    .onEnd((event) => {
      const horizontalThreshold = 80;
      const verticalThreshold = 50;
      
      // Check for horizontal swipe (hide purchased)
      if (Math.abs(event.translationX) > horizontalThreshold && Math.abs(event.translationX) > Math.abs(event.translationY)) {
        if (event.translationX < 0) {
          // Swipe left - hide purchased
          if (!hidePurchased && currentItems.some(item => item.purchased)) {
            runOnJS(toggleHidePurchased)();
          }
        } else {
          // Swipe right - show purchased
          if (hidePurchased) {
            runOnJS(toggleHidePurchased)();
          }
        }
      }
      // Check for vertical swipe (collapse header)
      else if (Math.abs(event.translationY) > verticalThreshold && Math.abs(event.translationY) > Math.abs(event.translationX)) {
        if (event.translationY > 0) {
          // Swipe down - collapse header
          if (!headerCollapsed) {
            runOnJS(toggleHeaderCollapsed)();
          }
        } else {
          // Swipe up - expand header
          if (headerCollapsed) {
            runOnJS(toggleHeaderCollapsed)();
          }
        }
      }
    });

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
        <LoadingState config={ShoppingListLoadingStates.lists} fullScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 pt-4 pb-4 border-b border-gray-200 dark:border-gray-700" style={{ minHeight: 56 }}>
        <View className="flex-row items-center justify-between" style={{ height: 28 }}>
          <View className="flex-row items-center flex-1">
            <Text className="text-2xl mr-2" style={{ lineHeight: 28 }}>🛒</Text>
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100" accessibilityRole="header" style={{ lineHeight: 28 }}>Shopping Lists</Text>
          </View>
        </View>
      </View>

      {/* List Selector and Actions */}
      <View className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <HapticTouchableOpacity
            onPress={() => setShowListPicker(true)}
            className="flex-1 flex-row items-center justify-between bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3"
          >
            <View className="flex-1 flex-row items-center">
              <Icon name={Icons.SHOPPING_LIST_OUTLINE} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Shopping list" style={{ marginRight: 8 }} />
              <Text className="text-gray-900 dark:text-gray-100 font-semibold flex-1" numberOfLines={1}>
                {selectedList?.name || 'Select a list'}
              </Text>
            </View>
            <Icon name={Icons.CHEVRON_DOWN} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Open dropdown" />
          </HapticTouchableOpacity>
          
          {selectedList && (
            <>
              <HapticTouchableOpacity
                onPress={handleEditName}
                className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
              >
                <Icon name={Icons.EDIT_OUTLINE} size={IconSizes.MD} color={isDark ? "white" : "#6B7280"} accessibilityLabel="Edit list name" />
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={handleDeleteList}
                className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
              >
                <Icon name={Icons.DELETE_OUTLINE} size={IconSizes.MD} color={isDark ? DarkColors.secondaryRed : Colors.secondaryRed} accessibilityLabel="Delete list" />
              </HapticTouchableOpacity>
            </>
          )}
          
          {shoppingLists.length > 1 && (
            <HapticTouchableOpacity
              onPress={() => setShowMergeModal(true)}
              className="p-3 rounded-lg"
              style={{ backgroundColor: isDark ? `${Colors.tertiaryGreenLight}33` : Colors.tertiaryGreenLight }}
            >
              <Icon name={Icons.MERGE_LISTS_OUTLINE} size={IconSizes.MD} color={isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen} accessibilityLabel="Merge lists" />
            </HapticTouchableOpacity>
          )}
          
          <HapticTouchableOpacity
            onPress={() => {
              HapticPatterns.buttonPressPrimary();
              handleCreateList();
            }}
            className="p-3 rounded-lg"
            style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
          >
            <Icon name={Icons.ADD} size={IconSizes.MD} color="white" accessibilityLabel="Create new list" />
          </HapticTouchableOpacity>
        </View>
      </View>

      {selectedList && (
        <View className="flex-1">
          {/* Collapsible Header Content */}
          <Animated.View
            style={{
              maxHeight: headerHeight.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 2000], // Large enough to accommodate all content
              }),
              overflow: 'hidden',
              opacity: headerHeight,
            }}
          >
            {/* Progress Indicator */}
            {currentItems.length > 0 && (
              <View className="mx-4 mt-4 mb-2">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {progressStats.purchased} of {progressStats.total} items purchased
                </Text>
                <Text className="text-sm font-semibold" style={{ color: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}>
                  {Math.round(progressStats.progress)}%
                </Text>
              </View>
              <AnimatedProgressBar
                progress={progressStats.progress}
                height={8}
                backgroundColor={isDark ? '#374151' : '#E5E7EB'}
                progressColor={isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen}
                borderRadius={999}
              />
            </View>
          )}

          {/* Estimated Total Cost */}
          {currentItems.length > 0 && estimatedCost > 0 && (
            <View className="mx-4 mb-4">
              <View className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Icon name={Icons.CART_OUTLINE} size={IconSizes.MD} color={isDark ? DarkColors.accent : Colors.accent} accessibilityLabel="Estimated cost" style={{ marginRight: 8 }} />
                    <View>
                      <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">Estimated Total</Text>
                      <Text className="text-2xl font-bold" style={{ color: isDark ? DarkColors.accent : Colors.accent }}>
                        ${estimatedCost.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs text-gray-500 dark:text-gray-400 italic">
                    {currentItems.filter(item => !item.purchased).length} items
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Hide Purchased Toggle */}
          {!selectionMode && currentItems.length > 0 && currentItems.some(item => item.purchased) && (
            <View className="mx-4 mb-3">
              <HapticTouchableOpacity
                onPress={toggleHidePurchased}
                className="flex-row items-center justify-between p-3 rounded-lg border"
                style={{
                  backgroundColor: isDark ? (hidePurchased ? DarkColors.tertiaryGreenLight : '#1F2937') : (hidePurchased ? Colors.tertiaryGreenLight : '#F3F4F6'),
                  borderColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen,
                }}
              >
                <View className="flex-row items-center">
                  <Icon 
                    name={hidePurchased ? Icons.EYE_OFF_OUTLINE : Icons.EYE_OUTLINE} 
                    size={IconSizes.SM} 
                    color={isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen} 
                    accessibilityLabel="Toggle purchased items" 
                    style={{ marginRight: 8 }} 
                  />
                  <Text className="text-sm font-semibold" style={{ color: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}>
                    {hidePurchased ? 'Show Purchased Items' : 'Hide Purchased Items'}
                  </Text>
                </View>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {currentItems.filter(item => item.purchased).length} hidden
                </Text>
              </HapticTouchableOpacity>
            </View>
          )}

          {/* Group by Recipe Toggle */}
          {!selectionMode && currentItems.length > 0 && currentItems.some(item => item.recipeId) && (
            <View className="mx-4 mb-3">
              <HapticTouchableOpacity
                onPress={() => setGroupByRecipe(!groupByRecipe)}
                className="flex-row items-center justify-between p-3 rounded-lg border"
                style={{
                  backgroundColor: isDark ? DarkColors.primaryLight : Colors.primaryLight,
                  borderColor: isDark ? DarkColors.primary : Colors.primary,
                }}
              >
                <View className="flex-row items-center">
                  <Icon name={Icons.EMPTY_RECIPES} size={IconSizes.SM} color={isDark ? DarkColors.primary : Colors.primary} accessibilityLabel="Group by recipe" style={{ marginRight: 8 }} />
                  <Text className="text-sm font-semibold" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
                    Group by Recipe
                  </Text>
                </View>
                <View
                  style={{
                    width: 48,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: groupByRecipe
                      ? (isDark ? DarkColors.primary : Colors.primary)
                      : (isDark ? '#374151' : '#D1D5DB'),
                    alignItems: groupByRecipe ? 'flex-end' : 'flex-start',
                    justifyContent: 'center',
                    paddingHorizontal: Spacing.xs,
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: 'white',
                    }}
                  />
                </View>
              </HapticTouchableOpacity>
            </View>
          )}

          {/* Quick Add Suggestions */}
          {!selectionMode && quickSuggestions.length > 0 && (
            <View className="mx-4 mb-4">
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Quick Add</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 16 }}
              >
                <View className="flex-row" style={{ gap: 8 }}>
                  {quickSuggestions.map((suggestion, index) => (
                    <HapticTouchableOpacity
                      key={`${suggestion}-${index}`}
                      onPress={async () => {
                        if (!selectedList) return;
                        
                        try {
                          // Check for duplicates
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
                          await shoppingListApi.addItem(selectedList.id, {
                            name: suggestion,
                            quantity: '1',
                            category: category,
                          });
                          
                          HapticPatterns.success();
                          
                          // Reload list and suggestions
                          await loadShoppingListDetails(selectedList.id);
                          loadQuickSuggestions();
                        } catch (error) {
                          console.error('Error adding quick suggestion:', error);
                          HapticPatterns.error();
                        }
                      }}
                      className="px-4 py-2 rounded-full border"
                      style={{
                        backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryDark,
                        borderColor: isDark ? DarkColors.primary : Colors.primaryDark,
                      }}
                    >
                      <Text 
                        className="text-sm font-medium"
                        style={{ color: isDark ? DarkColors.primary : '#FFFFFF' }}
                      >
                        {suggestion}
                      </Text>
                    </HapticTouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Selection Mode Actions */}
          {selectionMode && currentItems.length > 0 && (
            <View className="mx-4 mt-4 mb-2 flex-row" style={{ gap: 8 }}>
              <HapticTouchableOpacity
                onPress={() => {
                  setSelectionMode(false);
                  setSelectedItems(new Set());
                }}
                className="flex-1 py-3 px-4 rounded-lg"
                style={{ backgroundColor: isDark ? '#374151' : '#E5E7EB' }}
              >
                <Text className="text-center font-semibold text-gray-700 dark:text-gray-100">Cancel</Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={handleMarkSelectedComplete}
                disabled={selectedItems.size === 0 || bulkUpdating}
                className={`flex-1 py-3 px-4 rounded-lg ${selectedItems.size === 0 || bulkUpdating ? 'opacity-50' : ''}`}
                style={{ backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}
              >
                <Text className="text-center font-semibold text-white">
                  {bulkUpdating ? 'Updating...' : `Mark ${selectedItems.size} Complete`}
                </Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={handleMarkAllComplete}
                disabled={bulkUpdating || currentItems.every(item => item.purchased)}
                className={`flex-1 py-3 px-4 rounded-lg ${bulkUpdating || currentItems.every(item => item.purchased) ? 'opacity-50' : ''}`}
                style={{ backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}
              >
                <Text className="text-center font-semibold text-white">
                  {bulkUpdating ? 'Updating...' : 'Mark All Complete'}
                </Text>
              </HapticTouchableOpacity>
            </View>
          )}

            {/* Add Item Button - When list has items and not in selection mode */}
            {currentItems.length > 0 && !selectionMode && (
              <View className="mx-4 mt-4">
                <HapticTouchableOpacity
                  onPress={handleFABPress}
                  className="py-3 px-4 rounded-lg flex-row items-center justify-center shadow-sm"
                  style={{
                    backgroundColor: isDark ? DarkColors.accent : Colors.accent,
                  }}
                >
                  <Animated.View
                    style={{
                      transform: [
                        { scale: fabScale },
                        {
                          rotate: fabRotation.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '45deg'],
                          }),
                        },
                      ],
                    }}
                  >
                    <Icon name={Icons.ADD} size={IconSizes.MD} color="white" accessibilityLabel="Add item" style={{ marginRight: 8 }} />
                  </Animated.View>
                  <Text className="text-white font-semibold">Add Item</Text>
                </HapticTouchableOpacity>
                
                {/* Mark All Complete / Undo Button */}
                {showUndoButton ? (
                  <HapticTouchableOpacity
                    onPress={handleUndoMarkAllComplete}
                    disabled={bulkUpdating}
                    className={`py-3 px-4 rounded-lg flex-row items-center justify-center shadow-sm mt-2 ${bulkUpdating ? 'opacity-50' : ''}`}
                    style={{
                      backgroundColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed,
                    }}
                  >
                    <Icon name={Icons.CLOSE} size={IconSizes.MD} color="white" accessibilityLabel="Undo mark all complete" style={{ marginRight: 8 }} />
                    <Text className="text-white font-semibold">
                      {bulkUpdating ? 'Reverting...' : 'Undo Mark All Complete'}
                    </Text>
                  </HapticTouchableOpacity>
                ) : (
                  !currentItems.every(item => item.purchased) && (
                    <HapticTouchableOpacity
                      onPress={handleMarkAllComplete}
                      disabled={bulkUpdating}
                      className={`py-3 px-4 rounded-lg flex-row items-center justify-center shadow-sm mt-2 ${bulkUpdating ? 'opacity-50' : ''}`}
                      style={{
                        backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen,
                      }}
                    >
                      <Icon name={Icons.CHECKMARK_CIRCLE} size={IconSizes.MD} color="white" accessibilityLabel="Mark all complete" style={{ marginRight: 8 }} />
                      <Text className="text-white font-semibold">
                        {bulkUpdating ? 'Updating...' : 'Mark All Complete'}
                      </Text>
                    </HapticTouchableOpacity>
                  )
                )}
              </View>
            )}
          </Animated.View>

          {/* Collapse/Expand Indicator */}
          {currentItems.length > 0 && (
            <HapticTouchableOpacity
              onPress={toggleHeaderCollapsed}
              className="mx-4 py-2 flex-row items-center justify-center"
            >
              <Icon 
                name={headerCollapsed ? Icons.CHEVRON_DOWN : Icons.CHEVRON_UP} 
                size={IconSizes.SM} 
                color={isDark ? DarkColors.primary : Colors.primary} 
                accessibilityLabel={headerCollapsed ? 'Expand header' : 'Collapse header'} 
              />
              <Text className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                {headerCollapsed ? 'Show details' : 'Hide details'}
              </Text>
            </HapticTouchableOpacity>
          )}

          {/* Items List */}
          <GestureDetector gesture={panGesture}>
            <View style={{ flex: 1 }}>
              <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: Spacing['3xl'] }}
                onScroll={handleScroll}
                scrollEventThrottle={16}
              >
                {visibleItems.length === 0 && currentItems.length > 0 ? (
                  <View className="flex-1 items-center justify-center p-8">
                    <AnimatedEmptyState
                      config={ShoppingListEmptyStates.allPurchased}
                      title=""
                    />
                    <View className="mt-8 w-full px-4">
                      <HapticTouchableOpacity
                        onPress={toggleHidePurchased}
                        className="px-6 py-4 rounded-xl flex-row items-center justify-center shadow-lg"
                        style={{
                          backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen,
                        }}
                      >
                        <Icon name={Icons.EYE_OUTLINE} size={IconSizes.MD} color="white" accessibilityLabel="Show purchased items" style={{ marginRight: 8 }} />
                        <Text className="text-white font-semibold text-base">Show Purchased Items</Text>
                      </HapticTouchableOpacity>
                    </View>
                  </View>
                ) : currentItems.length === 0 ? (
              <View className="flex-1 items-center justify-center p-8">
                <AnimatedEmptyState
                  config={ShoppingListEmptyStates.emptyList}
                  title=""
                />
                <View className="mt-8 w-full px-4" style={{ gap: 12 }}>
                  {/* Generate from Meal Plan Button */}
                  <HapticTouchableOpacity
                    onPress={handleGenerateFromMealPlan}
                    disabled={generatingFromMealPlan}
                    className="px-6 py-4 rounded-xl flex-row items-center justify-center shadow-lg"
                    style={{
                      backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                      opacity: generatingFromMealPlan ? 0.6 : 1,
                    }}
                  >
                    {generatingFromMealPlan ? (
                      <AnimatedActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                    ) : (
                      <Icon name={Icons.MEAL_PLAN_OUTLINE} size={IconSizes.MD} color="white" accessibilityLabel="Generate from meal plan" style={{ marginRight: 8 }} />
                    )}
                    <Text className="text-white font-semibold text-base">
                      {generatingFromMealPlan ? 'Generating...' : 'Generate from Meal Plan'}
                    </Text>
                  </HapticTouchableOpacity>

                  {/* Add Item Button */}
                  <HapticTouchableOpacity
                    onPress={handleFABPress}
                    className="px-6 py-4 rounded-xl flex-row items-center justify-center shadow-lg border-2"
                    style={{
                      backgroundColor: 'transparent',
                      borderColor: isDark ? DarkColors.accent : Colors.accent,
                    }}
                  >
                    <Animated.View
                      style={{
                        transform: [
                          { scale: fabScale },
                          {
                            rotate: fabRotation.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '45deg'],
                            }),
                          },
                        ],
                      }}
                    >
                      <Icon name={Icons.ADD} size={IconSizes.MD} color={isDark ? DarkColors.accent : Colors.accent} accessibilityLabel="Add item" style={{ marginRight: 8 }} />
                    </Animated.View>
                    <Text 
                      className="font-semibold text-base"
                      style={{ color: isDark ? DarkColors.accent : Colors.accent }}
                    >
                      Add Item Manually
                    </Text>
                  </HapticTouchableOpacity>
                </View>
              </View>
            ) : (
              <View className="p-4">
                {groupByRecipe && itemsByRecipe ? (
                  <>
                    {/* Grouped by Recipe */}
                    {Object.values(itemsByRecipe.grouped).map((group) => (
                      <View key={group.recipe.id} className="mb-6">
                        <HapticTouchableOpacity
                          onPress={() => router.push(`/recipe/${group.recipe.id}`)}
                          className="flex-row items-center mb-3 p-3 rounded-lg"
                          style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight }}
                        >
                          {group.recipe.imageUrl && (
                            <Image
                              source={{ uri: group.recipe.imageUrl }}
                              style={{ width: 40, height: 40, borderRadius: 8, marginRight: 12 }}
                              contentFit="cover"
                            />
                          )}
                          <View className="flex-1">
                            <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                              {group.recipe.title}
                            </Text>
                            <Text className="text-xs text-gray-500 dark:text-gray-400">
                              {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                            </Text>
                          </View>
                          <Icon name={Icons.CHEVRON_RIGHT} size={IconSizes.SM} color={isDark ? DarkColors.primary : Colors.primary} accessibilityLabel="View recipe" />
                        </HapticTouchableOpacity>
                        {group.items.map((item) => (
                          <SwipeableItem
                            key={item.id}
                            onDelete={() => handleDeleteItem(item)}
                            disabled={selectionMode}
                          >
                            {renderShoppingListItem(item)}
                          </SwipeableItem>
                        ))}
                      </View>
                    ))}
                    {/* Items without recipe */}
                    {itemsByRecipe.noRecipe.length > 0 && (
                      <View className="mb-6">
                        <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Other Items</Text>
                        {itemsByRecipe.noRecipe.map((item) => (
                          <SwipeableItem
                            key={item.id}
                            onDelete={() => handleDeleteItem(item)}
                            disabled={selectionMode}
                          >
                            {renderShoppingListItem(item)}
                          </SwipeableItem>
                        ))}
                      </View>
                    )}
                  </>
                ) : (
                  /* Regular list view */
                  visibleItems.map((item) => (
                    <SwipeableItem
                      key={item.id}
                      onDelete={() => handleDeleteItem(item)}
                      disabled={selectionMode}
                    >
                      {renderShoppingListItem(item)}
                    </SwipeableItem>
                  ))
                )}
              </View>
            )}
              </ScrollView>
            </View>
          </GestureDetector>

          {/* Sync to External Apps - Only show if there are integrations */}
          {integrations.length > 0 && (
            <View className="bg-white dark:bg-gray-800 p-4">
              <View className="mb-3">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Sync to:</Text>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {integrations.map((integration) => (
                    <HapticTouchableOpacity
                      key={integration.id}
                      onPress={() => handleSyncToApp(integration.appName)}
                      className="px-4 py-2 rounded-lg"
                      style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight }}
                    >
                      <Text className="font-semibold text-sm" style={{ color: isDark ? DarkColors.primaryDark : Colors.primaryDark }}>
                        {integration.appName.charAt(0).toUpperCase() + integration.appName.slice(1)}
                      </Text>
                    </HapticTouchableOpacity>
                  ))}
                </View>
                <HapticTouchableOpacity
                  onPress={handleSyncBidirectional}
                  className="px-4 py-2 rounded-lg mt-2 flex-row items-center justify-center"
                  style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight }}
                >
                  <Icon name={Icons.SYNC_OUTLINE} size={IconSizes.XS} color={isDark ? DarkColors.primary : Colors.primary} accessibilityLabel="Sync all bidirectional" style={{ marginRight: 6 }} />
                  <Text className="font-semibold text-sm" style={{ color: isDark ? DarkColors.primaryDark : Colors.primaryDark }}>
                    Sync All (Bidirectional)
                  </Text>
                </HapticTouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {!selectedList && shoppingLists.length === 0 && (
        <View className="flex-1 items-center justify-center p-8">
          <Icon name={Icons.CART_OUTLINE} size={64} color="#9CA3AF" accessibilityLabel="No shopping lists" />
          <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-2">
            No shopping lists yet
          </Text>
          <Text className="text-gray-600 dark:text-gray-100 text-center mb-6">
            Create your first shopping list to get started
          </Text>
          <HapticTouchableOpacity
            onPress={handleCreateList}
            className="px-6 py-3 rounded-lg"
            style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
          >
            <Text className="text-white font-semibold">Create Shopping List</Text>
          </HapticTouchableOpacity>
        </View>
      )}

      {!selectedList && shoppingLists.length > 0 && (
        <View className="flex-1 items-center justify-center p-8">
          <Icon name={Icons.SHOPPING_LIST_OUTLINE} size={64} color="#9CA3AF" accessibilityLabel="Select a list" />
          <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-2">
            Select a shopping list
          </Text>
          <Text className="text-gray-600 dark:text-gray-100 text-center mb-6">
            Choose a list from the dropdown above to view and manage items
          </Text>
          <HapticTouchableOpacity
            onPress={() => setShowListPicker(true)}
            className="px-6 py-3 rounded-lg"
            style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
          >
            <Text className="text-white font-semibold">Select List</Text>
          </HapticTouchableOpacity>
        </View>
      )}

      {/* List Picker Modal */}
      <Modal
        visible={showListPicker}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowListPicker(false)}
      >
        <Animated.View 
          className="flex-1 bg-black/50 justify-center items-center px-4"
          style={{ opacity: listPickerOpacity }}
        >
          <HapticTouchableOpacity
            activeOpacity={1}
            onPress={() => setShowListPicker(false)}
            className="flex-1 w-full justify-center items-center"
          >
            <HapticTouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <Animated.View 
                className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-sm shadow-lg"
                style={{
                  transform: [{ scale: listPickerScale }],
                }}
              >
            <View className="p-4 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Select Shopping List</Text>
            </View>
            
            <ScrollView className="max-h-80">
              {shoppingLists.map((list) => (
                <HapticTouchableOpacity
                  key={list.id}
                  onPress={() => handleSelectList(list.id)}
                  className={`px-4 py-3 flex-row items-center border-b border-gray-100 dark:border-gray-700 ${
                    selectedList?.id === list.id ? '' : 'bg-white dark:bg-gray-800'
                  }`}
                  style={selectedList?.id === list.id ? { backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight } : undefined}
                >
                  <Icon 
                    name={selectedList?.id === list.id ? Icons.CHECKMARK_CIRCLE : Icons.ELLIPSE_OUTLINE} 
                    size={IconSizes.MD} 
                    color={selectedList?.id === list.id ? (isDark ? DarkColors.primary : Colors.primary) : "#9CA3AF"} 
                    accessibilityLabel={selectedList?.id === list.id ? "Selected" : "Not selected"}
                    style={{ marginRight: 12 }}
                  />
                  <View className="flex-1">
                    <Text className={`text-base ${selectedList?.id === list.id ? 'font-semibold' : 'text-gray-900 dark:text-gray-100'}`} style={selectedList?.id === list.id ? { color: isDark ? DarkColors.primaryDark : Colors.primaryDark } : undefined}>
                      {list.name}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-1">
                      {list.items?.length || 0} items
                    </Text>
                  </View>
                </HapticTouchableOpacity>
              ))}
              
              {shoppingLists.length === 0 && (
                <View className="px-4 py-8 items-center">
                  <Icon name={Icons.CART_OUTLINE} size={48} color="#9CA3AF" accessibilityLabel="No shopping lists" />
                  <Text className="text-gray-500 dark:text-gray-200 mt-4 text-center">No shopping lists yet</Text>
                </View>
              )}
            </ScrollView>
            
            <HapticTouchableOpacity
              onPress={() => {
                setShowListPicker(false);
                handleCreateList();
              }}
              className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex-row items-center justify-center"
              style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight }}
            >
              <Icon name={Icons.ADD_CIRCLE_OUTLINE} size={IconSizes.MD} color={isDark ? DarkColors.primary : Colors.primary} accessibilityLabel="Create new list" style={{ marginRight: 8 }} />
              <Text className="font-semibold" style={{ color: isDark ? DarkColors.primaryDark : Colors.primaryDark }}>Create New List</Text>
            </HapticTouchableOpacity>
              </Animated.View>
            </HapticTouchableOpacity>
          </HapticTouchableOpacity>
        </Animated.View>
      </Modal>

      {/* Create List Modal */}
      <Modal
        visible={showCreateListModal}
        transparent={true}
        animationType="none"
        onRequestClose={() => {
          setShowCreateListModal(false);
          setNewListName('');
        }}
      >
        <Animated.View 
          className="flex-1 bg-black/50 items-center justify-center px-4"
          style={{ opacity: createListOpacity }}
        >
          <Animated.View 
            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm"
            style={{
              transform: [{ scale: createListScale }],
            }}
          >
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Create New Shopping List
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Give your shopping list a name
            </Text>
            <TextInput
              placeholder="e.g., Weekly Groceries, Costco Trip"
              value={newListName}
              onChangeText={setNewListName}
              className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-lg mb-4 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
              placeholderTextColor="#9CA3AF"
              autoFocus={true}
              onSubmitEditing={handleSaveNewList}
              maxLength={100}
            />
            <View className="flex-row" style={{ gap: 8 }}>
              <HapticTouchableOpacity
                onPress={() => {
                  setShowCreateListModal(false);
                  setNewListName('');
                }}
                className="flex-1 bg-gray-200 dark:bg-gray-700 py-3 rounded-lg"
                disabled={creatingList}
              >
                <Text className="text-center font-semibold text-gray-700 dark:text-gray-100">Cancel</Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={handleSaveNewList}
                className={`flex-1 py-3 rounded-lg ${creatingList || !newListName.trim() ? 'opacity-50' : ''}`}
                style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
                disabled={creatingList || !newListName.trim()}
              >
                {creatingList ? (
                  <AnimatedActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-center font-semibold text-white">Create</Text>
                )}
              </HapticTouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Edit Name Modal */}
      <Modal
        visible={showEditNameModal}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowEditNameModal(false)}
      >
        <Animated.View 
          className="flex-1 bg-black/50 items-center justify-center px-4"
          style={{ opacity: editNameOpacity }}
        >
          <Animated.View 
            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm"
            style={{
              transform: [{ scale: editNameScale }],
            }}
          >
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Edit List Name
            </Text>
            
            <TextInput
              value={editingListName}
              onChangeText={setEditingListName}
              placeholder="Enter list name"
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 mb-4 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
              placeholderTextColor="#9CA3AF"
              autoFocus={true}
              maxLength={100}
            />
            
            <View className="flex-row space-x-3">
              <HapticTouchableOpacity 
                onPress={() => {
                  setShowEditNameModal(false);
                  setEditingListName('');
                }}
                disabled={updatingName}
                className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">Cancel</Text>
              </HapticTouchableOpacity>
              
              <HapticTouchableOpacity 
                onPress={handleSaveName}
                disabled={updatingName}
                className={`flex-1 py-3 px-4 rounded-lg ${updatingName ? 'opacity-50' : ''}`}
                style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
              >
                <Text className="text-white font-medium text-center">
                  {updatingName ? 'Saving...' : 'Save'}
                </Text>
              </HapticTouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Merge Lists Modal */}
      <Modal
        visible={showMergeModal}
        transparent={true}
        animationType="none"
        onRequestClose={() => {
          setShowMergeModal(false);
          setSelectedListsForMerge(new Set());
          setMergeName('Weekly Shopping');
        }}
      >
        <Animated.View 
          className="flex-1 bg-black/50 items-center justify-center px-4"
          style={{ opacity: mergeOpacity }}
        >
          <Animated.View 
            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm max-h-[80%]"
            style={{
              transform: [{ scale: mergeScale }],
            }}
          >
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Merge Shopping Lists
            </Text>
            <Text className="text-gray-600 dark:text-gray-100 mb-2 text-sm">
              Select at least 2 lists to combine into a new weekly shopping list
            </Text>
            {selectedListsForMerge.size > 0 && (
              <Text className="mb-4 text-sm font-medium" style={{ color: isDark ? DarkColors.primaryDark : Colors.primaryDark }}>
                {selectedListsForMerge.size} list{selectedListsForMerge.size !== 1 ? 's' : ''} selected
              </Text>
            )}
            
            <ScrollView className="max-h-64 mb-4">
              {shoppingLists.map((list) => {
                const isSelected = selectedListsForMerge.has(list.id);
                return (
                  <HapticTouchableOpacity
                    key={list.id}
                    onPress={() => {
                      const newSet = new Set(selectedListsForMerge);
                      if (isSelected) {
                        newSet.delete(list.id);
                      } else {
                        newSet.add(list.id);
                      }
                      setSelectedListsForMerge(newSet);
                    }}
                    className={`px-4 py-3 flex-row items-center border-b border-gray-100 dark:border-gray-700 ${
                      isSelected ? '' : 'bg-white dark:bg-gray-800'
                    }`}
                    style={isSelected ? { backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight } : undefined}
                  >
                    <Icon 
                      name={isSelected ? Icons.CHECKMARK_CIRCLE : Icons.ELLIPSE_OUTLINE} 
                      size={IconSizes.MD} 
                      color={isSelected ? (isDark ? DarkColors.primary : Colors.primary) : "#9CA3AF"} 
                      accessibilityLabel={isSelected ? "Selected" : "Not selected"}
                      style={{ marginRight: 12 }}
                    />
                    <View className="flex-1">
                      <Text className={`text-base ${isSelected ? 'font-semibold' : 'text-gray-900 dark:text-gray-100'}`} style={isSelected ? { color: isDark ? DarkColors.primaryDark : Colors.primaryDark } : undefined}>
                        {list.name}
                      </Text>
                      <Text className="text-xs text-gray-500 mt-1">
                        {list.items?.length || 0} items
                      </Text>
                    </View>
                  </HapticTouchableOpacity>
                );
              })}
            </ScrollView>

            {selectedListsForMerge.size >= 2 && (
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Name for merged list:</Text>
                <TextInput
                  value={mergeName}
                  onChangeText={setMergeName}
                  placeholder="e.g., Weekly Shopping, Grocery Run"
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            )}
            
            <View className="flex-row space-x-3">
              <HapticTouchableOpacity 
                onPress={() => {
                  setShowMergeModal(false);
                  setSelectedListsForMerge(new Set());
                  setMergeName('Weekly Shopping');
                }}
                disabled={mergingLists}
                className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">Cancel</Text>
              </HapticTouchableOpacity>
              
              <HapticTouchableOpacity 
                onPress={handleConfirmMerge}
                disabled={mergingLists || selectedListsForMerge.size < 2}
                className={`flex-1 py-3 px-4 rounded-lg ${
                  (mergingLists || selectedListsForMerge.size < 2) 
                    ? 'bg-gray-300 dark:bg-gray-600' 
                    : ''
                }`}
                style={(mergingLists || selectedListsForMerge.size < 2) ? undefined : { backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
              >
                <Text className={`font-medium text-center ${
                  (mergingLists || selectedListsForMerge.size < 2)
                    ? 'text-gray-500 dark:text-gray-200'
                    : 'text-white'
                }`}>
                  {mergingLists 
                    ? 'Merging...' 
                    : selectedListsForMerge.size < 2
                    ? `Select ${2 - selectedListsForMerge.size} more list${2 - selectedListsForMerge.size !== 1 ? 's' : ''}`
                    : 'Merge Lists'}
                </Text>
              </HapticTouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        visible={showAddItemModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowAddItemModal(false);
          setNewItemName('');
          setNewItemQuantity('');
        }}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-6 pb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">Add Item</Text>
              <HapticTouchableOpacity 
                onPress={() => {
                  setShowAddItemModal(false);
                  setNewItemName('');
                  setNewItemQuantity('');
                }}
              >
                <Icon name={Icons.CLOSE} size={IconSizes.LG} color="#6B7280" accessibilityLabel="Close modal" />
              </HapticTouchableOpacity>
            </View>
            
            <TextInput
              placeholder="Item name"
              value={newItemName}
              onChangeText={setNewItemName}
              className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-lg mb-3 text-gray-900 dark:text-gray-100"
              placeholderTextColor="#9CA3AF"
              autoFocus={true}
            />
            <TextInput
              placeholder="Quantity (e.g., 2 cups, 1 lb)"
              value={newItemQuantity}
              onChangeText={setNewItemQuantity}
              className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-lg mb-3 text-gray-900 dark:text-gray-100"
              placeholderTextColor="#9CA3AF"
            />
            
            {/* Quantity Suggestions */}
            {quantitySuggestions.length > 0 && (
              <View className="mb-6">
                <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Suggested from meal plan:</Text>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {quantitySuggestions.map((suggestion, index) => (
                    <HapticTouchableOpacity
                      key={index}
                      onPress={() => {
                        setNewItemQuantity(suggestion);
                        HapticPatterns.buttonPress();
                      }}
                      className="px-3 py-2 rounded-full border"
                      style={{
                        backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight,
                        borderColor: isDark ? DarkColors.primary : Colors.primary,
                      }}
                    >
                      <Text 
                        className="text-sm font-medium"
                        style={{ color: isDark ? DarkColors.primary : Colors.primary }}
                      >
                        {suggestion}
                      </Text>
                    </HapticTouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            
            <View className="flex-row" style={{ gap: 8 }}>
              <HapticTouchableOpacity
                onPress={() => {
                  setShowAddItemModal(false);
                  setNewItemName('');
                  setNewItemQuantity('');
                }}
                className="flex-1 bg-gray-200 dark:bg-gray-700 py-3 rounded-lg"
              >
                <Text className="text-center font-semibold text-gray-700 dark:text-gray-100">Cancel</Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={handleAddItem}
                className="flex-1 py-3 rounded-lg"
                style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
              >
                <Text className="text-center font-semibold text-white">Add</Text>
              </HapticTouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Quantity Modal */}
      <Modal
        visible={showEditQuantityModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowEditQuantityModal(false);
          setEditingQuantity('');
          setSelectedItem(null);
        }}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-6 pb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Quantity</Text>
              <HapticTouchableOpacity 
                onPress={() => {
                  setShowEditQuantityModal(false);
                  setEditingQuantity('');
                  setSelectedItem(null);
                }}
              >
                <Icon name={Icons.CLOSE} size={IconSizes.LG} color="#6B7280" accessibilityLabel="Close modal" />
              </HapticTouchableOpacity>
            </View>
            
            {selectedItem && (
              <>
                <Text className="text-gray-600 dark:text-gray-300 mb-2">
                  {selectedItem.name}
                </Text>
                <TextInput
                  placeholder="Quantity (e.g., 2 cups, 1 lb)"
                  value={editingQuantity}
                  onChangeText={setEditingQuantity}
                  className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-lg mb-6 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
                  placeholderTextColor="#9CA3AF"
                  autoFocus={true}
                  onSubmitEditing={handleSaveQuantity}
                />
                
                <View className="flex-row" style={{ gap: 8 }}>
                  <HapticTouchableOpacity
                    onPress={() => {
                      setShowEditQuantityModal(false);
                      setEditingQuantity('');
                      setSelectedItem(null);
                    }}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 py-3 rounded-lg"
                    disabled={updatingQuantity}
                  >
                    <Text className="text-center font-semibold text-gray-700 dark:text-gray-100">Cancel</Text>
                  </HapticTouchableOpacity>
                  <HapticTouchableOpacity
                    onPress={handleSaveQuantity}
                    className={`flex-1 py-3 rounded-lg ${updatingQuantity ? 'opacity-50' : ''}`}
                    style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
                    disabled={updatingQuantity}
                  >
                    {updatingQuantity ? (
                      <AnimatedActivityIndicator size="small" color="white" />
                    ) : (
                      <Text className="text-center font-semibold text-white">Save</Text>
                    )}
                  </HapticTouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

