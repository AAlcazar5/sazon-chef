// frontend/components/shopping/AddItemModal.tsx
// Add item modal with tabs: Add New / Buy Again / Pantry
// Edit quantity modal remains unchanged

import { View, Text, TextInput, Modal, Image, Alert, ScrollView } from 'react-native';
import { useState } from 'react';
import { useColorScheme } from 'nativewind';
import * as ImagePicker from 'expo-image-picker';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import AnimatedActivityIndicator from '../ui/AnimatedActivityIndicator';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { HapticPatterns } from '../../constants/Haptics';
import { ShoppingListItem, PurchaseHistoryItem, PantryItem } from '../../types';
import type { ShoppingListState } from '../../hooks/useShoppingList';

type AddItemTab = 'add' | 'buyAgain' | 'pantry';

interface AddItemModalProps {
  state: ShoppingListState;
  dispatch: React.Dispatch<any>;
  onAddItem: () => void;
  onSaveQuantity: () => void;
  onPickItemPhoto: (imageUri: string) => void;
  purchaseHistoryPriceMap: Map<string, number>;
  onBuyAgainItem: (item: PurchaseHistoryItem) => void;
  onToggleFavorite: (item: PurchaseHistoryItem) => void;
  onReorderLastWeek: () => void;
  onRemoveFromPantry: (itemId: string) => void;
  onSetupDefaultPantry: () => void;
  onQuickAddSuggestion: (suggestion: string) => void;
}

export default function AddItemModal({
  state,
  dispatch,
  onAddItem,
  onSaveQuantity,
  onPickItemPhoto,
  purchaseHistoryPriceMap,
  onBuyAgainItem,
  onToggleFavorite,
  onReorderLastWeek,
  onRemoveFromPantry,
  onSetupDefaultPantry,
  onQuickAddSuggestion,
}: AddItemModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeTab, setActiveTab] = useState<AddItemTab>('add');

  const editItemLastPrice = state.selectedItem
    ? purchaseHistoryPriceMap.get(state.selectedItem.name.toLowerCase().trim())
    : undefined;

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to attach item photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      onPickItemPhoto(result.assets[0].uri);
    }
  };

  const handleCloseAddModal = () => {
    dispatch({ type: 'CLOSE_ADD_ITEM_MODAL' });
    setActiveTab('add');
  };

  const tabs: { key: AddItemTab; label: string; icon: string }[] = [
    { key: 'add', label: 'Add New', icon: Icons.ADD },
    { key: 'buyAgain', label: 'Buy Again', icon: Icons.REFRESH },
    { key: 'pantry', label: 'Pantry', icon: Icons.HOME_OUTLINE },
  ];

  const favorites = state.purchaseHistory.filter(item => item.isFavorite);
  const frequent = state.purchaseHistory.filter(item => !item.isFavorite);
  const formatItemName = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

  return (
    <>
      {/* Add Item Modal */}
      <Modal
        visible={state.showAddItemModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseAddModal}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-6 pb-8" style={{ maxHeight: '80%' }}>
            {/* Header */}
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">Add Items</Text>
              <HapticTouchableOpacity onPress={handleCloseAddModal}>
                <Icon name={Icons.CLOSE} size={IconSizes.LG} color="#6B7280" accessibilityLabel="Close modal" />
              </HapticTouchableOpacity>
            </View>

            {/* Tab Bar */}
            <View
              className="flex-row rounded-xl mb-4 p-1"
              style={{ backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }}
            >
              {tabs.map((tab) => (
                <HapticTouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  className="flex-1 flex-row items-center justify-center py-2.5 rounded-lg"
                  style={activeTab === tab.key ? {
                    backgroundColor: isDark ? '#374151' : '#FFFFFF',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 2,
                  } : undefined}
                >
                  <Icon
                    name={tab.icon}
                    size={14}
                    color={activeTab === tab.key
                      ? (isDark ? '#F9FAFB' : '#111827')
                      : (isDark ? '#9CA3AF' : '#6B7280')
                    }
                    accessibilityLabel={tab.label}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    className="text-xs font-semibold"
                    style={{
                      color: activeTab === tab.key
                        ? (isDark ? '#F9FAFB' : '#111827')
                        : (isDark ? '#9CA3AF' : '#6B7280'),
                    }}
                  >
                    {tab.label}
                  </Text>
                </HapticTouchableOpacity>
              ))}
            </View>

            {/* Tab Content */}
            {activeTab === 'add' && (
              <View>
                {/* Quick Suggestions */}
                {state.quickSuggestions.length > 0 && (
                  <View className="mb-3">
                    <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Quick add:
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View className="flex-row" style={{ gap: 6 }}>
                        {state.quickSuggestions.slice(0, 8).map((suggestion, idx) => (
                          <HapticTouchableOpacity
                            key={idx}
                            onPress={() => {
                              onQuickAddSuggestion(suggestion);
                              HapticPatterns.buttonPress();
                            }}
                            className="px-3 py-1.5 rounded-full border"
                            style={{
                              backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                              borderColor: isDark ? '#374151' : '#E5E7EB',
                            }}
                          >
                            <Text
                              className="text-xs font-medium"
                              style={{ color: isDark ? '#D1D5DB' : '#374151' }}
                            >
                              {suggestion}
                            </Text>
                          </HapticTouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}

                <TextInput
                  placeholder="Item name"
                  value={state.newItemName}
                  onChangeText={(text) => dispatch({ type: 'UPDATE', payload: { newItemName: text } })}
                  className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-lg mb-3 text-gray-900 dark:text-gray-100"
                  placeholderTextColor="#9CA3AF"
                  autoFocus={true}
                />
                <TextInput
                  placeholder="Quantity (e.g., 2 cups, 1 lb)"
                  value={state.newItemQuantity}
                  onChangeText={(text) => dispatch({ type: 'UPDATE', payload: { newItemQuantity: text } })}
                  className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-lg mb-3 text-gray-900 dark:text-gray-100"
                  placeholderTextColor="#9CA3AF"
                />

                {/* Quantity Suggestions */}
                {state.quantitySuggestions.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Suggested from meal plan:</Text>
                    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                      {state.quantitySuggestions.map((suggestion, index) => (
                        <HapticTouchableOpacity
                          key={index}
                          onPress={() => {
                            dispatch({ type: 'UPDATE', payload: { newItemQuantity: suggestion } });
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
                    onPress={handleCloseAddModal}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 py-3 rounded-lg"
                  >
                    <Text className="text-center font-semibold text-gray-700 dark:text-gray-100">Cancel</Text>
                  </HapticTouchableOpacity>
                  <HapticTouchableOpacity
                    onPress={onAddItem}
                    className="flex-1 py-3 rounded-lg"
                    style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
                  >
                    <Text className="text-center font-semibold text-white">Add</Text>
                  </HapticTouchableOpacity>
                </View>
              </View>
            )}

            {activeTab === 'buyAgain' && (
              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                {state.loadingPurchaseHistory ? (
                  <View className="items-center py-8">
                    <AnimatedActivityIndicator size="small" color={isDark ? DarkColors.primary : Colors.primary} />
                  </View>
                ) : state.purchaseHistory.length === 0 ? (
                  <View className="items-center py-8">
                    <Icon name={Icons.TIME_OUTLINE} size={48} color="#9CA3AF" accessibilityLabel="No purchase history" />
                    <Text className="text-gray-500 dark:text-gray-400 mt-3 text-center">
                      No purchase history yet.{'\n'}Items you buy will appear here.
                    </Text>
                  </View>
                ) : (
                  <View>
                    {/* Reorder Last Week */}
                    <HapticTouchableOpacity
                      onPress={onReorderLastWeek}
                      className="flex-row items-center justify-center px-4 py-3 rounded-xl mb-4 border"
                      style={{
                        backgroundColor: isDark ? `${Colors.primaryLight}15` : `${Colors.primaryLight}`,
                        borderColor: isDark ? DarkColors.primary : Colors.primary,
                      }}
                    >
                      <Icon
                        name={Icons.REFRESH}
                        size={16}
                        color={isDark ? DarkColors.primary : Colors.primary}
                        accessibilityLabel="Reorder last week"
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        className="font-semibold text-sm"
                        style={{ color: isDark ? DarkColors.primary : Colors.primary }}
                      >
                        Reorder Last Week
                      </Text>
                    </HapticTouchableOpacity>

                    {/* Favorites */}
                    {favorites.length > 0 && (
                      <View className="mb-4">
                        <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                          Favorites
                        </Text>
                        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                          {favorites.map((item) => (
                            <HapticTouchableOpacity
                              key={item.id}
                              onPress={() => onBuyAgainItem(item)}
                              onLongPress={() => onToggleFavorite(item)}
                              className="flex-row items-center px-3 py-2 rounded-full border"
                              style={{
                                backgroundColor: isDark ? '#78350F' : '#FFFBEB',
                                borderColor: isDark ? '#F59E0B' : '#FCD34D',
                              }}
                            >
                              <Icon
                                name={Icons.STAR}
                                size={14}
                                color={isDark ? '#F59E0B' : '#D97706'}
                                accessibilityLabel="Favorite"
                                style={{ marginRight: 4 }}
                              />
                              <Text
                                className="text-sm font-medium"
                                style={{ color: isDark ? '#FCD34D' : '#92400E' }}
                                numberOfLines={1}
                              >
                                {formatItemName(item.itemName)}
                              </Text>
                              {item.lastPrice != null && item.lastPrice > 0 && (
                                <Text className="text-xs ml-1" style={{ color: '#9CA3AF' }}>
                                  ${item.lastPrice.toFixed(2)}
                                </Text>
                              )}
                            </HapticTouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Frequent Items */}
                    {frequent.length > 0 && (
                      <View className="mb-4">
                        <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                          Frequently Bought
                        </Text>
                        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                          {frequent.map((item) => (
                            <HapticTouchableOpacity
                              key={item.id}
                              onPress={() => onBuyAgainItem(item)}
                              onLongPress={() => onToggleFavorite(item)}
                              className="flex-row items-center px-3 py-2 rounded-full border"
                              style={{
                                backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                                borderColor: isDark ? '#374151' : '#E5E7EB',
                              }}
                            >
                              <Text
                                className="text-sm font-medium"
                                style={{ color: isDark ? '#D1D5DB' : '#374151' }}
                                numberOfLines={1}
                              >
                                {formatItemName(item.itemName)}
                              </Text>
                              {item.lastPrice != null && item.lastPrice > 0 && (
                                <Text className="text-xs ml-1" style={{ color: '#9CA3AF' }}>
                                  ${item.lastPrice.toFixed(2)}
                                </Text>
                              )}
                              {item.purchaseCount > 1 && (
                                <Text className="text-xs ml-1" style={{ color: '#9CA3AF' }}>
                                  x{item.purchaseCount}
                                </Text>
                              )}
                            </HapticTouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    <Text className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
                      Tap to add, long-press to favorite
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            {activeTab === 'pantry' && (
              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                {state.loadingPantry ? (
                  <View className="items-center py-8">
                    <AnimatedActivityIndicator size="small" color={isDark ? DarkColors.primary : Colors.primary} />
                  </View>
                ) : state.pantryItems.length === 0 ? (
                  <View className="items-center py-8">
                    <Icon name={Icons.HOME_OUTLINE} size={48} color="#9CA3AF" accessibilityLabel="No pantry items" />
                    <Text className="text-gray-500 dark:text-gray-400 mt-3 text-center mb-4">
                      Add staples you always have on hand.{'\n'}They'll be excluded from generated lists.
                    </Text>
                    <HapticTouchableOpacity
                      onPress={onSetupDefaultPantry}
                      className="flex-row items-center px-5 py-2.5 rounded-full"
                      style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
                    >
                      <Icon name={Icons.ADD} size={16} color="white" accessibilityLabel="Add defaults" style={{ marginRight: 4 }} />
                      <Text className="text-sm font-semibold text-white">Get Started</Text>
                    </HapticTouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <View className="flex-row items-center mb-3">
                      <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        My Pantry
                      </Text>
                      <Text className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                        {state.pantryItems.length} items
                      </Text>
                    </View>
                    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                      {state.pantryItems.map((item) => (
                        <HapticTouchableOpacity
                          key={item.id}
                          onLongPress={() => onRemoveFromPantry(item.id)}
                          className="flex-row items-center px-3 py-2 rounded-full border"
                          style={{
                            backgroundColor: isDark ? '#1E3A2F' : '#ECFDF5',
                            borderColor: isDark ? '#065F46' : '#A7F3D0',
                          }}
                        >
                          <Text
                            className="text-sm font-medium"
                            style={{ color: isDark ? '#6EE7B7' : '#065F46' }}
                            numberOfLines={1}
                          >
                            {formatItemName(item.name)}
                          </Text>
                        </HapticTouchableOpacity>
                      ))}
                    </View>
                    <Text className="text-xs text-gray-400 dark:text-gray-500 text-center mt-3">
                      Long-press to remove from pantry
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Quantity Modal */}
      <Modal
        visible={state.showEditQuantityModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => dispatch({ type: 'CLOSE_EDIT_QUANTITY_MODAL' })}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-6 pb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Item</Text>
              <HapticTouchableOpacity onPress={() => dispatch({ type: 'CLOSE_EDIT_QUANTITY_MODAL' })}>
                <Icon name={Icons.CLOSE} size={IconSizes.LG} color="#6B7280" accessibilityLabel="Close modal" />
              </HapticTouchableOpacity>
            </View>

            {state.selectedItem && (
              <>
                <Text className="text-gray-600 dark:text-gray-300 mb-2">
                  {state.selectedItem.name}
                </Text>
                <TextInput
                  placeholder="Quantity (e.g., 2 cups, 1 lb)"
                  value={state.editingQuantity}
                  onChangeText={(text) => dispatch({ type: 'UPDATE', payload: { editingQuantity: text } })}
                  className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-lg mb-3 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
                  placeholderTextColor="#9CA3AF"
                  autoFocus={true}
                />
                <TextInput
                  placeholder="Price (e.g., 3.99)"
                  value={state.editingPrice}
                  onChangeText={(text) => dispatch({ type: 'UPDATE', payload: { editingPrice: text } })}
                  className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-lg mb-2 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  onSubmitEditing={onSaveQuantity}
                />
                {editItemLastPrice != null && (
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mb-3 ml-1">
                    Was ${editItemLastPrice.toFixed(2)} last time
                  </Text>
                )}
                <TextInput
                  placeholder="Notes (e.g., the organic one in the green box)"
                  value={state.editingNotes}
                  onChangeText={(text) => dispatch({ type: 'UPDATE', payload: { editingNotes: text } })}
                  className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-lg mb-4 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
                  placeholderTextColor="#9CA3AF"
                  multiline={true}
                  numberOfLines={2}
                  style={{ minHeight: 60, textAlignVertical: 'top' }}
                />

                {/* Photo picker */}
                <View className="flex-row items-center mb-4" style={{ gap: 12 }}>
                  {state.editingPhotoUrl ? (
                    <Image
                      source={{ uri: state.editingPhotoUrl }}
                      style={{ width: 64, height: 64, borderRadius: 8 }}
                    />
                  ) : null}
                  <HapticTouchableOpacity
                    onPress={handlePickPhoto}
                    disabled={state.uploadingPhoto}
                    className="flex-row items-center px-4 py-2.5 rounded-lg border"
                    style={{ borderColor: isDark ? '#4B5563' : '#D1D5DB', gap: 8 }}
                  >
                    {state.uploadingPhoto ? (
                      <AnimatedActivityIndicator size="small" color={isDark ? DarkColors.primary : Colors.primary} />
                    ) : (
                      <Icon name={Icons.CAMERA_OUTLINE} size={IconSizes.MD} color={isDark ? DarkColors.primary : Colors.primary} accessibilityLabel="Add photo" />
                    )}
                    <Text className="text-sm font-medium" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
                      {state.editingPhotoUrl ? 'Change Photo' : 'Add Photo'}
                    </Text>
                  </HapticTouchableOpacity>
                  {state.editingPhotoUrl && (
                    <HapticTouchableOpacity
                      onPress={() => dispatch({ type: 'UPDATE', payload: { editingPhotoUrl: null } })}
                      className="p-2"
                    >
                      <Icon name={Icons.CLOSE} size={IconSizes.SM} color="#6B7280" accessibilityLabel="Remove photo" />
                    </HapticTouchableOpacity>
                  )}
                </View>

                <View className="flex-row" style={{ gap: 8 }}>
                  <HapticTouchableOpacity
                    onPress={() => dispatch({ type: 'CLOSE_EDIT_QUANTITY_MODAL' })}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 py-3 rounded-lg"
                    disabled={state.updatingQuantity}
                  >
                    <Text className="text-center font-semibold text-gray-700 dark:text-gray-100">Cancel</Text>
                  </HapticTouchableOpacity>
                  <HapticTouchableOpacity
                    onPress={onSaveQuantity}
                    className={`flex-1 py-3 rounded-lg ${state.updatingQuantity ? 'opacity-50' : ''}`}
                    style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
                    disabled={state.updatingQuantity}
                  >
                    {state.updatingQuantity ? (
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
    </>
  );
}
