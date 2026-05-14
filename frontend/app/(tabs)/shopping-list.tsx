// frontend/app/(tabs)/shopping-list.tsx
// Shopping list screen - refactored to use extracted components and useShoppingList hook

import { View, Text, ScrollView, SectionList, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from 'nativewind';
import ScreenGradient from '../../components/ui/ScreenGradient';
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';
import BrandButton from '../../components/ui/BrandButton';
import AnimatedActivityIndicator from '../../components/ui/AnimatedActivityIndicator';
import AnimatedEmptyState from '../../components/ui/AnimatedEmptyState';
import { useAffinityExamples, formatAffinityHint } from '../../hooks/useAffinityExamples';
import SwipeableItem from '../../components/ui/SwipeableItem';
import LoadingState from '../../components/ui/LoadingState';
import LogoMascot from '../../components/mascot/LogoMascot';
import Icon from '../../components/ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors, Pastel, PastelDark } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { ComponentSpacing } from '../../constants/Spacing';
import { ShoppingListEmptyStates } from '../../constants/EmptyStates';
import { ShoppingListLoadingStates } from '../../constants/LoadingStates';
import { useShoppingList, useActiveList, categorizeItem, AISLE_ORDER, DEFAULT_AISLE_ORDER, AISLE_EMOJI } from '../../hooks/useShoppingList';
import { ShoppingListItem as ShoppingListItemType } from '../../types';
import { HapticChoreography } from '../../utils/hapticChoreography';
import { mealPlanApi, userApi } from '../../lib/api';
import { requestStoreReview } from '../../lib/storeReview';
import { useBudget } from '../../hooks/useBudget';
import ContinuityCTA from '../../components/ui/ContinuityCTA';
import { CelebrationOverlay } from '../../components/celebrations';

// Aisle → pastel tint mapping for colorful section headers (9L)
const AISLE_TINT: Record<string, { light: string; dark: string }> = {
  'Produce':        { light: Pastel.sage, dark: PastelDark.sage },
  'Bakery':         { light: Pastel.golden, dark: PastelDark.golden },
  'Meat & Seafood': { light: Pastel.blush, dark: PastelDark.blush },
  'Dairy':          { light: Pastel.sky, dark: PastelDark.sky },
  'Frozen':         { light: Pastel.sky, dark: PastelDark.sky },
  'Beverages':      { light: Pastel.lavender, dark: PastelDark.lavender },
  'Snacks':         { light: Pastel.lavender, dark: PastelDark.lavender },
  'Pantry':         { light: Pastel.peach, dark: PastelDark.peach },
  'Other':          { light: Pastel.orange, dark: PastelDark.orange },
  "Can't Find":     { light: Pastel.peach, dark: PastelDark.peach },
};
import SazonRefreshControl from '../../components/ui/SazonRefreshControl';
import {
  ShoppingListHeader,
  ShoppingListItem,
  ShoppingListCategory,
  AddItemModal,
  MergeListsModal,
  OfflineBanner,
  EditorialShoppingIntro,
  EditorialShoppingProgress,
  EditorialAisleHeader,
} from '../../components/shopping';
import BuildFromRecipesSheet from '../../components/shopping/BuildFromRecipesSheet';
import ArchiveView, { ArchivedList } from '../../components/shopping/ArchiveView';
import BottomSheet from '../../components/ui/BottomSheet';
import { shoppingListApi } from '../../lib/api';
import { useAutoArchiveOnCompletion } from '../../hooks/useShoppingList.autoArchive';
import InStoreDoneButton from '../../components/shopping/InStoreDoneButton';
import StartFreshAction from '../../components/shopping/StartFreshAction';
import MergeSuggestionBanner, { MergeSuggestion } from '../../components/shopping/MergeSuggestionBanner';
import FoodIntelToast from '../../components/shopping/FoodIntelToast';

// CONFETTI constant kept for backward compat reference (celebration now uses CelebrationOverlay)

export default function ShoppingListScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { activateInStore } = useLocalSearchParams<{ activateInStore?: string }>();
  const affinityExamples = useAffinityExamples();
  const affinityHint = formatAffinityHint(affinityExamples);

  // Singleton UX: always open to the active list, no list-picker on mount
  const { list: activeList, isLoading: activeListLoading, refetch: refetchActiveList } = useActiveList();

  // Archive picker sheet (opt-in via header button)
  const [showArchivePicker, setShowArchivePicker] = useState(false);
  const [archivedLists, setArchivedLists] = useState<ArchivedList[]>([]);

  const fetchArchivedLists = async () => {
    try {
      const response = await shoppingListApi.getShoppingLists();
      const all = (response.data as any[]) ?? [];
      const archived = all.filter((l: any) => !l.isActive || l.tier === 'archived' || l.tier === 'older');
      setArchivedLists(archived as ArchivedList[]);
    } catch {
      // Non-blocking — empty archive is acceptable
    }
  };

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
    handleRefresh,
  } = useShoppingList();

  // Weekly grocery budget — unified source of truth
  const { weeklyGrocery: weeklyBudget } = useBudget();

  // Build-from-Recipes sheet
  const [showBuildFromRecipes, setShowBuildFromRecipes] = useState(false);

  // All-done celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  const [tonightsMeal, setTonightsMeal] = useState<string | null>(null);
  const prevAllDone = useRef(false);

  // Merge suggestion banner state
  const [mergeSuggestion, setMergeSuggestion] = useState<MergeSuggestion | null>(null);

  // 10R Surface 4: Food Intel toast on item check-off
  const [intelToast, setIntelToast] = useState<{ name: string; purchaseCount: number } | null>(null);

  const handleTogglePurchasedWithIntel = (item: ShoppingListItemType) => {
    if (!item.purchased) {
      const key = item.name.toLowerCase().trim();
      const history = state.purchaseHistory.find(
        (h) => h.itemName.toLowerCase().trim() === key,
      );
      const purchaseCount = (history?.purchaseCount ?? 0) + 1;
      setIntelToast({ name: item.name, purchaseCount });
    }
    handleTogglePurchased(item);
  };

  // Fetch merge suggestion when active list loads
  useEffect(() => {
    if (!state.selectedList || state.loading) return;
    shoppingListApi.getMergeSuggestion()
      .then((res: any) => setMergeSuggestion(res?.data ?? null))
      .catch(() => {});
  }, [state.selectedList?.id]);

  // Auto-archive on completion hook (fires celebration + archives after 10s grace)
  useAutoArchiveOnCompletion({
    listId: state.selectedList?.id ?? null,
    items: currentItems,
    loading: state.loading,
    onCelebrate: () => {
      setShowCelebration(true);
      HapticChoreography.shoppingCelebration();
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
      // E5: prompt for store review on the highest-satisfaction state.
      // Uses cooking-history bucket for copy + 30-day cooldown internally.
      userApi.getCookingStats()
        .then((res: any) => {
          const cookCount = res?.data?.recipesCookedAllTime ?? 0;
          return requestStoreReview({ cookCount });
        })
        .catch(() => {});
    },
    onRefresh: handleRefresh,
  });

  // (Celebration + archive are now handled by useAutoArchiveOnCompletion above)

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
      <ScreenGradient><View style={{ flex: 1 }}>
        <LoadingState config={ShoppingListLoadingStates.lists} fullScreen />
      </View></ScreenGradient>
    );
  }

  return (
    <View style={{ flex: 1 }}>
    <ScreenGradient><View style={{ flex: 1 }}>
      <EditorialShoppingIntro
        itemsLeft={(state.selectedList?.items || []).filter(i => !i.purchased && !pantrySet.has(i.name.toLowerCase().trim())).length}
        itemsInPantry={(state.selectedList?.items || []).filter(i => pantrySet.has(i.name.toLowerCase().trim())).length}
      />
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
        onOpenArchive={() => {
          setShowArchivePicker(true);
          fetchArchivedLists();
        }}
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

          {/* Pantry deep-link (10G-Pre continuity) */}
          <View style={{ paddingHorizontal: 16, marginBottom: 6 }}>
            <ContinuityCTA
              label={`${pantrySet.size} items in your pantry`}
              icon="archive"
              onPress={() => router.push('/pantry' as any)}
              tint="sage"
              accessibilityLabel="Open pantry"
              testID="pantry-chip"
            />
          </View>

          {/* Build from Recipes chip (10Q) */}
          <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <ContinuityCTA
              label="Build from Recipes"
              icon="book-outline"
              onPress={() => setShowBuildFromRecipes(true)}
              tint="golden"
              accessibilityLabel="Build shopping list from saved recipes"
              testID="build-from-recipes-chip"
            />
          </View>

          {/* Merge Suggestion Banner (10Q-ListMgmt) */}
          {state.selectedList && mergeSuggestion && (
            <MergeSuggestionBanner
              activeListId={state.selectedList.id}
              suggestion={mergeSuggestion}
              onMerged={handleRefresh}
              onDismissed={() => setMergeSuggestion(null)}
            />
          )}

          {/* Start Fresh action (10Q-ListMgmt) — shown when list has items */}
          {state.selectedList && currentItems.length > 0 && (
            <View style={{ paddingHorizontal: 16, marginBottom: 8, alignItems: 'flex-end' }}>
              <StartFreshAction
                listId={state.selectedList.id}
                items={currentItems}
                onItemsCleared={handleRefresh}
              />
            </View>
          )}

          {/* Editorial Progress Card (peach) */}
          {currentItems.length > 0 && (
            <EditorialShoppingProgress
              purchased={progressStats.purchased}
              total={progressStats.total}
            />
          )}

          {/* By aisle header — only when grouped by aisle */}
          {currentItems.length > 0 && itemsByAisle && (
            <EditorialAisleHeader />
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
                    <Text style={{ color: '#FFFFFF', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16 }}>Show Purchased Items</Text>
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
                  <BrandButton
                    label={state.generatingFromMealPlan ? 'Generating...' : 'Shop for this week'}
                    onPress={handleGenerateFromMealPlan}
                    loading={state.generatingFromMealPlan}
                    disabled={state.generatingFromMealPlan}
                    variant="sage"
                    icon="cart-outline"
                    hapticStyle="medium"
                    accessibilityLabel="Shop for this week"
                  />
                  <BrandButton
                    label={state.generatingFromMealPlan ? 'Generating...' : 'Generate from Meal Plan'}
                    onPress={handleGenerateFromMealPlan}
                    loading={state.generatingFromMealPlan}
                    disabled={state.generatingFromMealPlan}
                    variant="brand"
                    icon="calendar-outline"
                    hapticStyle="medium"
                  />

                  <BrandButton
                    label="Build from Recipes"
                    onPress={() => setShowBuildFromRecipes(true)}
                    variant="golden"
                    icon="book-outline"
                    hapticStyle="light"
                    accessibilityLabel="Build shopping list from saved recipes"
                  />

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
                    <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16, color: isDark ? '#E5E7EB' : '#374151' }}>
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
              refreshControl={
                <SazonRefreshControl refreshing={state.refreshing} onRefresh={handleRefresh} />
              }
              renderSectionHeader={({ section }) => {
                const tint = AISLE_TINT[section.title];
                const allDone = section.remaining === 0 && section.data.length > 0;
                return (
                  <View style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: isDark
                      ? (tint?.dark || PastelDark.orange)
                      : (tint?.light || Pastel.orange),
                    opacity: allDone ? 0.5 : 1,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 20, marginRight: 8 }}>
                        {AISLE_EMOJI[section.title] || '📦'}
                      </Text>
                      <Text style={{
                        fontSize: 14,
                        fontFamily: 'PlusJakartaSans_800ExtraBold',
                        color: isDark ? '#E5E7EB' : '#111827',
                      }}>
                        {section.title}
                      </Text>
                      <View style={{
                        marginLeft: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 100,
                        backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.06)',
                      }}>
                        <Text style={{
                          fontSize: 11,
                          fontFamily: 'PlusJakartaSans_600SemiBold',
                          color: isDark ? '#9CA3AF' : '#6B7280',
                        }}>
                          {allDone ? '✓ Done' : `${section.remaining} left`}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              }}
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
                      onTogglePurchased={handleTogglePurchasedWithIntel}
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
              contentContainerStyle={{ paddingBottom: ComponentSpacing.tabBar.scrollPaddingBottom }}
              refreshControl={
                <SazonRefreshControl refreshing={state.refreshing} onRefresh={handleRefresh} />
              }
            >
              <View className="p-4">
                {state.groupByRecipe && itemsByRecipe ? (
                  <ShoppingListCategory
                    itemsByRecipe={itemsByRecipe}
                    selectionMode={state.selectionMode}
                    selectedItems={state.selectedItems}
                    cantFindItems={state.cantFindItems}
                    inStoreMode={state.inStoreMode}
                    onTogglePurchased={handleTogglePurchasedWithIntel}
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
                        onTogglePurchased={handleTogglePurchasedWithIntel}
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

          {/* "I'm done shopping" button — shown in in-store mode (10Q-ListMgmt) */}
          {state.inStoreMode && state.selectedList && currentItems.length > 0 && !state.selectionMode && (
            <View style={{ position: 'absolute', left: 16, right: 16, bottom: 88 }}>
              <InStoreDoneButton
                listId={state.selectedList.id}
                inStoreMode={state.inStoreMode}
                onListDone={handleRefresh}
              />
            </View>
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
                <Text style={{ color: '#FFFFFF', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16 }}>${estimatedCost.toFixed(2)}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginLeft: 4 }}>remaining</Text>
              </View>
              <Text style={{ color: '#FFFFFF', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14 }}>
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
                backgroundColor: isDark ? DarkColors.card : '#FFFFFF',
              }, Shadows.LG]}
            >
              <HapticTouchableOpacity
                onPress={() => dispatch({ type: 'EXIT_SELECTION_MODE' })}
                style={{ flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }}
              >
                <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: isDark ? '#E5E7EB' : '#374151' }}>Cancel</Text>
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
                <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: '#FFFFFF' }}>
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
            description={
              affinityHint
                ? `Tap + to start your first list. ${affinityHint}`
                : undefined
            }
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

      {/* Archive view bottom sheet */}
      <BottomSheet
        visible={showArchivePicker}
        onClose={() => setShowArchivePicker(false)}
        snapPoints={['70%', '90%']}
      >
        <View style={{ flex: 1, paddingTop: 8 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '700',
            paddingHorizontal: 16,
            paddingBottom: 8,
            color: isDark ? '#F0EDE8' : '#111827',
          }}>
            Past Lists
          </Text>
          <ArchiveView
            lists={archivedLists}
            onRestore={(_listId) => {
              setShowArchivePicker(false);
              refetchActiveList();
            }}
          />
        </View>
      </BottomSheet>

      <BuildFromRecipesSheet
        visible={showBuildFromRecipes}
        onClose={() => setShowBuildFromRecipes(false)}
        onListCreated={(listId) => {
          setShowBuildFromRecipes(false);
          if (listId) router.push(`/shopping-list?listId=${listId}` as any);
        }}
      />

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
    </View></ScreenGradient>

    {/* 10R Surface 4: Food Intel toast on item check-off */}
    <FoodIntelToast
      itemName={intelToast?.name ?? null}
      purchaseCount={intelToast?.purchaseCount}
      onHide={() => setIntelToast(null)}
    />

    {/* All-done celebration overlay — full-screen */}
    <CelebrationOverlay
      visible={showCelebration}
      title="Shop complete!"
      subtitle={tonightsMeal
        ? `Your pantry is stocked! Want to cook ${tonightsMeal} now?`
        : 'Your pantry is stocked. Ready to cook?'}
      expression="celebrating"
      stats={[
        { value: String(progressStats.total), label: 'Items', color: '#15803D', bgColor: 'rgba(16, 185, 129, 0.15)' },
        { value: `$${estimatedCost.toFixed(0)}`, label: 'Spent', color: '#1D4ED8', bgColor: 'rgba(59, 130, 246, 0.15)' },
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
