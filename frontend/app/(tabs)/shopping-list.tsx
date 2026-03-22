// frontend/app/(tabs)/shopping-list.tsx
// Shopping list screen - refactored to use extracted components and useShoppingList hook

import { View, Text, ScrollView, SectionList, Animated, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import ScreenGradient from '../../components/ui/ScreenGradient';
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';
import AnimatedActivityIndicator from '../../components/ui/AnimatedActivityIndicator';
import AnimatedEmptyState from '../../components/ui/AnimatedEmptyState';
import SwipeableItem from '../../components/ui/SwipeableItem';
import LoadingState from '../../components/ui/LoadingState';
import LogoMascot from '../../components/mascot/LogoMascot';
import Icon from '../../components/ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { ComponentSpacing } from '../../constants/Spacing';
import { ShoppingListEmptyStates } from '../../constants/EmptyStates';
import { ShoppingListLoadingStates } from '../../constants/LoadingStates';
import { useShoppingList, categorizeItem, AISLE_ORDER, DEFAULT_AISLE_ORDER, AISLE_EMOJI } from '../../hooks/useShoppingList';
import { ShoppingListItem as ShoppingListItemType } from '../../types';
import { HapticChoreography } from '../../utils/hapticChoreography';
import { userApi, mealPlanApi } from '../../lib/api';
import { CelebrationOverlay } from '../../components/celebrations';
import {
  ShoppingListHeader,
  ShoppingListItem,
  ShoppingListCategory,
  AddItemModal,
  MergeListsModal,
  OfflineBanner,
} from '../../components/shopping';

// CONFETTI constant kept for backward compat reference (celebration now uses CelebrationOverlay)

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
    handleAddMultipleItems,
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

  // Weekly grocery budget from user preferences
  const [weeklyBudget, setWeeklyBudget] = useState<number | null>(null);

  useEffect(() => {
    userApi.getPreferences()
      .then(res => {
        const budget = res.data?.maxDailyFoodBudget;
        if (budget && budget > 0) setWeeklyBudget(budget);
      })
      .catch(() => {}); // Non-critical
  }, []);

  // All-done celebration
  const [showCelebration, setShowCelebration] = useState(false);
  const [tonightsMeal, setTonightsMeal] = useState<string | null>(null);
  const prevAllDone = useRef(false);

  useEffect(() => {
    const allDone = progressStats.total > 0 && progressStats.purchased === progressStats.total;
    if (allDone && !prevAllDone.current && !state.loading) {
      prevAllDone.current = true;
      setShowCelebration(true);
      HapticChoreography.shoppingCelebration();

      // Fetch tonight's meal (non-blocking)
      mealPlanApi.getWeeklyPlan().then((res: any) => {
        const days = res?.data?.days || res?.data?.data?.days || [];
        if (Array.isArray(days)) {
          const today = new Date().toISOString().split('T')[0];
          const todayPlan = days.find((d: any) => d.date === today);
          const meals = todayPlan?.meals || [];
          const next = meals.find((m: any) => !m.completed);
          if (next?.recipe?.title) setTonightsMeal(next.recipe.title);
        }
      }).catch(() => {});
    } else if (!allDone) {
      prevAllDone.current = false;
    }
  }, [progressStats.purchased, progressStats.total, state.loading]);

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
      <ScreenGradient><SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <LoadingState config={ShoppingListLoadingStates.lists} fullScreen />
      </SafeAreaView></ScreenGradient>
    );
  }

  return (
    <View style={{ flex: 1 }}>
    <ScreenGradient><SafeAreaView style={{ flex: 1 }} edges={['top']}>
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

          {/* Progress Card */}
          {currentItems.length > 0 && (
            <View style={[{
              marginHorizontal: 16,
              marginTop: 12,
              marginBottom: 4,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 20,
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            }, Shadows.SM]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? '#D1D5DB' : '#374151' }}>
                  {progressStats.purchased} of {progressStats.total} items
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#34D399' : '#047857' }}>
                  ${estimatedCost.toFixed(2)} est.
                </Text>
              </View>
              <View style={{ height: 6, borderRadius: 100, overflow: 'hidden', backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }}>
                <View
                  style={{
                    height: '100%',
                    borderRadius: 100,
                    width: `${progressStats.total > 0 ? (progressStats.purchased / progressStats.total) * 100 : 0}%`,
                    backgroundColor: isDark ? DarkColors.success : Colors.success,
                  }}
                />
              </View>

              {/* Budget bar — only when user has a weekly budget set */}
              {weeklyBudget != null && estimatedCost > 0 && (() => {
                const totalCost = estimatedCost + (state.selectedList
                  ? currentItems.filter(i => i.purchased && i.price != null && i.price > 0).reduce((s, i) => s + (i.price ?? 0), 0)
                  : 0);
                const budgetPct = Math.min((totalCost / weeklyBudget) * 100, 100);
                const overBudget = totalCost > weeklyBudget;
                return (
                  <View style={{ marginTop: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: '500', color: isDark ? '#9CA3AF' : '#6B7280' }}>
                        Budget
                      </Text>
                      <Text style={{
                        fontSize: 11,
                        fontWeight: '600',
                        color: overBudget
                          ? (isDark ? DarkColors.error : Colors.error)
                          : (isDark ? '#9CA3AF' : '#6B7280'),
                      }}>
                        ${totalCost.toFixed(2)} / ${weeklyBudget.toFixed(2)}
                      </Text>
                    </View>
                    <View style={{ height: 4, borderRadius: 100, overflow: 'hidden', backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }}>
                      <View
                        style={{
                          height: '100%',
                          borderRadius: 100,
                          width: `${budgetPct}%`,
                          backgroundColor: overBudget
                            ? (isDark ? DarkColors.error : Colors.error)
                            : (isDark ? DarkColors.info : Colors.info),
                        }}
                      />
                    </View>
                  </View>
                );
              })()}
            </View>
          )}

          {/* Items List — in-store aisle view uses SectionList for native sticky headers */}
          {visibleItems.length === 0 && currentItems.length > 0 ? (
            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: ComponentSpacing.tabBar.scrollPaddingBottom }}>
              <View className="flex-1 items-center justify-center p-8">
                <AnimatedEmptyState
                  config={ShoppingListEmptyStates.allPurchased}
                  title=""
                />
                <View style={{ marginTop: 32, width: '100%', paddingHorizontal: 16 }}>
                  <HapticTouchableOpacity
                    onPress={toggleHidePurchased}
                    style={[{
                      paddingHorizontal: 24,
                      paddingVertical: 16,
                      borderRadius: 100,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen,
                    }, Shadows.SM]}
                  >
                    <Icon name={Icons.EYE_OUTLINE} size={IconSizes.MD} color="white" accessibilityLabel="Show purchased items" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>Show Purchased Items</Text>
                  </HapticTouchableOpacity>
                </View>
              </View>
            </ScrollView>
          ) : currentItems.length === 0 ? (
            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: ComponentSpacing.tabBar.scrollPaddingBottom }}>
              <View className="flex-1 items-center justify-center p-8">
                <AnimatedEmptyState
                  config={ShoppingListEmptyStates.emptyList}
                  title=""
                />
                <View style={{ marginTop: 32, width: '100%', paddingHorizontal: 16, gap: 12 }}>
                  <HapticTouchableOpacity
                    onPress={handleGenerateFromMealPlan}
                    disabled={state.generatingFromMealPlan}
                    style={[{ borderRadius: 100, overflow: 'hidden', opacity: state.generatingFromMealPlan ? 0.6 : 1 }, Shadows.MD]}
                  >
                    <LinearGradient
                      colors={['#fa7e12', '#d67a0c']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 100 }}
                    >
                      {state.generatingFromMealPlan ? (
                        <AnimatedActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                      ) : (
                        <Icon name={Icons.MEAL_PLAN_OUTLINE} size={IconSizes.MD} color="white" accessibilityLabel="Generate from meal plan" style={{ marginRight: 8 }} />
                      )}
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>
                        {state.generatingFromMealPlan ? 'Generating...' : 'Generate from Meal Plan'}
                      </Text>
                    </LinearGradient>
                  </HapticTouchableOpacity>

                  <HapticTouchableOpacity
                    onPress={handleFABPress}
                    style={{
                      paddingHorizontal: 24,
                      paddingVertical: 16,
                      borderRadius: 100,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                    }}
                  >
                    <Icon name={Icons.ADD} size={IconSizes.MD} color={isDark ? '#E5E7EB' : '#374151'} accessibilityLabel="Add item" style={{ marginRight: 8 }} />
                    <Text style={{ fontWeight: '600', fontSize: 16, color: isDark ? '#E5E7EB' : '#374151' }}>
                      Add Item Manually
                    </Text>
                  </HapticTouchableOpacity>
                </View>
              </View>
            </ScrollView>
          ) : itemsByAisle ? (
            // In-store mode: SectionList with frosted glass sticky aisle headers
            <SectionList
              style={{ flex: 1 }}
              sections={itemsByAisle.map(group => ({
                title: group.category,
                data: group.items,
                remaining: group.items.filter(i => !i.purchased).length,
              }))}
              keyExtractor={item => item.id}
              stickySectionHeadersEnabled
              contentContainerStyle={{ paddingTop: 4, paddingBottom: ComponentSpacing.tabBar.scrollPaddingBottom }}
              renderSectionHeader={({ section }) => (
                <BlurView
                  intensity={90}
                  tint={isDark ? 'dark' : 'light'}
                  style={{ paddingHorizontal: 16, paddingVertical: 12 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, marginRight: 8 }}>
                      {AISLE_EMOJI[section.title] || '📦'}
                    </Text>
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '800',
                      color: isDark ? '#E5E7EB' : '#111827',
                    }}>
                      {section.title}
                    </Text>
                    <View style={{
                      marginLeft: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 100,
                      backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                    }}>
                      <Text style={{
                        fontSize: 11,
                        fontWeight: '600',
                        color: isDark ? '#9CA3AF' : '#6B7280',
                      }}>
                        {section.remaining} left
                      </Text>
                    </View>
                  </View>
                </BlurView>
              )}
              renderItem={({ item }) => (
                <View style={{ paddingHorizontal: 16, paddingBottom: 0 }}>
                  <SwipeableItem
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
                      onEditQuantity={(editItem) => dispatch({ type: 'OPEN_EDIT_QUANTITY', item: editItem })}
                      onToggleSelection={(itemId) => dispatch({ type: 'TOGGLE_ITEM_SELECTION', itemId })}
                      onLongPress={(itemId) => dispatch({ type: 'ENTER_SELECTION_MODE', itemId })}
                      onCantFind={handleCantFind}
                      onAddToPantry={handleAddToPantry}
                    />
                  </SwipeableItem>
                </View>
              )}
            />
          ) : (
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingBottom: state.selectionMode ? ComponentSpacing.tabBar.scrollPaddingBottom : ComponentSpacing.tabBar.scrollPaddingBottom }}
            >
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
            </ScrollView>
          )}

          {/* Floating In-Store Mode Bar */}
          {state.inStoreMode && currentItems.length > 0 && !state.selectionMode && (
            <View
              style={[{
                position: 'absolute',
                left: 16,
                right: 16,
                bottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingVertical: 14,
                borderRadius: 20,
                backgroundColor: isDark ? '#064E3B' : '#059669',
              }, Shadows.LG]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, marginRight: 8 }}>🛒</Text>
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>${estimatedCost.toFixed(2)}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginLeft: 4 }}>remaining</Text>
              </View>
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>
                {progressStats.purchased}/{progressStats.total} done
              </Text>
            </View>
          )}

          {/* Floating Selection Mode Bar */}
          {state.selectionMode && currentItems.length > 0 && (
            <View
              style={[{
                position: 'absolute',
                left: 16,
                right: 16,
                bottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
                borderRadius: 20,
                overflow: 'hidden',
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              }, Shadows.LG]}
            >
              <HapticTouchableOpacity
                onPress={() => dispatch({ type: 'EXIT_SELECTION_MODE' })}
                style={{ flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }}
              >
                <Text style={{ fontWeight: '600', fontSize: 14, color: isDark ? '#E5E7EB' : '#374151' }}>Cancel</Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={handleMarkSelectedComplete}
                disabled={state.selectedItems.length === 0 || state.bulkUpdating}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  alignItems: 'center',
                  backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen,
                  opacity: state.selectedItems.length === 0 || state.bulkUpdating ? 0.5 : 1,
                }}
              >
                <Text style={{ fontWeight: '600', fontSize: 14, color: '#FFFFFF' }}>
                  {state.bulkUpdating ? '...' : `Done (${state.selectedItems.length})`}
                </Text>
              </HapticTouchableOpacity>
            </View>
          )}
        </View>
      )}

      {!state.selectedList && state.shoppingLists.length === 0 && (
        <View className="flex-1">
          <AnimatedEmptyState
            config={ShoppingListEmptyStates.noLists}
            title=""
            onAction={handleCreateList}
          />
        </View>
      )}

      {!state.selectedList && state.shoppingLists.length > 0 && (
        <View className="flex-1">
          <AnimatedEmptyState
            useMascot
            mascotExpression="happy"
            mascotSize="large"
            title="Select a Shopping List"
            description="Choose a list from the dropdown above to view and manage items."
            actionLabel="Select List"
            onAction={() => dispatch({ type: 'UPDATE', payload: { showListPicker: true } })}
          />
        </View>
      )}

      <MergeListsModal
        state={state}
        dispatch={dispatch}
        onConfirmMerge={handleConfirmMerge}
      />

      <AddItemModal
        state={state}
        dispatch={dispatch}
        onAddItem={handleAddItem}
        onAddMultipleItems={handleAddMultipleItems}
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
    </SafeAreaView></ScreenGradient>

    {/* All-done celebration overlay — full-screen */}
    <CelebrationOverlay
      visible={showCelebration}
      title="Shop complete!"
      subtitle={tonightsMeal
        ? `Your pantry is stocked! Want to cook ${tonightsMeal} now?`
        : 'Your pantry is stocked. Ready to cook?'}
      expression="celebrating"
      stats={[
        { value: String(progressStats.total), label: 'Items', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)' },
        { value: `$${estimatedCost.toFixed(0)}`, label: 'Spent', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.15)' },
      ]}
      primaryCTA={{
        label: tonightsMeal ? `Cook ${tonightsMeal}` : "Let's cook",
        onPress: () => {
          setShowCelebration(false);
          router.push('/(tabs)/meal-plan' as any);
        },
      }}
      secondaryCTA={{
        label: 'Dismiss',
        onPress: () => setShowCelebration(false),
      }}
      autoDismiss={5000}
      onDismiss={() => setShowCelebration(false)}
    />
    </View>
  );
}
