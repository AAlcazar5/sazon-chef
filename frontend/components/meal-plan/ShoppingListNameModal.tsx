// frontend/components/meal-plan/ShoppingListNameModal.tsx
// Bottom sheet for naming a shopping list before generation

import React from 'react';
import { View, Text, TextInput } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import BrandButton from '../ui/BrandButton';
import BottomSheet from '../ui/BottomSheet';

interface ShoppingListNameModalProps {
  visible: boolean;
  shoppingListName: string;
  generatingShoppingList: boolean;
  isDark: boolean;
  onClose: () => void;
  onNameChange: (name: string) => void;
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
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Name Your Shopping List"
      snapPoints={['40%']}
    >
      <View className="px-4 pb-6">
        <Text className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
          Enter a name for your shopping list, or leave blank to use the default.
        </Text>

        <TextInput
          value={shoppingListName}
          onChangeText={onNameChange}
          placeholder="e.g., Weekly Groceries, Thanksgiving Shopping"
          placeholderTextColor="#9CA3AF"
          className=" rounded-lg px-4 py-3 mb-4 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
          autoFocus
          maxLength={100}
        />

        <View className="flex-row space-x-3">
          <HapticTouchableOpacity
            onPress={onClose}
            className="flex-1 py-3 px-4  rounded-lg"
          >
            <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">
              Cancel
            </Text>
          </HapticTouchableOpacity>

          <View className="flex-1">
            <BrandButton
              label={generatingShoppingList ? 'Generating...' : 'Create'}
              onPress={onConfirm}
              loading={generatingShoppingList}
              disabled={generatingShoppingList}
              variant="sage"
              size="compact"
            />
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}
