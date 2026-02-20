// frontend/components/shopping/MergeListsModal.tsx
// List merge functionality modal

import { View, Text, TextInput, ScrollView, Modal, Animated } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import type { ShoppingListState } from '../../hooks/useShoppingList';

interface MergeListsModalProps {
  state: ShoppingListState;
  dispatch: React.Dispatch<any>;
  onConfirmMerge: () => void;
  mergeScale: Animated.Value;
  mergeOpacity: Animated.Value;
}

export default function MergeListsModal({
  state,
  dispatch,
  onConfirmMerge,
  mergeScale,
  mergeOpacity,
}: MergeListsModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const selectedSet = new Set(state.selectedListsForMerge);

  return (
    <Modal
      visible={state.showMergeModal}
      transparent={true}
      animationType="none"
      onRequestClose={() => dispatch({ type: 'RESET_MERGE' })}
    >
      <Animated.View
        className="flex-1 bg-black/50 items-center justify-center px-4"
        style={{ opacity: mergeOpacity }}
      >
        <Animated.View
          className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm max-h-[80%]"
          style={{ transform: [{ scale: mergeScale }] }}
        >
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Merge Shopping Lists
          </Text>
          <Text className="text-gray-600 dark:text-gray-100 mb-2 text-sm">
            Select at least 2 lists to combine into a new weekly shopping list
          </Text>
          {state.selectedListsForMerge.length > 0 && (
            <Text className="mb-4 text-sm font-medium" style={{ color: isDark ? DarkColors.primaryDark : Colors.primaryDark }}>
              {state.selectedListsForMerge.length} list{state.selectedListsForMerge.length !== 1 ? 's' : ''} selected
            </Text>
          )}

          <ScrollView className="max-h-64 mb-4">
            {state.shoppingLists.map((list) => {
              const isSelected = selectedSet.has(list.id);
              return (
                <HapticTouchableOpacity
                  key={list.id}
                  onPress={() => dispatch({ type: 'TOGGLE_MERGE_SELECTION', listId: list.id })}
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

          {state.selectedListsForMerge.length >= 2 && (
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Name for merged list:</Text>
              <TextInput
                value={state.mergeName}
                onChangeText={(text) => dispatch({ type: 'UPDATE', payload: { mergeName: text } })}
                placeholder="e.g., Weekly Shopping, Grocery Run"
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          )}

          <View className="flex-row space-x-3">
            <HapticTouchableOpacity
              onPress={() => dispatch({ type: 'RESET_MERGE' })}
              disabled={state.mergingLists}
              className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg"
            >
              <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">Cancel</Text>
            </HapticTouchableOpacity>

            <HapticTouchableOpacity
              onPress={onConfirmMerge}
              disabled={state.mergingLists || state.selectedListsForMerge.length < 2}
              className={`flex-1 py-3 px-4 rounded-lg ${
                (state.mergingLists || state.selectedListsForMerge.length < 2)
                  ? 'bg-gray-300 dark:bg-gray-600'
                  : ''
              }`}
              style={(state.mergingLists || state.selectedListsForMerge.length < 2) ? undefined : { backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
            >
              <Text className={`font-medium text-center ${
                (state.mergingLists || state.selectedListsForMerge.length < 2)
                  ? 'text-gray-500 dark:text-gray-200'
                  : 'text-white'
              }`}>
                {state.mergingLists
                  ? 'Merging...'
                  : state.selectedListsForMerge.length < 2
                  ? `Select ${2 - state.selectedListsForMerge.length} more list${2 - state.selectedListsForMerge.length !== 1 ? 's' : ''}`
                  : 'Merge Lists'}
              </Text>
            </HapticTouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
