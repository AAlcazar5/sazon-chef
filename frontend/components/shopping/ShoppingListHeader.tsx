// frontend/components/shopping/ShoppingListHeader.tsx
// Simplified header with list picker, "+" add button, and "..." overflow menu

import { View, Text, ScrollView, TextInput, Modal, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import BrandButton from '../ui/BrandButton';
import AnimatedActivityIndicator from '../ui/AnimatedActivityIndicator';
import ActionSheet, { ActionSheetItem } from '../ui/ActionSheet';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors, Pastel, PastelDark, Accent } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { BorderRadius } from '../../constants/Spacing';
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

        <View className="flex-row items-center" style={{ gap: 10 }}>
          {/* List Picker Dropdown */}
          <HapticTouchableOpacity
            onPress={() => dispatch({ type: 'UPDATE', payload: { showListPicker: true } })}
            style={[{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: isDark ? PastelDark.peach : Pastel.peach,
              borderRadius: BorderRadius.card,
              paddingHorizontal: 16,
              paddingVertical: 13,
            }, Shadows.SM]}
          >
            <View className="flex-1 flex-row items-center">
              <View style={{
                width: 32,
                height: 32,
                borderRadius: BorderRadius.full,
                backgroundColor: isDark ? 'rgba(255,183,77,0.2)' : 'rgba(250,126,18,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
              }}>
                <Icon name={Icons.SHOPPING_LIST_OUTLINE} size={IconSizes.SM} color={isDark ? Accent.peach : Colors.primary} accessibilityLabel="Shopping list" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#F3F4F6' : Colors.text.primary, flex: 1 }} numberOfLines={1}>
                {state.selectedList?.name || 'Select a list'}
              </Text>
            </View>
            <View style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              borderRadius: BorderRadius.full,
              padding: 4,
            }}>
              <Icon name={Icons.CHEVRON_DOWN} size={IconSizes.SM} color={isDark ? '#9CA3AF' : '#6B7280'} accessibilityLabel="Open dropdown" />
            </View>
          </HapticTouchableOpacity>

          {state.selectedList && (
            <>
              {/* Add Item Button — gradient circle */}
              <HapticTouchableOpacity
                onPress={onAddItem}
                accessibilityLabel="Add item"
                style={{ borderRadius: BorderRadius.full, overflow: 'hidden', ...Shadows.MD }}
              >
                <LinearGradient
                  colors={['#fa7e12', '#EF4444']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ padding: 12, borderRadius: BorderRadius.full }}
                >
                  <Icon name={Icons.ADD} size={IconSizes.MD} color="white" accessibilityLabel="Add item" />
                </LinearGradient>
              </HapticTouchableOpacity>

              {/* Overflow Menu Button */}
              <HapticTouchableOpacity
                onPress={() => dispatch({ type: 'UPDATE', payload: { showOverflowMenu: true } })}
                style={[{
                  padding: 12,
                  borderRadius: BorderRadius.full,
                  backgroundColor: isDark ? PastelDark.lavender : Pastel.lavender,
                }, Shadows.SM]}
                accessibilityLabel="More options"
              >
                <Icon name={Icons.MORE} size={IconSizes.MD} color={isDark ? Accent.lavender : '#7B1FA2'} accessibilityLabel="More options" />
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
                  borderRadius: BorderRadius['2xl'],
                  width: '100%',
                  maxWidth: 360,
                  overflow: 'hidden',
                }, Shadows.XL, { transform: [{ scale: listPickerScale }] }]}
              >
                {/* Header with pastel accent bar */}
                <View style={{
                  padding: 20,
                  paddingBottom: 14,
                  backgroundColor: isDark ? PastelDark.peach : Pastel.peach,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 22, marginRight: 8 }}>📋</Text>
                    <Text style={{ fontSize: 19, fontWeight: '800', color: isDark ? '#F3F4F6' : Colors.text.primary }}>Pick a list</Text>
                  </View>
                </View>

                <ScrollView className="max-h-80" style={{ paddingVertical: 8 }}>
                  {state.shoppingLists.map((list) => {
                    const isActive = state.selectedList?.id === list.id;
                    return (
                      <HapticTouchableOpacity
                        key={list.id}
                        onPress={() => onSelectList(list.id)}
                        style={[{
                          marginHorizontal: 12,
                          marginVertical: 4,
                          paddingHorizontal: 16,
                          paddingVertical: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          borderRadius: BorderRadius.lg,
                          backgroundColor: isActive
                            ? (isDark ? PastelDark.peach : Pastel.peach)
                            : (isDark ? 'rgba(255,255,255,0.04)' : Colors.surfaceTint),
                        }, isActive ? Shadows.SM : {}]}
                      >
                        <View style={{
                          width: 36,
                          height: 36,
                          borderRadius: BorderRadius.full,
                          backgroundColor: isActive
                            ? (isDark ? 'rgba(250,126,18,0.25)' : 'rgba(250,126,18,0.15)')
                            : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                        }}>
                          <Icon
                            name={isActive ? Icons.CHECKMARK_CIRCLE : Icons.CART_OUTLINE}
                            size={IconSizes.SM}
                            color={isActive ? (isDark ? Accent.peach : Colors.primary) : (isDark ? '#6B7280' : '#9CA3AF')}
                            accessibilityLabel={isActive ? "Selected" : "Not selected"}
                          />
                        </View>
                        <View className="flex-1">
                          <Text style={{
                            fontSize: 16,
                            fontWeight: isActive ? '700' : '500',
                            color: isActive
                              ? (isDark ? Accent.peach : Colors.primaryDark)
                              : (isDark ? '#E5E7EB' : Colors.text.primary),
                          }}>
                            {list.name}
                          </Text>
                          <Text style={{ fontSize: 12, color: isDark ? '#6B7280' : '#9CA3AF', marginTop: 2 }}>
                            {list.items?.length || 0} items
                          </Text>
                        </View>
                        {isActive && (
                          <View style={{
                            backgroundColor: isDark ? 'rgba(250,126,18,0.2)' : 'rgba(250,126,18,0.12)',
                            borderRadius: BorderRadius.full,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                          }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: isDark ? Accent.peach : Colors.primary }}>
                              Active
                            </Text>
                          </View>
                        )}
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

                {/* Create New List — gradient button */}
                <View style={{ marginHorizontal: 16, marginTop: 8, marginBottom: 20 }}>
                  <BrandButton
                    label="Create New List"
                    onPress={() => {
                      dispatch({ type: 'UPDATE', payload: { showListPicker: false } });
                      onCreateList();
                    }}
                    variant="brand"
                    icon="add-circle-outline"
                    accessibilityLabel="Create new list"
                  />
                </View>
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
              borderRadius: BorderRadius['2xl'],
              padding: 24,
              width: '100%',
              maxWidth: 360,
              overflow: 'hidden',
            }, Shadows.XL, { transform: [{ scale: createListScale }] }]}
          >
            {/* Pastel header accent */}
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              backgroundColor: isDark ? Accent.sage : Colors.primary,
              borderTopLeftRadius: BorderRadius['2xl'],
              borderTopRightRadius: BorderRadius['2xl'],
            }} />

            <Text style={{ fontSize: 20, fontWeight: '800', color: isDark ? '#F3F4F6' : Colors.text.primary, marginBottom: 4, marginTop: 4 }}>
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
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : Colors.surfaceTint,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderRadius: BorderRadius.input,
                marginBottom: 20,
                fontSize: 16,
                color: isDark ? '#F3F4F6' : Colors.text.primary,
                ...Shadows.SM,
              }}
              placeholderTextColor={Colors.text.tertiary}
              autoFocus={true}
              onSubmitEditing={onSaveNewList}
              maxLength={100}
            />
            <View className="flex-row" style={{ gap: 12 }}>
              <View style={{ flex: 1 }}>
                <BrandButton
                  label="Cancel"
                  onPress={() => dispatch({ type: 'CLOSE_CREATE_LIST' })}
                  variant="ghost"
                  disabled={state.creatingList}
                  accessibilityLabel="Cancel"
                />
              </View>
              <View style={{ flex: 1 }}>
                <BrandButton
                  label="Create"
                  onPress={onSaveNewList}
                  variant="sage"
                  icon="add-circle-outline"
                  loading={state.creatingList}
                  disabled={state.creatingList || !state.newListName.trim()}
                  accessibilityLabel="Create new list"
                />
              </View>
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
              borderRadius: BorderRadius['2xl'],
              padding: 24,
              width: '100%',
              maxWidth: 360,
              overflow: 'hidden',
            }, Shadows.XL, { transform: [{ scale: editNameScale }] }]}
          >
            {/* Pastel header accent */}
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              backgroundColor: isDark ? Accent.sky : '#42A5F5',
              borderTopLeftRadius: BorderRadius['2xl'],
              borderTopRightRadius: BorderRadius['2xl'],
            }} />

            <Text style={{ fontSize: 20, fontWeight: '800', color: isDark ? '#F3F4F6' : Colors.text.primary, marginBottom: 16, marginTop: 4 }}>
              Rename list
            </Text>

            <TextInput
              value={state.editingListName}
              onChangeText={(text) => dispatch({ type: 'UPDATE', payload: { editingListName: text } })}
              placeholder="Enter list name"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : Colors.surfaceTint,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderRadius: BorderRadius.input,
                marginBottom: 20,
                fontSize: 16,
                color: isDark ? '#F3F4F6' : Colors.text.primary,
                ...Shadows.SM,
              }}
              placeholderTextColor={Colors.text.tertiary}
              autoFocus={true}
              maxLength={100}
            />

            <View className="flex-row" style={{ gap: 12 }}>
              <View style={{ flex: 1 }}>
                <BrandButton
                  label="Cancel"
                  onPress={() => dispatch({ type: 'CLOSE_EDIT_NAME' })}
                  variant="ghost"
                  disabled={state.updatingName}
                  accessibilityLabel="Cancel"
                />
              </View>
              <View style={{ flex: 1 }}>
                <BrandButton
                  label={state.updatingName ? 'Saving...' : 'Save'}
                  onPress={onSaveName}
                  variant="sky"
                  icon="checkmark-circle"
                  disabled={state.updatingName}
                  loading={state.updatingName}
                  accessibilityLabel="Save list name"
                />
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}
