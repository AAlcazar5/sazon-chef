// frontend/app/(tabs)/shopping-list.tsx
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';
// Shopping list screen

import { View, Text, ScrollView, TextInput, Alert, Modal, Animated } from 'react-native';
import AnimatedActivityIndicator from '../../components/ui/AnimatedActivityIndicator';
import SwipeableItem from '../../components/ui/SwipeableItem';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Icon from '../../components/ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import * as Location from 'expo-location';
import { shoppingListApi, shoppingAppApi, costTrackingApi } from '../../lib/api';
import { ShoppingList, ShoppingListItem, ShoppingAppIntegration, SupportedShoppingApp } from '../../types';
import * as Haptics from 'expo-haptics';

export default function ShoppingListScreen() {
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [integrations, setIntegrations] = useState<ShoppingAppIntegration[]>([]);
  const [supportedApps, setSupportedApps] = useState<SupportedShoppingApp[]>([]);
  const [bestStore, setBestStore] = useState<any>(null);
  const [loadingBestStore, setLoadingBestStore] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [zipCode, setZipCode] = useState('');
  const [useGPS, setUseGPS] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showListPicker, setShowListPicker] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editingListName, setEditingListName] = useState('');
  const [updatingName, setUpdatingName] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [selectedListsForMerge, setSelectedListsForMerge] = useState<Set<string>>(new Set());
  const [mergingLists, setMergingLists] = useState(false);
  const [mergeName, setMergeName] = useState('Weekly Shopping');

  // Animation values for modals
  const listPickerScale = useRef(new Animated.Value(0)).current;
  const listPickerOpacity = useRef(new Animated.Value(0)).current;
  const editNameScale = useRef(new Animated.Value(0)).current;
  const editNameOpacity = useRef(new Animated.Value(0)).current;
  const mergeScale = useRef(new Animated.Value(0)).current;
  const mergeOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadShoppingLists();
    loadSupportedApps();
    loadIntegrations();
  }, []);

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

  const loadShoppingLists = async () => {
    try {
      setLoading(true);
      const response = await shoppingListApi.getShoppingLists();
      const lists = response.data;
      setShoppingLists(lists);
      
      // Select active list or first list
      const activeList = lists.find((l: ShoppingList) => l.isActive) || lists[0];
      if (activeList) {
        await loadShoppingListDetails(activeList.id);
      }
    } catch (error: any) {
      console.error('Error loading shopping lists:', error);
      Alert.alert('Error', 'Failed to load shopping lists');
    } finally {
      setLoading(false);
    }
  };

  const loadShoppingListDetails = async (id: string) => {
    try {
      const response = await shoppingListApi.getShoppingList(id);
      setSelectedList(response.data);
    } catch (error: any) {
      console.error('Error loading shopping list details:', error);
    }
  };

  const handleSelectList = async (listId: string) => {
    setShowListPicker(false);
    await loadShoppingListDetails(listId);
  };

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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to find nearby stores.');
        return null;
      }

      const locationData = await Location.getCurrentPositionAsync({});
      return {
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your location. Please try entering a zip code instead.');
      return null;
    }
  };

  const findBestStore = useCallback(async () => {
    const itemsToUse = selectedList?.items || [];
    if (!itemsToUse || itemsToUse.length === 0) return;

    // If no location set, show modal to get location
    if (!zipCode && !location) {
      setShowLocationModal(true);
      return;
    }

    try {
      setLoadingBestStore(true);
      const ingredientNames = itemsToUse
        .filter(item => item && item.name)
        .map(item => item.name.toLowerCase());
      
      const locationOptions: any = {};
      if (zipCode) {
        locationOptions.zipCode = zipCode;
      } else if (location) {
        locationOptions.latitude = location.latitude;
        locationOptions.longitude = location.longitude;
      }
      locationOptions.radiusMiles = 10;

      const response = await costTrackingApi.getBestStoreForShoppingList(ingredientNames, locationOptions);
      setBestStore(response.data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      // Silently handle - no price data available yet
      // User can try again later when they have cost information
      console.error('Error finding best store:', error);
      setBestStore(null);
    } finally {
      setLoadingBestStore(false);
    }
  }, [selectedList?.items, zipCode, location]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadShoppingLists();
    await loadIntegrations();
    if (selectedList) {
      await findBestStore();
    }
    setRefreshing(false);
  }, [selectedList, findBestStore, loadShoppingLists, loadIntegrations]);

  const handleUseGPS = async () => {
    const loc = await requestLocationPermission();
    if (loc) {
      setLocation(loc);
      setUseGPS(true);
      setZipCode('');
      setShowLocationModal(false);
      // Automatically find best store after getting location
      setTimeout(() => findBestStore(), 100);
    }
  };

  const handleUseZipCode = () => {
    if (!zipCode || zipCode.length < 5) {
      Alert.alert('Invalid Zip Code', 'Please enter a valid 5-digit zip code.');
      return;
    }
    setLocation(null);
    setUseGPS(false);
    setShowLocationModal(false);
    // Automatically find best store after setting zip code
    setTimeout(() => findBestStore(), 100);
  };

  const handleCreateList = async () => {
    try {
      const response = await shoppingListApi.createShoppingList();
      await loadShoppingLists();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('Error creating shopping list:', error);
      Alert.alert('Error', 'Failed to create shopping list');
    }
  };

  const handleAddItem = async () => {
    if (!selectedList || !newItemName.trim() || !newItemQuantity.trim()) {
      Alert.alert('Error', 'Please enter item name and quantity');
      return;
    }

    try {
      await shoppingListApi.addItem(selectedList.id, {
        name: newItemName.trim(),
        quantity: newItemQuantity.trim(),
        category: newItemCategory.trim() || undefined,
      });
      
      setNewItemName('');
      setNewItemQuantity('');
      setNewItemCategory('');
      setShowAddItem(false);
      await loadShoppingListDetails(selectedList.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to add item');
    }
  };

  const handleTogglePurchased = async (item: ShoppingListItem) => {
    if (!selectedList) return;

    try {
      await shoppingListApi.updateItem(selectedList.id, item.id, {
        purchased: !item.purchased,
      });
      await loadShoppingListDetails(selectedList.id);
    } catch (error: any) {
      console.error('Error updating item:', error);
      Alert.alert('Error', 'Failed to update item');
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
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error: any) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const handleSyncToApp = async (appName: string) => {
    if (!selectedList) {
      Alert.alert('Error', 'Please select a shopping list');
      return;
    }

    try {
      const response = await shoppingAppApi.syncToExternalApp(appName, selectedList.id);
      if (response.data.success) {
        Alert.alert('Success', response.data.message || `Items synced to ${appName}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Sync to all connected apps
      const syncPromises = integrations.map(integration =>
        shoppingAppApi.syncBidirectional(integration.appName, selectedList.id)
      );

      const results = await Promise.allSettled(syncPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '✅ Sync Complete',
        `Synced to ${successful} of ${integrations.length} shopping app(s)`
      );
    } catch (error: any) {
      console.error('Error syncing bidirectionally:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Sync Failed', 'Failed to sync shopping list');
    }
  };

  // Get items from selected list - memoized to prevent re-computation
  const currentItems = useMemo(() => {
    return selectedList?.items || [];
  }, [selectedList?.items]);
  
  const itemsByCategory = useMemo(() => {
    try {
      return currentItems.reduce((acc, item) => {
        if (item && item.name) {
          const category = item.category || 'Other';
          if (!acc[category]) acc[category] = [];
          acc[category].push(item);
        }
        return acc;
      }, {} as Record<string, ShoppingListItem[]>);
    } catch (error) {
      console.error('Error in itemsByCategory:', error);
      return {};
    }
  }, [currentItems]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900 items-center justify-center">
        <AnimatedActivityIndicator size="large" color="#F97316" />
        <Text className="text-gray-600 dark:text-gray-100 mt-4">Loading shopping lists...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 py-4 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">Shopping Lists</Text>
            <Text className="text-gray-500 dark:text-gray-200 mt-1">
              {selectedList ? `${selectedList.items.length} items` : 'No list selected'}
            </Text>
          </View>
          <HapticTouchableOpacity
            onPress={handleRefresh}
            className="p-2"
            disabled={refreshing}
          >
            <Icon
              name={Icons.RELOAD}
              size={IconSizes.LG}
              color={refreshing ? "#9CA3AF" : "#6B7280"}
              accessibilityLabel="Refresh shopping lists"
            />
          </HapticTouchableOpacity>
        </View>

        {/* List Selector - Dropdown */}
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
            <HapticTouchableOpacity
              onPress={handleEditName}
              className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
            >
              <Icon name={Icons.EDIT_OUTLINE} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Edit list name" />
            </HapticTouchableOpacity>
          )}
          
          {shoppingLists.length > 1 && (
            <HapticTouchableOpacity
              onPress={() => setShowMergeModal(true)}
              className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg"
            >
              <Icon name={Icons.MERGE_LISTS_OUTLINE} size={IconSizes.MD} color="#9333EA" accessibilityLabel="Merge lists" />
            </HapticTouchableOpacity>
          )}
          
          <HapticTouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handleCreateList();
            }}
            className="p-3 bg-orange-500 dark:bg-orange-600 rounded-lg"
          >
            <Icon name={Icons.ADD} size={IconSizes.MD} color="white" accessibilityLabel="Create new list" />
          </HapticTouchableOpacity>
        </View>
      </View>

      {selectedList && (
        <>
          {/* Best Store Recommendation */}
          {bestStore && bestStore.savings > 0 && (
            <View className="mx-4 mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500 dark:border-green-600">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <Icon name={Icons.STORE_OUTLINE} size={IconSizes.MD} color="#10B981" accessibilityLabel="Best store" />
                  <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 ml-2">Best Store</Text>
                </View>
                <View className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                  <Text className="text-green-700 dark:text-green-300 font-bold">
                    Save ${bestStore.savings.toFixed(2)}
                  </Text>
                </View>
              </View>
              <Text className="text-gray-700 mb-1">
                Shop at <Text className="font-semibold">{bestStore.store}</Text>
                {bestStore.location && ` (${bestStore.location})`} to save {bestStore.savingsPercent.toFixed(0)}%
              </Text>
              <Text className="text-sm text-gray-600 mb-3">
                Total cost: ${bestStore.totalCost.toFixed(2)}
              </Text>
              {bestStore.location && (
                <Text className="text-xs text-gray-500 mt-1">
                  📍 {bestStore.location}
                </Text>
              )}
            </View>
          )}

          {/* Find Best Store Button */}
          {currentItems.length > 0 && (
            <View className="mx-4 mt-4">
              <HapticTouchableOpacity
                onPress={() => {
                  if (!loadingBestStore) {
                    findBestStore();
                  }
                }}
                disabled={loadingBestStore}
                hapticStyle="medium"
                className={`bg-blue-500 dark:bg-blue-600 py-3 px-4 rounded-lg flex-row items-center justify-center ${
                  loadingBestStore ? 'opacity-50' : ''
                }`}
              >
                <Icon name={Icons.STORE_OUTLINE} size={IconSizes.MD} color="white" accessibilityLabel="Find best store" style={{ marginRight: 8 }} />
                <Text className="text-white font-semibold">
                  {loadingBestStore ? 'Finding Best Store...' : '🔍 Find Best Store'}
                </Text>
              </HapticTouchableOpacity>
            </View>
          )}

          {/* Items List */}
          <ScrollView className="flex-1">
            {currentItems.length === 0 ? (
              <AnimatedEmptyState
                icon={Icons.CART_OUTLINE}
                title="Your list is empty"
                description="Add items to get started with your shopping list"
                actionLabel="Add First Item"
                onAction={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowAddItem(true);
                }}
              />
            ) : (
              <View className="p-4">
                {Object.entries(itemsByCategory).map(([category, items]) => (
                  <View key={category} className="mb-6">
                    <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {category}
                    </Text>
                    {items.map((item) => (
                      <SwipeableItem
                        key={item.id}
                        onDelete={() => handleDeleteItem(item)}
                      >
                        <HapticTouchableOpacity
                          onPress={() => handleTogglePurchased(item)}
                          className={`flex-row items-center justify-between p-3 rounded-lg mb-2 ${
                            item.purchased ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'
                          }`}
                        >
                          <View className="flex-1 flex-row items-center">
                            <Icon
                              name={item.purchased ? Icons.CHECKMARK_CIRCLE : Icons.ELLIPSE_OUTLINE}
                              size={IconSizes.LG}
                              color={item.purchased ? '#10B981' : '#9CA3AF'}
                              accessibilityLabel={item.purchased ? 'Purchased' : 'Not purchased'}
                            />
                            <View className="ml-3 flex-1">
                              <Text
                                className={`font-medium ${
                                  item.purchased
                                    ? 'text-gray-400 dark:text-gray-200 line-through'
                                    : 'text-gray-900 dark:text-gray-100'
                                }`}
                              >
                                {item.name}
                              </Text>
                              <Text className="text-sm text-gray-500 dark:text-gray-200">{item.quantity}</Text>
                            </View>
                          </View>
                        </HapticTouchableOpacity>
                      </SwipeableItem>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Add Item Input */}
          {showAddItem && (
            <View className="bg-white border-t border-gray-200 p-4">
              <Text className="text-lg font-semibold text-gray-900 mb-3">Add Item</Text>
              <TextInput
                placeholder="Item name"
                value={newItemName}
                onChangeText={setNewItemName}
                className="bg-gray-100 px-4 py-3 rounded-lg mb-2"
              />
              <TextInput
                placeholder="Quantity (e.g., 2 cups, 1 lb)"
                value={newItemQuantity}
                onChangeText={setNewItemQuantity}
                className="bg-gray-100 px-4 py-3 rounded-lg mb-2"
              />
              <TextInput
                placeholder="Category (optional)"
                value={newItemCategory}
                onChangeText={setNewItemCategory}
                className="bg-gray-100 px-4 py-3 rounded-lg mb-3"
              />
              <View className="flex-row" style={{ gap: 8 }}>
                <HapticTouchableOpacity
                  onPress={() => {
                    setShowAddItem(false);
                    setNewItemName('');
                    setNewItemQuantity('');
                    setNewItemCategory('');
                  }}
                  className="flex-1 bg-gray-200 py-3 rounded-lg"
                >
                  <Text className="text-center font-semibold text-gray-700">Cancel</Text>
                </HapticTouchableOpacity>
                <HapticTouchableOpacity
                  onPress={handleAddItem}
                  className="flex-1 bg-orange-500 py-3 rounded-lg"
                >
                  <Text className="text-center font-semibold text-white">Add</Text>
                </HapticTouchableOpacity>
              </View>
            </View>
          )}

          {/* Bottom Actions */}
          {!showAddItem && (
            <View className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
              <HapticTouchableOpacity
                onPress={() => setShowAddItem(true)}
                className="bg-orange-500 dark:bg-orange-600 py-3 rounded-lg mb-3"
              >
                <Text className="text-center font-semibold text-white">Add Item</Text>
              </HapticTouchableOpacity>

              {/* Sync to External Apps */}
              {integrations.length > 0 && (
                <View className="mb-3">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Sync to:</Text>
                  <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                    {integrations.map((integration) => (
                      <HapticTouchableOpacity
                        key={integration.id}
                        onPress={() => handleSyncToApp(integration.appName)}
                        className="bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-lg"
                      >
                        <Text className="text-blue-700 dark:text-blue-300 font-semibold text-sm">
                          {integration.appName.charAt(0).toUpperCase() + integration.appName.slice(1)}
                        </Text>
                      </HapticTouchableOpacity>
                    ))}
                  </View>
                  <HapticTouchableOpacity
                    onPress={handleSyncBidirectional}
                    className="bg-purple-100 dark:bg-purple-900/30 px-4 py-2 rounded-lg mt-2 flex-row items-center justify-center"
                  >
                    <Icon name={Icons.SYNC_OUTLINE} size={IconSizes.XS} color="#9333EA" accessibilityLabel="Sync all bidirectional" style={{ marginRight: 6 }} />
                    <Text className="text-purple-700 dark:text-purple-300 font-semibold text-sm">
                      Sync All (Bidirectional)
                    </Text>
                  </HapticTouchableOpacity>
                </View>
              )}
            </View>
          )}
        </>
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
            className="bg-orange-500 dark:bg-orange-600 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-semibold">Create Shopping List</Text>
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
                  className={`px-4 py-3 flex-row items-center border-b border-gray-100 ${
                    selectedList?.id === list.id ? 'bg-orange-50' : 'bg-white'
                  }`}
                >
                  <Icon 
                    name={selectedList?.id === list.id ? Icons.CHECKMARK_CIRCLE : Icons.ELLIPSE_OUTLINE} 
                    size={IconSizes.MD} 
                    color={selectedList?.id === list.id ? "#F97316" : "#9CA3AF"} 
                    accessibilityLabel={selectedList?.id === list.id ? "Selected" : "Not selected"}
                    style={{ marginRight: 12 }}
                  />
                  <View className="flex-1">
                    <Text className={`text-base ${selectedList?.id === list.id ? 'text-orange-600 font-semibold' : 'text-gray-900'}`}>
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
              className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex-row items-center justify-center bg-orange-50 dark:bg-orange-900/20"
            >
              <Icon name={Icons.ADD_CIRCLE_OUTLINE} size={IconSizes.MD} color="#F97316" accessibilityLabel="Create new list" style={{ marginRight: 8 }} />
              <Text className="text-orange-600 dark:text-orange-400 font-semibold">Create New List</Text>
            </HapticTouchableOpacity>
              </Animated.View>
            </HapticTouchableOpacity>
          </HapticTouchableOpacity>
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
                className={`flex-1 py-3 px-4 bg-orange-500 dark:bg-orange-600 rounded-lg ${updatingName ? 'opacity-50' : ''}`}
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
              <Text className="text-orange-600 dark:text-orange-400 mb-4 text-sm font-medium">
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
                    className={`px-4 py-3 flex-row items-center border-b border-gray-100 ${
                      isSelected ? 'bg-orange-50' : 'bg-white'
                    }`}
                  >
                    <Icon 
                      name={isSelected ? Icons.CHECKMARK_CIRCLE : Icons.ELLIPSE_OUTLINE} 
                      size={IconSizes.MD} 
                      color={isSelected ? "#F97316" : "#9CA3AF"} 
                      accessibilityLabel={isSelected ? "Selected" : "Not selected"}
                      style={{ marginRight: 12 }}
                    />
                    <View className="flex-1">
                      <Text className={`text-base ${isSelected ? 'text-orange-600 font-semibold' : 'text-gray-900'}`}>
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
                    : 'bg-purple-500 dark:bg-purple-600'
                }`}
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

      {/* Location Modal */}
      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-6 pb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">Find Nearby Stores</Text>
              <HapticTouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Icon name={Icons.CLOSE} size={IconSizes.LG} color="#6B7280" accessibilityLabel="Close modal" />
              </HapticTouchableOpacity>
            </View>
            
            <Text className="text-gray-600 dark:text-gray-100 mb-6">
              To find the best store near you, please provide your location:
            </Text>

            {/* GPS Option */}
            <HapticTouchableOpacity
              onPress={handleUseGPS}
              className="bg-blue-500 dark:bg-blue-600 py-4 px-4 rounded-lg flex-row items-center justify-center mb-4"
            >
              <Icon name={Icons.LOCATION} size={IconSizes.MD} color="white" accessibilityLabel="Use GPS location" style={{ marginRight: 8 }} />
              <Text className="text-white font-semibold text-lg">Use My Location (GPS)</Text>
            </HapticTouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center my-4">
              <View className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
              <Text className="px-4 text-gray-500 dark:text-gray-200">OR</Text>
              <View className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
            </View>

            {/* Zip Code Option */}
            <Text className="text-gray-700 dark:text-gray-100 font-semibold mb-2">Enter Zip Code</Text>
            <TextInput
              value={zipCode}
              onChangeText={setZipCode}
              placeholder="12345"
              keyboardType="number-pad"
              maxLength={5}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 mb-4 text-lg dark:bg-gray-700 dark:text-gray-100"
              placeholderTextColor="#9CA3AF"
            />
            <HapticTouchableOpacity
              onPress={handleUseZipCode}
              className="bg-orange-500 dark:bg-orange-600 py-4 px-4 rounded-lg"
              disabled={!zipCode || zipCode.length < 5}
            >
              <Text className="text-white font-semibold text-center text-lg">
                Use Zip Code
              </Text>
            </HapticTouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

