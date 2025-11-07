// frontend/app/(tabs)/shopping-list.tsx
// Shopping list screen

import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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

  useEffect(() => {
    loadShoppingLists();
    loadSupportedApps();
    loadIntegrations();
  }, []);

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadShoppingLists();
    await loadIntegrations();
    if (selectedList) {
      await findBestStore();
    }
    setRefreshing(false);
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

  const findBestStore = async () => {
    if (!selectedList || selectedList.items.length === 0) return;

    // If no location set, show modal to get location
    if (!zipCode && !location) {
      setShowLocationModal(true);
      return;
    }

    try {
      setLoadingBestStore(true);
      const ingredientNames = selectedList.items.map(item => item.name.toLowerCase());
      
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
      setBestStore(null);
    } finally {
      setLoadingBestStore(false);
    }
  };

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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const itemsByCategory = selectedList?.items.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ShoppingListItem[]>) || {};

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#F97316" />
        <Text className="text-gray-600 mt-4">Loading shopping lists...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 py-4 border-b border-gray-200">
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900">Shopping Lists</Text>
            <Text className="text-gray-500 mt-1">
              {selectedList ? `${selectedList.items.length} items` : 'No list selected'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleRefresh}
            className="p-2"
            disabled={refreshing}
          >
            <Ionicons
              name="refresh"
              size={24}
              color={refreshing ? "#9CA3AF" : "#6B7280"}
            />
          </TouchableOpacity>
        </View>

        {/* List Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          <View className="flex-row" style={{ gap: 8 }}>
            {shoppingLists.map((list) => (
              <TouchableOpacity
                key={list.id}
                onPress={() => loadShoppingListDetails(list.id)}
                className={`px-4 py-2 rounded-lg ${
                  selectedList?.id === list.id
                    ? 'bg-orange-500'
                    : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`font-semibold ${
                    selectedList?.id === list.id ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {list.name}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={handleCreateList}
              className="px-4 py-2 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300"
            >
              <Text className="text-gray-600 font-semibold">+ New List</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {selectedList && (
        <>
          {/* Best Store Recommendation */}
          {bestStore && bestStore.savings > 0 && (
            <View className="mx-4 mt-4 p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <Ionicons name="storefront-outline" size={20} color="#10B981" />
                  <Text className="text-lg font-semibold text-gray-900 ml-2">Best Store</Text>
                </View>
                <View className="bg-green-100 px-3 py-1 rounded-full">
                  <Text className="text-green-700 font-bold">
                    Save ${bestStore.savings.toFixed(2)}
                  </Text>
                </View>
              </View>
              <Text className="text-gray-700 mb-1">
                Shop at <Text className="font-semibold">{bestStore.store}</Text>
                {bestStore.location && ` (${bestStore.location})`} to save {bestStore.savingsPercent.toFixed(0)}%
              </Text>
              <Text className="text-sm text-gray-600">
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
          {selectedList.items.length > 0 && (
            <View className="mx-4 mt-4">
              <TouchableOpacity
                onPress={findBestStore}
                disabled={loadingBestStore}
                className={`bg-blue-500 py-3 px-4 rounded-lg flex-row items-center justify-center ${
                  loadingBestStore ? 'opacity-50' : ''
                }`}
              >
                <Ionicons name="storefront-outline" size={20} color="white" style={{ marginRight: 8 }} />
                <Text className="text-white font-semibold">
                  {loadingBestStore ? 'Finding Best Store...' : '🔍 Find Best Store'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Items List */}
          <ScrollView className="flex-1">
            {selectedList.items.length === 0 ? (
              <View className="flex-1 items-center justify-center p-8 mt-20">
                <Ionicons name="cart-outline" size={64} color="#9CA3AF" />
                <Text className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                  Your list is empty
                </Text>
                <Text className="text-gray-600 text-center mb-6">
                  Add items to get started with your shopping list
                </Text>
                <TouchableOpacity
                  onPress={() => setShowAddItem(true)}
                  className="bg-orange-500 px-6 py-3 rounded-lg"
                >
                  <Text className="text-white font-semibold">Add First Item</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="p-4">
                {Object.entries(itemsByCategory).map(([category, items]) => (
                  <View key={category} className="mb-6">
                    <Text className="text-lg font-semibold text-gray-900 mb-2">
                      {category}
                    </Text>
                    {items.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => handleTogglePurchased(item)}
                        className={`flex-row items-center justify-between p-3 rounded-lg mb-2 ${
                          item.purchased ? 'bg-gray-100' : 'bg-white'
                        }`}
                      >
                        <View className="flex-1 flex-row items-center">
                          <Ionicons
                            name={item.purchased ? 'checkmark-circle' : 'ellipse-outline'}
                            size={24}
                            color={item.purchased ? '#10B981' : '#9CA3AF'}
                          />
                          <View className="ml-3 flex-1">
                            <Text
                              className={`font-medium ${
                                item.purchased
                                  ? 'text-gray-400 line-through'
                                  : 'text-gray-900'
                              }`}
                            >
                              {item.name}
                            </Text>
                            <Text className="text-sm text-gray-500">{item.quantity}</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleDeleteItem(item)}
                          className="ml-2 p-2"
                        >
                          <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </TouchableOpacity>
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
                <TouchableOpacity
                  onPress={() => {
                    setShowAddItem(false);
                    setNewItemName('');
                    setNewItemQuantity('');
                    setNewItemCategory('');
                  }}
                  className="flex-1 bg-gray-200 py-3 rounded-lg"
                >
                  <Text className="text-center font-semibold text-gray-700">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddItem}
                  className="flex-1 bg-orange-500 py-3 rounded-lg"
                >
                  <Text className="text-center font-semibold text-white">Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Bottom Actions */}
          {!showAddItem && (
            <View className="bg-white border-t border-gray-200 p-4">
              <TouchableOpacity
                onPress={() => setShowAddItem(true)}
                className="bg-orange-500 py-3 rounded-lg mb-3"
              >
                <Text className="text-center font-semibold text-white">Add Item</Text>
              </TouchableOpacity>

              {/* Sync to External Apps */}
              {integrations.length > 0 && (
                <View className="mb-3">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Sync to:</Text>
                  <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                    {integrations.map((integration) => (
                      <TouchableOpacity
                        key={integration.id}
                        onPress={() => handleSyncToApp(integration.appName)}
                        className="bg-blue-100 px-4 py-2 rounded-lg"
                      >
                        <Text className="text-blue-700 font-semibold text-sm">
                          {integration.appName.charAt(0).toUpperCase() + integration.appName.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    onPress={handleSyncBidirectional}
                    className="bg-purple-100 px-4 py-2 rounded-lg mt-2 flex-row items-center justify-center"
                  >
                    <Ionicons name="sync-outline" size={16} color="#9333EA" style={{ marginRight: 6 }} />
                    <Text className="text-purple-700 font-semibold text-sm">
                      Sync All (Bidirectional)
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </>
      )}

      {!selectedList && shoppingLists.length === 0 && (
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="cart-outline" size={64} color="#9CA3AF" />
          <Text className="text-xl font-semibold text-gray-900 mt-4 mb-2">
            No shopping lists yet
          </Text>
          <Text className="text-gray-600 text-center mb-6">
            Create your first shopping list to get started
          </Text>
          <TouchableOpacity
            onPress={handleCreateList}
            className="bg-orange-500 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-semibold">Create Shopping List</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Location Modal */}
      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-2xl font-bold text-gray-900">Find Nearby Stores</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <Text className="text-gray-600 mb-6">
              To find the best store near you, please provide your location:
            </Text>

            {/* GPS Option */}
            <TouchableOpacity
              onPress={handleUseGPS}
              className="bg-blue-500 py-4 px-4 rounded-lg flex-row items-center justify-center mb-4"
            >
              <Ionicons name="location" size={20} color="white" style={{ marginRight: 8 }} />
              <Text className="text-white font-semibold text-lg">Use My Location (GPS)</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center my-4">
              <View className="flex-1 h-px bg-gray-300" />
              <Text className="px-4 text-gray-500">OR</Text>
              <View className="flex-1 h-px bg-gray-300" />
            </View>

            {/* Zip Code Option */}
            <Text className="text-gray-700 font-semibold mb-2">Enter Zip Code</Text>
            <TextInput
              value={zipCode}
              onChangeText={setZipCode}
              placeholder="12345"
              keyboardType="number-pad"
              maxLength={5}
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-lg"
            />
            <TouchableOpacity
              onPress={handleUseZipCode}
              className="bg-orange-500 py-4 px-4 rounded-lg"
              disabled={!zipCode || zipCode.length < 5}
            >
              <Text className="text-white font-semibold text-center text-lg">
                Use Zip Code
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

