// frontend/components/shopping/AddItemModal.tsx
// Add item and edit quantity modals

import { View, Text, TextInput, Modal } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import AnimatedActivityIndicator from '../ui/AnimatedActivityIndicator';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { HapticPatterns } from '../../constants/Haptics';
import { ShoppingListItem } from '../../types';
import type { ShoppingListState } from '../../hooks/useShoppingList';

interface AddItemModalProps {
  state: ShoppingListState;
  dispatch: React.Dispatch<any>;
  onAddItem: () => void;
  onSaveQuantity: () => void;
  purchaseHistoryPriceMap: Map<string, number>;
}

export default function AddItemModal({
  state,
  dispatch,
  onAddItem,
  onSaveQuantity,
  purchaseHistoryPriceMap,
}: AddItemModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const editItemLastPrice = state.selectedItem
    ? purchaseHistoryPriceMap.get(state.selectedItem.name.toLowerCase().trim())
    : undefined;

  return (
    <>
      {/* Add Item Modal */}
      <Modal
        visible={state.showAddItemModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => dispatch({ type: 'CLOSE_ADD_ITEM_MODAL' })}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-6 pb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">Add Item</Text>
              <HapticTouchableOpacity onPress={() => dispatch({ type: 'CLOSE_ADD_ITEM_MODAL' })}>
                <Icon name={Icons.CLOSE} size={IconSizes.LG} color="#6B7280" accessibilityLabel="Close modal" />
              </HapticTouchableOpacity>
            </View>

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
              <View className="mb-6">
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
                onPress={() => dispatch({ type: 'CLOSE_ADD_ITEM_MODAL' })}
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
