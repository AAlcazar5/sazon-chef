// frontend/app/(tabs)/shopping-list.tsx
// Shopping list screen - refactored to use extracted components and useShoppingList hook

import { View, Text, ScrollView, SectionList, Animated, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
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
import { Spacing } from '../../constants/Spacing';
import { ShoppingListEmptyStates } from '../../constants/EmptyStates';
import { ShoppingListLoadingStates } from '../../constants/LoadingStates';
import { useShoppingList, categorizeItem, AISLE_ORDER, DEFAULT_AISLE_ORDER, AISLE_EMOJI } from '../../hooks/useShoppingList';
import { ShoppingListItem as ShoppingListItemType } from '../../types';
import { HapticChoreography } from '../../utils/hapticChoreography';
import {
  ShoppingListHeader,
  ShoppingListItem,
  ShoppingListCategory,
  AddItemModal,
  MergeListsModal,
  OfflineBanner,
} from '../../components/shopping';

const CONFETTI = ['🎉', '🛒', '✅', '🌟', '🎊', '👏'];

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

  // All-done celebration
  const [showCelebration, setShowCelebration] = useState(false);
  const celebrationOpacity = useRef(new Animated.Value(0)).current;
  const mascotScale = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef(CONFETTI.map(() => ({
    y: new Animated.Value(0),
    opacity: new Animated.Value(1),
    x: new Animated.Value(0),
  }))).current;
  const prevAllDone = useRef(false);

  useEffect(() => {
    const allDone = progressStats.total > 0 && progressStats.purchased === progressStats.total;
    if (allDone && !prevAllDone.current && !state.loading) {
      prevAllDone.current = true;
      setShowCelebration(true);
      HapticChoreography.shoppingCelebration();

      // Reset confetti
      confettiAnims.forEach(a => { a.y.setValue(0); a.opacity.setValue(1); a.x.setValue(0); });
      mascotScale.setValue(0);
      celebrationOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(celebrationOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(mascotScale, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true }),
        ...confettiAnims.map((a, i) =>
          Animated.parallel([
            Animated.timing(a.y, {
              toValue: -(120 + Math.random() * 160),
              duration: 900 + i * 100,
              useNativeDriver: true,
            }),
            Animated.timing(a.x, {
              toValue: (Math.random() - 0.5) * 120,
              duration: 900 + i * 100,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.delay(400),
              Animated.timing(a.opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
            ]),
          ])
        ),
      ]).start();

      // Auto-dismiss after 2.8 seconds
      const timer = setTimeout(() => {
        Animated.timing(celebrationOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
          setShowCelebration(false);
        });
      }, 2800);
      return () => clearTimeout(timer);
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
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0F0F0F' : '#F2F2F7' }} edges={['top']}>
        <LoadingState config={ShoppingListLoadingStates.lists} fullScreen />
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0F0F0F' : '#F2F2F7' }} edges={['top']}>
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
              borderRadius: 16,
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
                    backgroundColor: isDark ? '#34D399' : '#10B981',
                  }}
                />
              </View>
            </View>
          )}

          {/* Items List — in-store aisle view uses SectionList for native sticky headers */}
          {visibleItems.length === 0 && currentItems.length > 0 ? (
            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: Spacing['3xl'] }}>
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
            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: Spacing['3xl'] }}>
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
              contentContainerStyle={{ paddingTop: 4, paddingBottom: 80 }}
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
              contentContainerStyle={{ paddingBottom: state.selectionMode ? 80 : Spacing['3xl'] }}
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
        mergeScale={mergeScale}
        mergeOpacity={mergeOpacity}
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
    </SafeAreaView>

    {/* All-done celebration overlay — full-screen (P4: earn the peak) */}
    {showCelebration && (
      <Animated.View
        style={[StyleSheet.absoluteFill, {
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.55)',
          opacity: celebrationOpacity,
          zIndex: 99,
        }]}
        pointerEvents="box-only"
      >
        {/* Confetti emoji particles */}
        {CONFETTI.map((emoji, i) => (
          <Animated.Text
            key={i}
            style={{
              position: 'absolute',
              fontSize: 32 + (i % 3) * 10,
              transform: [
                { translateY: confettiAnims[i].y },
                { translateX: confettiAnims[i].x },
              ],
              opacity: confettiAnims[i].opacity,
            }}
          >
            {emoji}
          </Animated.Text>
        ))}

        {/* Celebration Card */}
        <Animated.View
          style={[{
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            borderRadius: 28,
            paddingVertical: 40,
            paddingHorizontal: 40,
            alignItems: 'center',
            marginHorizontal: 32,
            transform: [{ scale: mascotScale }],
          }, Shadows.XL]}
        >
          <LogoMascot expression="chef-kiss" size="large" />
          <Text style={{
            fontSize: 26,
            fontWeight: '800',
            color: isDark ? '#F9FAFB' : '#111827',
            marginTop: 20,
            textAlign: 'center',
          }}>
            You nailed it!
          </Text>
          <Text style={{
            fontSize: 15,
            color: isDark ? '#9CA3AF' : '#6B7280',
            marginTop: 8,
            textAlign: 'center',
            lineHeight: 22,
          }}>
            Your pantry is stocked. Ready to cook?
          </Text>

          {/* CTA — next action (P4: always a next action) */}
          <HapticTouchableOpacity
            onPress={() => {
              setShowCelebration(false);
              router.push('/(tabs)/meal-plan' as any);
            }}
            style={[{ marginTop: 24, borderRadius: 100, overflow: 'hidden', width: '100%' }, Shadows.SM]}
          >
            <LinearGradient
              colors={['#fa7e12', '#d67a0c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ paddingVertical: 14, alignItems: 'center', borderRadius: 100 }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>Let's cook</Text>
            </LinearGradient>
          </HapticTouchableOpacity>
        </Animated.View>
      </Animated.View>
    )}
    </View>
  );
}
