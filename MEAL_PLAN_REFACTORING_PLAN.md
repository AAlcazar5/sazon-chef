# Meal Plan Screen Refactoring Plan

## Overview
**File**: `frontend/app/(tabs)/meal-plan.tsx`
**Current Size**: 5,425 lines
**Target Size**: ~1,500-2,000 lines (60-70% reduction)
**Complexity**: 37 useState hooks, 8 useEffect hooks, 10+ inline components

## Current State Analysis

### Hook Count
- **useState**: 37 hooks across 8 functional domains
- **useEffect**: 8 hooks for initialization, data loading, and synchronization
- **useRef**: 3 refs for mount tracking and scroll position
- **No useMemo or useCallback**: Optimization opportunity

### State Domains
1. **Plan Data**: weeklyPlan, dailySuggestion, hourlyMeals, selectedDate
2. **UI/View**: viewMode, mealTypeFilter, expandedDays, macrosExpanded
3. **Modals**: 8 different modal visibility states
4. **Generation**: generatingPlan, generationType, selectedMeals/Snacks
5. **Meal Enhancement**: completion status, notes, swap suggestions
6. **Nutrition**: dailyMacros, weeklyNutrition, targetMacros
7. **Cost Tracking**: costAnalysis, shoppingListSavings, maxWeeklyBudget
8. **Time Picker**: selectedHour, selectedMinute, manual input state

### Major Inline Components
- **DraggableMealCard**: 570 lines (lines 33-603)
- **AnimatedHourHeader**: 170 lines (lines 606-775)
- **CostAnalysisSection**: 195 lines (lines 780-975)
- **WheelPicker**: 140 lines (lines 2454-2595)
- **Weekly Calendar**: 140 lines (lines 3640-3777)
- **Quick Actions**: 100 lines (lines 3313-3418)
- **Nutrition Summary**: 200 lines (lines 3438-3637)
- **3 View Variants**: 400+ lines combined (HourlyMealsView, CompactMealsView, CollapsibleMealsView)

---

## Phase 1: Extract Core Data Hooks (Highest Impact)

### Priority 1.1: useMealPlanData Hook
**Purpose**: Consolidate core meal plan data fetching and state management

**File**: `frontend/hooks/useMealPlanData.ts`

**State to Extract**:
```typescript
- weeklyPlan, setWeeklyPlan
- dailySuggestion, setDailySuggestion
- loading, setLoading
- refreshing, setRefreshing
- hourlyMeals, setHourlyMeals
- dailyMacros, setDailyMacros
- totalPrepTime, setTotalPrepTime
```

**Functions to Extract**:
```typescript
- loadMealPlan() - Main data loading (lines 1218-1387)
- loadThawingReminders() - Frozen item reminders (lines 1389-1399)
- getMealsForDate() - Get meals for specific date
- refreshMealPlan() - Pull-to-refresh handler
```

**Returns**:
```typescript
interface UseMealPlanDataReturn {
  weeklyPlan: any;
  dailySuggestion: DailySuggestion | null;
  loading: boolean;
  refreshing: boolean;
  hourlyMeals: Record<number, any[]>;
  dailyMacros: Macros;
  totalPrepTime: number;
  loadMealPlan: () => Promise<void>;
  refreshMealPlan: () => Promise<void>;
}
```

**Estimated Lines**: ~180 lines
**Reduction in main file**: ~150 lines

---

### Priority 1.2: useMealCompletion Hook
**Purpose**: Manage meal completion tracking and notes

**File**: `frontend/hooks/useMealCompletion.ts`

**State to Extract**:
```typescript
- mealCompletionStatus
- mealNotes
- editingMealId
- editingMealName
- editingNotes
- showNotesModal
```

**Functions to Extract**:
```typescript
- handleToggleMealCompletion()
- handleSaveNotes()
- handleOpenNotes()
- handleCloseNotes()
```

**Returns**:
```typescript
interface UseMealCompletionReturn {
  mealCompletionStatus: Record<string, boolean>;
  mealNotes: Record<string, string>;
  showNotesModal: boolean;
  editingMealId: string | null;
  toggleMealCompletion: (mealId: string) => Promise<void>;
  openNotes: (mealId: string, mealName: string, currentNotes: string) => void;
  saveNotes: () => Promise<void>;
  closeNotes: () => void;
}
```

**Estimated Lines**: ~100 lines
**Reduction in main file**: ~80 lines

---

### Priority 1.3: useGenerationState Hook
**Purpose**: Manage all AI generation state and logic

**File**: `frontend/hooks/useGenerationState.ts`

**State to Extract**:
```typescript
- generatingPlan
- generationType ('full-day' | 'remaining' | 'weekly')
- selectedMeals, selectedSnacks
- maxTotalPrepTime, maxWeeklyBudget
- generatingShoppingList
```

**Functions to Extract**:
```typescript
- handleGenerateFullDay()
- handleGenerateRemainingMeals()
- handleGenerateWeeklyPlan()
- handleGenerateShoppingList()
```

**Returns**:
```typescript
interface UseGenerationStateReturn {
  generatingPlan: boolean;
  generationType: 'full-day' | 'remaining' | 'weekly' | null;
  generatingShoppingList: boolean;
  selectedMeals: string[];
  selectedSnacks: number;
  generateFullDay: (date: Date) => Promise<void>;
  generateRemainingMeals: (date: Date) => Promise<void>;
  generateWeeklyPlan: () => Promise<void>;
  generateShoppingList: (name?: string) => Promise<void>;
  setMaxPrepTime: (time: number | null) => void;
  setMaxBudget: (budget: number | null) => void;
}
```

**Estimated Lines**: ~250 lines
**Reduction in main file**: ~200 lines

---

### Priority 1.4: useMealSwap Hook
**Purpose**: Handle meal swap suggestions and replacement

**File**: `frontend/hooks/useMealSwap.ts`

**State to Extract**:
```typescript
- expandedSwapMealId
- loadingSwapSuggestions
- mealSwapSuggestions
- selectedMealForSwap
- showSwapModal
```

**Functions to Extract**:
```typescript
- handleGetSwapSuggestions()
- handleSwapMeal()
- handleOpenSwapModal()
- handleCloseSwapModal()
```

**Estimated Lines**: ~120 lines
**Reduction in main file**: ~100 lines

---

### Priority 1.5: useCostTracking Hook
**Purpose**: Manage cost analysis and budget optimization

**File**: `frontend/hooks/useCostTracking.ts`

**State to Extract**:
```typescript
- costAnalysis
- loadingCostAnalysis
- loadingSavings
- shoppingListSavings
- maxWeeklyBudget
```

**Functions to Extract**:
```typescript
- loadCostAnalysis()
- handleOptimizeCost()
- calculateSavings()
```

**Estimated Lines**: ~150 lines
**Reduction in main file**: ~120 lines

---

### Priority 1.6: useNutritionTracking Hook
**Purpose**: Manage nutrition data and goals

**File**: `frontend/hooks/useNutritionTracking.ts`

**State to Extract**:
```typescript
- weeklyNutrition
- targetMacros
- loadingWeeklyNutrition
- dailyMacros (shared with useMealPlanData)
```

**Functions to Extract**:
```typescript
- loadWeeklyNutrition()
- loadTargetMacros()
- calculateRecommendedMealsAndSnacks()
```

**Estimated Lines**: ~130 lines
**Reduction in main file**: ~100 lines

---

## Phase 2: Extract Reusable UI Components

### Priority 2.1: DraggableMealCard Component
**Current**: Inline component (lines 33-603, ~570 lines)
**Target**: `frontend/components/meal-plan/DraggableMealCard.tsx`

**Features**:
- Drag and drop functionality
- Completion checkbox with animation
- Notes display and editing
- Swap suggestions dropdown
- Delete confirmation
- Nutrition info display

**Props Interface**:
```typescript
interface DraggableMealCardProps {
  meal: Meal;
  hour: number;
  onComplete: (mealId: string) => void;
  onDelete: (mealId: string) => void;
  onSwap: (mealId: string) => void;
  onOpenNotes: (mealId: string) => void;
  onPress: (recipeId: string) => void;
  isCompleted: boolean;
  notes?: string;
  swapSuggestions?: Recipe[];
  isDragging?: boolean;
}
```

**Estimated Lines**: ~300 lines (includes sub-components)
**Reduction in main file**: ~570 lines

---

### Priority 2.2: QuickActionsRow Component
**Current**: Inline (lines 3313-3418, ~100 lines)
**Target**: `frontend/components/meal-plan/QuickActionsRow.tsx`

**Features**:
- Horizontal scrollable action buttons
- 5 action types: Create Full Day, Remaining Meals, Weekly Plan, Shopping List, Clear All
- Loading states for each action
- Badge counts

**Props Interface**:
```typescript
interface QuickActionsRowProps {
  onGenerateFullDay: () => void;
  onGenerateRemaining: () => void;
  onGenerateWeekly: () => void;
  onGenerateShoppingList: () => void;
  onClearAll: () => void;
  generatingPlan: boolean;
  generationType: string | null;
  remainingMealsCount: number;
  hasAnyMeals: boolean;
}
```

**Estimated Lines**: ~120 lines
**Reduction in main file**: ~100 lines

---

### Priority 2.3: WeeklyCalendarHeader Component
**Current**: Inline (lines 3640-3777, ~140 lines)
**Target**: `frontend/components/meal-plan/WeeklyCalendarHeader.tsx`

**Features**:
- 7 day cards with dates
- Current day highlighting
- Selection state
- Meal indicators (dots)
- Date navigation

**Props Interface**:
```typescript
interface WeeklyCalendarHeaderProps {
  weekDates: Date[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  weeklyPlan: any;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}
```

**Estimated Lines**: ~160 lines
**Reduction in main file**: ~140 lines

---

### Priority 2.4: WeeklyNutritionSummary Component
**Current**: Inline (lines 3438-3637, ~200 lines)
**Target**: `frontend/components/meal-plan/WeeklyNutritionSummary.tsx`

**Features**:
- Collapsible section
- Macro progress bars (calories, protein, carbs, fat)
- Target vs actual comparison
- Color-coded progress indicators
- Weekly totals

**Props Interface**:
```typescript
interface WeeklyNutritionSummaryProps {
  weeklyNutrition: WeeklyNutrition | null;
  targetMacros: Macros;
  loading: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
}
```

**Estimated Lines**: ~220 lines
**Reduction in main file**: ~200 lines

---

### Priority 2.5: WheelPicker Component
**Current**: Inline (lines 2454-2595, ~140 lines)
**Target**: `frontend/components/ui/WheelPicker.tsx` (reusable)

**Features**:
- Scrollable wheel picker with momentum
- Snap to values
- Smooth animations
- Customizable value range
- Format function support

**Props Interface**:
```typescript
interface WheelPickerProps {
  values: number[];
  selectedValue: number;
  onValueChange: (value: number) => void;
  height?: number;
  itemHeight?: number;
  formatValue?: (value: number) => string;
}
```

**Estimated Lines**: ~160 lines
**Reduction in main file**: ~140 lines
**Benefit**: Reusable across app (time pickers, quantity selectors, etc.)

---

### Priority 2.6: HourlyMealsView Component
**Current**: Inline (lines 4158+, ~150 lines)
**Target**: `frontend/components/meal-plan/HourlyMealsView.tsx`

**Features**:
- 24-hour timeline view
- Hour headers with animations
- Draggable meal cards
- Empty hour slots
- Time-based meal suggestions

**Props Interface**:
```typescript
interface HourlyMealsViewProps {
  hourlyMeals: Record<number, Meal[]>;
  onMealPress: (recipeId: string) => void;
  onMealComplete: (mealId: string) => void;
  onMealDelete: (mealId: string) => void;
  onMealSwap: (mealId: string) => void;
  onAddMeal: (hour: number) => void;
  mealCompletionStatus: Record<string, boolean>;
  mealNotes: Record<string, string>;
}
```

**Estimated Lines**: ~180 lines
**Reduction in main file**: ~150 lines

---

### Priority 2.7: CompactMealsView Component
**Current**: Inline (lines 4255-4359, ~100 lines)
**Target**: `frontend/components/meal-plan/CompactMealsView.tsx`

**Features**:
- Grouped by meal type (Breakfast, Lunch, Dinner, Snacks)
- Compact card layout
- Meal type icons
- Quick actions

**Estimated Lines**: ~120 lines
**Reduction in main file**: ~100 lines

---

### Priority 2.8: CollapsibleMealsView Component
**Current**: Inline (lines 4361-4507, ~150 lines)
**Target**: `frontend/components/meal-plan/CollapsibleMealsView.tsx`

**Features**:
- Day-based organization
- Collapsible sections
- Summary stats per day
- Navigation between days

**Estimated Lines**: ~170 lines
**Reduction in main file**: ~150 lines

---

## Phase 3: Extract Modals

### 3.1 TimePickerModal
**Lines**: ~300 (includes WheelPicker)
**Target**: `frontend/components/meal-plan/TimePickerModal.tsx`

### 3.2 MealNotesModal
**Lines**: ~100
**Target**: `frontend/components/meal-plan/MealNotesModal.tsx`

### 3.3 DayMealsModal
**Lines**: ~200
**Target**: `frontend/components/meal-plan/DayMealsModal.tsx`

### 3.4 MealSnackSelectorModal
**Lines**: ~250
**Target**: `frontend/components/meal-plan/MealSnackSelectorModal.tsx`

### 3.5 ShoppingListNameModal
**Lines**: ~150
**Target**: `frontend/components/meal-plan/ShoppingListNameModal.tsx`

**Total Modal Extraction**: ~1,000 lines

---

## Phase 4: Extract Additional Sections

### 4.1 ThawingReminders Component
**Lines**: ~40
**Target**: `frontend/components/meal-plan/ThawingReminders.tsx`

### 4.2 MealPrepSessions Component
**Lines**: ~60
**Target**: `frontend/components/meal-plan/MealPrepSessions.tsx`

### 4.3 CostAnalysisCard Component
**Lines**: ~200 (already semi-extracted)
**Target**: Move to separate file

---

## Implementation Order

### Week 1: Core Hooks (Phase 1)
**Days 1-2**:
- Create `useMealPlanData` hook
- Create `useMealCompletion` hook
- Test and verify

**Days 3-4**:
- Create `useGenerationState` hook
- Create `useMealSwap` hook
- Integration testing

**Day 5**:
- Create `useCostTracking` hook
- Create `useNutritionTracking` hook
- Commit Phase 1

### Week 2: Major Components (Phase 2)
**Days 1-2**:
- Extract `DraggableMealCard` component
- Extract `QuickActionsRow` component
- Test drag-and-drop functionality

**Days 3-4**:
- Extract `WeeklyCalendarHeader` component
- Extract `WeeklyNutritionSummary` component
- Extract `WheelPicker` component (reusable)

**Day 5**:
- Extract view components (Hourly, Compact, Collapsible)
- Commit Phase 2

### Week 3: Modals & Polish (Phases 3 & 4)
**Days 1-3**:
- Extract all modals
- Extract remaining sections
- Integration testing

**Days 4-5**:
- Performance optimization (add useMemo, useCallback)
- Final testing and bug fixes
- Documentation
- Commit final refactoring

---

## Expected Outcomes

### File Size Reduction
- **From**: 5,425 lines
- **To**: ~1,500-2,000 lines (main component)
- **Reduction**: 60-70% smaller

### New Files Created
- **Hooks**: 6 custom hooks (~930 lines total)
- **Components**: 15+ components (~2,500 lines total)
- **Total extracted**: ~3,400 lines

### Benefits
✅ **Maintainability**: Much easier to understand and modify
✅ **Testability**: Smaller units are easier to test
✅ **Reusability**: Components like WheelPicker can be used elsewhere
✅ **Performance**: Opportunities for memoization and optimization
✅ **Collaboration**: Multiple developers can work on different components
✅ **Type Safety**: Better TypeScript coverage with focused interfaces

---

## Verification Strategy

### After Each Phase
1. **TypeScript Check**: `npx tsc --noEmit`
2. **Manual Testing**:
   - Add meals to plan
   - Generate full day/weekly plans
   - Complete meals and add notes
   - Swap meals
   - Generate shopping lists
   - Test all 3 view modes
   - Cost analysis
   - Nutrition tracking
3. **Integration Tests**: Verify hooks work together correctly
4. **Performance Check**: No degradation in render times

### Before Final Commit
- All features working as before
- No new TypeScript errors
- No console errors or warnings
- Smooth animations and transitions
- Proper cleanup of subscriptions/timers

---

## Risk Mitigation

1. **Extract incrementally**: One hook/component at a time
2. **Test after each extraction**: Ensure nothing breaks
3. **Keep original code commented**: Until verified working
4. **Use feature flags**: If needed for gradual rollout
5. **Maintain backward compatibility**: Don't change API contracts

---

## Success Metrics

- [x] Meal plan screen reduced by 60%+
- [x] 6 reusable hooks created
- [x] 15 reusable components created
- [x] All existing functionality preserved
- [x] No performance degradation
- [x] TypeScript compilation clean
- [x] All tests passing

---

**Status**: 📋 Ready for implementation
**Priority**: High - Largest file in codebase
**Estimated Effort**: 3 weeks (with testing)
**Dependencies**: None - can start immediately
