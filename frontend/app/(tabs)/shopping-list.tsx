// frontend/app/(tabs)/shopping-list.tsx
// Shopping list screen - refactored to use extracted components and useShoppingList hook

import { View, Text, ScrollView } from 'react-native';
import { useEffect, useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';
import AnimatedActivityIndicator from '../../components/ui/AnimatedActivityIndicator';
import AnimatedEmptyState from '../../components/ui/AnimatedEmptyState';
import SwipeableItem from '../../components/ui/SwipeableItem';
import LoadingState from '../../components/ui/LoadingState';
import Icon from '../../components/ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { ShoppingListEmptyStates } from '../../constants/EmptyStates';
import { ShoppingListLoadingStates } from '../../constants/LoadingStates';
import { useShoppingList, categorizeItem, AISLE_ORDER, DEFAULT_AISLE_ORDER, AISLE_EMOJI } from '../../hooks/useShoppingList';
import { ShoppingListItem as ShoppingListItemType } from '../../types';
import {
  ShoppingListHeader,
  ShoppingListItem,
  ShoppingListCategory,
  AddItemModal,
  MergeListsModal,
  OfflineBanner,
} from '../../components/shopping';

export default function ShoppingListScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { activateInStore } = useLocalSearchParams<{ activateInStore?: string }>();

  const {
    state,
    dispatch,
    currentItems,
    visibleItems,
    itemsByRecipe,
    progressStats,
    estimatedCost,
    purchaseHistoryPriceMap,
    pantrySet,
    listPickerScale,
    listPickerOpacity,
    editNameScale,
    editNameOpacity,
    mergeScale,
    mergeOpacity,
    createListScale,
    createListOpacity,
    handleSelectList,
    handleEditName,
    handleSaveName,
    handleCreateList,
    handleSaveNewList,
    handleDeleteList,
    handleConfirmMerge,
    handleAddItem,
    handleQuickAddSuggestion,
    handleGenerateFromMealPlan,
    handleFABPress,
    handleTogglePurchased,
    handleSaveQuantity,
    handlePickItemPhoto,
    handleMarkSelectedComplete,
    handleMarkAllComplete,
    handleUndoMarkAllComplete,
    handleDeleteItem,
    toggleHidePurchased,
    toggleGroupByRecipe,
    toggleInStoreMode,
    handleCantFind,
    handleBuyAgainItem,
    handleToggleFavorite,
    handleReorderLastWeek,
    handleAddToPantry,
    handleRemoveFromPantry,
    handleSetupDefaultPantry,
  } = useShoppingList();

  // Auto-activate in-store mode when navigated from Shopping Mode FAB action
  useEffect(() => {
    if (activateInStore === 'true' && !state.inStoreMode && !state.loading && currentItems.length > 0) {
      toggleInStoreMode();
      router.setParams({ activateInStore: '' });
    }
  }, [activateInStore, state.inStoreMode, state.loading, currentItems.length]);

  const selectedItemsSet = new Set(state.selectedItems);

  // Compute aisle-grouped items for in-store mode
  const itemsByAisle = useMemo(() => {
    if (!state.inStoreMode || state.groupByRecipe) return null;

    const cantFindSet = new Set(state.cantFindItems);
    const categoryMap = new Map<string, ShoppingListItemType[]>();

    visibleItems.forEach(item => {
      if (cantFindSet.has(item.id)) return; // Handle separately
      const category = item.category || categorizeItem(item.name) || 'Other';
      if (!categoryMap.has(category)) categoryMap.set(category, []);
      categoryMap.get(category)!.push(item);
    });

    const groups: { category: string; items: ShoppingListItemType[] }[] = [];

    const sortedCategories = Array.from(categoryMap.entries()).sort(([a], [b]) => {
      return (AISLE_ORDER[a] ?? DEFAULT_AISLE_ORDER) - (AISLE_ORDER[b] ?? DEFAULT_AISLE_ORDER);
    });

    sortedCategories.forEach(([category, items]) => {
      if (items.length > 0) groups.push({ category, items });
    });

    const cantFindItems = visibleItems.filter(i => cantFindSet.has(i.id));
    if (cantFindItems.length > 0) groups.push({ category: "Can't Find", items: cantFindItems });

    return groups;
  }, [state.inStoreMode, state.groupByRecipe, visibleItems, state.cantFindItems]);

  if (state.loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
        <LoadingState config={ShoppingListLoadingStates.lists} fullScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      <ShoppingListHeader
        state={state}
        dispatch={dispatch}
        onSelectList={handleSelectList}
        onEditName={handleEditName}
        onSaveName={handleSaveName}
        onDeleteList={handleDeleteList}
        onCreateList={handleCreateList}
        onSaveNewList={handleSaveNewList}
        onAddItem={handleFABPress}
        onToggleHidePurchased={toggleHidePurchased}
        onToggleGroupByRecipe={toggleGroupByRecipe}
        onToggleInStoreMode={toggleInStoreMode}
        onMarkAllComplete={handleMarkAllComplete}
        onUndoMarkAllComplete={handleUndoMarkAllComplete}
        listPickerScale={listPickerScale}
        listPickerOpacity={listPickerOpacity}
        editNameScale={editNameScale}
        editNameOpacity={editNameOpacity}
        createListScale={createListScale}
        createListOpacity={createListOpacity}
      />

      {state.selectedList && (
        <View className="flex-1">
          {/* Offline Banner */}
          {(state.isOffline || state.hasPendingSync || (state.cacheAge != null && state.cacheAge > 3600000)) && (
            <OfflineBanner
              isOffline={state.isOffline}
              hasPendingSync={state.hasPendingSync}
              cacheAge={state.cacheAge}
            />
          )}

          {/* Slim Progress Bar */}
          {currentItems.length > 0 && (
            <View className="bg-white dark:bg-gray-800 px-4 py-2 border-b border-gray-100 dark:border-gray-700">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {progressStats.purchased}/{progressStats.total} items
                </Text>
                <Text className="text-xs font-semibold" style={{ color: isDark ? '#34D399' : '#047857' }}>
                  ${estimatedCost.toFixed(2)} est.
                </Text>
              </View>
              <View className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? '#374151' : '#E5E7EB' }}>
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${progressStats.total > 0 ? (progressStats.purchased / progressStats.total) * 100 : 0}%`,
                    backgroundColor: isDark ? '#34D399' : '#10B981',
                  }}
                />
              </View>
            </View>
          )}

          {/* Items List */}
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: state.inStoreMode || state.selectionMode ? 80 : Spacing['3xl'] }}
          >
            {visibleItems.length === 0 && currentItems.length > 0 ? (
              <View className="flex-1 items-center justify-center p-8">
                <AnimatedEmptyState
                  config={ShoppingListEmptyStates.allPurchased}
                  title=""
                />
                <View className="mt-8 w-full px-4">
                  <HapticTouchableOpacity
                    onPress={toggleHidePurchased}
                    className="px-6 py-4 rounded-xl flex-row items-center justify-center shadow-lg"
                    style={{ backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}
                  >
                    <Icon name={Icons.EYE_OUTLINE} size={IconSizes.MD} color="white" accessibilityLabel="Show purchased items" style={{ marginRight: 8 }} />
                    <Text className="text-white font-semibold text-base">Show Purchased Items</Text>
                  </HapticTouchableOpacity>
                </View>
              </View>
            ) : currentItems.length === 0 ? (
              <View className="flex-1 items-center justify-center p-8">
                <AnimatedEmptyState
                  config={ShoppingListEmptyStates.emptyList}
                  title=""
                />
                <View className="mt-8 w-full px-4" style={{ gap: 12 }}>
                  <HapticTouchableOpacity
                    onPress={handleGenerateFromMealPlan}
                    disabled={state.generatingFromMealPlan}
                    className="px-6 py-4 rounded-xl flex-row items-center justify-center shadow-lg"
                    style={{
                      backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                      opacity: state.generatingFromMealPlan ? 0.6 : 1,
                    }}
                  >
                    {state.generatingFromMealPlan ? (
                      <AnimatedActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                    ) : (
                      <Icon name={Icons.MEAL_PLAN_OUTLINE} size={IconSizes.MD} color="white" accessibilityLabel="Generate from meal plan" style={{ marginRight: 8 }} />
                    )}
                    <Text className="text-white font-semibold text-base">
                      {state.generatingFromMealPlan ? 'Generating...' : 'Generate from Meal Plan'}
                    </Text>
                  </HapticTouchableOpacity>

                  <HapticTouchableOpacity
                    onPress={handleFABPress}
                    className="px-6 py-4 rounded-xl flex-row items-center justify-center shadow-lg border-2"
                    style={{
                      backgroundColor: 'transparent',
                      borderColor: isDark ? DarkColors.accent : Colors.accent,
                    }}
                  >
                    <Icon name={Icons.ADD} size={IconSizes.MD} color={isDark ? DarkColors.accent : Colors.accent} accessibilityLabel="Add item" style={{ marginRight: 8 }} />
                    <Text
                      className="font-semibold text-base"
                      style={{ color: isDark ? DarkColors.accent : Colors.accent }}
                    >
                      Add Item Manually
                    </Text>
                  </HapticTouchableOpacity>
                </View>
              </View>
            ) : (
              <View className="p-4">
                {state.groupByRecipe && itemsByRecipe ? (
                  <ShoppingListCategory
                    itemsByRecipe={itemsByRecipe}
                    selectionMode={state.selectionMode}
                    selectedItems={state.selectedItems}
                    cantFindItems={state.cantFindItems}
                    inStoreMode={state.inStoreMode}
                    onTogglePurchased={handleTogglePurchased}
                    onEditQuantity={(item) => dispatch({ type: 'OPEN_EDIT_QUANTITY', item })}
                    onDeleteItem={handleDeleteItem}
                    onToggleSelection={(itemId) => dispatch({ type: 'TOGGLE_ITEM_SELECTION', itemId })}
                    onLongPress={(itemId) => dispatch({ type: 'ENTER_SELECTION_MODE', itemId })}
                    onCantFind={handleCantFind}
                  />
                ) : itemsByAisle ? (
                  itemsByAisle.map((group) => (
                    <View key={group.category} className="mb-4">
                      <View className="flex-row items-center mb-2 px-1">
                        <Text className="text-lg mr-1.5">
                          {AISLE_EMOJI[group.category] || '📦'}
                        </Text>
                        <Text className="text-sm font-bold text-gray-700 dark:text-gray-300">
                          {group.category}
                        </Text>
                        <Text className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                          {group.items.filter(i => !i.purchased).length} left
                        </Text>
                      </View>
                      {group.items.map((item) => (
                        <SwipeableItem
                          key={item.id}
                          onDelete={() => handleDeleteItem(item)}
                          disabled={state.selectionMode}
                        >
                          <ShoppingListItem
                            item={item}
                            selectionMode={state.selectionMode}
                            isSelected={selectedItemsSet.has(item.id)}
                            groupByRecipe={state.groupByRecipe}
                            inStoreMode={state.inStoreMode}
                            isCantFind={state.cantFindItems.includes(item.id)}
                            isPantryItem={pantrySet.has(item.name.toLowerCase().trim())}
                            onTogglePurchased={handleTogglePurchased}
                            onEditQuantity={(item) => dispatch({ type: 'OPEN_EDIT_QUANTITY', item })}
                            onToggleSelection={(itemId) => dispatch({ type: 'TOGGLE_ITEM_SELECTION', itemId })}
                            onLongPress={(itemId) => dispatch({ type: 'ENTER_SELECTION_MODE', itemId })}
                            onCantFind={handleCantFind}
                            onAddToPantry={handleAddToPantry}
                          />
                        </SwipeableItem>
                      ))}
                    </View>
                  ))
                ) : (
                  visibleItems.map((item) => (
                    <SwipeableItem
                      key={item.id}
                      onDelete={() => handleDeleteItem(item)}
                      disabled={state.selectionMode}
                    >
                      <ShoppingListItem
                        item={item}
                        selectionMode={state.selectionMode}
                        isSelected={selectedItemsSet.has(item.id)}
                        groupByRecipe={state.groupByRecipe}
                        inStoreMode={state.inStoreMode}
                        isCantFind={state.cantFindItems.includes(item.id)}
                        isPantryItem={pantrySet.has(item.name.toLowerCase().trim())}
                        onTogglePurchased={handleTogglePurchased}
                        onEditQuantity={(item) => dispatch({ type: 'OPEN_EDIT_QUANTITY', item })}
                        onToggleSelection={(itemId) => dispatch({ type: 'TOGGLE_ITEM_SELECTION', itemId })}
                        onLongPress={(itemId) => dispatch({ type: 'ENTER_SELECTION_MODE', itemId })}
                        onCantFind={handleCantFind}
                        onAddToPantry={handleAddToPantry}
                      />
                    </SwipeableItem>
                  ))
                )}
              </View>
            )}
          </ScrollView>

          {/* Floating In-Store Mode Bar */}
          {state.inStoreMode && currentItems.length > 0 && !state.selectionMode && (
            <View
              className="absolute left-4 right-4 bottom-4 flex-row items-center justify-between px-4 py-3 rounded-xl shadow-lg"
              style={{ backgroundColor: isDark ? '#064E3B' : '#059669' }}
            >
              <View className="flex-row items-center">
                <Text className="text-base mr-2">🛒</Text>
                <Text className="text-white font-bold text-base">${estimatedCost.toFixed(2)}</Text>
                <Text className="text-white/70 text-sm ml-1">remaining</Text>
              </View>
              <Text className="text-white font-semibold text-sm">
                {progressStats.purchased}/{progressStats.total} done
              </Text>
            </View>
          )}

          {/* Floating Selection Mode Bar */}
          {state.selectionMode && currentItems.length > 0 && (
            <View
              className="absolute left-4 right-4 bottom-4 flex-row items-center rounded-xl shadow-lg overflow-hidden"
              style={{ backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderWidth: 1, borderColor: isDark ? '#374151' : '#E5E7EB' }}
            >
              <HapticTouchableOpacity
                onPress={() => dispatch({ type: 'EXIT_SELECTION_MODE' })}
                className="flex-1 py-3 items-center"
                style={{ backgroundColor: isDark ? '#374151' : '#F3F4F6' }}
              >
                <Text className="font-semibold text-gray-700 dark:text-gray-100 text-sm">Cancel</Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={handleMarkSelectedComplete}
                disabled={state.selectedItems.length === 0 || state.bulkUpdating}
                className={`flex-1 py-3 items-center ${state.selectedItems.length === 0 || state.bulkUpdating ? 'opacity-50' : ''}`}
                style={{ backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}
              >
                <Text className="font-semibold text-white text-sm">
                  {state.bulkUpdating ? '...' : `Done (${state.selectedItems.length})`}
                </Text>
              </HapticTouchableOpacity>
            </View>
          )}
        </View>
      )}

      {!state.selectedList && state.shoppingLists.length === 0 && (
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
            className="px-6 py-3 rounded-lg"
            style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
          >
            <Text className="text-white font-semibold">Create Shopping List</Text>
          </HapticTouchableOpacity>
        </View>
      )}

      {!state.selectedList && state.shoppingLists.length > 0 && (
        <View className="flex-1 items-center justify-center p-8">
          <Icon name={Icons.SHOPPING_LIST_OUTLINE} size={64} color="#9CA3AF" accessibilityLabel="Select a list" />
          <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-2">
            Select a shopping list
          </Text>
          <Text className="text-gray-600 dark:text-gray-100 text-center mb-6">
            Choose a list from the dropdown above to view and manage items
          </Text>
          <HapticTouchableOpacity
            onPress={() => dispatch({ type: 'UPDATE', payload: { showListPicker: true } })}
            className="px-6 py-3 rounded-lg"
            style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
          >
            <Text className="text-white font-semibold">Select List</Text>
          </HapticTouchableOpacity>
        </View>
      )}

      <MergeListsModal
        state={state}
        dispatch={dispatch}
        onConfirmMerge={handleConfirmMerge}
        mergeScale={mergeScale}
        mergeOpacity={mergeOpacity}
      />

      <AddItemModal
        state={state}
        dispatch={dispatch}
        onAddItem={handleAddItem}
        onSaveQuantity={handleSaveQuantity}
        onPickItemPhoto={handlePickItemPhoto}
        purchaseHistoryPriceMap={purchaseHistoryPriceMap}
        onBuyAgainItem={handleBuyAgainItem}
        onToggleFavorite={handleToggleFavorite}
        onReorderLastWeek={handleReorderLastWeek}
        onRemoveFromPantry={handleRemoveFromPantry}
        onSetupDefaultPantry={handleSetupDefaultPantry}
        onQuickAddSuggestion={handleQuickAddSuggestion}
      />
    </SafeAreaView>
  );
}
