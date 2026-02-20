import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Alert, RefreshControl } from 'react-native';
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';
import SuccessModal from '../../components/ui/SuccessModal';
import Toast from '../../components/ui/Toast';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, DarkColors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { HapticPatterns } from '../../constants/Haptics';
import { useMealPlanData } from '../../hooks/useMealPlanData';
import { useMealPlanUI } from '../../hooks/useMealPlanUI';
import { useMealPlanActions } from '../../hooks/useMealPlanActions';
import { useShoppingListGeneration } from '../../hooks/useShoppingListGeneration';
import { useMealCompletion } from '../../hooks/useMealCompletion';
import { useGenerationState } from '../../hooks/useGenerationState';
import { useMealSwap } from '../../hooks/useMealSwap';
import { useCostTracking } from '../../hooks/useCostTracking';
import { useNutritionTracking } from '../../hooks/useNutritionTracking';
import {
  MealCardSkeleton,
  WeeklyCalendarSkeleton,
  MealSnackSelectorModal,
  DayMealsModal,
  MealNotesModal,
  CostAnalysisSection,
  TimePickerModal,
  MealSwapModal,
  ShoppingListNameModal,
  ViewModePickerModal,
  MealPlanHeader,
  QuickActionsBar,
  WeeklyNutritionSummary,
  WeeklyCalendar,
  ThawingReminders,
  MealPrepSessions,
  TotalPrepTimeCard,
  DailyMacrosSummary,
  ViewModeSelector,
  TimelineView,
  CompactMealView,
  CollapsibleWeekView,
  SaveTemplateModal,
  TemplatePickerModal,
  DuplicateModal,
  RecurringMealModal,
  RecurringMealsManagerModal,
} from '../../components/meal-plan';
import type { RecurringMeal } from '../../types';

export default function MealPlanScreen() {
  const { recipeId, recipeTitle, scaledServings } = useLocalSearchParams();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const isMountedRef = useRef(false);

  // Recurring meal state
  const [recurringModalVisible, setRecurringModalVisible] = useState(false);
  const [recurringMeal, setRecurringMeal] = useState<any>(null);
  const [editingRule, setEditingRule] = useState<RecurringMeal | undefined>(undefined);
  const [managerModalVisible, setManagerModalVisible] = useState(false);
  const [recurringRules, setRecurringRules] = useState<RecurringMeal[]>([]);

  // Use meal plan UI hook (state, utilities, constants)
  const {
    isDark,
    showTimePickerModal, setShowTimePickerModal,
    selectedHour, setSelectedHour,
    selectedMinute, setSelectedMinute,
    manualTimeInput, showManualInput,
    handleManualTimeInput, toggleManualInput,
    draggingMeal, setDraggingMeal,
    dragOverHour, setDragOverHour,
    viewMode, setViewMode,
    mealTypeFilter, setMealTypeFilter,
    showViewModePicker, setShowViewModePicker,
    expandedDays, setExpandedDays,
    macrosExpanded, setMacrosExpanded,
    scrollViewRef, scrollPositionRef,
    showAddRecipeModal, setShowAddRecipeModal,
    hours, mealTypeToHour,
    formatDate, formatDateRange,
    isToday, isSelected,
    handleJumpToToday, groupMealsByType,
    formatTime, getMacroProgress, getMacroColor,
  } = useMealPlanUI({ selectedDate, setSelectedDate });

  // Use meal plan data hook
  const {
    weeklyPlan,
    dailySuggestion,
    loading,
    refreshing,
    hourlyMeals,
    dailyMacros,
    totalPrepTime,
    thawingReminders,
    loadingThawingReminders,
    mealCompletionStatus,
    mealNotes,
    weekDates,
    loadMealPlan,
    refreshMealPlan,
    getMealsForDate,
    setHourlyMeals,
    setDailyMacros,
    setTotalPrepTime,
    setMealCompletionStatus,
    setMealNotes,
    setWeeklyPlan,
  } = useMealPlanData({
    selectedDate,
    isMountedRef,
    mealTypeToHour,
  });

  // Use meal completion hook
  const {
    showNotesModal,
    editingMealId,
    editingMealName,
    editingNotes,
    showCelebrationToast,
    celebrationMessage,
    quickTemplates,
    handleToggleMealCompletion,
    handleOpenNotes,
    handleSaveNotes,
    handleCloseNotesModal,
    insertBulletPoint,
    insertTemplate,
    setEditingNotes,
    setShowCelebrationToast,
  } = useMealCompletion({
    hourlyMeals,
    weeklyPlan,
    mealCompletionStatus,
    mealNotes,
    setMealCompletionStatus,
    setMealNotes,
  });

  // Use generation state hook
  const {
    generatingPlan,
    showMealSnackSelector,
    selectedMeals,
    selectedSnacks,
    maxTotalPrepTime,
    maxWeeklyBudget,
    generationType,
    showDayMealsModal,
    selectedDayForModal,
    generatingShoppingList,
    showSuccessModal,
    successMessage,
    showShoppingListSuccessModal,
    shoppingListSuccessMessage,
    showShoppingListNameModal,
    shoppingListName,
    setGeneratingPlan,
    setShowMealSnackSelector,
    setSelectedMeals,
    setSelectedSnacks,
    setMaxTotalPrepTime,
    setMaxWeeklyBudget,
    setGenerationType,
    setShowDayMealsModal,
    setSelectedDayForModal,
    setGeneratingShoppingList,
    setShowSuccessModal,
    setSuccessMessage,
    setShowShoppingListSuccessModal,
    setShoppingListSuccessMessage,
    setShowShoppingListNameModal,
    setShoppingListName,
    showTemplatePickerModal,
    showSaveTemplateModal,
    templates,
    loadingTemplates,
    applyingTemplate,
    savingTemplate,
    setShowTemplatePickerModal,
    setShowSaveTemplateModal,
    setTemplates,
    setLoadingTemplates,
    setApplyingTemplate,
    setSavingTemplate,
    duplicating,
    showDuplicateModal,
    setDuplicating,
    setShowDuplicateModal,
  } = useGenerationState();

  // Use meal swap hook
  const {
    showSwapModal,
    swapSuggestions,
    selectedMealForSwap,
    expandedSwapMealId,
    loadingSwapSuggestions,
    mealSwapSuggestions,
    handleGetSwapSuggestions,
    handleSwapMeal,
    setShowSwapModal,
    setSwapSuggestions,
    setSelectedMealForSwap,
    setExpandedSwapMealId,
  } = useMealSwap({
    hourlyMeals,
    selectedDate,
    setHourlyMeals,
    setDailyMacros,
    setTotalPrepTime,
  });

  // Use cost tracking hook
  const {
    costAnalysis,
    loadingCostAnalysis,
    shoppingListSavings,
    loadingSavings,
    loadCostAnalysis,
    setCostAnalysis,
    setLoadingCostAnalysis,
    setShoppingListSavings,
    setLoadingSavings,
  } = useCostTracking({
    hourlyMeals,
  });

  // Use nutrition tracking hook
  const {
    weeklyNutrition,
    loadingWeeklyNutrition,
    targetMacros,
    setWeeklyNutrition,
    setLoadingWeeklyNutrition,
    setTargetMacros,
  } = useNutritionTracking();

  // Use meal plan actions hook (business logic)
  const {
    handleGenerateWeeklyPlan,
    handleGenerateFullDay,
    handleConfirmMealSnackSelection,
    handleGenerateRemainingMeals,
    handleOptimizeCost,
    handleRefresh,
    handleDateSelect,
    handleAddRecipe,
    handleAddRecipeToMeal,
    handleAddMealToHour,
    handleMoveMeal,
    handleRemoveMeal,
    handleTimePickerConfirm,
    loadWeeklyNutrition,
    calculateRecommendedMealsAndSnacks,
    loadTemplates,
    handleSaveAsTemplate,
    handleApplyTemplate,
    handleDeleteTemplate,
    handleCopyLastWeek,
    handleCopyDay,
    handleCopyMealToDays,
    handleSetRecurring,
    loadRecurringRules,
    handleSaveRecurringRule,
    handleDeleteRecurringRule,
    handleToggleRecurringActive,
    handleApplyRecurring,
  } = useMealPlanActions({
    hourlyMeals,
    weeklyPlan,
    weekDates,
    selectedDate,
    setSelectedDate,
    setHourlyMeals,
    setDailyMacros,
    setTotalPrepTime,
    loadMealPlan,
    refreshMealPlan,
    generatingPlan,
    setGeneratingPlan,
    setShowMealSnackSelector,
    selectedMeals,
    selectedSnacks,
    setSelectedMeals,
    setSelectedSnacks,
    maxTotalPrepTime,
    maxWeeklyBudget,
    setMaxWeeklyBudget,
    generationType,
    setGenerationType,
    setShowSuccessModal,
    setSuccessMessage,
    targetMacros,
    setTargetMacros,
    setWeeklyNutrition,
    setLoadingWeeklyNutrition,
    costAnalysis,
    mealTypeToHour,
    hours,
    isSelected,
    selectedHour,
    selectedMinute,
    setShowTimePickerModal,
    setShowAddRecipeModal,
    recipeId: recipeId as string | undefined,
    recipeTitle: recipeTitle as string | undefined,
    setShowTemplatePickerModal,
    setShowSaveTemplateModal,
    templates,
    setTemplates,
    setLoadingTemplates,
    setApplyingTemplate,
    setSavingTemplate,
    setDuplicating,
    setShowDuplicateModal,
    setRecurringModalVisible,
    setRecurringMeal,
    setManagerModalVisible,
    recurringRules,
    setRecurringRules,
  });

  // Use shopping list generation hook
  const {
    handleGenerateShoppingList,
    handleConfirmShoppingListName,
  } = useShoppingListGeneration({
    hourlyMeals,
    weekDates,
    generatingShoppingList,
    setGeneratingShoppingList,
    setShowShoppingListNameModal,
    shoppingListName,
    setShoppingListName,
    setShoppingListSuccessMessage,
    setShowShoppingListSuccessModal,
  });

  // ── Memoized values ──
  const memoizedGroupedMeals = useMemo(() => groupMealsByType(hourlyMeals), [hourlyMeals]);
  const formattedSelectedDate = useMemo(() => formatDate(selectedDate), [selectedDate]);

  // ── Memoized callbacks for child components ──
  const handlePreviousWeek = useCallback(() => {
    HapticPatterns.buttonPress();
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  }, [selectedDate]);

  const handleNextWeek = useCallback(() => {
    HapticPatterns.buttonPress();
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  }, [selectedDate]);

  const handleShowDayMeals = useCallback((date: Date) => {
    setSelectedDayForModal(date);
    setShowDayMealsModal(true);
  }, []);

  const handleToggleExpanded = useCallback(() => {
    setMacrosExpanded(prev => !prev);
  }, []);

  const handleOpenViewModePicker = useCallback(() => {
    setShowViewModePicker(true);
  }, []);

  const handleToggleDay = useCallback((dateStr: string) => {
    setExpandedDays(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(dateStr)) {
        newExpanded.delete(dateStr);
      } else {
        newExpanded.add(dateStr);
      }
      return newExpanded;
    });
  }, []);

  const handleDragStart = useCallback((state: any) => setDraggingMeal(state), []);
  const handleDragEnd = useCallback(() => {
    setDraggingMeal(null);
    setDragOverHour(null);
  }, []);
  const handleDragOver = useCallback((hour: number) => setDragOverHour(hour), []);

  // ── Effects ──

  useEffect(() => {
    isMountedRef.current = true;
    loadMealPlan();

    if (recipeId && recipeTitle && scaledServings) {
      Alert.alert(
        'Add Scaled Recipe to Meal Plan',
        `Add "${recipeTitle}" (${scaledServings} servings) to your meal plan?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add to Meal Plan',
            onPress: () => {
              setShowTimePickerModal(true);
            },
          },
        ]
      );
    } else if (recipeId && recipeTitle) {
      setShowTimePickerModal(true);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [recipeId, recipeTitle, scaledServings]);

  useEffect(() => {
    if (isMountedRef.current) {
      loadMealPlan();
    }
  }, [selectedDate]);

  // Load recurring rules and auto-apply on mount
  useEffect(() => {
    if (isMountedRef.current) {
      loadRecurringRules();
      handleApplyRecurring();
    }
  }, []);

  useEffect(() => {
    if (Object.keys(hourlyMeals).length > 0) {
      loadCostAnalysis();
    } else {
      setCostAnalysis(null);
    }
  }, [hourlyMeals]);

  // ── Render ──

  return (
    <>
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
        {loading ? (
          <>
            <View className="bg-white dark:bg-gray-800 px-4 pt-4 pb-4 border-b border-gray-200 dark:border-gray-700" style={{ minHeight: 56 }}>
              <View className="flex-row items-center justify-center" style={{ height: 28 }}>
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Meal Plan</Text>
              </View>
            </View>
            <ScrollView className="flex-1" contentContainerStyle={{ padding: Spacing.lg }} nestedScrollEnabled={true}>
              <WeeklyCalendarSkeleton />
              <View className="px-4 mb-4">
                <View className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                  <SkeletonLoader width="40%" height={16} borderRadius={4} style={{ marginBottom: 12 }} />
                  <View className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <View key={i}>
                        <View className="flex-row justify-between mb-1">
                          <SkeletonLoader width={60} height={12} borderRadius={4} />
                          <SkeletonLoader width={40} height={12} borderRadius={4} />
                        </View>
                        <SkeletonLoader width={i === 1 ? "100%" : i === 2 ? "85%" : "70%"} height={8} borderRadius={4} />
                      </View>
                    ))}
                  </View>
                </View>
              </View>
              <View className="px-4">
                <SkeletonLoader width="30%" height={18} borderRadius={4} style={{ marginBottom: 12 }} />
                {[1, 2, 3].map((i) => (
                  <MealCardSkeleton key={i} />
                ))}
              </View>
            </ScrollView>
          </>
        ) : (
          <>
        <MealPlanHeader
          dateRange={formatDateRange(weekDates[0], weekDates[6])}
          isSelectedDateToday={isToday(selectedDate)}
          isDark={isDark}
          onJumpToToday={handleJumpToToday}
        />

        <QuickActionsBar
          generatingPlan={generatingPlan}
          generatingShoppingList={generatingShoppingList}
          isDark={isDark}
          onGenerateFullDay={handleGenerateFullDay}
          onGenerateRemainingMeals={handleGenerateRemainingMeals}
          onGenerateWeeklyPlan={handleGenerateWeeklyPlan}
          onShowShoppingListModal={() => setShowShoppingListNameModal(true)}
          onDuplicate={() => setShowDuplicateModal(true)}
          onSaveAsTemplate={() => setShowSaveTemplateModal(true)}
          onUseTemplate={() => {
            setShowTemplatePickerModal(true);
            loadTemplates();
          }}
          onRecurring={() => {
            setManagerModalVisible(true);
            loadRecurringRules();
          }}
          onClearAll={() => {
            setHourlyMeals({});
            setDailyMacros({ calories: 0, protein: 0, carbs: 0, fat: 0 });
          }}
        />

        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: Spacing['3xl'] }}
          nestedScrollEnabled={true}
          onScroll={(event) => {
            scrollPositionRef.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={isDark ? DarkColors.primary : Colors.primary}
              colors={[isDark ? DarkColors.primary : Colors.primary]}
            />
          }
        >
          <WeeklyNutritionSummary weeklyNutrition={weeklyNutrition} isDark={isDark} />

          <WeeklyCalendar
            weekDates={weekDates}
            selectedDate={selectedDate}
            weeklyPlan={weeklyPlan}
            isDark={isDark}
            isToday={isToday}
            isSelected={isSelected}
            onSelectDate={setSelectedDate}
            onPreviousWeek={handlePreviousWeek}
            onNextWeek={handleNextWeek}
            onShowDayMeals={handleShowDayMeals}
          />

          <ThawingReminders thawingReminders={thawingReminders} isDark={isDark} />

          <MealPrepSessions
            selectedDate={selectedDate}
            weeklyPlan={weeklyPlan}
            formattedDate={formattedSelectedDate}
            isDark={isDark}
          />

          <TotalPrepTimeCard totalPrepTime={totalPrepTime} isDark={isDark} />

          <DailyMacrosSummary
            dailyMacros={dailyMacros}
            targetMacros={targetMacros}
            formattedDate={formattedSelectedDate}
            macrosExpanded={macrosExpanded}
            isDark={isDark}
            onToggleExpanded={handleToggleExpanded}
            getMacroColor={getMacroColor}
          />

          <ViewModeSelector viewMode={viewMode} onOpenPicker={handleOpenViewModePicker} />

          {viewMode === '24hour' && (
            <TimelineView
              hours={hours}
              hourlyMeals={hourlyMeals}
              mealTypeFilter={mealTypeFilter}
              draggingMeal={draggingMeal}
              dragOverHour={dragOverHour}
              mealCompletionStatus={mealCompletionStatus}
              mealNotes={mealNotes}
              expandedSwapMealId={expandedSwapMealId}
              loadingSwapSuggestions={loadingSwapSuggestions}
              mealSwapSuggestions={mealSwapSuggestions}
              isDark={isDark}
              onAddMealToHour={handleAddMealToHour}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onMoveMeal={handleMoveMeal}
              onRemoveMeal={handleRemoveMeal}
              onToggleComplete={handleToggleMealCompletion}
              onOpenNotes={handleOpenNotes}
              onGetSwapSuggestions={handleGetSwapSuggestions}
              onSwapMeal={handleSwapMeal}
              onSetRecurring={handleSetRecurring}
            />
          )}

          {viewMode === 'compact' && (
            <CompactMealView
              hourlyMeals={hourlyMeals}
              groupedMeals={memoizedGroupedMeals}
              generatingPlan={generatingPlan}
              isDark={isDark}
              formatTime={formatTime}
              onAddMealToHour={handleAddMealToHour}
              onRemoveMeal={handleRemoveMeal}
              onGenerateFullDay={handleGenerateFullDay}
            />
          )}

          {viewMode === 'collapsible' && (
            <CollapsibleWeekView
              weekDates={weekDates}
              selectedDate={selectedDate}
              expandedDays={expandedDays}
              isDark={isDark}
              getMealsForDate={getMealsForDate}
              onSelectDate={setSelectedDate}
              onToggleDay={handleToggleDay}
            />
          )}

          {/* Cost Analysis */}
          <View className="px-4 mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {"💰 Weekly Cost Analysis"}
              </Text>
              {costAnalysis && costAnalysis.budgetExceeded ? (
                <HapticTouchableOpacity
                  onPress={handleOptimizeCost}
                  className="px-4 py-2 rounded-lg"
                  style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
                >
                  <Text className="text-white font-semibold text-sm">{"Optimize"}</Text>
                </HapticTouchableOpacity>
              ) : null}
            </View>
            <CostAnalysisSection
              costAnalysis={costAnalysis}
              loadingCostAnalysis={loadingCostAnalysis}
              shoppingListSavings={shoppingListSavings}
              maxWeeklyBudget={maxWeeklyBudget}
              isDark={isDark}
              onOptimize={handleOptimizeCost}
            />
          </View>
        </ScrollView>

        {/* Modals */}
        <MealSnackSelectorModal
          visible={showMealSnackSelector}
          generationType={generationType}
          selectedMeals={selectedMeals}
          selectedSnacks={selectedSnacks}
          maxTotalPrepTime={maxTotalPrepTime}
          maxWeeklyBudget={maxWeeklyBudget}
          targetMacros={targetMacros}
          isDark={isDark}
          onClose={() => {
            setShowMealSnackSelector(false);
            setGenerationType(null);
          }}
          onConfirm={handleConfirmMealSnackSelection}
          setSelectedMeals={setSelectedMeals}
          setSelectedSnacks={setSelectedSnacks}
          setMaxTotalPrepTime={setMaxTotalPrepTime}
          setMaxWeeklyBudget={setMaxWeeklyBudget}
          calculateRecommendedMealsAndSnacks={calculateRecommendedMealsAndSnacks}
        />

        <TimePickerModal
          visible={showTimePickerModal && !!(recipeId && recipeTitle)}
          recipeTitle={(recipeTitle as string) || ''}
          selectedHour={selectedHour}
          selectedMinute={selectedMinute}
          formattedTime={formatTime(selectedHour, selectedMinute)}
          manualTimeInput={manualTimeInput}
          showManualInput={showManualInput}
          isDark={isDark}
          onHourChange={setSelectedHour}
          onMinuteChange={setSelectedMinute}
          onManualTimeInput={handleManualTimeInput}
          onToggleManualInput={toggleManualInput}
          onCancel={() => setShowTimePickerModal(false)}
          onConfirm={handleTimePickerConfirm}
        />

        <MealNotesModal
          visible={showNotesModal}
          editingMealName={editingMealName}
          editingNotes={editingNotes}
          quickTemplates={quickTemplates}
          isDark={isDark}
          onClose={handleCloseNotesModal}
          onSave={handleSaveNotes}
          onNotesChange={setEditingNotes}
          onInsertBulletPoint={insertBulletPoint}
          onInsertTemplate={insertTemplate}
        />

        <MealSwapModal
          visible={showSwapModal}
          swapSuggestions={swapSuggestions}
          selectedMealForSwap={selectedMealForSwap}
          isDark={isDark}
          onClose={() => setShowSwapModal(false)}
        />

        <DayMealsModal
          visible={showDayMealsModal}
          selectedDay={selectedDayForModal}
          weeklyPlan={weeklyPlan}
          isDark={isDark}
          onClose={() => {
            setShowDayMealsModal(false);
            setSelectedDayForModal(null);
          }}
          isToday={isToday}
        />

        <ShoppingListNameModal
          visible={showShoppingListNameModal}
          shoppingListName={shoppingListName}
          generatingShoppingList={generatingShoppingList}
          isDark={isDark}
          onClose={() => {
            setShowShoppingListNameModal(false);
            setShoppingListName('');
          }}
          onNameChange={setShoppingListName}
          onConfirm={handleConfirmShoppingListName}
        />

        <ViewModePickerModal
          visible={showViewModePicker}
          viewMode={viewMode}
          isDark={isDark}
          onClose={() => setShowViewModePicker(false)}
          onSelectViewMode={setViewMode}
        />

        <SaveTemplateModal
          visible={showSaveTemplateModal}
          saving={savingTemplate}
          isDark={isDark}
          onClose={() => setShowSaveTemplateModal(false)}
          onSave={handleSaveAsTemplate}
        />

        <TemplatePickerModal
          visible={showTemplatePickerModal}
          templates={templates}
          loading={loadingTemplates}
          applying={applyingTemplate}
          isDark={isDark}
          onClose={() => setShowTemplatePickerModal(false)}
          onApply={handleApplyTemplate}
          onDelete={handleDeleteTemplate}
        />

        <DuplicateModal
          visible={showDuplicateModal}
          duplicating={duplicating}
          isDark={isDark}
          weekDates={weekDates}
          weeklyPlan={weeklyPlan}
          onClose={() => setShowDuplicateModal(false)}
          onCopyLastWeek={handleCopyLastWeek}
          onCopyDay={handleCopyDay}
          onCopyMealToDays={handleCopyMealToDays}
        />
        <RecurringMealModal
          visible={recurringModalVisible}
          onClose={() => {
            setRecurringModalVisible(false);
            setRecurringMeal(null);
            setEditingRule(undefined);
          }}
          meal={recurringMeal}
          existingRule={editingRule}
          onSave={handleSaveRecurringRule}
        />
        <RecurringMealsManagerModal
          visible={managerModalVisible}
          onClose={() => setManagerModalVisible(false)}
          rules={recurringRules}
          onEdit={(rule) => {
            setManagerModalVisible(false);
            setTimeout(() => {
              setRecurringMeal(null);
              setEditingRule(rule);
              setRecurringModalVisible(true);
            }, 300);
          }}
          onDelete={handleDeleteRecurringRule}
          onToggleActive={handleToggleRecurringActive}
        />
        </>
        )}
      </SafeAreaView>

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        title={successMessage.title}
        message={successMessage.message}
        expression="celebrating"
        onDismiss={() => setShowSuccessModal(false)}
      />

      {/* Shopping List Success Modal */}
      <SuccessModal
        visible={showShoppingListSuccessModal}
        title={shoppingListSuccessMessage.title}
        message={shoppingListSuccessMessage.message}
        expression="proud"
        onDismiss={() => setShowShoppingListSuccessModal(false)}
        actionLabel="View List"
        onAction={() => {
          router.push('/(tabs)/shopping-list');
        }}
      />

      {/* Celebration Toast */}
      <Toast
        visible={showCelebrationToast}
        message={celebrationMessage}
        type="success"
        duration={2000}
        onClose={() => setShowCelebrationToast(false)}
      />
    </>
  );
}
