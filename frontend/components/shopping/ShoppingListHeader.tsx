// frontend/components/shopping/ShoppingListHeader.tsx
// Simplified header with list picker, "+" add button, and "..." overflow menu

import { View, Text, ScrollView, TextInput, Modal, Animated } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import AnimatedActivityIndicator from '../ui/AnimatedActivityIndicator';
import ActionSheet, { ActionSheetItem } from '../ui/ActionSheet';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { HapticPatterns } from '../../constants/Haptics';
import { ShoppingList } from '../../types';
import type { ShoppingListState } from '../../hooks/useShoppingList';

interface ShoppingListHeaderProps {
  state: ShoppingListState;
  dispatch: React.Dispatch<any>;
  onSelectList: (listId: string) => void;
  onEditName: () => void;
  onSaveName: () => void;
  onDeleteList: () => void;
  onCreateList: () => void;
  onSaveNewList: () => void;
  onAddItem: () => void;
  onToggleHidePurchased: () => void;
  onToggleGroupByRecipe: () => void;
  onToggleInStoreMode: () => void;
  onMarkAllComplete: () => void;
  onUndoMarkAllComplete: () => void;
  listPickerScale: Animated.Value;
  listPickerOpacity: Animated.Value;
  editNameScale: Animated.Value;
  editNameOpacity: Animated.Value;
  createListScale: Animated.Value;
  createListOpacity: Animated.Value;
}

export default function ShoppingListHeader({
  state,
  dispatch,
  onSelectList,
  onEditName,
  onSaveName,
  onDeleteList,
  onCreateList,
  onSaveNewList,
  onAddItem,
  onToggleHidePurchased,
  onToggleGroupByRecipe,
  onToggleInStoreMode,
  onMarkAllComplete,
  onUndoMarkAllComplete,
  listPickerScale,
  listPickerOpacity,
  editNameScale,
  editNameOpacity,
  createListScale,
  createListOpacity,
}: ShoppingListHeaderProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const currentItems = state.selectedList?.items || [];
  const hasPurchasedItems = currentItems.some(item => item.purchased);
  const hasRecipeItems = currentItems.some(item => item.recipeId);
  const allPurchased = currentItems.length > 0 && currentItems.every(item => item.purchased);

  // Build overflow menu items
  const overflowItems: ActionSheetItem[] = [];

  if (state.selectedList) {
    overflowItems.push({
      label: 'Edit List Name',
      icon: 'create-outline',
      onPress: onEditName,
    });

    overflowItems.push({
      label: 'Create New List',
      icon: 'add-circle-outline',
      onPress: onCreateList,
    });

    if (state.shoppingLists.length > 1) {
      overflowItems.push({
        label: 'Merge Lists',
        icon: 'git-merge-outline',
        onPress: () => dispatch({ type: 'UPDATE', payload: { showMergeModal: true } }),
      });
    }

    if (currentItems.length > 0) {
      if (hasPurchasedItems) {
        overflowItems.push({
          label: state.hidePurchased ? 'Show Purchased Items ✓' : 'Hide Purchased Items',
          icon: state.hidePurchased ? 'eye-outline' : 'eye-off-outline',
          onPress: onToggleHidePurchased,
        });
      }

      if (hasRecipeItems) {
        overflowItems.push({
          label: state.groupByRecipe ? 'Group by Recipe ✓' : 'Group by Recipe',
          icon: 'restaurant-outline',
          onPress: onToggleGroupByRecipe,
        });
      }

      overflowItems.push({
        label: state.inStoreMode ? 'In-Store Mode ✓' : 'In-Store Mode',
        icon: 'storefront-outline',
        onPress: onToggleInStoreMode,
      });

      if (state.showUndoButton) {
        overflowItems.push({
          label: 'Undo Mark All Complete',
          icon: 'arrow-undo-outline',
          onPress: onUndoMarkAllComplete,
        });
      } else if (!allPurchased) {
        overflowItems.push({
          label: 'Mark All Complete',
          icon: 'checkmark-done-outline',
          onPress: onMarkAllComplete,
        });
      }
    }

    overflowItems.push({
      label: 'Delete List',
      icon: 'trash-outline',
      onPress: onDeleteList,
      destructive: true,
      color: 'red',
    });
  }

  return (
    <>
      {/* Page Title + Actions */}
      <View className="bg-white dark:bg-gray-800 px-4 pt-4 pb-3 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center justify-between" style={{ height: 28 }}>
          <View className="flex-row items-center flex-1">
            <Text className="text-2xl mr-2" style={{ lineHeight: 28 }}>🛒</Text>
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100" accessibilityRole="header" style={{ lineHeight: 28 }}>Shopping Lists</Text>
          </View>
        </View>
      </View>

      {/* List Selector + Add + Overflow */}
      <View className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <HapticTouchableOpacity
            onPress={() => dispatch({ type: 'UPDATE', payload: { showListPicker: true } })}
            className="flex-1 flex-row items-center justify-between bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3"
          >
            <View className="flex-1 flex-row items-center">
              <Icon name={Icons.SHOPPING_LIST_OUTLINE} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Shopping list" style={{ marginRight: 8 }} />
              <Text className="text-gray-900 dark:text-gray-100 font-semibold flex-1" numberOfLines={1}>
                {state.selectedList?.name || 'Select a list'}
              </Text>
            </View>
            <Icon name={Icons.CHEVRON_DOWN} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Open dropdown" />
          </HapticTouchableOpacity>

          {state.selectedList && (
            <>
              {/* Add Item Button */}
              <HapticTouchableOpacity
                onPress={onAddItem}
                className="p-3 rounded-lg"
                style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
                accessibilityLabel="Add item"
              >
                <Icon name={Icons.ADD} size={IconSizes.MD} color="white" accessibilityLabel="Add item" />
              </HapticTouchableOpacity>

              {/* Overflow Menu Button */}
              <HapticTouchableOpacity
                onPress={() => dispatch({ type: 'UPDATE', payload: { showOverflowMenu: true } })}
                className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
                accessibilityLabel="More options"
              >
                <Icon name={Icons.MORE} size={IconSizes.MD} color={isDark ? 'white' : '#6B7280'} accessibilityLabel="More options" />
              </HapticTouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Overflow Action Sheet */}
      <ActionSheet
        visible={state.showOverflowMenu || false}
        onClose={() => dispatch({ type: 'UPDATE', payload: { showOverflowMenu: false } })}
        items={overflowItems}
        title="List Options"
      />

      {/* List Picker Modal */}
      <Modal
        visible={state.showListPicker}
        transparent={true}
        animationType="none"
        onRequestClose={() => dispatch({ type: 'UPDATE', payload: { showListPicker: false } })}
      >
        <Animated.View
          className="flex-1 bg-black/50 justify-center items-center px-4"
          style={{ opacity: listPickerOpacity }}
        >
          <HapticTouchableOpacity
            activeOpacity={1}
            onPress={() => dispatch({ type: 'UPDATE', payload: { showListPicker: false } })}
            className="flex-1 w-full justify-center items-center"
          >
            <HapticTouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <Animated.View
                className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-sm shadow-lg"
                style={{ transform: [{ scale: listPickerScale }] }}
              >
                <View className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Select Shopping List</Text>
                </View>

                <ScrollView className="max-h-80">
                  {state.shoppingLists.map((list) => (
                    <HapticTouchableOpacity
                      key={list.id}
                      onPress={() => onSelectList(list.id)}
                      className={`px-4 py-3 flex-row items-center border-b border-gray-100 dark:border-gray-700 ${
                        state.selectedList?.id === list.id ? '' : 'bg-white dark:bg-gray-800'
                      }`}
                      style={state.selectedList?.id === list.id ? { backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight } : undefined}
                    >
                      <Icon
                        name={state.selectedList?.id === list.id ? Icons.CHECKMARK_CIRCLE : Icons.ELLIPSE_OUTLINE}
                        size={IconSizes.MD}
                        color={state.selectedList?.id === list.id ? (isDark ? DarkColors.primary : Colors.primary) : "#9CA3AF"}
                        accessibilityLabel={state.selectedList?.id === list.id ? "Selected" : "Not selected"}
                        style={{ marginRight: 12 }}
                      />
                      <View className="flex-1">
                        <Text className={`text-base ${state.selectedList?.id === list.id ? 'font-semibold' : 'text-gray-900 dark:text-gray-100'}`} style={state.selectedList?.id === list.id ? { color: isDark ? DarkColors.primaryDark : Colors.primaryDark } : undefined}>
                          {list.name}
                        </Text>
                        <Text className="text-xs text-gray-500 mt-1">
                          {list.items?.length || 0} items
                        </Text>
                      </View>
                    </HapticTouchableOpacity>
                  ))}

                  {state.shoppingLists.length === 0 && (
                    <View className="px-4 py-8 items-center">
                      <Icon name={Icons.CART_OUTLINE} size={48} color="#9CA3AF" accessibilityLabel="No shopping lists" />
                      <Text className="text-gray-500 dark:text-gray-200 mt-4 text-center">No shopping lists yet</Text>
                    </View>
                  )}
                </ScrollView>

                <HapticTouchableOpacity
                  onPress={() => {
                    dispatch({ type: 'UPDATE', payload: { showListPicker: false } });
                    onCreateList();
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
        visible={state.showCreateListModal}
        transparent={true}
        animationType="none"
        onRequestClose={() => dispatch({ type: 'CLOSE_CREATE_LIST' })}
      >
        <Animated.View
          className="flex-1 bg-black/50 items-center justify-center px-4"
          style={{ opacity: createListOpacity }}
        >
          <Animated.View
            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm"
            style={{ transform: [{ scale: createListScale }] }}
          >
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Create New Shopping List
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Give your shopping list a name
            </Text>
            <TextInput
              placeholder="e.g., Weekly Groceries, Costco Trip"
              value={state.newListName}
              onChangeText={(text) => dispatch({ type: 'UPDATE', payload: { newListName: text } })}
              className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-lg mb-4 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
              placeholderTextColor="#9CA3AF"
              autoFocus={true}
              onSubmitEditing={onSaveNewList}
              maxLength={100}
            />
            <View className="flex-row" style={{ gap: 8 }}>
              <HapticTouchableOpacity
                onPress={() => dispatch({ type: 'CLOSE_CREATE_LIST' })}
                className="flex-1 bg-gray-200 dark:bg-gray-700 py-3 rounded-lg"
                disabled={state.creatingList}
              >
                <Text className="text-center font-semibold text-gray-700 dark:text-gray-100">Cancel</Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={onSaveNewList}
                className={`flex-1 py-3 rounded-lg ${state.creatingList || !state.newListName.trim() ? 'opacity-50' : ''}`}
                style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
                disabled={state.creatingList || !state.newListName.trim()}
              >
                {state.creatingList ? (
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
        visible={state.showEditNameModal}
        transparent={true}
        animationType="none"
        onRequestClose={() => dispatch({ type: 'CLOSE_EDIT_NAME' })}
      >
        <Animated.View
          className="flex-1 bg-black/50 items-center justify-center px-4"
          style={{ opacity: editNameOpacity }}
        >
          <Animated.View
            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm"
            style={{ transform: [{ scale: editNameScale }] }}
          >
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Edit List Name
            </Text>

            <TextInput
              value={state.editingListName}
              onChangeText={(text) => dispatch({ type: 'UPDATE', payload: { editingListName: text } })}
              placeholder="Enter list name"
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 mb-4 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
              placeholderTextColor="#9CA3AF"
              autoFocus={true}
              maxLength={100}
            />

            <View className="flex-row space-x-3">
              <HapticTouchableOpacity
                onPress={() => dispatch({ type: 'CLOSE_EDIT_NAME' })}
                disabled={state.updatingName}
                className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">Cancel</Text>
              </HapticTouchableOpacity>

              <HapticTouchableOpacity
                onPress={onSaveName}
                disabled={state.updatingName}
                className={`flex-1 py-3 px-4 rounded-lg ${state.updatingName ? 'opacity-50' : ''}`}
                style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
              >
                <Text className="text-white font-medium text-center">
                  {state.updatingName ? 'Saving...' : 'Save'}
                </Text>
              </HapticTouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}
