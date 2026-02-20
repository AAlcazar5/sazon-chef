// frontend/app/(tabs)/shopping-list.tsx
// Shopping list screen - refactored to use extracted components and useShoppingList hook

import { View, Text, ScrollView, Animated } from 'react-native';
import { useCallback, useEffect, useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
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
import { HapticPatterns } from '../../constants/Haptics';
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
  ShoppingListProgress,
  BuyAgainSection,
  PantrySection,
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
    spentSoFar,
    purchaseHistoryPriceMap,
    pantrySet,
    fabScale,
    fabRotation,
    headerHeight,
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
    handleSyncToApp,
    handleSyncBidirectional,
    handleScroll,
    toggleHidePurchased,
    toggleHeaderCollapsed,
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

  // Swipe gesture to toggle hidePurchased / collapse header
  const panGesture = Gesture.Pan()
    .onEnd((event) => {
      const horizontalThreshold = 80;
      const verticalThreshold = 50;

      if (Math.abs(event.translationX) > horizontalThreshold && Math.abs(event.translationX) > Math.abs(event.translationY)) {
        if (event.translationX < 0) {
          if (!state.hidePurchased && currentItems.some(item => item.purchased)) {
            runOnJS(toggleHidePurchased)();
          }
        } else {
          if (state.hidePurchased) {
            runOnJS(toggleHidePurchased)();
          }
        }
      } else if (Math.abs(event.translationY) > verticalThreshold && Math.abs(event.translationY) > Math.abs(event.translationX)) {
        if (event.translationY > 0) {
          if (!state.headerCollapsed) {
            runOnJS(toggleHeaderCollapsed)();
          }
        } else {
          if (state.headerCollapsed) {
            runOnJS(toggleHeaderCollapsed)();
          }
        }
      }
    });

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

          {/* In-Store Mode Banner */}
          {currentItems.length > 0 && (
            <View className="mx-4 mt-3 mb-1">
              <HapticTouchableOpacity
                onPress={toggleInStoreMode}
                className="flex-row items-center justify-between p-3 rounded-xl border-2"
                style={{
                  backgroundColor: state.inStoreMode
                    ? (isDark ? '#064E3B' : '#ECFDF5')
                    : (isDark ? '#1F2937' : '#F9FAFB'),
                  borderColor: state.inStoreMode
                    ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
                    : (isDark ? '#374151' : '#E5E7EB'),
                }}
              >
                <View className="flex-row items-center">
                  <Icon
                    name={Icons.STORE_OUTLINE}
                    size={IconSizes.MD}
                    color={state.inStoreMode ? (isDark ? '#34D399' : Colors.tertiaryGreen) : (isDark ? '#9CA3AF' : '#6B7280')}
                    accessibilityLabel="In-store mode"
                    style={{ marginRight: 10 }}
                  />
                  <View>
                    <Text className="text-sm font-bold" style={{ color: state.inStoreMode ? (isDark ? '#34D399' : Colors.tertiaryGreen) : (isDark ? '#D1D5DB' : '#374151') }}>
                      {state.inStoreMode ? 'In-Store Mode ON' : 'In-Store Mode'}
                    </Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">
                      {state.inStoreMode ? 'Simplified view for shopping' : 'Tap to enable while shopping'}
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center">
                  {state.inStoreMode && (
                    <View className="bg-white dark:bg-gray-800 rounded-full px-2.5 py-1 mr-2">
                      <Text className="text-xs font-bold" style={{ color: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}>
                        {currentItems.filter(i => !i.purchased).length} left
                      </Text>
                    </View>
                  )}
                  <View
                    style={{
                      width: 48,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: state.inStoreMode
                        ? (isDark ? '#34D399' : Colors.tertiaryGreen)
                        : (isDark ? '#374151' : '#D1D5DB'),
                      alignItems: state.inStoreMode ? 'flex-end' : 'flex-start',
                      justifyContent: 'center',
                      paddingHorizontal: Spacing.xs,
                    }}
                  >
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: 'white' }} />
                  </View>
                </View>
              </HapticTouchableOpacity>
            </View>
          )}

          {/* In-Store Mode Running Total */}
          {state.inStoreMode && currentItems.length > 0 && (
            <View className="mx-4 mt-2 mb-1">
              <View
                className="flex-row items-center justify-between p-4 rounded-xl"
                style={{
                  backgroundColor: isDark ? '#064E3B' : '#D1FAE5',
                }}
              >
                <View className="flex-row items-center">
                  <Text className="text-2xl mr-2">🛒</Text>
                  <View>
                    <Text className="text-xs font-medium" style={{ color: isDark ? '#A7F3D0' : '#065F46' }}>
                      Remaining
                    </Text>
                    <Text className="text-2xl font-bold" style={{ color: isDark ? '#34D399' : '#047857' }}>
                      ${estimatedCost.toFixed(2)}
                    </Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-lg font-bold" style={{ color: isDark ? '#34D399' : '#047857' }}>
                    {progressStats.purchased}/{progressStats.total}
                  </Text>
                  <Text className="text-xs" style={{ color: isDark ? '#A7F3D0' : '#065F46' }}>
                    items done
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Collapsible Header Content */}
          <Animated.View
            style={{
              maxHeight: headerHeight.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 2000],
              }),
              overflow: 'hidden',
              opacity: headerHeight,
            }}
          >
            <ShoppingListProgress
              progressStats={progressStats}
              estimatedCost={estimatedCost}
              spentSoFar={spentSoFar}
              currentItems={currentItems}
            />

            {/* Hide Purchased Toggle */}
            {!state.selectionMode && currentItems.length > 0 && currentItems.some(item => item.purchased) && (
              <View className="mx-4 mb-3">
                <HapticTouchableOpacity
                  onPress={toggleHidePurchased}
                  className="flex-row items-center justify-between p-3 rounded-lg border"
                  style={{
                    backgroundColor: isDark ? (state.hidePurchased ? DarkColors.tertiaryGreenLight : '#1F2937') : (state.hidePurchased ? Colors.tertiaryGreenLight : '#F3F4F6'),
                    borderColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen,
                  }}
                >
                  <View className="flex-row items-center">
                    <Icon
                      name={state.hidePurchased ? Icons.EYE_OFF_OUTLINE : Icons.EYE_OUTLINE}
                      size={IconSizes.SM}
                      color={isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen}
                      accessibilityLabel="Toggle purchased items"
                      style={{ marginRight: 8 }}
                    />
                    <Text className="text-sm font-semibold" style={{ color: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}>
                      {state.hidePurchased ? 'Show Purchased Items' : 'Hide Purchased Items'}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    {currentItems.filter(item => item.purchased).length} hidden
                  </Text>
                </HapticTouchableOpacity>
              </View>
            )}

            {/* Group by Recipe Toggle */}
            {!state.selectionMode && currentItems.length > 0 && currentItems.some(item => item.recipeId) && (
              <View className="mx-4 mb-3">
                <HapticTouchableOpacity
                  onPress={toggleGroupByRecipe}
                  className="flex-row items-center justify-between p-3 rounded-lg border"
                  style={{
                    backgroundColor: isDark ? DarkColors.primaryLight : Colors.primaryLight,
                    borderColor: isDark ? DarkColors.primary : Colors.primary,
                  }}
                >
                  <View className="flex-row items-center">
                    <Icon name={Icons.EMPTY_RECIPES} size={IconSizes.SM} color={isDark ? DarkColors.primary : Colors.primary} accessibilityLabel="Group by recipe" style={{ marginRight: 8 }} />
                    <Text className="text-sm font-semibold" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
                      Group by Recipe
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 48,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: state.groupByRecipe
                        ? (isDark ? DarkColors.primary : Colors.primary)
                        : (isDark ? '#374151' : '#D1D5DB'),
                      alignItems: state.groupByRecipe ? 'flex-end' : 'flex-start',
                      justifyContent: 'center',
                      paddingHorizontal: Spacing.xs,
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: 'white',
                      }}
                    />
                  </View>
                </HapticTouchableOpacity>
              </View>
            )}

            {/* Quick Add Suggestions */}
            {!state.selectionMode && state.quickSuggestions.length > 0 && (
              <View className="mx-4 mb-4">
                <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Quick Add</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 16 }}
                >
                  <View className="flex-row" style={{ gap: 8 }}>
                    {state.quickSuggestions.map((suggestion, index) => (
                      <HapticTouchableOpacity
                        key={`${suggestion}-${index}`}
                        onPress={() => handleQuickAddSuggestion(suggestion)}
                        className="px-4 py-2 rounded-full border"
                        style={{
                          backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryDark,
                          borderColor: isDark ? DarkColors.primary : Colors.primaryDark,
                        }}
                      >
                        <Text
                          className="text-sm font-medium"
                          style={{ color: isDark ? DarkColors.primary : '#FFFFFF' }}
                        >
                          {suggestion}
                        </Text>
                      </HapticTouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Buy Again Section */}
            {!state.selectionMode && state.purchaseHistory.length > 0 && (
              <BuyAgainSection
                purchaseHistory={state.purchaseHistory}
                loading={state.loadingPurchaseHistory}
                onAddItem={handleBuyAgainItem}
                onToggleFavorite={handleToggleFavorite}
                onReorderLastWeek={handleReorderLastWeek}
              />
            )}

            {/* My Pantry Section */}
            {!state.selectionMode && (
              <PantrySection
                pantryItems={state.pantryItems}
                loading={state.loadingPantry}
                onRemoveItem={handleRemoveFromPantry}
                onSetupDefaults={handleSetupDefaultPantry}
              />
            )}

            {/* Selection Mode Actions */}
            {state.selectionMode && currentItems.length > 0 && (
              <View className="mx-4 mt-4 mb-2 flex-row" style={{ gap: 8 }}>
                <HapticTouchableOpacity
                  onPress={() => dispatch({ type: 'EXIT_SELECTION_MODE' })}
                  className="flex-1 py-3 px-4 rounded-lg"
                  style={{ backgroundColor: isDark ? '#374151' : '#E5E7EB' }}
                >
                  <Text className="text-center font-semibold text-gray-700 dark:text-gray-100">Cancel</Text>
                </HapticTouchableOpacity>
                <HapticTouchableOpacity
                  onPress={handleMarkSelectedComplete}
                  disabled={state.selectedItems.length === 0 || state.bulkUpdating}
                  className={`flex-1 py-3 px-4 rounded-lg ${state.selectedItems.length === 0 || state.bulkUpdating ? 'opacity-50' : ''}`}
                  style={{ backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}
                >
                  <Text className="text-center font-semibold text-white">
                    {state.bulkUpdating ? 'Updating...' : `Mark ${state.selectedItems.length} Complete`}
                  </Text>
                </HapticTouchableOpacity>
                <HapticTouchableOpacity
                  onPress={handleMarkAllComplete}
                  disabled={state.bulkUpdating || currentItems.every(item => item.purchased)}
                  className={`flex-1 py-3 px-4 rounded-lg ${state.bulkUpdating || currentItems.every(item => item.purchased) ? 'opacity-50' : ''}`}
                  style={{ backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}
                >
                  <Text className="text-center font-semibold text-white">
                    {state.bulkUpdating ? 'Updating...' : 'Mark All Complete'}
                  </Text>
                </HapticTouchableOpacity>
              </View>
            )}

            {/* Add Item Button - When list has items and not in selection mode */}
            {currentItems.length > 0 && !state.selectionMode && (
              <View className="mx-4 mt-4">
                <HapticTouchableOpacity
                  onPress={handleFABPress}
                  className="py-3 px-4 rounded-lg flex-row items-center justify-center shadow-sm"
                  style={{ backgroundColor: isDark ? DarkColors.accent : Colors.accent }}
                >
                  <Animated.View
                    style={{
                      transform: [
                        { scale: fabScale },
                        { rotate: fabRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) },
                      ],
                    }}
                  >
                    <Icon name={Icons.ADD} size={IconSizes.MD} color="white" accessibilityLabel="Add item" style={{ marginRight: 8 }} />
                  </Animated.View>
                  <Text className="text-white font-semibold">Add Item</Text>
                </HapticTouchableOpacity>

                {/* Mark All Complete / Undo Button */}
                {state.showUndoButton ? (
                  <HapticTouchableOpacity
                    onPress={handleUndoMarkAllComplete}
                    disabled={state.bulkUpdating}
                    className={`py-3 px-4 rounded-lg flex-row items-center justify-center shadow-sm mt-2 ${state.bulkUpdating ? 'opacity-50' : ''}`}
                    style={{ backgroundColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}
                  >
                    <Icon name={Icons.CLOSE} size={IconSizes.MD} color="white" accessibilityLabel="Undo mark all complete" style={{ marginRight: 8 }} />
                    <Text className="text-white font-semibold">
                      {state.bulkUpdating ? 'Reverting...' : 'Undo Mark All Complete'}
                    </Text>
                  </HapticTouchableOpacity>
                ) : (
                  !currentItems.every(item => item.purchased) && (
                    <HapticTouchableOpacity
                      onPress={handleMarkAllComplete}
                      disabled={state.bulkUpdating}
                      className={`py-3 px-4 rounded-lg flex-row items-center justify-center shadow-sm mt-2 ${state.bulkUpdating ? 'opacity-50' : ''}`}
                      style={{ backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}
                    >
                      <Icon name={Icons.CHECKMARK_CIRCLE} size={IconSizes.MD} color="white" accessibilityLabel="Mark all complete" style={{ marginRight: 8 }} />
                      <Text className="text-white font-semibold">
                        {state.bulkUpdating ? 'Updating...' : 'Mark All Complete'}
                      </Text>
                    </HapticTouchableOpacity>
                  )
                )}
              </View>
            )}
          </Animated.View>

          {/* Collapse/Expand Indicator */}
          {currentItems.length > 0 && (
            <HapticTouchableOpacity
              onPress={toggleHeaderCollapsed}
              className="mx-4 py-2 flex-row items-center justify-center"
            >
              <Icon
                name={state.headerCollapsed ? Icons.CHEVRON_DOWN : Icons.CHEVRON_UP}
                size={IconSizes.SM}
                color={isDark ? DarkColors.primary : Colors.primary}
                accessibilityLabel={state.headerCollapsed ? 'Expand header' : 'Collapse header'}
              />
              <Text className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                {state.headerCollapsed ? 'Show details' : 'Hide details'}
              </Text>
            </HapticTouchableOpacity>
          )}

          {/* Items List */}
          <GestureDetector gesture={panGesture}>
            <View style={{ flex: 1 }}>
              <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: Spacing['3xl'] }}
                onScroll={handleScroll}
                scrollEventThrottle={16}
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
                        <Animated.View
                          style={{
                            transform: [
                              { scale: fabScale },
                              { rotate: fabRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) },
                            ],
                          }}
                        >
                          <Icon name={Icons.ADD} size={IconSizes.MD} color={isDark ? DarkColors.accent : Colors.accent} accessibilityLabel="Add item" style={{ marginRight: 8 }} />
                        </Animated.View>
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
            </View>
          </GestureDetector>

          {/* Sync to External Apps */}
          {state.integrations.length > 0 && (
            <View className="bg-white dark:bg-gray-800 p-4">
              <View className="mb-3">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Sync to:</Text>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {state.integrations.map((integration) => (
                    <HapticTouchableOpacity
                      key={integration.id}
                      onPress={() => handleSyncToApp(integration.appName)}
                      className="px-4 py-2 rounded-lg"
                      style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight }}
                    >
                      <Text className="font-semibold text-sm" style={{ color: isDark ? DarkColors.primaryDark : Colors.primaryDark }}>
                        {integration.appName.charAt(0).toUpperCase() + integration.appName.slice(1)}
                      </Text>
                    </HapticTouchableOpacity>
                  ))}
                </View>
                <HapticTouchableOpacity
                  onPress={handleSyncBidirectional}
                  className="px-4 py-2 rounded-lg mt-2 flex-row items-center justify-center"
                  style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight }}
                >
                  <Icon name={Icons.SYNC_OUTLINE} size={IconSizes.XS} color={isDark ? DarkColors.primary : Colors.primary} accessibilityLabel="Sync all bidirectional" style={{ marginRight: 6 }} />
                  <Text className="font-semibold text-sm" style={{ color: isDark ? DarkColors.primaryDark : Colors.primaryDark }}>
                    Sync All (Bidirectional)
                  </Text>
                </HapticTouchableOpacity>
              </View>
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
      />
    </SafeAreaView>
  );
}
