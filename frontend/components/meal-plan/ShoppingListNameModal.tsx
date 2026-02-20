// frontend/components/meal-plan/ShoppingListNameModal.tsx
// Modal for naming a shopping list before generation

import React from 'react';
import { View, Text, TextInput, Modal } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import PulsingLoader from '../ui/PulsingLoader';

interface ShoppingListNameModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Current shopping list name */
  shoppingListName: string;
  /** Whether the shopping list is being generated */
  generatingShoppingList: boolean;
  /** Whether dark mode is active */
  isDark: boolean;
  /** Close the modal */
  onClose: () => void;
  /** Update the shopping list name */
  onNameChange: (name: string) => void;
  /** Confirm and generate the shopping list */
  onConfirm: () => void;
}

export default function ShoppingListNameModal({
  visible,
  shoppingListName,
  generatingShoppingList,
  isDark,
  onClose,
  onNameChange,
  onConfirm,
}: ShoppingListNameModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black bg-opacity-50 items-center justify-center px-4">
        <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Name Your Shopping List
          </Text>
          <Text className="text-gray-600 dark:text-gray-100 mb-4 text-sm">
            Enter a name for your shopping list (or leave blank to use default)
          </Text>

          <TextInput
            value={shoppingListName}
            onChangeText={onNameChange}
            placeholder="e.g., Weekly Groceries, Thanksgiving Shopping"
            placeholderTextColor="#9CA3AF"
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 mb-4 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
            autoFocus={true}
            maxLength={100}
          />

          <View className="flex-row space-x-3">
            <HapticTouchableOpacity
              onPress={onClose}
              className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg"
            >
              <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">Cancel</Text>
            </HapticTouchableOpacity>

            <HapticTouchableOpacity
              onPress={onConfirm}
              disabled={generatingShoppingList}
              className={`flex-1 py-3 px-4 bg-emerald-500 dark:bg-emerald-600 rounded-lg ${generatingShoppingList ? 'opacity-50' : ''} flex-row items-center justify-center`}
            >
              {generatingShoppingList ? (
                <>
                  <PulsingLoader size={14} color="white" />
                  <Text className="text-white font-medium text-center ml-2">Generating...</Text>
                </>
              ) : (
                <Text className="text-white font-medium text-center">Create</Text>
              )}
            </HapticTouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
