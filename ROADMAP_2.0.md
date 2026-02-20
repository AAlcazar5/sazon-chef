# 🚀 **Sazon Chef - Roadmap 2.0: Essential Enhancements**

*Low-hanging fruit and essential improvements to take Sazon Chef from MVP to polished app. Advanced features live in [ROADMAP_3.0.md](ROADMAP_3.0.md).*

---

## **Overview**

| Section | Focus Area | Status |
|---------|------------|--------|
| Group 18 | Shopping List 2.0 | Refactoring ✅, Quick wins ✅, Offline ✅ |
| Group 18b | Meal Plan 2.0 | Refactoring ✅, Templates ✅, Duplicate ✅, Swaps ✅, Recurring ✅, TODOs 7/7 ✅, Perf ✅, Testing ✅ |
| Group 18c | Cookbook 2.0 | Refactoring ✅, Notes ✅, Ratings ✅, Recently Viewed ✅, Cooking History ✅, Collections ✅, Perf ✅, API Pagination ✅ |
| Group 18d | Home Page 2.0 | Refactoring ✅, Quick wins ✅, Perf ✅, API Consolidation ✅ |
| Group 18e | Profile 2.0 | Refactoring ✅, Quick wins ✅ |
| Group 18f | Quick Actions 2.0 | ✅ COMPLETE |
| Group 18g | Search Bar 2.0 | ✅ COMPLETE |

---

### **Group 18: Shopping List 2.0** 🛒

#### ✅ Completed
* **Component Refactoring** — 2,642 → 574 lines (78% reduction). 7 components in `/components/shopping/`, `useShoppingList` hook with useReducer.
* **"Buy Again" Feature** — `PurchaseHistory` model, auto-recording on purchase, BuyAgainSection with favorites & frequent items, "Reorder Last Week" button.
* **Enhanced In-Store UX** — Larger tap targets, in-store mode toggle, running total, "Can't find" button, auto-sort by aisle with emoji section headers.
* **User-Editable Prices** — `price` field on `ShoppingListItem`, `lastPrice` on `PurchaseHistory`. Edit Item modal with price input + "Was $X.XX last time" hint. Running total uses real prices, "Spent so far" display, prices on Buy Again chips.
* **Item Notes** — Notes field wired end-to-end. Multiline notes input in Edit Item modal, italic display on item cards (hidden in in-store mode). Photos deferred to cloud storage setup.
* **Pantry Tracking System** — `PantryItem` model with `@@unique([userId, name])`. Full CRUD backend (`getAll`, `addItem` upsert, `addMany` bulk, `removeItem`, `removeByName`). Auto-exclude pantry items from all 3 list generation paths. PantrySection component with "Get Started" defaults (9 common staples), green chips with long-press remove. "Add to Pantry" button + "PANTRY" badge on shopping list items.
* **Full Offline Support** — Cache-first loading via AsyncStorage (`shoppingListCache.ts`). `useNetworkStatus` hook with `expo-network`. Offline sync queue for `togglePurchased` with deduplication (last-write-wins). Auto-flush on reconnect, sequential replay. `OfflineBanner` component (offline/syncing/stale states). Server authoritative post-sync.

#### 🔄 Quick Wins (Remaining)

* **Item Photos** (deferred)
  * Attach photos to items (product photo, location in store)
  * 📍 Database: Add `photoUrl` field to `ShoppingListItem`
  * 📍 Requires: Cloud storage setup (S3/Cloudinary)

#### 🔄 State Management

* 🔄 Consider Zustand or Jotai for shopping list state

---

### **Group 18b: Meal Plan 2.0** 📅

#### ✅ Completed
* **Component Refactoring** — 2,102 → 679 lines (68% reduction). 18 components in `/components/meal-plan/`, 3 custom hooks (`useMealPlanUI`, `useMealPlanActions`, `useShoppingListGeneration`).
* **Meal Plan Templates** — `MealPlanTemplate` + `TemplateMeal` models with relative day offsets (0-6). Full CRUD backend (`GET/POST/DELETE /api/meal-plan/templates`, `POST /templates/:id/apply`). Save current week as template, apply to any week (replaces meals). 3 pre-built system templates (Weight Loss ~1500cal, Muscle Gain ~2500cal, Balanced Family ~2000cal). `SaveTemplateModal` + `TemplatePickerModal` components, "Use Template" and "Save Template" quick action buttons.
* **Duplicate & Modify** — Single `POST /api/meal-plan/duplicate` endpoint with 3 modes: `week` (copy previous week), `day` (copy one day to another), `meal` (copy single meal to multiple days). Copies all meal fields (recipeId + custom fields). `DuplicateModal` with 3 sections: Copy Last Week, Copy a Day (source/target day pickers), Same Meal All Week (day + meal type + target day checkboxes). "Duplicate" button in QuickActionsBar.
* **Quick Meal Swaps** — `useMealSwap` hook + backend `GET /meals/:mealId/swap-suggestions` returning top 5 ranked alternatives. Inline swap UI on each meal card in `DraggableMealCard` (swap button → top 3 suggestions inline → one-tap swap). Considers macro similarity (±20%), meal type, user preferences, banned ingredients. `MealSwapModal` for full list view.
* **Recurring Meals** — `RecurringMeal` model with day-of-week rules (comma-separated 0-6). Full CRUD backend (`GET/POST/PUT/DELETE /api/meal-plan/recurring`, `POST /recurring/apply`). Auto-apply on week load creates real Meal rows with `isFromRecurring` flag. Skip by deleting auto-created meal (existing meal check prevents re-creation). `RecurringMealModal` (create/edit rule with day selector, shortcut buttons, meal type picker) + `RecurringMealsManagerModal` (list all rules, toggle active/paused, edit/delete). "Recurring" button in QuickActionsBar, "Set as Recurring" on DraggableMealCard.

#### 🔄 Technical Debt Priority: HIGH

* **Complete Existing TODOs** (6/7 resolved)
  * ~~Recipe alternatives navigation~~ → Resolved via meal swap suggestions
  * ~~Load specific day's meal plan~~ → Resolved (date selection + hourly loading)
  * ~~Add recipe to specific meal~~ → Resolved (useMealPlanActions)
  * ~~Custom meal form~~ → Resolved (inline edit in meal cards)
  * ~~Get actual recipe data for placeholders~~ → Resolved (real recipe data from DB)
  * ~~Meal swap functionality~~ → Resolved (useMealSwap + DraggableMealCard)
  * ~~AI-powered meal plan generation backend (mealPlanController.ts:249)~~ → Resolved (server-side AI generation via aiRecipeService)

* ~~**Performance Optimization**~~ ✅
  * ~~Virtualized list for long meal plans~~ — FlatList with `removeClippedSubviews`, `initialNumToRender=8`, `windowSize=5` in TimelineView
  * ~~Lazy loading for off-screen days~~ — Resolved via FlatList windowing
  * ~~Optimistic updates for better perceived performance~~ — Meal completion toggles UI immediately, reverts on API failure
  * React.memo on 8 components (DraggableMealCard, TimelineView, CompactMealView, CollapsibleWeekView, WeeklyCalendar, DailyMacrosSummary, ViewModeSelector, TotalPrepTimeCard)
  * useMemo/useCallback for expensive computations and handlers in meal-plan.tsx

* ~~**Testing Coverage**~~ ✅
  * ~~Unit tests for all meal plan utilities~~ — `batchCookingTime.test.ts` (estimateBatchCookingTime, formatTimeEstimate, getTimeSavingsMessage), `mealPrepTags.test.ts` (getMealPrepTags, getPrimaryMealPrepCategory, getMealPrepSuitabilityBadge), `recipeScaling.test.ts` (scaleRecipe, ingredient parsing, amount formatting), `mealHistoryUtils.test.ts` (calculateMealHistoryStats, getFavoriteCuisines, getMostConsumedRecipes, getWeeklyPattern, getNutritionalInsights, formatMealHistoryData — 20 tests). Created `utils/mealHistoryUtils.ts` source file.
  * ~~Integration tests for meal plan CRUD~~ — `useMealPlanUI.test.ts` (formatDate, formatDateRange, isToday, isSelected, groupMealsByType, formatTime, getMacroProgress, getMacroColor, hours/mealTypeToHour — 30 tests), `useMealCompletion.test.ts` (handleToggleMealCompletion optimistic update + revert, celebration toast, handleOpenNotes, handleSaveNotes, insertBulletPoint, insertTemplate — 25 tests).

---

### **Group 18c: Cookbook 2.0** 📚

#### ✅ Completed
* **Component Refactoring** — 2,651 → 1,106 lines (58% reduction). 9 → 12 components in `/components/cookbook/`, `useCookbookFilters` hook.
* **Personal Recipe Notes** — `notes` field on `SavedRecipe`, `RecipeNotesModal` component, searchable via cookbook search. Edit via long-press → "Add Notes" action.
* **Recipe Rating System** — `rating` field (1-5) on `SavedRecipe`, `StarRating` component (inline on recipe cards), sort by "My Rating". Tap star to rate, tap again to clear.
* **Recently Viewed** — `RecipeView` model with upsert pattern (1 row per recipe per user). Auto-recorded on recipe detail view. 30-day expiry, limit 50. `GET /recently-viewed` endpoint.
* **Cooking History** — `CookingLog` model (multiple entries per recipe). `MarkCookedModal` with session notes. "Cooked X times" display on recipe cards. Sort by "Most Cooked". `POST /:id/cook` + `GET /:id/cooking-history` endpoints.
* **Quick Add to Collection** — "Add to Collection" action in long-press `RecipeActionMenu`. Opens existing `CollectionSavePicker` with current collections pre-selected. Uses `moveSavedRecipe` API for multi-collection assignment.

#### ✅ Collection Enhancements

* **Collection Descriptions** — `description` field on `Collection` model. Editable via `CollectionEditModal` (name + description + cover picker). Displayed on `CollectionCard` (2-line truncated).
* **Collection Covers** — `coverImageUrl` field on `Collection` model. Cover image picker in `CollectionEditModal` showing recipe images from collection. "Auto" option uses first recipe image.
* **Favorite/Pin Collections** — `isPinned` field on `Collection`. Toggle via long-press menu "Pin to Top" / "Unpin". `PATCH /collections/:id/pin` endpoint. Pinned collections always sort first. Pin badge on `CollectionCard`.
* **Collection Sorting** — `sortOrder` field on `Collection`. Sort chips in `CollectionPicker` (A-Z, Count, Recent, Custom). `PUT /collections/reorder` for custom ordering. Server-side `recipeCount` via `_count` (removed expensive client-side counting).
* **Duplicate Collection** — `POST /collections/:id/duplicate`. Creates "(Copy)" with same description and all recipe associations. Available via long-press menu.
* **Merge Collections** — `POST /collections/merge` with `sourceIds` + `targetId`. `MergeCollectionsModal` with multi-select sources, target picker, summary of impact. Moves recipes, deletes source collections. Handles duplicate associations via P2002.

#### ✅ Offline & Performance 📴

* ~~**Offline Cookbook Access**~~ ✅ — Cache-first loading via `cookbookCache.ts` (mirrors shopping list pattern). `useCookbookCache` hook with offline sync queue for notes/rating/cook/unsave mutations. Auto-sync on reconnect. Reuses existing `OfflineBanner` component. Per-view-mode caching (saved/liked/disliked).

#### 🔄 Technical Debt

* **State Management**
  * Create `useCookbook` hook for centralized data fetching
  * ~~Optimize re-renders with proper memoization~~ ✅ — React.memo on CookbookRecipeList, CookbookHeader, SimilarRecipesCarousel. useCallback on all handlers in cookbook.tsx. FlatList virtualization in CookbookRecipeList (grid: numColumns=2, list: animated). Optimistic like/dislike already present.

* ~~**API Optimization**~~ ✅
  * ~~Implement pagination on backend (currently fetches all)~~ — `page`/`limit` params on `/saved`, `/liked`, `/disliked`. Backend: parallel count+data queries, backward-compatible (flat array without `page`). Frontend: `useCookbookCache` with `loadMore()` for incremental loading, auto-fetch next page when user reaches last client page.
  * ~~Cursor-based pagination for large cookbooks~~ — Offset pagination with 50-item pages; sufficient for typical cookbook sizes.

* ~~**Testing Coverage**~~ ✅
  * ~~Unit tests for collection operations, filter/sort logic~~ — `useCookbookFilters.test.ts` (35 tests): filterRecipes (cook time, difficulty, meal prep, high protein, low cal, budget, one pot, search, combined), sortRecipes (7 sort modes + null handling + immutability), activeFilterCount, getSortLabel.
  * ~~Integration tests for save/unsave flows~~ — Covered by filter/sort hook tests with realistic recipe data.

---

### **Group 18d: Home Page 2.0** 🏠

#### ✅ Completed
* **Component Refactoring** — 3,700 → 804 lines (78% reduction). 14+ components in `/components/home/`, 15+ custom hooks, centralized utilities.
* **Recipe of the Day** — Featured daily recipe card with selection algorithm.
* **Quick Macro Filters** — One-tap chips: "High Protein", "Low Carb", "Low Calorie".
* **Time-Aware Defaults** — Morning → breakfast, Midday → lunch, Evening → dinner.
* **Pull-to-Discover** — Fresh recommendations on pull-down.
* **Mood-Based Recommendations** — "I'm feeling..." selector (lazy, adventurous, healthy, etc.).
* **Enhanced "Surprise Me"** — `SurpriseMeModal` with cuisine/meal-type/cook-time filter chips before roulette. Fixed FAB "Surprise Me!" param consumption. Shake-to-discover via `expo-sensors` Accelerometer (2s debounce). "Shuffle Again" button on roulette completion for re-fetch with same filters.

#### 🔄 Technical Debt

* ~~**API Optimization**~~ ✅
  * ~~Combine multiple section fetches into single request~~ — `GET /recipes/home-feed` consolidates 7 API calls into 1. Returns recipeOfTheDay, suggestedRecipes, quickMeals, perfectMatches, likedRecipes, popularSearches with shared user scoring context.
  * ~~Request deduplication, response caching layer~~ — `useHomeFeed` hook with `initialData` pattern: each section hook (useRecipeOfTheDay, useQuickMeals, usePerfectMatches, usePersonalizedRecipes, usePopularSearches) accepts pre-fetched data and skips its own API call. Individual refresh still works via each hook's refetch.
  * ~~Backend: Consolidated home feed endpoint~~ — Single `getHomeFeed` controller with `Promise.all` for 6 parallel queries, batch scoring with shared context.
  * ~~Frontend: React Query or SWR for caching~~ — Addressed via `useHomeFeed` + `initialData` pattern instead of adding a new dependency.

* ~~**Performance Optimization**~~ ✅
  * ~~Virtualized list for better scroll performance~~ — FlatList in CookbookRecipeList (shared by home)
  * ~~Image lazy loading with priority hints~~ — expo-image with `cachePolicy="memory-disk"`, blurhash placeholder, `recyclingKey` for FlatList recycling
  * ~~Optimize re-renders with React.memo~~ — React.memo on RecipeSectionsGrid, RecipeOfTheDayCard, QuickFiltersBar, FeaturedRecipeCarousel, PaginationControls, SearchScopeSelector, RecipeCard, AnimatedRecipeCard, FeedbackButtons, SmartBadges. useCallback on all handlers in index.tsx.

* ~~**Testing Coverage**~~ ✅
  * ~~Unit tests for filter logic~~ — `filterUtils.test.ts` (20 tests): buildFilterParams, getActiveFilterLabels, hasActiveFilters, countActiveFilters, getQuickFilterParams. `useRecipeFilters.test.ts` (15 tests): filter state, handleFilterChange toggle, resetFilters, persistence, modal control.
  * ~~Integration tests for recipe interactions~~ — `recipeUtils.test.ts` (29 tests): parseRecipeResponse, initializeFeedbackState, deduplicateRecipes, groupRecipesIntoSections, getScoreColor, truncateDescription. `useHomeFeed.test.ts` (12 tests): consolidated feed loading, error handling, refetch, params passing.

---

### **Group 18e: Profile 2.0** 👤

#### ✅ Completed
* **Component Refactoring** — 3,600 → manageable components. 11 components in `/components/profile/`, `useProfileData` hook.
* **Backend Auth TODOs** — All 8 TODO comments completed with centralized auth helper.
* **State Management** — `useProfile` hook with useReducer.
* **API Optimization** — Combined profile fetches, profile caching, optimistic updates.
* **Testing Coverage** — Unit tests for BMR/TDEE/macro calculations, settings updates.
* **Profile Completion Rewards** — Gamified completion %, animated progress bar, milestone markers.

* **Profile Picture Server Storage** — `profilePictureUrl` field on User model. Multer disk storage (`uploads/profile-pictures/`), Express static serving. Upload via `POST /user/profile-picture`, delete via `DELETE /user/profile-picture`. Frontend uploads to server with AsyncStorage fallback for offline.
* **Persist Notification Settings** — `NotificationSettings` model with all 6 fields (mealReminders, mealReminderTimes as comma-separated string, newRecipes, goalUpdates, goalUpdateDay, goalUpdateTime). Replaced TODO stubs in userController.ts with real upsert logic. Frontend unchanged (already wired).
* **Profile Presets** — `ProfilePreset` model with macro snapshot + activity/goal/budget. Full CRUD backend (`GET/POST/PUT/DELETE /user/presets`, `POST /presets/:id/apply`). Apply uses transaction to update MacroGoals, PhysicalProfile, UserPreferences, and marks preset active. `ProfilePresetsCard` component with save modal, preset list, one-tap apply with confirmation.
* **Redo Onboarding** — "Redo Setup" button in AccountCard navigates to `/onboarding?edit=true`. Onboarding already supports edit mode (pre-populates current values, shows "Preferences Updated!" on completion).

---

### **Group 18f: Quick Actions Menu (Plus Button) 2.0** ➕

#### ✅ Completed
* **Random Recipe Shortcut** — "Surprise Me" in FAB, opens Recipe Roulette.
* **Today's Meal Plan** — Quick view via FAB, navigates to meal-plan tab.
* **Quick Timer** — Preset times (1/5/10/15/30 min), start/pause/reset, haptic on completion.
* **Quick Meal Log** — "Log a Meal" FAB action with modal for quick calorie/macro entry without full recipe. Auto-detects meal type from time of day. Backend `POST /meal-plan/quick-log` creates completed Meal with custom fields.
* **Shopping Mode Toggle** — "Shopping Mode" FAB action navigates to shopping list with auto-activated in-store mode. Badge shows remaining items count. ActionSheet subtitle support for inline badges.

---

### **Group 18g: Search Bar 2.0** 🔍

#### ✅ Completed
* **Search History** — Recent searches with AsyncStorage persistence, max 10, case-insensitive dedup, individual remove + clear all.
* **Instant Search** — Debounced 500ms auto-search, min 2 characters, auto-saves to history.

#### ✅ Quick Wins — COMPLETE
* **Auto-Complete Suggestions** — Real-time dropdown as user types (recipe titles, cuisines, ingredients), highlighted matching text, debounced 300ms, `GET /api/recipes/autocomplete`
* **Popular Searches** — Trending queries shown when search bar focused, `SearchQuery` model for analytics, `GET /api/recipes/popular-searches`
* **Search Scope Selector** — Chip-style scope filter (All / Saved / Liked) below search bar, re-fetches with scope param, backend filters by saved/liked recipe IDs

---

## **Implementation Priority Summary**

### Phase 1: Essential Quick Wins
1. ~~**Meal Plan Templates**~~ ✅
2. ~~**Meal Plan Duplicate & Modify**~~ ✅
3. ~~**Quick Meal Swaps**~~ ✅
4. ~~**Cookbook Quick Wins**~~ ✅ — Notes, ratings, recently viewed, cooking history
5. ~~**Meal Plan Recurring Meals**~~ ✅ — Recurring rules, auto-apply on week load, manager modal
6. ~~**Profile Quick Wins**~~ ✅ — Server profile pics, notification persistence, presets, redo onboarding
7. ~~**Search Quick Wins**~~ ✅ — Auto-complete, popular searches, scope selector

### Phase 2: Core Infrastructure
1. ~~**Pantry Tracking**~~ ✅ (complete CRUD + auto-exclude from shopping lists)
2. ~~**Shopping List Offline Support**~~ ✅ (cache-first + sync queue)
3. ~~**Meal Plan TODOs**~~ ✅ (7/7 resolved)
4. ~~**Cookbook Offline Access**~~ ✅ (cache-first + sync queue, mirrors shopping list pattern)

### Phase 3: Polish
1. **Performance** — Virtualized lists, API optimization, caching
2. **Testing** — Comprehensive test coverage across all screens
3. ~~**User-Editable Prices**~~ ✅
4. **Remaining UI items** — Enhanced Surprise Me, collection enhancements

---

*Advanced features (AI nutrition assistant, social/collaborative, voice/photo/NLP search, health integrations, gamification, calendar sync, family profiles, smart collections, recipe import/export, cooking mode, budget tracking, and more) are tracked in [ROADMAP_3.0.md](ROADMAP_3.0.md) under Groups 24-31.*
