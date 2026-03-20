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
import { Shadows } from '../../constants/Shadows';
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
      {/* Page Title + List Selector */}
      <View style={[{ backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }, Shadows.SM]}>
        <View className="flex-row items-center justify-between" style={{ height: 28, marginBottom: 12 }}>
          <View className="flex-row items-center flex-1">
            <Text className="text-2xl mr-2" style={{ lineHeight: 28 }}>🛒</Text>
            <Text className="text-2xl font-extrabold text-gray-900 dark:text-gray-100" accessibilityRole="header" style={{ lineHeight: 28 }}>Shopping</Text>
          </View>
        </View>

        <View className="flex-row items-center" style={{ gap: 8 }}>
          <HapticTouchableOpacity
            onPress={() => dispatch({ type: 'UPDATE', payload: { showListPicker: true } })}
            style={[{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }]}
          >
            <View className="flex-1 flex-row items-center">
              <Icon name={Icons.SHOPPING_LIST_OUTLINE} size={IconSizes.MD} color={isDark ? '#9CA3AF' : '#6B7280'} accessibilityLabel="Shopping list" style={{ marginRight: 8 }} />
              <Text className="text-gray-900 dark:text-gray-100 font-semibold flex-1" numberOfLines={1}>
                {state.selectedList?.name || 'Select a list'}
              </Text>
            </View>
            <Icon name={Icons.CHEVRON_DOWN} size={IconSizes.MD} color={isDark ? '#9CA3AF' : '#6B7280'} accessibilityLabel="Open dropdown" />
          </HapticTouchableOpacity>

          {state.selectedList && (
            <>
              {/* Add Item Button */}
              <HapticTouchableOpacity
                onPress={onAddItem}
                style={[{
                  padding: 12,
                  borderRadius: 100,
                  backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                }, Shadows.SM]}
                accessibilityLabel="Add item"
              >
                <Icon name={Icons.ADD} size={IconSizes.MD} color="white" accessibilityLabel="Add item" />
              </HapticTouchableOpacity>

              {/* Overflow Menu Button */}
              <HapticTouchableOpacity
                onPress={() => dispatch({ type: 'UPDATE', payload: { showOverflowMenu: true } })}
                style={{
                  padding: 12,
                  borderRadius: 100,
                  backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                }}
                accessibilityLabel="More options"
              >
                <Icon name={Icons.MORE} size={IconSizes.MD} color={isDark ? '#E5E7EB' : '#6B7280'} accessibilityLabel="More options" />
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
                style={[{
                  backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                  borderRadius: 24,
                  width: '100%',
                  maxWidth: 360,
                  overflow: 'hidden',
                }, Shadows.XL, { transform: [{ scale: listPickerScale }] }]}
              >
                <View style={{ padding: 20, paddingBottom: 12 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? DarkColors.text.primary : Colors.text.primary }}>Pick a list</Text>
                </View>

                <ScrollView className="max-h-80">
                  {state.shoppingLists.map((list) => {
                    const isActive = state.selectedList?.id === list.id;
                    return (
                      <HapticTouchableOpacity
                        key={list.id}
                        onPress={() => onSelectList(list.id)}
                        style={{
                          paddingHorizontal: 20,
                          paddingVertical: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: isActive
                            ? (isDark ? `${Colors.primaryLight}33` : Colors.primaryLight)
                            : 'transparent',
                        }}
                      >
                        <Icon
                          name={isActive ? Icons.CHECKMARK_CIRCLE : Icons.ELLIPSE_OUTLINE}
                          size={IconSizes.MD}
                          color={isActive ? (isDark ? DarkColors.primary : Colors.primary) : "#9CA3AF"}
                          accessibilityLabel={isActive ? "Selected" : "Not selected"}
                          style={{ marginRight: 12 }}
                        />
                        <View className="flex-1">
                          <Text style={{ fontSize: 16, fontWeight: isActive ? '600' : '400', color: isActive ? (isDark ? DarkColors.primaryDark : Colors.primaryDark) : (isDark ? DarkColors.text.primary : Colors.text.primary) }}>
                            {list.name}
                          </Text>
                          <Text style={{ fontSize: 12, color: isDark ? '#6B7280' : '#9CA3AF', marginTop: 2 }}>
                            {list.items?.length || 0} items
                          </Text>
                        </View>
                      </HapticTouchableOpacity>
                    );
                  })}

                  {state.shoppingLists.length === 0 && (
                    <View style={{ paddingHorizontal: 20, paddingVertical: 32, alignItems: 'center' }}>
                      <Icon name={Icons.CART_OUTLINE} size={48} color="#9CA3AF" accessibilityLabel="No shopping lists" />
                      <Text style={{ color: isDark ? '#D1D5DB' : '#6B7280', marginTop: 16, textAlign: 'center' }}>No lists yet</Text>
                    </View>
                  )}
                </ScrollView>

                <HapticTouchableOpacity
                  onPress={() => {
                    dispatch({ type: 'UPDATE', payload: { showListPicker: false } });
                    onCreateList();
                  }}
                  style={{
                    marginHorizontal: 20,
                    marginTop: 8,
                    marginBottom: 20,
                    paddingVertical: 14,
                    borderRadius: 100,
                    backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={Icons.ADD_CIRCLE_OUTLINE} size={IconSizes.MD} color={isDark ? DarkColors.primary : Colors.primary} accessibilityLabel="Create new list" style={{ marginRight: 8 }} />
                  <Text style={{ fontWeight: '600', color: isDark ? DarkColors.primaryDark : Colors.primaryDark }}>Create New List</Text>
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
            style={[{
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              borderRadius: 24,
              padding: 24,
              width: '100%',
              maxWidth: 360,
            }, Shadows.XL, { transform: [{ scale: createListScale }] }]}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? DarkColors.text.primary : Colors.text.primary, marginBottom: 4 }}>
              New list
            </Text>
            <Text style={{ fontSize: 14, color: isDark ? '#9CA3AF' : '#6B7280', marginBottom: 16 }}>
              What are you shopping for?
            </Text>
            <TextInput
              placeholder="e.g., Weekly Groceries, Costco Trip"
              value={state.newListName}
              onChangeText={(text) => dispatch({ type: 'UPDATE', payload: { newListName: text } })}
              style={{
                backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderRadius: 14,
                marginBottom: 16,
                fontSize: 16,
                color: isDark ? DarkColors.text.primary : Colors.text.primary,
              }}
              placeholderTextColor="#9CA3AF"
              autoFocus={true}
              onSubmitEditing={onSaveNewList}
              maxLength={100}
            />
            <View className="flex-row" style={{ gap: 10 }}>
              <HapticTouchableOpacity
                onPress={() => dispatch({ type: 'CLOSE_CREATE_LIST' })}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 100, backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }}
                disabled={state.creatingList}
              >
                <Text style={{ textAlign: 'center', fontWeight: '600', color: isDark ? '#E5E7EB' : '#374151' }}>Cancel</Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={onSaveNewList}
                style={[{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 100,
                  backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                  opacity: state.creatingList || !state.newListName.trim() ? 0.5 : 1,
                }, Shadows.SM]}
                disabled={state.creatingList || !state.newListName.trim()}
              >
                {state.creatingList ? (
                  <AnimatedActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={{ textAlign: 'center', fontWeight: '600', color: '#FFFFFF' }}>Create</Text>
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
            style={[{
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              borderRadius: 24,
              padding: 24,
              width: '100%',
              maxWidth: 360,
            }, Shadows.XL, { transform: [{ scale: editNameScale }] }]}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? DarkColors.text.primary : Colors.text.primary, marginBottom: 16 }}>
              Rename list
            </Text>

            <TextInput
              value={state.editingListName}
              onChangeText={(text) => dispatch({ type: 'UPDATE', payload: { editingListName: text } })}
              placeholder="Enter list name"
              style={{
                backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderRadius: 14,
                marginBottom: 16,
                fontSize: 16,
                color: isDark ? DarkColors.text.primary : Colors.text.primary,
              }}
              placeholderTextColor="#9CA3AF"
              autoFocus={true}
              maxLength={100}
            />

            <View className="flex-row" style={{ gap: 10 }}>
              <HapticTouchableOpacity
                onPress={() => dispatch({ type: 'CLOSE_EDIT_NAME' })}
                disabled={state.updatingName}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 100, backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }}
              >
                <Text style={{ textAlign: 'center', fontWeight: '600', color: isDark ? '#E5E7EB' : '#374151' }}>Cancel</Text>
              </HapticTouchableOpacity>

              <HapticTouchableOpacity
                onPress={onSaveName}
                disabled={state.updatingName}
                style={[{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 100,
                  backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                  opacity: state.updatingName ? 0.5 : 1,
                }, Shadows.SM]}
              >
                <Text style={{ textAlign: 'center', fontWeight: '600', color: '#FFFFFF' }}>
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
