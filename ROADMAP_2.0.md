# 🚀 **Sazon Chef - Roadmap 2.0: Enhanced Features**

*This roadmap contains major enhancement initiatives for each core screen and feature. These are designed to take Sazon Chef from a functional MVP to a polished, feature-rich application.*

---

## **Overview**

| Section | Focus Area | Priority Items |
|---------|------------|----------------|
| Group 18 | Shopping List 2.0 | Pantry tracking, collaborative lists, offline support |
| Group 18b | Meal Plan 2.0 | AI generation, templates, calendar sync |
| Group 18c | Cookbook 2.0 | Smart collections, import/export, cooking mode |
| Group 18d | Home Page 2.0 | Smart discovery modes, personalization, gamification |
| Group 18e | Profile 2.0 | Health integrations, family profiles, security |
| Group 18f | Quick Actions 2.0 | Customizable actions, voice/barcode input |
| Group 18g | Search Bar 2.0 | NLP search, voice/photo search, saved searches |
| Group 18h | AI Nutrition Assistant | Meal history chat, gap analysis, smart recommendations |

---

### **Group 18: Shopping List 2.0 - Enhanced Features** 🛒

#### **Current State Analysis**
* 📝 **Existing Features**: Multi-list management, batch operations, auto-category detection, quantity parsing, generate from meal plan, merge lists, progress tracking, external app integration stubs
* 📝 **Technical Debt**: Main screen is ~2,600 lines with 29+ useState hooks - needs refactoring
* 📝 **Integration Status**: Shopping app integrations (Instacart, Walmart, Kroger) are mocked/placeholder implementations

#### **Quick Wins** (Low effort, high value) ✅ Priority: HIGH
* 🔄 **"Buy Again" Feature**
  * 🔄 Track purchase history per user
  * 🔄 Show frequently purchased items as quick-add suggestions
  * 🔄 "Reorder last week's groceries" button
  * 🔄 Favorite/starred items for instant access
  * 🔄 Seasonal suggestions based on past purchases
  * 📍 Database: Add `PurchaseHistory` model to track completed items
  * 📍 Frontend: Add "Buy Again" section to shopping list screen
  * 📍 Backend: New endpoint `GET /api/shopping-lists/purchase-history`

* 🔄 **Enhanced In-Store UX**
  * 🔄 Larger checkboxes/tap targets for easy tapping while walking
  * 🔄 "In-Store Mode" toggle that simplifies UI
  * 🔄 Running total prominently displayed at top
  * 🔄 Item count badge showing remaining items
  * 🔄 Quick "can't find" option that moves item to end of list
  * 🔄 Auto-sort by aisle when in-store mode enabled
  * 📍 Frontend: Add in-store mode toggle and simplified UI variant

* 🔄 **User-Editable Prices**
  * 🔄 Let users manually set/update item prices
  * 🔄 Remember prices for future lists
  * 🔄 Show running total that updates as items are checked off
  * 🔄 Price history per item ("milk was $3.99 last time")
  * 📍 Database: Add `price` and `priceHistory` fields to `ShoppingListItem`
  * 📍 Frontend: Add price input field to item edit modal

* 🔄 **Item Notes & Photos**
  * 🔄 Add notes field to items (e.g., "the organic one in the green box")
  * 🔄 Attach photos to items (product photo, location in store)
  * 🔄 Voice notes support
  * 📍 Database: `notes` field exists, add `photoUrl` field
  * 📍 Frontend: Add photo capture/attach to item modal

#### **Pantry & Staples Integration** 🥫 Priority: HIGH
* 🔄 **Pantry Tracking System**
  * 🔄 Create "My Pantry" section for items user always has on hand
  * 🔄 Common staples: salt, pepper, oil, flour, sugar, etc.
  * 🔄 Auto-exclude pantry items when generating lists from recipes
  * 🔄 "Add to Pantry" action for any item
  * 🔄 Bulk pantry setup during onboarding
  * 📍 Database: New `PantryItem` model linked to User
  * 📍 Backend: `GET/POST/DELETE /api/pantry` endpoints
  * 📍 Frontend: New pantry management screen + integration with list generation

* 🔄 **Low Stock Warnings**
  * 🔄 Track pantry item quantities
  * 🔄 Alert when staples are running low based on usage patterns
  * 🔄 Auto-add low stock items to shopping list
  * 🔄 Usage frequency learning (e.g., "you use olive oil every 2 weeks")
  * 📍 Backend: Usage pattern analysis service

#### **Smart Store Optimization** 🏪 Priority: MEDIUM
* 🔄 **Aisle Mapping**
  * 🔄 Let users set their preferred store's layout
  * 🔄 Drag-and-drop aisle ordering
  * 🔄 Pre-configured layouts for common stores (Walmart, Kroger, etc.)
  * 🔄 Reorder items by aisle for efficient shopping trips
  * 📍 Database: New `StoreLayout` model with `AisleMapping`
  * 📍 Frontend: Store layout editor screen

* 🔄 **Multi-Store Splitting**
  * 🔄 Recommend which items to buy where based on price
  * 🔄 "Costco list" vs "Grocery store list" auto-splitting
  * 🔄 User preferences for store-specific items (e.g., "always buy meat at Costco")
  * 🔄 Price comparison across configured stores
  * 📍 Backend: Store price database and recommendation engine

* 🔄 **Store-Specific Lists**
  * 🔄 Create separate optimized lists per store
  * 🔄 One-tap "split by store" feature
  * 🔄 Merge store lists back together
  * 📍 Frontend: Store filter/split UI

#### **Collaborative Shopping** 👥 Priority: HIGH
* 🔄 **Shared Lists**
  * 🔄 Share lists with family/roommates via invite link or email
  * 🔄 Permission levels: view-only, can edit, can purchase
  * 🔄 Real-time sync when multiple people shop together
  * 🔄 See who added/purchased what item
  * 📍 Database: `ShoppingListShare` model with permissions
  * 📍 Backend: WebSocket support for real-time sync
  * 📍 Frontend: Share modal, collaborator indicators

* 🔄 **Assign Items to People**
  * 🔄 Assign specific items to specific people
  * 🔄 Filter view by assignee ("Show my items only")
  * 🔄 Push notifications when assigned items
  * 📍 Database: Add `assignedUserId` to `ShoppingListItem`
  * 📍 Frontend: Assignee picker in item modal

* 🔄 **Activity Feed**
  * 🔄 See who purchased what and when
  * 🔄 Comments on items
  * 🔄 "@mention" collaborators
  * 📍 Database: `ShoppingListActivity` audit log

#### **Smart Quantity Suggestions** 📊 Priority: MEDIUM
* 🔄 **Household-Based Quantities**
  * 🔄 Set household size in profile
  * 🔄 Auto-suggest quantities based on household (e.g., "family of 4 typically needs 2 gallons milk/week")
  * 🔄 Learn from past purchases ("you usually buy 2 gallons")
  * 📍 Backend: Quantity prediction service

* 🔄 **Smart Scaling**
  * 🔄 Scale recipes directly from shopping list
  * 🔄 "Double this recipe's ingredients" action
  * 🔄 Warn about overbuying perishables
  * 🔄 Freshness warnings ("2lbs chicken should be used within 3 days")
  * 📍 Frontend: Recipe scaling integration in list view

* 🔄 **Bulk vs Regular Recommendations**
  * 🔄 Suggest bulk buying for frequently purchased items
  * 🔄 Cost-per-unit comparison (bulk vs regular)
  * 🔄 Storage warnings for bulk items

#### **Budget Tracking** 💰 Priority: MEDIUM
* 🔄 **Real Budget Management**
  * 🔄 Set weekly/monthly grocery budget
  * 🔄 Running total updates as items are checked
  * 🔄 Budget alerts ("you're $15 over your weekly budget")
  * 🔄 Visual budget progress bar
  * 📍 Database: `GroceryBudget` model linked to User
  * 📍 Frontend: Budget widget on shopping list screen

* 🔄 **Price History & Trends**
  * 🔄 Track prices over time
  * 🔄 "Milk was cheaper last week" alerts
  * 🔄 Price trend graphs for common items
  * 🔄 Best time to buy recommendations
  * 📍 Backend: Price tracking service with historical data

* 🔄 **Category Spending Breakdown**
  * 🔄 Show spending by category (Produce, Meat, Dairy, etc.)
  * 🔄 Compare to previous weeks/months
  * 🔄 Identify spending patterns

#### **Input Improvements** 🎤 Priority: MEDIUM
* 🔄 **Voice Input**
  * 🔄 "Add 2 pounds of chicken breast" voice command
  * 🔄 Continuous voice mode for rapid item entry
  * 🔄 Voice corrections and confirmations
  * 📍 Frontend: Integrate speech-to-text API
  * 📍 Backend: Natural language parsing for quantities

* 🔄 **Barcode Scanning**
  * 🔄 Scan product barcodes to add items
  * 🔄 Auto-fill name, brand, typical price
  * 🔄 Link to product database (Open Food Facts API)
  * 📍 Frontend: Barcode scanner integration
  * 📍 Backend: Product lookup service

* 🔄 **Natural Language Parsing**
  * 🔄 "milk, eggs, and a dozen oranges" → 3 items
  * 🔄 Smart quantity extraction
  * 🔄 Brand recognition ("Tide detergent" → Household category)
  * 📍 Backend: Enhanced NLP parsing in `ingredientQuantityParser.ts`

* 🔄 **Photo Recognition** (Future)
  * 🔄 Snap a photo of a handwritten list
  * 🔄 OCR + AI to extract items
  * 🔄 Scan receipts to track actual prices paid
  * 📍 Backend: Integrate OCR/Vision API

#### **Substitution Suggestions** 🔄 Priority: LOW
* 🔄 **Smart Alternatives**
  * 🔄 Suggest alternatives when items unavailable
  * 🔄 "No cilantro? Try parsley" recommendations
  * 🔄 Dietary-compatible substitutes
  * 🔄 Price-based alternatives ("organic vs conventional")
  * 📍 Backend: Substitution database and recommendation engine

* 🔄 **User Substitution Preferences**
  * 🔄 Remember user's preferred substitutions
  * 🔄 "Always substitute X with Y" rules
  * 🔄 Share substitution tips with community

#### **Offline Support** 📴 Priority: HIGH
* 🔄 **Full Offline Functionality**
  * 🔄 Cache shopping lists locally
  * 🔄 Work completely offline in-store
  * 🔄 Queue changes for sync when online
  * 🔄 Conflict resolution for shared lists
  * 📍 Frontend: AsyncStorage caching + sync queue
  * 📍 Backend: Conflict resolution endpoints

* 🔄 **Smart Sync**
  * 🔄 Background sync when connection returns
  * 🔄 Sync indicators showing pending changes
  * 🔄 Manual sync trigger option
  * 📍 Frontend: Sync status component

#### **Technical Debt & Refactoring** 🔧 Priority: HIGH
* 🔄 **Component Refactoring**
  * 🔄 Split `shopping-list.tsx` (2,600 lines) into smaller components
    * 🔄 `ShoppingListHeader.tsx` - Header with list picker and actions
    * 🔄 `ShoppingListItem.tsx` - Individual item component
    * 🔄 `ShoppingListCategory.tsx` - Category grouping component
    * 🔄 `AddItemModal.tsx` - Add/edit item modal
    * 🔄 `MergeListsModal.tsx` - List merge functionality
    * 🔄 `ShoppingListProgress.tsx` - Progress bar component
  * 🔄 Reduce 29 useState hooks to useReducer or state machine
  * 🔄 Extract business logic into custom hooks
  * 📍 Frontend: Refactor into `/components/shopping/` directory

* 🔄 **State Management Improvement**
  * 🔄 Implement useReducer for complex state
  * 🔄 Consider Zustand or Jotai for shopping list state
  * 🔄 Optimize re-renders with proper memoization
  * 📍 Frontend: New `useShoppingList` hook with reducer

* 🔄 **Real Shopping App Integration**
  * 🔄 Implement actual OAuth2 flow for Instacart
  * 🔄 Implement actual OAuth2 flow for Walmart
  * 🔄 Implement actual OAuth2 flow for Kroger
  * 🔄 Product matching API integration
  * 🔄 Cart/wishlist creation via real APIs
  * 📍 Backend: Complete `shoppingAppIntegrationService.ts` implementation
  * 📍 Note: Current implementation is mocked - needs real API integration

* 🔄 **Bidirectional Sync Implementation**
  * 🔄 Pull items from external apps (not just push)
  * 🔄 Sync purchased status from store apps
  * 🔄 Handle conflicts between local and external
  * 📍 Backend: Complete `shoppingListSyncService.ts` pull logic

#### **Shopping App Cart/Wishlist Integration** 🛒
* 🛒 **Future: Automatic Shopping List to Store Cart/Wishlist Integration**
  * **Goal**: Automatically create wish lists or shopping carts in third-party shopping apps (Instacart, Walmart, Kroger, etc.) via their APIs
  * **Use Case**: User finds best store → clicks button → shopping list items are automatically added to their cart/wishlist in that store's app
  * **Requirements**:
    * Full API integration with shopping app providers (OAuth, authentication)
    * Product matching/identification (match ingredient names to store products)
    * Cart/wishlist management via API
    * Bidirectional sync (items added in store app sync back to our app)
  * **Status**: Removed manual deep links - waiting for proper API integration
  * **Priority**: Medium - High value feature but requires significant API integration work
  * **Note**: Manual deep links were removed as they don't provide the seamless experience users expect. This feature will be revisited when we can implement proper API-based cart/wishlist creation.

---

### **Group 18b: Meal Plan 2.0 - Enhanced Features** 📅

#### **Current State Analysis**
* 📝 **Existing Features**: 24-hour timeline view, drag-and-drop meals, swipe gestures (complete/delete), meal swaps, cost analysis, weekly nutrition summary, meal prep integration, thawing reminders, shopping list generation, multiple view modes
* 📝 **Technical Debt**: Main screen is ~5,400 lines with 50+ state variables - significant refactoring needed
* 📝 **Incomplete Features**: 7 TODOs in frontend (recipe alternatives, custom meals, meal swaps), 1 TODO in backend (AI meal plan generation)
* 📝 **Integration Status**: Well-integrated with recipes, shopping lists, meal prep, and cost tracking

#### **Quick Wins** (Low effort, high value) ✅ Priority: HIGH
* 🔄 **Meal Plan Templates**
  * 🔄 Save current week as a template ("My Cutting Week", "Bulking Plan", "Family Favorites")
  * 🔄 One-tap apply template to any week
  * 🔄 Share templates with other users
  * 🔄 Pre-built templates for common goals (weight loss, muscle gain, maintenance)
  * 📍 Database: New `MealPlanTemplate` model with `templateMeals` relation
  * 📍 Backend: `POST/GET/DELETE /api/meal-plan/templates`
  * 📍 Frontend: Template picker modal, save as template button

* 🔄 **Duplicate & Modify**
  * 🔄 "Copy last week" button to duplicate previous week's plan
  * 🔄 Copy single day to another day
  * 🔄 Copy single meal to multiple days ("same breakfast all week")
  * 📍 Frontend: Copy actions in context menus
  * 📍 Backend: `POST /api/meal-plan/duplicate`

* 🔄 **Quick Meal Swaps**
  * 🔄 One-tap swap button on each meal card
  * 🔄 Show 3 instant alternatives without opening modal
  * 🔄 "Swap all breakfasts" batch action
  * 🔄 Remember swap preferences ("when I swap chicken, suggest fish")
  * 📍 Frontend: Inline swap UI, batch swap modal

* 🔄 **Recurring Meals**
  * 🔄 Set meals to repeat ("Oatmeal every weekday breakfast")
  * 🔄 Weekly recurring patterns
  * 🔄 Easy toggle to skip specific days
  * 🔄 Auto-populate when creating new week's plan
  * 📍 Database: Add `isRecurring`, `recurringPattern` to Meal model
  * 📍 Backend: Recurring meal resolution logic

#### **Smart Planning & AI** 🤖 Priority: HIGH
* 🔄 **AI-Powered Plan Generation** (Complete existing TODO)
  * 🔄 "Generate full week" based on macro goals and preferences
  * 🔄 Respect dietary restrictions and banned ingredients
  * 🔄 Variety enforcement (no repeated proteins/cuisines)
  * 🔄 Cook time distribution (quick meals on busy days)
  * 🔄 Budget-aware generation
  * 📍 Backend: Complete TODO in `mealPlanController.ts:249`
  * 📍 Frontend: AI generation modal with preferences

* 🔄 **Smart Suggestions**
  * 🔄 "Based on what you have" - suggest meals using pantry items
  * 🔄 "Use expiring ingredients" - prioritize items about to expire
  * 🔄 "Similar to what you liked" - ML-based recommendations
  * 🔄 Time-aware suggestions (quick meals for busy evenings)
  * 📍 Backend: Enhanced suggestion engine with context awareness

* 🔄 **Goal-Based Planning Modes**
  * 🔄 "Cut" mode - calorie deficit with high protein
  * 🔄 "Bulk" mode - calorie surplus with macro targets
  * 🔄 "Maintenance" mode - balanced macros at TDEE
  * 🔄 "Performance" mode - carb cycling for athletes
  * 🔄 Mode affects all AI suggestions and swaps
  * 📍 Database: Add `planningMode` to MealPlan model
  * 📍 Frontend: Mode selector in plan settings

* 🔄 **Flexible Macro Targets**
  * 🔄 Set weekly macro targets instead of daily
  * 🔄 Allow high/low days (carb cycling support)
  * 🔄 "Rollover" unused macros to next day
  * 🔄 Weekly average tracking vs strict daily
  * 📍 Frontend: Weekly vs daily macro toggle

#### **Leftover & Ingredient Optimization** 🥡 Priority: MEDIUM
* 🔄 **Leftover Tracking**
  * 🔄 Mark meals as "makes leftovers"
  * 🔄 Auto-suggest leftover for next day's lunch
  * 🔄 Track leftover portions and expiry
  * 🔄 "Finish leftovers first" reminders
  * 📍 Database: `Leftover` model with portion tracking
  * 📍 Frontend: Leftover indicator on meal cards

* 🔄 **Ingredient Overlap Optimization**
  * 🔄 Analyze planned recipes for shared ingredients
  * 🔄 Suggest swaps to maximize ingredient reuse
  * 🔄 "Buy once, use multiple times" recommendations
  * 🔄 Reduce food waste and shopping costs
  * 📍 Backend: Ingredient overlap analysis service

* 🔄 **Batch Cooking Optimization**
  * 🔄 Identify recipes that can be batch-cooked together
  * 🔄 Optimal cooking order for prep day
  * 🔄 Equipment scheduling (oven vs stovetop timing)
  * 🔄 Prep day time estimation
  * 📍 Backend: Batch cooking optimization algorithm

#### **Calendar & Scheduling** 📆 Priority: MEDIUM
* 🔄 **Calendar Sync**
  * 🔄 Sync meal plan to Google Calendar
  * 🔄 Sync to Apple Calendar
  * 🔄 Include cook time reminders
  * 🔄 Shopping reminder events
  * 📍 Frontend: Calendar integration via expo-calendar
  * 📍 Backend: iCal export endpoint

* 🔄 **Cook Time Scheduling**
  * 🔄 Set desired meal time (e.g., "Dinner at 7pm")
  * 🔄 Calculate when to start cooking
  * 🔄 Push notification: "Start cooking in 30 minutes"
  * 🔄 Account for prep time + cook time
  * 📍 Frontend: Meal time picker, notification scheduling
  * 📍 Backend: Push notification service

* 🔄 **Meal Reminders**
  * 🔄 "Time for breakfast" notification
  * 🔄 Thawing reminders (already partially implemented)
  * 🔄 "Don't forget to eat" reminders
  * 🔄 Customizable reminder timing
  * 📍 Frontend: Notification preferences screen

* 🔄 **Busy Day Detection**
  * 🔄 Integrate with calendar to detect busy days
  * 🔄 Auto-suggest quick meals (<30 min) for busy days
  * 🔄 "Meeting at 6pm? Here's a 15-minute dinner"
  * 📍 Frontend: Calendar read permission, busy day logic

#### **Family & Multi-Person Planning** 👨‍👩‍👧‍👦 Priority: MEDIUM
* 🔄 **Household Profiles**
  * 🔄 Add family members with individual preferences
  * 🔄 Different portion sizes per person
  * 🔄 Per-person dietary restrictions
  * 🔄 Kids' meal preferences
  * 📍 Database: `HouseholdMember` model linked to User
  * 📍 Frontend: Family management screen

* 🔄 **Portion Scaling Per Person**
  * 🔄 Adult vs child portions
  * 🔄 "John eats double portions"
  * 🔄 Auto-calculate total ingredients needed
  * 🔄 Per-person macro tracking
  * 📍 Backend: Portion multiplier logic

* 🔄 **Shared Meal Planning**
  * 🔄 Share meal plan with partner/family
  * 🔄 Collaborative editing
  * 🔄 See who marked meals complete
  * 🔄 Family meal calendar view
  * 📍 Database: `MealPlanShare` model with permissions
  * 📍 Backend: WebSocket for real-time sync

#### **Eating Out & Flexibility** 🍽️ Priority: LOW
* 🔄 **Restaurant/Takeout Logging**
  * 🔄 Log meals eaten out
  * 🔄 Search restaurant menu items
  * 🔄 Manual macro entry for unknown meals
  * 🔄 "Ate out" placeholder that adjusts daily macros
  * 📍 Database: Support custom meals with `isEatingOut` flag
  * 📍 Frontend: Quick "eating out" entry modal

* 🔄 **Flexible Meal Slots**
  * 🔄 "Skip meal" option (intermittent fasting support)
  * 🔄 "Combine meals" (brunch instead of breakfast + lunch)
  * 🔄 Custom meal times beyond breakfast/lunch/dinner/snack
  * 📍 Frontend: Flexible meal slot configuration

* 🔄 **Cheat Meal Planning**
  * 🔄 Designate "cheat meals" in advance
  * 🔄 Auto-adjust surrounding meals to compensate
  * 🔄 Weekly cheat meal budget
  * 📍 Backend: Cheat meal compensation algorithm

#### **Analytics & Insights** 📊 Priority: LOW
* 🔄 **Meal Plan History**
  * 🔄 View past weeks' meal plans
  * 🔄 Compare nutrition across weeks
  * 🔄 Streak tracking (days planned in advance)
  * 🔄 Completion rate trends
  * 📍 Frontend: History browser screen

* 🔄 **Variety Scoring**
  * 🔄 Score meal plans on variety (cuisines, proteins, vegetables)
  * 🔄 Warn about repetitive patterns
  * 🔄 Suggest variety improvements
  * 🔄 "You've had chicken 5 times this week"
  * 📍 Backend: Variety analysis service

* 🔄 **Nutrition Trends**
  * 🔄 Weekly/monthly macro trends
  * 🔄 Nutrient gap analysis
  * 🔄 "You're consistently low on fiber"
  * 🔄 Micronutrient tracking over time
  * 📍 Frontend: Nutrition dashboard with charts

* 🔄 **Cost Tracking Over Time**
  * 🔄 Weekly/monthly food spending trends
  * 🔄 Cost per calorie analysis
  * 🔄 Budget vs actual spending history
  * 🔄 Savings from meal planning vs eating out
  * 📍 Frontend: Cost analytics dashboard

#### **UI/UX Improvements** 🎨 Priority: HIGH
* 🔄 **Simplified Daily View**
  * 🔄 Focus mode: Show only today's meals
  * 🔄 Large meal cards with prominent images
  * 🔄 One-tap actions for common tasks
  * 🔄 Minimal distractions, maximum usability
  * 📍 Frontend: New simplified daily view component

* 🔄 **Drag & Drop Improvements**
  * 🔄 Visual drop zones during drag
  * 🔄 Cross-day drag (move meal to different day)
  * 🔄 Multi-select and batch move
  * 🔄 Undo last move action
  * 📍 Frontend: Enhanced gesture handling

* 🔄 **Better Empty States**
  * 🔄 Guided first-time experience
  * 🔄 "Tap to add meal" on empty slots
  * 🔄 Quick-add from recent meals
  * 🔄 AI suggestion prompts on empty days
  * 📍 Frontend: Enhanced empty state components

* 🔄 **Compact Week Overview**
  * 🔄 See entire week at a glance
  * 🔄 Color-coded by macro balance (green = on target)
  * 🔄 Completion indicators per day
  * 🔄 Tap to expand day details
  * 📍 Frontend: New compact calendar component

#### **Technical Debt & Refactoring** 🔧 Priority: HIGH
* 🔄 **Component Refactoring**
  * 🔄 Split `meal-plan.tsx` (5,400 lines) into smaller components
    * 🔄 `MealPlanHeader.tsx` - Date navigation and view toggles
    * 🔄 `DailyMealView.tsx` - Single day's meals display
    * 🔄 `WeeklyOverview.tsx` - Week calendar component
    * 🔄 `MealCard.tsx` - Individual meal card (extract from DraggableMealCard)
    * 🔄 `MealSlot.tsx` - Empty meal slot with add action
    * 🔄 `NutritionSummary.tsx` - Daily/weekly macro summary
    * 🔄 `MealSwapModal.tsx` - Swap suggestions modal
    * 🔄 `AddMealModal.tsx` - Add recipe/custom meal modal
    * 🔄 `CostAnalysisCard.tsx` - Cost breakdown component
    * 🔄 `ThawingReminders.tsx` - Thawing reminder section
  * 🔄 Reduce 50+ state variables to useReducer
  * 🔄 Extract gesture handling into custom hooks
  * 📍 Frontend: Refactor into `/components/meal-plan/` directory

* 🔄 **State Management Improvement**
  * 🔄 Implement useReducer for complex meal plan state
  * 🔄 Create `useMealPlan` hook for centralized logic
  * 🔄 Separate UI state from data state
  * 🔄 Optimize re-renders with proper memoization
  * 📍 Frontend: New `useMealPlan` hook with reducer

* 🔄 **Complete Existing TODOs**
  * 🔄 Recipe alternatives navigation screen (Line 1940)
  * 🔄 Load specific day's meal plan (Line 1960)
  * 🔄 Add recipe to specific meal implementation (Line 1979)
  * 🔄 Custom meal form (Line 2012)
  * 🔄 Get actual recipe data for placeholders (Line 2386-2392)
  * 🔄 Meal swap functionality (Line 5010)
  * 🔄 AI-powered meal plan generation backend (mealPlanController.ts:249)
  * 📍 Frontend/Backend: Address all TODO comments

* 🔄 **Performance Optimization**
  * 🔄 Virtualized list for long meal plans
  * 🔄 Lazy loading for off-screen days
  * 🔄 Optimistic updates for better perceived performance
  * 🔄 Cache meal plan data locally
  * 📍 Frontend: React Native virtualization

* 🔄 **Testing Coverage**
  * 🔄 Unit tests for all meal plan utilities
  * 🔄 Integration tests for meal plan CRUD
  * 🔄 E2E tests for critical user flows
  * 🔄 Gesture handling tests
  * 📍 Frontend/Backend: Comprehensive test suite

---

### **Group 18c: Cookbook 2.0 - Enhanced Features** 📚

#### **Current State Analysis**
* 📝 **Existing Features**: Saved/liked/disliked views, custom collections, multi-collection support, advanced filtering (cook time, difficulty, dietary), sorting options, grid/list views, cookbook insights with statistics, similar recipes carousel, comprehensive scoring system
* 📝 **Technical Debt**: Main screen is ~3,200 lines - needs component splitting
* 📝 **Data Model**: Collection, SavedRecipe, RecipeCollection (many-to-many join), RecipeFeedback models
* 📝 **Missing**: Collection sharing, batch operations, recipe notes, smart collections, export functionality

#### **Quick Wins** (Low effort, high value) ✅ Priority: HIGH
* 🔄 **Personal Recipe Notes**
  * 🔄 Add notes to any saved recipe ("needs more garlic", "kids loved it")
  * 🔄 Notes visible on recipe card and detail view
  * 🔄 Search notes content
  * 🔄 Note history with timestamps
  * 📍 Database: Add `notes` field to `SavedRecipe` model
  * 📍 Frontend: Notes input in recipe modal, notes indicator on cards

* 🔄 **Recipe Rating System**
  * 🔄 5-star personal rating (beyond like/dislike)
  * 🔄 Rate after cooking
  * 🔄 Sort/filter by personal rating
  * 🔄 "Highly rated" smart collection
  * 📍 Database: Add `rating` field (1-5) to `SavedRecipe`
  * 📍 Frontend: Star rating component

* 🔄 **Recently Viewed**
  * 🔄 Track last 50 viewed recipes
  * 🔄 "Recently Viewed" filter/collection option
  * 🔄 Clear history option
  * 🔄 Auto-expire after 30 days
  * 📍 Database: New `RecipeView` model with timestamps
  * 📍 Backend: `GET /api/recipes/recently-viewed`

* 🔄 **Cooking History**
  * 🔄 Mark recipes as "cooked" with date
  * 🔄 "Cooked X times" counter on recipe cards
  * 🔄 "Last cooked: 2 weeks ago" indicator
  * 🔄 Filter by cooking frequency
  * 📍 Database: Enhance `RecipeFeedback.consumed` with history
  * 📍 Frontend: Cook history badge and filter

* 🔄 **Quick Add to Collection**
  * 🔄 Long-press quick action: "Add to..." with recent collections
  * 🔄 Create new collection inline
  * 🔄 Multi-select recipes for batch add
  * 📍 Frontend: Enhanced action sheet with collection picker

#### **Collection Enhancements** 📁 Priority: HIGH
* 🔄 **Collection Descriptions**
  * 🔄 Add optional description to collections
  * 🔄 Show description in collection header
  * 🔄 Search collection descriptions
  * 📍 Database: Add `description` field to `Collection` model

* 🔄 **Collection Covers**
  * 🔄 Custom cover image upload (schema has coverImageUrl but not implemented)
  * 🔄 Auto-generate cover from recipe grid
  * 🔄 Cover templates/styles
  * 📍 Backend: Implement `coverImageUrl` field usage
  * 📍 Frontend: Cover image picker in collection settings

* 🔄 **Favorite/Pin Collections**
  * 🔄 Pin collections to top of list
  * 🔄 Starred collections appear first
  * 🔄 Quick access from home screen
  * 📍 Database: Add `isPinned` field to `Collection`
  * 📍 Frontend: Pin toggle, pinned section

* 🔄 **Collection Sorting**
  * 🔄 Custom drag-and-drop ordering
  * 🔄 Sort by recipe count, last updated, alphabetical
  * 🔄 Persist sort preference
  * 📍 Database: Add `sortOrder` field to `Collection`
  * 📍 Frontend: Sortable collection list

* 🔄 **Duplicate Collection**
  * 🔄 Clone collection with all recipes
  * 🔄 "Duplicate as..." with name input
  * 🔄 Option to include/exclude personal notes
  * 📍 Backend: `POST /api/recipes/collections/:id/duplicate`

* 🔄 **Merge Collections**
  * 🔄 Combine two or more collections
  * 🔄 Handle duplicate recipes
  * 🔄 Delete source collections option
  * 📍 Backend: `POST /api/recipes/collections/merge`

#### **Smart Collections** 🧠 Priority: MEDIUM
* 🔄 **Rules-Based Smart Collections**
  * 🔄 Auto-populate based on criteria
  * 🔄 Examples: "High Protein (>30g)", "Quick Meals (<20 min)", "5 Stars"
  * 🔄 Multiple rules with AND/OR logic
  * 🔄 Live updating as recipes are added
  * 📍 Database: New `SmartCollection` model with rules JSON
  * 📍 Backend: Smart collection evaluation engine

* 🔄 **Built-in Smart Collections**
  * 🔄 "Quick & Easy" (≤20 min, Easy difficulty)
  * 🔄 "Highly Rated" (4+ stars)
  * 🔄 "Not Cooked Recently" (>30 days)
  * 🔄 "Seasonal" (based on current season ingredients)
  * 🔄 "Weekend Projects" (>60 min cook time)
  * 🔄 "Weeknight Dinners" (≤30 min, dinner-tagged)
  * 📍 Frontend: Pre-configured smart collection templates

* 🔄 **Meal Type Auto-Collections**
  * 🔄 Auto-sort by breakfast/lunch/dinner/snack
  * 🔄 Based on recipe tags or AI classification
  * 📍 Backend: Meal type classification service

#### **Batch Operations** 📦 Priority: MEDIUM
* 🔄 **Multi-Select Mode**
  * 🔄 Select multiple recipes with checkboxes
  * 🔄 "Select All" / "Deselect All" actions
  * 🔄 Selection count indicator
  * 🔄 Bulk action toolbar appears when selecting
  * 📍 Frontend: Multi-select UI mode

* 🔄 **Batch Move to Collection**
  * 🔄 Move selected recipes to collection(s)
  * 🔄 Add to multiple collections at once
  * 🔄 Remove from current collection option
  * 📍 Backend: `PATCH /api/recipes/batch/move-to-collection`

* 🔄 **Batch Delete**
  * 🔄 Delete multiple recipes from cookbook
  * 🔄 Confirmation with count
  * 🔄 Undo option (soft delete with recovery window)
  * 📍 Backend: `DELETE /api/recipes/batch/unsave`

* 🔄 **Batch Export**
  * 🔄 Export selected recipes to PDF
  * 🔄 Export to printable format
  * 🔄 Share as recipe book image
  * 📍 Backend: PDF generation service
  * 📍 Frontend: Export format picker

#### **Recipe Import & Export** 📤 Priority: MEDIUM
* 🔄 **Import from URL**
  * 🔄 Paste recipe URL to import
  * 🔄 Support major recipe sites (AllRecipes, Food Network, etc.)
  * 🔄 AI-powered extraction for unsupported sites
  * 🔄 Review and edit before saving
  * 📍 Backend: Recipe scraper service with schema.org support
  * 📍 Frontend: URL import modal

* 🔄 **Import from Photo**
  * 🔄 Take photo of recipe card/book
  * 🔄 OCR extraction of ingredients and instructions
  * 🔄 AI cleanup and formatting
  * 📍 Backend: OCR + AI processing pipeline

* 🔄 **Export to PDF**
  * 🔄 Beautiful PDF recipe cards
  * 🔄 Include personal notes and rating
  * 🔄 Collection as recipe book PDF
  * 🔄 Print-friendly formatting
  * 📍 Backend: PDF generation with templates

* 🔄 **Share as Image**
  * 🔄 Generate shareable recipe card image
  * 🔄 Instagram/Pinterest optimized formats
  * 🔄 Include app branding
  * 📍 Frontend: Image generation and share sheet

* 🔄 **Export Collection**
  * 🔄 Export entire collection as JSON backup
  * 🔄 Import collection from backup
  * 🔄 Cross-device sync via export/import
  * 📍 Backend: Collection serialization endpoints

#### **Recipe Modifications & Versioning** ✏️ Priority: LOW
* 🔄 **Personal Modifications**
  * 🔄 Save modified version of any recipe
  * 🔄 Track ingredient substitutions made
  * 🔄 "My Version" badge on modified recipes
  * 🔄 Compare original vs modified
  * 📍 Database: New `RecipeModification` model
  * 📍 Frontend: Modification editor

* 🔄 **Substitution Tracking**
  * 🔄 Record ingredient swaps ("used almond milk instead of dairy")
  * 🔄 Rate substitution success
  * 🔄 Suggest substitutions to others
  * 📍 Database: `IngredientSubstitution` model

* 🔄 **Recipe Versioning**
  * 🔄 Track changes to user-created recipes
  * 🔄 Version history with timestamps
  * 🔄 Restore previous versions
  * 🔄 Compare versions side by side
  * 📍 Database: Recipe version history table

#### **Photo Gallery** 📸 Priority: LOW
* 🔄 **Personal Recipe Photos**
  * 🔄 Add your own photos to any recipe
  * 🔄 Multiple photos per recipe
  * 🔄 Photo with cooking date
  * 🔄 Before/after photos
  * 📍 Database: `RecipePhoto` model linked to SavedRecipe
  * 📍 Frontend: Photo gallery component

* 🔄 **Photo Feed**
  * 🔄 See all your cooking photos chronologically
  * 🔄 Filter by recipe, date range, collection
  * 🔄 Share cooking journey
  * 📍 Frontend: Photo feed screen

#### **Social & Sharing** 👥 Priority: LOW
* 🔄 **Share Collections**
  * 🔄 Generate shareable link for collection
  * 🔄 Public/private visibility toggle
  * 🔄 View-only or allow copying
  * 🔄 Share stats (views, copies)
  * 📍 Database: Add `isPublic`, `shareToken` to Collection
  * 📍 Backend: Public collection endpoints

* 🔄 **Follow Other Users**
  * 🔄 Follow friends' public collections
  * 🔄 Feed of new recipes from followed users
  * 🔄 "Popular in your network" suggestions
  * 📍 Database: `UserFollow` model
  * 📍 Frontend: Social feed screen

* 🔄 **Collection Collaboration**
  * 🔄 Invite others to contribute to collection
  * 🔄 Permission levels (view, add, edit, admin)
  * 🔄 Activity log of contributions
  * 📍 Database: `CollectionCollaborator` model

#### **Discovery & Recommendations** 🔍 Priority: MEDIUM
* 🔄 **"You Might Like" Suggestions**
  * 🔄 AI-powered recommendations based on cookbook
  * 🔄 "Because you saved X, try Y"
  * 🔄 Weekly personalized suggestions
  * 🔄 One-tap save to cookbook
  * 📍 Backend: Enhanced recommendation engine

* 🔄 **Duplicate Detection**
  * 🔄 Warn when saving similar recipe
  * 🔄 "You have a similar recipe" alert
  * 🔄 Find duplicates in cookbook
  * 🔄 Merge duplicate recipes
  * 📍 Backend: Recipe similarity detection

* 🔄 **Recipe Comparison**
  * 🔄 Compare 2-3 recipes side by side
  * 🔄 Highlight differences in ingredients, macros, time
  * 🔄 "Which is healthier?" analysis
  * 📍 Frontend: Comparison modal

* 🔄 **Gap Analysis**
  * 🔄 "Your cookbook is missing breakfast ideas"
  * 🔄 Cuisine diversity suggestions
  * 🔄 Nutritional variety recommendations
  * 📍 Backend: Cookbook analysis service

#### **Cooking Mode** 👨‍🍳 Priority: MEDIUM
* 🔄 **Hands-Free Cooking**
  * 🔄 Large text cooking mode
  * 🔄 Voice commands: "Next step", "Repeat", "Timer 10 minutes"
  * 🔄 Keep screen awake while cooking
  * 🔄 Step-by-step with progress indicator
  * 📍 Frontend: Dedicated cooking mode screen

* 🔄 **Built-in Timers**
  * 🔄 Set timers from recipe instructions
  * 🔄 Multiple concurrent timers
  * 🔄 Timer notifications
  * 🔄 "Timer done" voice announcement
  * 📍 Frontend: Timer component with notifications

* 🔄 **Ingredient Checklist**
  * 🔄 Check off ingredients as you prep
  * 🔄 Shopping list for missing ingredients
  * 🔄 Scale ingredients for servings
  * 📍 Frontend: Interactive ingredient list

#### **Offline & Performance** 📴 Priority: HIGH
* 🔄 **Offline Cookbook Access**
  * 🔄 Cache saved recipes locally
  * 🔄 View cookbook without internet
  * 🔄 Sync when connection returns
  * 🔄 Selective offline (choose which collections)
  * 📍 Frontend: AsyncStorage caching layer

* 🔄 **Quick Load**
  * 🔄 Instant cookbook load from cache
  * 🔄 Background refresh for updates
  * 🔄 Optimistic UI updates
  * 📍 Frontend: Cache-first loading strategy

#### **Technical Debt & Refactoring** 🔧 Priority: HIGH
* 🔄 **Component Refactoring**
  * 🔄 Split `cookbook.tsx` (3,200 lines) into smaller components
    * 🔄 `CookbookHeader.tsx` - View mode toggles and search
    * 🔄 `CollectionPicker.tsx` - Collection dropdown/selector
    * 🔄 `CookbookFilters.tsx` - Filter modal and chips
    * 🔄 `RecipeGrid.tsx` - Grid view component
    * 🔄 `RecipeList.tsx` - List view component
    * 🔄 `CookbookInsights.tsx` - Insights modal
    * 🔄 `SimilarRecipesCarousel.tsx` - Similar recipes section
    * 🔄 `CookbookPagination.tsx` - Pagination controls
  * 🔄 Extract filtering logic into custom hook
  * 🔄 Extract sorting logic into custom hook
  * 📍 Frontend: Refactor into `/components/cookbook/` directory

* 🔄 **State Management**
  * 🔄 Create `useCookbook` hook for centralized state
  * 🔄 Implement useReducer for complex filter state
  * 🔄 Optimize re-renders with proper memoization
  * 📍 Frontend: New cookbook state management

* 🔄 **API Optimization**
  * 🔄 Implement pagination on backend (currently fetches all)
  * 🔄 Add cursor-based pagination for large cookbooks
  * 🔄 Optimize scoring calculations (cache scores)
  * 📍 Backend: Paginated endpoints with cursor support

* 🔄 **Testing Coverage**
  * 🔄 Unit tests for collection operations
  * 🔄 Integration tests for save/unsave flows
  * 🔄 E2E tests for cookbook navigation
  * 🔄 Filter and sort logic tests
  * 📍 Frontend/Backend: Comprehensive test suite

---

### **Group 18d: Home Page 2.0 - Enhanced Discovery** 🏠

#### **Current State Analysis**
* 📝 **Existing Features**: Featured recipe showcase, contextual sections (Quick Meals, Perfect Match, Meal Prep, Superfoods), advanced filtering (cuisine, dietary, cook time, difficulty), grid/list view modes, meal prep mode toggle, recipe roulette, like/dislike/save actions, smart badges (match %, health grade, cook time), pagination, long-press context menu, time-aware suggestions, mood-based filtering, quick macro filters, recipe of the day
* ✅ **Refactoring Complete**: Main screen reduced from ~3,700 → 1,437 lines (59% reduction); 14+ components extracted; 15+ custom hooks created; centralized utilities; organized in `/components/home/` directory
* 📝 **Scoring System**: Comprehensive scoring with macro match (70%), taste score (30%), behavioral boost, temporal boost, superfood detection
* 📝 **API Integration**: Pagination, filter persistence, multiple parallel fetches for sections, centralized recipe fetching with useRecipeFetcher hook

#### **Quick Wins** (Low effort, high value) ✅ Priority: HIGH
* ✅ **Recipe of the Day** *(Completed)*
  * ✅ Featured daily recipe prominently displayed
  * 🔄 Push notification: "Today's recipe pick for you"
  * 🔄 Countdown timer to next day's pick
  * 🔄 "I made this!" quick action
  * ✅ Backend: Daily recipe selection algorithm
  * ✅ Frontend: Recipe of the Day card component

* ✅ **Quick Macro Filters** *(Completed)*
  * ✅ One-tap filter chips: "High Protein", "Low Carb", "Low Calorie"
  * ✅ Sticky filter bar below header
  * ✅ Combine with existing filters
  * ✅ Visual feedback when active
  * ✅ Frontend: Quick filter chip bar component

* 🔄 **Enhanced "Surprise Me"**
  * 🔄 Random recipe with smart constraints (respects preferences)
  * 🔄 "Surprise me with..." options (cuisine, meal type, cook time)
  * 🔄 Shake device to get random recipe
  * 🔄 Animation: Slot machine style reveal
  * 📍 Frontend: Enhanced random recipe modal

* ✅ **Time-Aware Defaults** *(Completed)*
  * ✅ Morning (6am-11am): Prioritize breakfast recipes
  * ✅ Midday (11am-2pm): Prioritize lunch recipes
  * ✅ Evening (5pm-9pm): Prioritize dinner recipes
  * ✅ Late night: Show quick snacks
  * ✅ User can override in settings (toggle in header)
  * ✅ Backend: Time-based scoring boost

* ✅ **Pull-to-Discover** *(Completed)*
  * ✅ Pull down for fresh recommendations
  * 🔄 "Shuffle" animation while loading
  * ✅ New recipes each pull (not just refresh)
  * ✅ Frontend: Custom pull-to-refresh with discovery logic

#### **Smart Discovery Modes** 🧠 Priority: HIGH
* 🔄 **"What's in Your Fridge" Mode**
  * 🔄 Input ingredients you have on hand
  * 🔄 Get recipes using those ingredients
  * 🔄 "Missing only 1-2 ingredients" filter
  * 🔄 Pantry integration (auto-include staples)
  * 🔄 Barcode scan to add ingredients
  * 📍 Database: `AvailableIngredient` temporary storage
  * 📍 Backend: Ingredient matching algorithm
  * 📍 Frontend: Ingredient input modal

* ✅ **Mood-Based Recommendations** *(Completed)*
  * ✅ "I'm feeling..." selector (lazy, adventurous, healthy, indulgent, comfort, energetic)
  * ✅ Mood maps to recipe characteristics
  * ✅ "Comfort food" → hearty, familiar cuisines
  * ✅ "Adventurous" → new cuisines, complex recipes
  * ✅ "Lazy" → quick, minimal ingredients
  * ✅ Backend: Mood-to-recipe mapping logic
  * ✅ Frontend: MoodSelector modal component

* 🔄 **Weather-Aware Suggestions**
  * 🔄 Integrate weather API (optional permission)
  * 🔄 Hot day → salads, cold soups, light meals
  * 🔄 Cold day → soups, stews, warm comfort food
  * 🔄 Rainy day → baking, slow cooker recipes
  * 📍 Backend: Weather-based scoring adjustments
  * 📍 Frontend: Weather indicator in header

* 🔄 **Budget Mode**
  * 🔄 Toggle to show only budget-friendly recipes
  * 🔄 Set daily/weekly food budget
  * 🔄 Filter by cost per serving threshold
  * 🔄 "Under $5 per serving" quick filter
  * 📍 Frontend: Budget mode toggle and threshold picker

* 🔄 **Leftover Mode**
  * 🔄 Recipes using common leftover ingredients
  * 🔄 "Use up your rice/chicken/vegetables" sections
  * 🔄 Connect to meal plan (suggest using yesterday's dinner)
  * 📍 Backend: Leftover-friendly recipe tagging

#### **Personalized Sections** 📱 Priority: MEDIUM
* 🔄 **Dynamic Section Ordering**
  * 🔄 Learn which sections user engages with most
  * 🔄 Reorder sections based on interaction
  * 🔄 User can manually pin/hide sections
  * 🔄 "Customize Home" settings screen
  * 📍 Database: `UserHomeSectionPreference` model
  * 📍 Frontend: Draggable section reordering

* 🔄 **Trending Recipes**
  * 🔄 "Popular this week" section
  * 🔄 Based on saves/likes across all users
  * 🔄 Trending in your area (if location enabled)
  * 🔄 Trending in similar users
  * 📍 Backend: Trending calculation job (daily)
  * 📍 Database: `RecipeTrend` analytics model

* 🔄 **Seasonal Highlights**
  * 🔄 Recipes featuring seasonal ingredients
  * 🔄 Holiday-specific sections (Thanksgiving, Christmas, etc.)
  * 🔄 "Summer grilling", "Fall comfort food" themes
  * 🔄 Auto-rotate based on calendar
  * 📍 Backend: Seasonal ingredient mapping
  * 📍 Content: Seasonal recipe tagging

* 🔄 **"Because You Liked X"**
  * 🔄 Personalized recommendation explanations
  * 🔄 "Similar to recipes you've saved"
  * 🔄 "From cuisines you love"
  * 🔄 Transparent recommendation reasoning
  * 📍 Backend: Recommendation explanation generator

* 🔄 **Recently Cooked**
  * 🔄 "Cook again?" section with recent history
  * 🔄 One-tap to add to today's meal plan
  * 🔄 Track cooking frequency per recipe
  * 📍 Frontend: Recently cooked carousel

#### **Cuisine & Ingredient Exploration** 🌍 Priority: MEDIUM
* 🔄 **Cuisine Journey**
  * 🔄 "Explore Thai Cuisine" guided experience
  * 🔄 Cuisine overview with history/tips
  * 🔄 Starter recipes → intermediate → advanced
  * 🔄 Essential pantry items for cuisine
  * 🔄 Progress tracking per cuisine
  * 📍 Frontend: Cuisine exploration screen
  * 📍 Content: Cuisine guides and progressions

* 🔄 **Ingredient Spotlight**
  * 🔄 "Recipes featuring avocado" deep dives
  * 🔄 Ingredient nutrition info
  * 🔄 Storage and selection tips
  * 🔄 Substitution suggestions
  * 📍 Frontend: Ingredient detail screen
  * 📍 Backend: `GET /api/ingredients/:id/recipes`

* 🔄 **Technique Tutorials**
  * 🔄 "Master knife skills" with recipe progression
  * 🔄 Technique-based recipe filtering
  * 🔄 Skill level progression tracking
  * 📍 Content: Technique guides linked to recipes

* 🔄 **Dietary Deep Dives**
  * 🔄 "Keto starter pack" curated collections
  * 🔄 Meal plan templates for diets
  * 🔄 Tips and tricks for each diet
  * 📍 Frontend: Dietary guide screens

#### **Gamification & Engagement** 🎮 Priority: LOW
* 🔄 **Cooking Streaks**
  * 🔄 Track consecutive days cooking
  * 🔄 Streak counter on home screen
  * 🔄 Streak milestones (7 days, 30 days, etc.)
  * 🔄 "Don't break your streak!" notifications
  * 📍 Database: `UserStreak` model
  * 📍 Frontend: Streak display component

* 🔄 **Weekly Challenges**
  * 🔄 "Try 3 new cuisines this week"
  * 🔄 "Cook 5 high-protein meals"
  * 🔄 Progress tracking with rewards
  * 🔄 Challenge completion badges
  * 📍 Database: `Challenge` and `UserChallengeProgress` models
  * 📍 Frontend: Challenge card and progress UI

* 🔄 **Achievement System**
  * 🔄 Unlock badges for milestones
  * 🔄 "First meal prep", "100 recipes tried", "Cuisine explorer"
  * 🔄 Display achievements on profile
  * 🔄 Share achievements socially
  * 📍 Database: `Achievement` and `UserAchievement` models

* 🔄 **Cooking Stats Dashboard**
  * 🔄 Total recipes cooked
  * 🔄 Favorite cuisines breakdown
  * 🔄 Macro averages over time
  * 🔄 Most cooked recipes
  * 🔄 Cooking consistency calendar
  * 📍 Frontend: Stats/insights screen

#### **Enhanced Interactions** 👆 Priority: MEDIUM
* 🔄 **Gesture Shortcuts**
  * 🔄 Double-tap to save recipe
  * 🔄 Two-finger swipe for quick actions
  * 🔄 Pinch to toggle grid/list view
  * 🔄 Gesture customization in settings
  * 📍 Frontend: Enhanced gesture handlers

* 🔄 **Infinite Scroll Option**
  * 🔄 Alternative to pagination
  * 🔄 Load more as user scrolls
  * 🔄 "Back to top" floating button
  * 🔄 User preference for pagination vs infinite
  * 📍 Frontend: Infinite scroll implementation

* 🔄 **Quick Actions Bar**
  * 🔄 Floating action bar on scroll
  * 🔄 Quick access: Filter, Search, Random, View Mode
  * 🔄 Contextual actions based on scroll position
  * 📍 Frontend: Floating quick actions component

* 🔄 **Enhanced Card Interactions**
  * 🔄 3D touch/haptic touch preview (iOS)
  * 🔄 Card flip animation to show macros
  * 🔄 Swipe up on card for quick-save
  * 🔄 Hold and drag to meal plan slot
  * 📍 Frontend: Advanced gesture handling

#### **Search Enhancements** 🔍 Priority: MEDIUM
* 🔄 **Natural Language Search**
  * 🔄 "Quick chicken dinner under 30 minutes"
  * 🔄 "High protein breakfast without eggs"
  * 🔄 AI-powered query understanding
  * 📍 Backend: NLP search query parser

* 🔄 **Search Suggestions**
  * 🔄 Auto-complete as user types
  * 🔄 Recent searches
  * 🔄 Popular searches
  * 🔄 Personalized suggestions
  * 📍 Frontend: Search suggestions dropdown
  * 📍 Backend: Search suggestion engine

* 🔄 **Voice Search**
  * 🔄 Tap microphone to speak search
  * 🔄 "Find me a vegetarian pasta dish"
  * 🔄 Hands-free while cooking
  * 📍 Frontend: Voice input integration

* 🔄 **Visual Search**
  * 🔄 Take photo of dish to find similar recipes
  * 🔄 AI image recognition
  * 🔄 "Find recipes like this"
  * 📍 Backend: Image recognition service

* 🔄 **Saved Searches**
  * 🔄 Save frequent filter combinations
  * 🔄 "My weeknight dinners" saved search
  * 🔄 Quick access from search bar
  * 📍 Database: `SavedSearch` model

#### **Social & Sharing** 👥 Priority: LOW
* 🔄 **Activity Feed**
  * 🔄 See what friends are cooking
  * 🔄 Recipe recommendations from friends
  * 🔄 "Sarah made this recipe" social proof
  * 📍 Database: `UserActivity` feed model
  * 📍 Frontend: Social feed tab/section

* 🔄 **Share to Home**
  * 🔄 Friends can share recipes to your home feed
  * 🔄 "John shared a recipe with you" notification
  * 🔄 Accept/dismiss shared recipes
  * 📍 Backend: Recipe sharing between users

* 🔄 **Recipe Reviews**
  * 🔄 See reviews from other users
  * 🔄 Filter by highly-rated community recipes
  * 🔄 Verified "I made this" reviews
  * 📍 Database: `RecipeReview` model

#### **Accessibility & Inclusivity** ♿ Priority: HIGH
* 🔄 **Screen Reader Optimization**
  * 🔄 Full VoiceOver/TalkBack support
  * 🔄 Meaningful accessibility labels on all elements
  * 🔄 Logical focus order
  * 🔄 Announce dynamic content changes
  * 📍 Frontend: Comprehensive a11y audit and fixes

* 🔄 **Visual Accessibility**
  * 🔄 High contrast mode option
  * 🔄 Larger text support (Dynamic Type)
  * 🔄 Reduced motion option
  * 🔄 Color blind friendly indicators
  * 📍 Frontend: Accessibility settings screen

* 🔄 **Motor Accessibility**
  * 🔄 Larger touch targets option
  * 🔄 Disable swipe gestures option
  * 🔄 One-handed mode
  * 📍 Frontend: Motor accessibility settings

#### **Technical Debt & Refactoring** 🔧 Priority: HIGH
* ✅ **Component Refactoring** *(Completed - Phases 1-16)*
  * ✅ Split `index.tsx` from ~3,700 lines → 1,437 lines (59% reduction)
    * ✅ `HomeHeader.tsx` - Logo, view toggles, meal prep toggle, time-aware indicator
    * ✅ `FeaturedRecipeCarousel.tsx` - Hero recipe showcase with CardStack
    * ✅ `QuickFiltersBar.tsx` - Filter chips, mood selector, macro filters, meal prep toggle
    * ✅ `RecipeCarouselSection.tsx` - Generic horizontal carousel section
    * ✅ `RecipeOfTheDayCard.tsx` - Featured daily recipe card
    * ✅ `MealPrepModeHeader.tsx` - Meal prep mode banner
    * ✅ `PaginationControls.tsx` - Previous/Next page navigation
    * ✅ `FilterModal.tsx` - Complete filter modal with all options
    * ✅ `RecipeSearchBar.tsx` - Search input with clear button
    * ✅ `HomeEmptyState.tsx` - No recipes empty state
    * ✅ `HomeLoadingState.tsx` - Loading skeleton
    * ✅ `HomeErrorState.tsx` - Error state with retry
    * ✅ `CollectionPickerModal.tsx` - Save to collection modal
    * ✅ `RandomRecipeModal.tsx` - Random recipe generation modal
  * ✅ Extract filter logic into `useRecipeFilters` hook (150 lines)
  * ✅ Extract recipe fetching into `useRecipeFetcher` hook (159 lines)
  * ✅ Additional hooks extracted: `useViewMode`, `useMealPrepMode`, `useTimeAwareMode`, `useRecipePagination`, `useRecipeInteractions`, `useCollectionSave`, `useQuickMeals`, `usePerfectMatches`, `useRecipeOfTheDay`, `usePersonalizedRecipes`, `useCollapsibleSections`, `useRecipeActions`, `useRecipeFeedback`, `useRandomRecipe`
  * ✅ Utility functions centralized in `recipeUtils.ts` and `filterUtils.ts`
  * ✅ All components organized in `/components/home/` directory with barrel export

* 🔄 **Additional Refactoring (Phases 17-21)** - **NEXT PRIORITY**
  * 🔄 **Phase 17: Recipe Search Hook** (~120 lines) - HIGH PRIORITY
    * 🔄 Create `useRecipeSearch.ts` hook
    * 🔄 Extract `searchQuery` state and search submission logic
    * 🔄 Extract URL param handling for search
    * 🔄 Extract search useEffect (lines 371-413)
    * 📍 Frontend: `/hooks/useRecipeSearch.ts` (~100 lines)
    * **Impact:** Reduce index.tsx by ~120 lines → ~1,317 lines

  * 🔄 **Phase 18: Initial Load Consolidation** (~200 lines) - HIGH PRIORITY
    * 🔄 Create `useInitialRecipeLoad.ts` hook
    * 🔄 Consolidate apply saved filters useEffect (lines 291-329)
    * 🔄 Consolidate load meal prep recipes useEffect (lines 346-368)
    * 🔄 Consolidate fetch initial recipes useEffect (lines 573-602)
    * 🔄 Consolidate view mode change refetch useEffect (lines 605-636)
    * 🔄 Extract `initialRecipesLoaded`, `loadingFromFilters`, `initialLoading` state
    * 📍 Frontend: `/hooks/useInitialRecipeLoad.ts` (~180 lines)
    * **Impact:** Reduce index.tsx by ~200 lines → ~1,117 lines ✅ **Meets target**

  * 🔄 **Phase 19: Quick Macro Filters Hook** (~80 lines) - MEDIUM PRIORITY
    * 🔄 Create `useQuickMacroFilters.ts` hook
    * 🔄 Extract `quickMacroFilters` state (highProtein, lowCarb, lowCalorie)
    * 🔄 Extract `getMacroFilterParams` useCallback
    * 🔄 Extract `handleQuickMacroFilter` function
    * 📍 Frontend: `/hooks/useQuickMacroFilters.ts` (~60 lines)
    * **Impact:** Reduce index.tsx by ~80 lines → ~1,037 lines

  * 🔄 **Phase 20: Recipe Sections Component** (~250 lines) - MEDIUM PRIORITY
    * 🔄 Create `RecipeSectionsGrid.tsx` component
    * 🔄 Extract large contextual sections JSX (lines 1032-1260)
    * 🔄 Include grid/list view rendering logic
    * 🔄 Include collapse/expand integration
    * 🔄 Include inline pagination for "Recipes for You"
    * 📍 Frontend: `/components/home/RecipeSectionsGrid.tsx` (~220 lines)
    * **Impact:** Reduce index.tsx by ~250 lines → ~787 lines ✅ **Exceeds target**

  * 🔄 **Phase 21: Welcome Effects Hook** (~50 lines) - LOW PRIORITY
    * 🔄 Create `useWelcomeEffects.ts` hook
    * 🔄 Extract welcome back notification useFocusEffect (lines 463-507)
    * 🔄 Extract first-time guidance tooltip useFocusEffect (lines 510-531)
    * 🔄 Extract `showFirstTimeTooltip` state
    * 📍 Frontend: `/hooks/useWelcomeEffects.ts` (~45 lines)
    * **Impact:** Reduce index.tsx by ~50 lines → ~737 lines ⭐ **Optimal**

  * **Projected Final State:** ~737 lines (from original ~3,700) = **80% reduction**

* 🔄 **State Management**
  * 🔄 Create `useHome` hook for centralized state
  * 🔄 Implement useReducer for complex state
  * 🔄 Separate data state from UI state
  * 🔄 Optimize re-renders with proper memoization
  * 📍 Frontend: New home state management architecture

* 🔄 **API Optimization**
  * 🔄 Combine multiple section fetches into single request
  * 🔄 Implement request deduplication
  * 🔄 Add response caching layer
  * 🔄 Prefetch next page while viewing current
  * 📍 Backend: Consolidated home feed endpoint
  * 📍 Frontend: React Query or SWR for caching

* 🔄 **Performance Optimization**
  * 🔄 Virtualized list for better scroll performance
  * 🔄 Image lazy loading with priority hints
  * 🔄 Reduce bundle size (code splitting)
  * 🔄 Optimize re-renders with React.memo
  * 📍 Frontend: Performance audit and optimization

* 🔄 **Testing Coverage**
  * 🔄 Unit tests for filter logic
  * 🔄 Integration tests for recipe interactions
  * 🔄 E2E tests for discovery flows
  * 🔄 Accessibility tests
  * 📍 Frontend/Backend: Comprehensive test suite

---

### **Group 18e: Profile 2.0 - Enhanced User Experience** 👤

#### **Current State Analysis**
* 📝 **Existing Features**: Physical profile (gender, age, height, weight, activity level, fitness goal), macro goals with auto-calculation, culinary preferences (banned ingredients, cuisines, dietary restrictions, superfoods, cook time, spice level), budget settings, weight tracking with history, theme toggle (light/dark/system), notification settings, privacy controls, data export, account management (password change, delete account)
* 📝 **Technical Debt**: Main profile screen is ~3,600 lines - needs component splitting; 8 backend TODOs for authentication; notifications not persisted in database
* 📝 **Edit Screens**: 5 separate edit screens (physical-profile, preferences, budget, macro-goals, weight-input)
* 📝 **Storage**: Database for core data, AsyncStorage for theme/privacy settings, profile pictures stored locally only

#### **Quick Wins** (Low effort, high value) ✅ Priority: HIGH
* 🔄 **Profile Picture Cloud Storage**
  * 🔄 Upload profile picture to cloud storage (S3/Cloudinary)
  * 🔄 Sync across devices
  * 🔄 Image compression and optimization
  * 🔄 Default avatar options
  * 📍 Backend: Image upload endpoint with storage service
  * 📍 Database: Add `profilePictureUrl` to User model

* 🔄 **Persist Notification Settings**
  * 🔄 Store notification preferences in database (currently TODO)
  * 🔄 Sync notification settings across devices
  * 🔄 Backend validation for notification times
  * 📍 Backend: Complete TODO in userController.ts lines 310, 326
  * 📍 Database: Add `NotificationSettings` model

* 🔄 **Profile Presets**
  * 🔄 Save current profile as preset ("Cutting Phase", "Bulk Mode", "Maintenance")
  * 🔄 One-tap switch between presets
  * 🔄 Preset includes macros, preferences, budget
  * 🔄 Quick swap for different fitness phases
  * 📍 Database: New `ProfilePreset` model
  * 📍 Frontend: Preset picker in profile header

* 🔄 **Redo Onboarding**
  * 🔄 "Redo Setup" button in profile settings
  * 🔄 Walk through onboarding flow again
  * 🔄 Pre-populate with current values
  * 🔄 Update all settings at once
  * 📍 Frontend: Navigation to onboarding with edit mode

* 🔄 **Profile Completion Rewards**
  * 🔄 Gamify profile completion percentage
  * 🔄 Show what's missing for 100%
  * 🔄 Unlock features at completion milestones
  * 🔄 Celebration animation at 100%
  * 📍 Frontend: Enhanced completion indicator

#### **Health & Fitness Tracking** 💪 Priority: HIGH
* 🔄 **Apple Health / Google Fit Integration**
  * 🔄 Sync weight from health apps
  * 🔄 Import step count for activity level
  * 🔄 Sync nutrition data (optional)
  * 🔄 Two-way sync option
  * 📍 Frontend: expo-health-connect / expo-apple-healthkit
  * 📍 Backend: Health data import endpoints

* 🔄 **Body Measurements Tracking**
  * 🔄 Track more than just weight
  * 🔄 Waist, chest, hips, arms, thighs measurements
  * 🔄 Progress charts per measurement
  * 🔄 Body composition estimates
  * 📍 Database: New `BodyMeasurement` model
  * 📍 Frontend: Measurement input and history screen

* 🔄 **Progress Photos**
  * 🔄 Take/upload progress photos with date
  * 🔄 Side-by-side comparison view
  * 🔄 Private by default (local storage option)
  * 🔄 Timeline view of transformation
  * 📍 Database: `ProgressPhoto` model (optional cloud sync)
  * 📍 Frontend: Photo gallery and comparison tools

* 🔄 **Weight Goal Tracking**
  * 🔄 Set target weight with deadline
  * 🔄 Calculate required deficit/surplus
  * 🔄 Progress percentage towards goal
  * 🔄 Projected completion date based on trends
  * 🔄 Milestone celebrations (every 5 lbs, etc.)
  * 📍 Backend: Weight goal calculation service
  * 📍 Frontend: Goal progress visualization

* 🔄 **Fitness Tracker Integration**
  * 🔄 Connect Fitbit, Garmin, Whoop
  * 🔄 Import activity and calories burned
  * 🔄 Adjust macro recommendations based on activity
  * 📍 Backend: OAuth integrations for fitness platforms

#### **Enhanced Preferences** ⚙️ Priority: MEDIUM
* 🔄 **Dietary Restriction Severity**
  * 🔄 "Strict" vs "Prefer to Avoid" levels
  * 🔄 Life-threatening allergy flag (extra warnings)
  * 🔄 Different filtering behavior per severity
  * 🔄 Visual indicators for severity in recipe cards
  * 📍 Database: Add `severity` field to dietary restrictions

* 🔄 **Cooking Skill Level**
  * 🔄 Beginner / Intermediate / Advanced self-assessment
  * 🔄 Affects recipe difficulty recommendations
  * 🔄 Technique tutorial suggestions for beginners
  * 🔄 "Level up" tracking as user tries harder recipes
  * 📍 Database: Add `cookingSkillLevel` to UserPreferences
  * 📍 Backend: Skill-based recipe filtering

* 🔄 **Kitchen Equipment Profile**
  * 🔄 What appliances user has (Instant Pot, air fryer, slow cooker, etc.)
  * 🔄 Filter recipes by available equipment
  * 🔄 Suggest equipment-specific recipes
  * 🔄 "I don't have an oven" filter
  * 📍 Database: `KitchenEquipment` join table
  * 📍 Backend: Equipment-based recipe filtering

* 🔄 **Time Availability Profile**
  * 🔄 Set available cooking time per day of week
  * 🔄 "Busy weekdays, more time weekends" pattern
  * 🔄 Auto-suggest quick recipes on busy days
  * 🔄 Meal plan respects time availability
  * 📍 Database: `WeeklyTimeAvailability` model
  * 📍 Backend: Time-aware recommendations

* 🔄 **Shopping Preferences**
  * 🔄 Preferred grocery stores
  * 🔄 Organic preference (always/sometimes/never)
  * 🔄 Brand preferences
  * 🔄 Bulk buying preference
  * 📍 Database: Add shopping preference fields
  * 📍 Backend: Store-aware shopping list optimization

* 🔄 **Ingredient Discovery Mode**
  * 🔄 "I want to try new ingredients" toggle
  * 🔄 Occasionally suggest recipes with unfamiliar ingredients
  * 🔄 "New to you" badge on ingredients
  * 🔄 Track ingredient exploration history
  * 📍 Database: `IngredientExposure` tracking
  * 📍 Backend: Novel ingredient scoring

#### **Notifications & Reminders** 🔔 Priority: MEDIUM
* 🔄 **Custom Reminder Types**
  * 🔄 Hydration reminders (water intake)
  * 🔄 Snack time reminders
  * 🔄 Meal prep day reminders
  * 🔄 Grocery shopping reminders
  * 🔄 Weight logging reminders
  * 📍 Database: Flexible `Reminder` model with types
  * 📍 Frontend: Reminder configuration UI

* 🔄 **Smart Notifications**
  * 🔄 "You haven't logged weight in 7 days"
  * 🔄 "Your streak is about to break!"
  * 🔄 "New recipes matching your preferences"
  * 🔄 Personalized notification frequency settings
  * 📍 Backend: Smart notification trigger service

* 🔄 **Notification Preferences by Type**
  * 🔄 Granular control (enable/disable per type)
  * 🔄 Quiet hours setting
  * 🔄 Weekend vs weekday schedules
  * 🔄 Notification sound/vibration preferences
  * 📍 Frontend: Detailed notification settings screen

#### **Family & Household** 👨‍👩‍👧‍👦 Priority: MEDIUM
* 🔄 **Family Profiles**
  * 🔄 Add family members under main account
  * 🔄 Per-person preferences and restrictions
  * 🔄 Per-person macro goals
  * 🔄 Kids' profiles with age-appropriate defaults
  * 📍 Database: `FamilyMember` model linked to User
  * 📍 Frontend: Family management screen

* 🔄 **Household Meal Planning**
  * 🔄 Plan meals for entire household
  * 🔄 Aggregate dietary restrictions
  * 🔄 "Everyone can eat this" filter
  * 🔄 Per-person portion adjustments
  * 📍 Backend: Household-aware meal planning

* 🔄 **Shared Shopping Lists**
  * 🔄 Family members see same lists
  * 🔄 Assign items to family members
  * 🔄 Real-time sync for family shopping
  * 📍 Backend: Household sharing permissions

#### **Social & Sharing** 👥 Priority: LOW
* 🔄 **Public Profile**
  * 🔄 Optional public profile page
  * 🔄 Share favorite recipes
  * 🔄 Display achievements and stats
  * 🔄 Privacy controls for what's visible
  * 📍 Database: Add `isPublic` and visibility settings
  * 📍 Frontend: Public profile view

* 🔄 **Follow System**
  * 🔄 Follow other users
  * 🔄 See their public collections
  * 🔄 Recipe activity feed
  * 📍 Database: `UserFollow` model
  * 📍 Frontend: Following/followers screens

* 🔄 **Referral Program**
  * 🔄 Unique referral code per user
  * 🔄 Track referral signups
  * 🔄 Rewards for successful referrals
  * 🔄 Shareable referral link
  * 📍 Database: `Referral` tracking model
  * 📍 Backend: Referral validation and rewards

* 🔄 **Achievement Sharing**
  * 🔄 Share achievements to social media
  * 🔄 Generate shareable achievement images
  * 🔄 "I cooked 100 recipes with Sazon Chef!"
  * 📍 Frontend: Social share image generation

#### **Security & Account** 🔐 Priority: HIGH
* 🔄 **Two-Factor Authentication**
  * 🔄 TOTP-based 2FA (Google Authenticator, etc.)
  * 🔄 SMS backup option
  * 🔄 Recovery codes
  * 🔄 Required for sensitive actions
  * 📍 Backend: 2FA implementation with speakeasy/otplib
  * 📍 Frontend: 2FA setup and verification screens

* 🔄 **Login History**
  * 🔄 See all active sessions
  * 🔄 Device and location info
  * 🔄 "Log out everywhere" option
  * 🔄 Suspicious login alerts
  * 📍 Database: `LoginSession` model with metadata
  * 📍 Frontend: Session management screen

* 🔄 **Account Linking**
  * 🔄 Link multiple auth providers (Google + Apple)
  * 🔄 Unlink providers (keep at least one)
  * 🔄 Merge accounts from different providers
  * 📍 Backend: Multi-provider account linking
  * 📍 Frontend: Linked accounts management

* 🔄 **Biometric Lock**
  * 🔄 Face ID / Touch ID to open app
  * 🔄 Biometric for sensitive settings
  * 🔄 Optional per-user preference
  * 📍 Frontend: expo-local-authentication integration

* 🔄 **Password Requirements**
  * 🔄 Enhanced password strength meter
  * 🔄 Breach detection (Have I Been Pwned API)
  * 🔄 Password change reminders
  * 📍 Backend: Password validation service

#### **Data & Privacy** 📊 Priority: HIGH
* 🔄 **GDPR-Compliant Export**
  * 🔄 Export ALL user data (full GDPR compliance)
  * 🔄 Include all tables (recipes, meals, feedback, etc.)
  * 🔄 Machine-readable format (JSON)
  * 🔄 Human-readable format (PDF report)
  * 📍 Backend: Comprehensive data export service

* 🔄 **Granular Privacy Controls**
  * 🔄 Control what's synced to cloud
  * 🔄 Local-only mode option
  * 🔄 Delete specific data categories
  * 🔄 Data retention settings
  * 📍 Frontend: Privacy control panel

* 🔄 **Data Insights Dashboard**
  * 🔄 Visualize your data usage
  * 🔄 "You've saved 150 recipes, cooked 45"
  * 🔄 Activity heatmap calendar
  * 🔄 Nutrition trends over time
  * 📍 Frontend: Data insights screen with charts

* 🔄 **Import Data**
  * 🔄 Import from other recipe apps
  * 🔄 Import from MyFitnessPal (nutrition data)
  * 🔄 Import from spreadsheet (CSV)
  * 📍 Backend: Data import parsers

#### **Personalization & Insights** 🎯 Priority: MEDIUM
* 🔄 **AI Nutrition Insights**
  * 🔄 Weekly AI-generated eating analysis
  * 🔄 "You're consistently low on fiber"
  * 🔄 Personalized improvement suggestions
  * 🔄 Macro balance trends
  * 📍 Backend: AI analysis service
  * 📍 Frontend: Insights notification and screen

* 🔄 **Goal Setting System**
  * 🔄 Specific, time-bound goals
  * 🔄 "Eat 5 servings of vegetables daily for 30 days"
  * 🔄 Progress tracking with reminders
  * 🔄 Goal completion celebrations
  * 📍 Database: `UserGoal` model with progress tracking
  * 📍 Frontend: Goal creation and tracking UI

* 🔄 **Seasonal Goals**
  * 🔄 Different goals for different seasons
  * 🔄 "Summer cut" / "Winter bulk" presets
  * 🔄 Auto-suggest goal changes by season
  * 📍 Frontend: Seasonal goal templates

* 🔄 **Personalized Tips**
  * 🔄 Context-aware tips based on behavior
  * 🔄 "Try adding more protein to breakfast"
  * 🔄 Dismissible tip cards
  * 🔄 Learn from dismissed tips
  * 📍 Backend: Tip recommendation engine

#### **Technical Debt & Refactoring** 🔧 Priority: HIGH
* 🔄 **Component Refactoring**
  * 🔄 Split `profile.tsx` (3,600 lines) into smaller components
    * 🔄 `ProfileHeader.tsx` - User info and avatar
    * 🔄 `AppearanceSettings.tsx` - Theme toggle
    * 🔄 `PhysicalProfileCard.tsx` - Physical stats display
    * 🔄 `MacroGoalsCard.tsx` - Macro display with progress
    * 🔄 `WeightHistoryCard.tsx` - Weight log list
    * 🔄 `PreferencesCard.tsx` - Preferences summary
    * 🔄 `BudgetCard.tsx` - Budget settings display
    * 🔄 `NotificationSettings.tsx` - Notification toggles
    * 🔄 `PrivacySettings.tsx` - Privacy controls
    * 🔄 `DataManagement.tsx` - Export and stats
    * 🔄 `AccountSettings.tsx` - Password, logout, delete
  * 🔄 Extract collapsible section logic into reusable component
  * 📍 Frontend: Refactor into `/components/profile/` directory

* 🔄 **Backend Authentication TODOs**
  * 🔄 Complete 8 TODO comments for user ID from authentication
  * 🔄 Centralize auth helper for consistent user ID extraction
  * 🔄 Remove hardcoded/temporary user IDs
  * 📍 Backend: Fix lines 159, 275, 310, 326, 349, 596, 619, 671, 709

* 🔄 **State Management**
  * 🔄 Create `useProfile` hook for centralized state
  * 🔄 Implement useReducer for complex settings state
  * 🔄 Optimize re-renders for collapsible sections
  * 📍 Frontend: New profile state management

* 🔄 **API Optimization**
  * 🔄 Combine profile fetches into single request
  * 🔄 Implement profile caching
  * 🔄 Optimistic updates for settings changes
  * 📍 Backend: Consolidated profile endpoint

* 🔄 **Testing Coverage**
  * 🔄 Unit tests for profile calculations (BMR, TDEE, macros)
  * 🔄 Integration tests for settings updates
  * 🔄 E2E tests for edit flows
  * 🔄 Validation logic tests
  * 📍 Frontend/Backend: Comprehensive test suite

---

### **Group 18f: Quick Actions Menu (Plus Button) 2.0** ➕

#### **Current State Analysis**
* 📝 **Existing Actions**: Take a Picture (camera + food recognition), Add Recipe, Input Daily Weight, Edit Preferences, Create Collection, Create Shopping List
* 📝 **UI/UX**: Floating action button (FAB) at bottom right, ActionSheet modal with spring animations, 45° rotation animation on press, haptic feedback
* 📝 **Location**: `/frontend/app/(tabs)/_layout.tsx` - integrated into tab layout
* 📝 **Camera Integration**: Food recognition via scanner API, photo library fallback

#### **Quick Wins** (Low effort, high value) ✅ Priority: HIGH
* 🔄 **Quick Meal Log**
  * 🔄 "Log what I just ate" action
  * 🔄 Quick entry without full recipe
  * 🔄 Calorie/macro estimation
  * 🔄 Add to meal history instantly
  * 📍 Frontend: Quick meal log modal
  * 📍 Backend: Simplified meal entry endpoint

* 🔄 **Random Recipe Shortcut**
  * 🔄 "Surprise Me" button in quick actions
  * 🔄 Opens random recipe based on preferences
  * 🔄 Respects current filters and restrictions
  * 🔄 Fun animation reveal
  * 📍 Frontend: Add to actionItems array

* 🔄 **Today's Meal Plan**
  * 🔄 Quick view of today's planned meals
  * 🔄 One-tap access without tab switch
  * 🔄 Show next upcoming meal prominently
  * 📍 Frontend: Today's meals quick modal

* 🔄 **Quick Timer**
  * 🔄 Start cooking timer from anywhere
  * 🔄 Preset times: 5, 10, 15, 30 minutes
  * 🔄 Custom time option
  * 🔄 Runs in background with notification
  * 📍 Frontend: Timer modal with expo-notifications

* 🔄 **Shopping Mode Toggle**
  * 🔄 Quick access to active shopping list
  * 🔄 In-store mode activation
  * 🔄 Badge showing items remaining
  * 📍 Frontend: Shopping list quick access

#### **Customization & Personalization** ⚙️ Priority: MEDIUM
* 🔄 **Customizable Actions**
  * 🔄 Let users choose which 6 actions appear
  * 🔄 Drag to reorder actions
  * 🔄 Pool of 15+ available actions to choose from
  * 🔄 "Edit Quick Actions" in settings
  * 📍 Database: `UserQuickActions` preferences
  * 📍 Frontend: Action customization screen

* 🔄 **Recent Actions**
  * 🔄 Show 2-3 recently used actions at top
  * 🔄 "Recent" section separator
  * 🔄 Learn from usage patterns
  * 📍 Frontend: Track action usage in AsyncStorage

* 🔄 **Favorite Actions**
  * 🔄 Star/pin favorite actions
  * 🔄 Favorites always appear first
  * 🔄 Long-press to toggle favorite
  * 📍 Frontend: Favorite action persistence

* 🔄 **Action Badges & Notifications**
  * 🔄 Badge on Shopping List: "5 items"
  * 🔄 Badge on Meal Plan: "Dinner not planned"
  * 🔄 Badge on Weight: "Log weight (3 days ago)"
  * 🔄 Visual reminder for pending actions
  * 📍 Frontend: Badge calculation logic

#### **Contextual Actions** 🎯 Priority: MEDIUM
* 🔄 **Screen-Aware Actions**
  * 🔄 Different actions based on current screen
  * 🔄 On Cookbook: "Add to Collection", "Create Collection"
  * 🔄 On Meal Plan: "Add Meal", "Generate Day"
  * 🔄 On Shopping List: "Add Item", "Scan Barcode"
  * 🔄 On Recipe Detail: "Save", "Add to Meal Plan", "Healthify"
  * 📍 Frontend: Context-aware action selection

* 🔄 **Time-Based Actions**
  * 🔄 Morning: "Log Breakfast", "What's for lunch?"
  * 🔄 Evening: "Log Dinner", "Plan tomorrow"
  * 🔄 Weekend: "Meal Prep", "Try new recipe"
  * 📍 Frontend: Time-based action prioritization

* 🔄 **Smart Suggestions**
  * 🔄 "You haven't logged weight this week"
  * 🔄 "Complete your meal plan for tomorrow"
  * 🔄 AI-suggested actions based on patterns
  * 📍 Backend: Action suggestion engine

#### **Advanced Input Methods** 🎤 Priority: MEDIUM
* 🔄 **Voice Commands**
  * 🔄 "Add chicken breast to shopping list"
  * 🔄 "Log 500 calorie lunch"
  * 🔄 "Start 10 minute timer"
  * 🔄 Voice activation without opening menu
  * 📍 Frontend: Speech-to-text integration
  * 📍 Backend: Voice command parser

* 🔄 **Barcode Scanner**
  * 🔄 Scan product barcodes
  * 🔄 Add to shopping list with product info
  * 🔄 Log nutrition from packaged foods
  * 🔄 Find recipes using scanned ingredient
  * 📍 Frontend: Barcode scanner modal
  * 📍 Backend: Product database lookup (Open Food Facts)

* 🔄 **Receipt Scanner**
  * 🔄 Scan grocery receipt
  * 🔄 OCR to extract items and prices
  * 🔄 Auto-add to shopping history
  * 🔄 Track actual spending
  * 📍 Backend: Receipt OCR service

* 🔄 **Gesture Shortcuts**
  * 🔄 Swipe up on FAB: Open camera
  * 🔄 Swipe left on FAB: Quick meal log
  * 🔄 Swipe right on FAB: Shopping list
  * 🔄 Long-press: Show all actions
  * 📍 Frontend: Gesture handler on FAB

#### **Expanded Actions Library** 📚 Priority: LOW
* 🔄 **Recipe Actions**
  * 🔄 Generate AI Recipe
  * 🔄 Import Recipe from URL
  * 🔄 Scan Recipe from Photo
  * 🔄 Random Recipe
  * 🔄 Recently Viewed

* 🔄 **Meal Plan Actions**
  * 🔄 Plan Today's Meals
  * 🔄 Generate Week Plan
  * 🔄 Copy Yesterday's Plan
  * 🔄 Clear Today's Plan

* 🔄 **Tracking Actions**
  * 🔄 Log Water Intake
  * 🔄 Log Exercise/Steps
  * 🔄 Log Body Measurements
  * 🔄 Take Progress Photo

* 🔄 **Social Actions**
  * 🔄 Share What I'm Cooking
  * 🔄 Invite Friend
  * 🔄 Browse Friend's Recipes

#### **UI/UX Enhancements** 🎨 Priority: MEDIUM
* 🔄 **Radial Menu Option**
  * 🔄 Alternative to bottom sheet: radial menu around FAB
  * 🔄 Actions fan out in circle
  * 🔄 Drag to select action
  * 🔄 User preference for menu style
  * 📍 Frontend: RadialMenu component

* 🔄 **Mini FAB Mode**
  * 🔄 Smaller FAB that expands on tap
  * 🔄 Shows only icons, labels on hover/hold
  * 🔄 Less intrusive for browsing
  * 📍 Frontend: Collapsible FAB variant

* 🔄 **FAB Position Customization**
  * 🔄 Move FAB to left or right side
  * 🔄 Adjust vertical position
  * 🔄 Hide FAB on certain screens
  * 📍 Frontend: FAB position settings

* 🔄 **Haptic Patterns per Action**
  * 🔄 Different haptic for different action types
  * 🔄 Success/confirmation haptics
  * 🔄 Subtle feedback during drag gestures
  * 📍 Frontend: Enhanced haptic feedback

---

### **Group 18g: Search Bar 2.0 - Enhanced Discovery** 🔍

#### **Current State Analysis**
* 📝 **Existing Features**: Text search for recipes, clear button, navigates to home with search params, works with existing filters (cuisine, dietary, cook time, difficulty)
* 📝 **Location**: `/frontend/app/(tabs)/_layout.tsx` - positioned next to FAB above tab bar
* 📝 **Behavior**: Searches on submit, clears sections to show only results, "Found X recipes" toast
* 📝 **Unused**: AnimatedSearchBar component exists but not integrated

#### **Quick Wins** (Low effort, high value) ✅ Priority: HIGH
* 🔄 **Search History**
  * 🔄 Show recent searches when focused
  * 🔄 Tap to repeat search
  * 🔄 "Clear history" option
  * 🔄 Persist across sessions
  * 📍 Frontend: AsyncStorage for search history
  * 📍 UI: Dropdown below search bar on focus

* 🔄 **Auto-Complete Suggestions**
  * 🔄 Suggest as user types
  * 🔄 Recipe titles, cuisines, ingredients
  * 🔄 Highlight matching text
  * 🔄 Keyboard navigation support
  * 📍 Backend: Auto-complete endpoint
  * 📍 Frontend: Suggestions dropdown

* 🔄 **Popular Searches**
  * 🔄 Show trending searches
  * 🔄 "Popular this week" section
  * 🔄 Based on all users' searches
  * 📍 Backend: Search analytics aggregation

* 🔄 **Search Scope Selector**
  * 🔄 Search: Recipes, Collections, Meal Plans, Shopping Lists
  * 🔄 Scope chips below search bar
  * 🔄 Default to "All" or "Recipes"
  * 🔄 Remember last used scope
  * 📍 Frontend: Scope selector component
  * 📍 Backend: Multi-entity search endpoint

* 🔄 **Instant Search**
  * 🔄 Results update as user types (debounced)
  * 🔄 No need to press "Search"
  * 🔄 Configurable delay (300ms default)
  * 🔄 Loading indicator during search
  * 📍 Frontend: Debounced search with loading state

#### **Natural Language & AI Search** 🤖 Priority: HIGH
* 🔄 **Natural Language Queries**
  * 🔄 "Quick chicken dinner under 30 minutes"
  * 🔄 "High protein breakfast without eggs"
  * 🔄 "Something healthy for meal prep"
  * 🔄 "What can I make with chicken and rice?"
  * 📍 Backend: NLP query parser using AI
  * 📍 Frontend: Enhanced query handling

* 🔄 **Semantic Search**
  * 🔄 Understand intent beyond keywords
  * 🔄 "Comfort food" → hearty, warm dishes
  * 🔄 "Date night" → impressive, romantic recipes
  * 🔄 "Kid-friendly" → simple, familiar flavors
  * 📍 Backend: Semantic search with embeddings

* 🔄 **Conversational Search**
  * 🔄 Follow-up queries: "Make it vegetarian"
  * 🔄 Refinement: "But quicker"
  * 🔄 Context-aware search history
  * 📍 Backend: Conversation state management

* 🔄 **Category Shortcuts**
  * 🔄 Prefix shortcuts: "quick:", "healthy:", "cheap:"
  * 🔄 "cuisine:italian pasta" → Italian pasta dishes
  * 🔄 "time:<30 chicken" → Chicken under 30 min
  * 🔄 Auto-suggest shortcuts as user types
  * 📍 Frontend: Shortcut parser and autocomplete

#### **Voice & Visual Search** 🎤 Priority: MEDIUM
* 🔄 **Voice Search**
  * 🔄 Microphone button in search bar
  * 🔄 Speak search query
  * 🔄 Real-time transcription display
  * 🔄 Works with natural language
  * 📍 Frontend: expo-speech / speech-to-text API

* 🔄 **Photo Search**
  * 🔄 Camera icon in search bar
  * 🔄 Take photo of dish
  * 🔄 AI identifies dish and finds similar recipes
  * 🔄 "Find recipes like this"
  * 📍 Backend: Image recognition service
  * 📍 Frontend: Camera integration in search

* 🔄 **Ingredient Photo Search**
  * 🔄 Photo of ingredients on counter
  * 🔄 AI identifies ingredients
  * 🔄 Suggests recipes using those ingredients
  * 🔄 "What can I make with these?"
  * 📍 Backend: Multi-ingredient recognition

#### **Advanced Search Features** ⚡ Priority: MEDIUM
* 🔄 **Saved Searches**
  * 🔄 Save frequent search + filter combinations
  * 🔄 Name saved searches: "My weeknight dinners"
  * 🔄 Quick access from search bar
  * 🔄 Share saved searches
  * 📍 Database: `SavedSearch` model
  * 📍 Frontend: Saved search management

* 🔄 **Advanced Filters in Search**
  * 🔄 Filter chips appear below search bar
  * 🔄 Add filters without opening modal
  * 🔄 "+" button to add more filters
  * 🔄 Visual filter builder
  * 📍 Frontend: Inline filter chips

* 🔄 **Boolean Search Operators**
  * 🔄 AND: "chicken AND broccoli"
  * 🔄 OR: "pasta OR rice"
  * 🔄 NOT: "dessert NOT chocolate"
  * 🔄 Parentheses: "(chicken OR beef) AND quick"
  * 📍 Backend: Boolean query parser

* 🔄 **Fuzzy Matching**
  * 🔄 Handle typos and misspellings
  * 🔄 "chiken" → "chicken"
  * 🔄 "Did you mean...?" suggestions
  * 🔄 Phonetic matching for ingredients
  * 📍 Backend: Fuzzy search with Levenshtein distance

* 🔄 **Ingredient-Based Search**
  * 🔄 "Find recipes with: tomato, basil, mozzarella"
  * 🔄 Multi-ingredient input
  * 🔄 "Include" vs "Exclude" ingredients
  * 🔄 "Use only these ingredients" strict mode
  * 📍 Backend: Ingredient matching algorithm
  * 📍 Frontend: Multi-ingredient input UI

#### **Search Results Enhancement** 📊 Priority: MEDIUM
* 🔄 **Faceted Search Results**
  * 🔄 Show result counts by category
  * 🔄 "Italian (15) | Quick (8) | Healthy (12)"
  * 🔄 Click facet to filter results
  * 📍 Backend: Faceted search aggregation

* 🔄 **Search Results Sorting**
  * 🔄 Sort by: Relevance, Match %, Cook Time, Rating
  * 🔄 Sort dropdown in results view
  * 🔄 Remember sort preference
  * 📍 Frontend: Sort selector in results

* 🔄 **Search Result Previews**
  * 🔄 Rich preview cards in suggestions
  * 🔄 Show image, cook time, match % in dropdown
  * 🔄 Quick-save from search results
  * 📍 Frontend: Enhanced suggestion cards

* 🔄 **"No Results" Improvements**
  * 🔄 Suggest similar searches
  * 🔄 Show related recipes
  * 🔄 "Try removing filters" suggestions
  * 🔄 "Create this recipe?" for unique searches
  * 📍 Frontend: Enhanced empty state

#### **UI/UX Enhancements** 🎨 Priority: MEDIUM
* 🔄 **Full-Screen Search Mode**
  * 🔄 Expand search to full screen on focus
  * 🔄 More room for suggestions and history
  * 🔄 Keyboard-optimized layout
  * 🔄 Smooth expand/collapse animation
  * 📍 Frontend: Full-screen search modal

* 🔄 **Search Bar Variants**
  * 🔄 Integrate AnimatedSearchBar (expandable)
  * 🔄 Header search bar option
  * 🔄 Persistent vs collapsible on scroll
  * 🔄 User preference for style
  * 📍 Frontend: Multiple search bar modes

* 🔄 **Visual Query Builder**
  * 🔄 Drag-and-drop filter building
  * 🔄 Visual representation of search
  * 🔄 "Building blocks" for queries
  * 📍 Frontend: Query builder component

* 🔄 **Search Animations**
  * 🔄 Smooth transitions between states
  * 🔄 Loading shimmer in suggestions
  * 🔄 Results fade-in animation
  * 🔄 Micro-interactions for delight
  * 📍 Frontend: Enhanced animations

#### **Analytics & Learning** 📈 Priority: LOW
* 🔄 **Search Analytics**
  * 🔄 Track popular searches
  * 🔄 Track zero-result searches
  * 🔄 Search-to-save conversion rate
  * 🔄 Use data to improve suggestions
  * 📍 Backend: Search analytics service

* 🔄 **Personalized Search Ranking**
  * 🔄 Learn from user's search behavior
  * 🔄 Boost recipes similar to past selections
  * 🔄 Personalized result ordering
  * 📍 Backend: User search profile

* 🔄 **Search Feedback**
  * 🔄 "Was this helpful?" on results
  * 🔄 Report irrelevant results
  * 🔄 Use feedback to improve ranking
  * 📍 Backend: Search feedback loop

---

### **Group 18h: AI Nutrition Assistant - Meal History Intelligence** 🤖💬

#### **Overview**
An AI-powered assistant that allows users to chat, ask questions, and search through their meal history to get personalized nutrition insights, identify dietary gaps, and receive intelligent recipe recommendations based on their eating patterns.

#### **Current State Analysis**
* 📝 **Existing Data**: MealHistory model tracks consumed recipes with dates; RecipeFeedback tracks likes/dislikes; MacroGoals and PhysicalProfile provide user context
* 📝 **Gap**: No way to query or analyze meal history intelligently; users can't ask "What am I missing in my diet?"
* 📝 **Opportunity**: Rich meal data exists but isn't leveraged for insights or conversational queries

#### **Core Chat Interface** 💬 Priority: HIGH
* 🔄 **AI Chat Screen**
  * 🔄 Dedicated chat interface for nutrition questions
  * 🔄 Conversational UI with message bubbles
  * 🔄 Sazon mascot as chat avatar
  * 🔄 Typing indicators and smooth animations
  * 🔄 Accessible via FAB quick action or profile
  * 📍 Frontend: New `/chat` or `/nutrition-assistant` screen
  * 📍 Backend: Chat endpoint with AI integration

* 🔄 **Natural Language Queries**
  * 🔄 "How can I add more fiber to my diet?"
  * 🔄 "What have I been eating too much of?"
  * 🔄 "Show me my protein intake this week"
  * 🔄 "Why am I not hitting my calorie goals?"
  * 🔄 "What healthy recipes haven't I tried?"
  * 📍 Backend: NLP query parser with meal history context

* 🔄 **Contextual Responses**
  * 🔄 AI analyzes user's actual meal history
  * 🔄 Responses reference specific meals eaten
  * 🔄 "You've only had 15g fiber on average. Try adding these high-fiber recipes..."
  * 🔄 Personalized to user's preferences and restrictions
  * 📍 Backend: Meal history analysis service

* 🔄 **Quick Action Buttons**
  * 🔄 Suggested questions below chat input
  * 🔄 "Analyze my week", "Find gaps", "Suggest recipes"
  * 🔄 One-tap to ask common questions
  * 📍 Frontend: Quick action chips in chat UI

#### **Nutritional Gap Analysis** 📊 Priority: HIGH
* 🔄 **"What Am I Missing?" Feature**
  * 🔄 Analyze meal history for nutritional gaps
  * 🔄 Identify deficient nutrients (fiber, vitamins, minerals)
  * 🔄 Compare to recommended daily values
  * 🔄 "You're consistently low on Vitamin D and Omega-3s"
  * 📍 Backend: Nutritional gap detection algorithm

* 🔄 **Macro Trend Analysis**
  * 🔄 "Show my protein intake over the last month"
  * 🔄 Visual charts of macro trends
  * 🔄 Identify patterns (low protein on weekends, etc.)
  * 🔄 Compare to goals with variance analysis
  * 📍 Frontend: Trend visualization components
  * 📍 Backend: Time-series macro aggregation

* 🔄 **Ingredient Frequency Analysis**
  * 🔄 "What ingredients do I eat most often?"
  * 🔄 "Am I eating too much red meat?"
  * 🔄 Identify over-reliance on certain foods
  * 🔄 Suggest variety improvements
  * 📍 Backend: Ingredient frequency tracking

* 🔄 **Dietary Balance Score**
  * 🔄 Weekly/monthly dietary balance rating
  * 🔄 Score based on variety, nutrients, macro balance
  * 🔄 "Your diet diversity score is 72/100"
  * 🔄 Specific improvement suggestions
  * 📍 Backend: Balance scoring algorithm

#### **Smart Recipe Recommendations** 🍽️ Priority: HIGH
* 🔄 **Gap-Filling Recipes**
  * 🔄 "Suggest recipes high in fiber" → AI finds fiber-rich recipes
  * 🔄 Recommendations based on identified gaps
  * 🔄 "These 5 recipes would help you hit your iron goals"
  * 🔄 One-tap save or add to meal plan
  * 📍 Backend: Nutrient-targeted recipe matching

* 🔄 **"More Like This" from History**
  * 🔄 "I loved that salmon dish last Tuesday"
  * 🔄 Find similar recipes to past favorites
  * 🔄 AI remembers what user enjoyed
  * 📍 Backend: Meal history recipe similarity

* 🔄 **Complement Suggestions**
  * 🔄 "What should I eat for dinner to balance today's meals?"
  * 🔄 Real-time recommendations based on day's intake
  * 🔄 "You've had 80g protein, here are low-protein dinner options"
  * 📍 Backend: Daily balance recommendation engine

* 🔄 **Avoid Repetition Suggestions**
  * 🔄 "I feel like I'm eating the same things"
  * 🔄 AI detects repetitive patterns
  * 🔄 Suggests new recipes in preferred cuisines
  * 🔄 "Try these 5 recipes you haven't made before"
  * 📍 Backend: Novelty-aware recommendations

#### **Health Goal Queries** 🎯 Priority: MEDIUM
* 🔄 **Goal Progress Questions**
  * 🔄 "Am I on track for my weight loss goal?"
  * 🔄 "How's my muscle gain diet looking?"
  * 🔄 AI correlates meals with goal progress
  * 🔄 Actionable advice based on trends
  * 📍 Backend: Goal progress analysis

* 🔄 **"What If" Scenarios**
  * 🔄 "What if I cut carbs by 20%?"
  * 🔄 AI simulates dietary changes
  * 🔄 Shows projected impact on goals
  * 🔄 Recipe suggestions for the change
  * 📍 Backend: Dietary simulation engine

* 🔄 **Personalized Meal Plans from Chat**
  * 🔄 "Create a high-protein meal plan for this week"
  * 🔄 AI generates plan based on history and preferences
  * 🔄 Considers what user has liked before
  * 🔄 One-tap apply to meal plan
  * 📍 Backend: Conversational meal plan generation

#### **Meal History Search** 🔍 Priority: MEDIUM
* 🔄 **Search Past Meals**
  * 🔄 "When did I last eat salmon?"
  * 🔄 "Show me all pasta dishes I've had"
  * 🔄 "What did I eat last Tuesday?"
  * 🔄 Searchable meal history with filters
  * 📍 Backend: Meal history search endpoint
  * 📍 Frontend: Meal history search UI

* 🔄 **Meal History Timeline**
  * 🔄 Visual calendar of meals eaten
  * 🔄 Tap date to see meals and macros
  * 🔄 Color-coded by macro adherence
  * 🔄 Export meal history
  * 📍 Frontend: Calendar view component

* 🔄 **Recipe Recall**
  * 🔄 "What was that chicken recipe I made 2 weeks ago?"
  * 🔄 AI finds recipes from vague descriptions
  * 🔄 "The one with the lemon sauce"
  * 📍 Backend: Fuzzy recipe recall from history

#### **Proactive Insights** 💡 Priority: MEDIUM
* 🔄 **Daily Nutrition Summary**
  * 🔄 End-of-day summary push notification
  * 🔄 "Today you hit your protein goal but were low on fiber"
  * 🔄 Quick suggestion for tomorrow
  * 📍 Backend: Daily summary generation job
  * 📍 Frontend: Notification with insights

* 🔄 **Weekly Digest**
  * 🔄 Weekly AI-generated nutrition report
  * 🔄 Trends, wins, areas for improvement
  * 🔄 Comparison to previous week
  * 🔄 Top recipe recommendations for next week
  * 📍 Backend: Weekly digest email/notification

* 🔄 **Smart Alerts**
  * 🔄 "You've had red meat 5 days in a row"
  * 🔄 "Great job hitting protein goals 7 days straight!"
  * 🔄 Contextual alerts based on patterns
  * 📍 Backend: Pattern detection triggers

* 🔄 **Seasonal Suggestions**
  * 🔄 "It's winter - you might need more Vitamin D"
  * 🔄 Seasonal nutrition tips
  * 🔄 Recipes featuring seasonal produce
  * 📍 Backend: Seasonal context awareness

#### **Voice Interaction** 🎤 Priority: LOW
* 🔄 **Voice Chat Mode**
  * 🔄 Speak questions to AI assistant
  * 🔄 Voice responses (text-to-speech)
  * 🔄 Hands-free while cooking
  * 🔄 "Hey Sazon, what should I eat for dinner?"
  * 📍 Frontend: Voice input/output integration

* 🔄 **Quick Voice Commands**
  * 🔄 "Log my lunch" → Opens quick meal log
  * 🔄 "What's my protein today?" → Instant answer
  * 🔄 "Suggest a healthy snack" → Recipe recommendation
  * 📍 Frontend: Voice command shortcuts

#### **Data & Privacy** 🔒 Priority: HIGH
* 🔄 **On-Device Processing Option**
  * 🔄 Basic analysis without cloud AI
  * 🔄 Privacy-first mode for sensitive users
  * 🔄 Limited but functional insights
  * 📍 Frontend: Local analysis algorithms

* 🔄 **Data Transparency**
  * 🔄 "What data do you know about me?"
  * 🔄 Clear explanation of data used
  * 🔄 Option to exclude certain meals from analysis
  * 📍 Frontend: Data usage disclosure

* 🔄 **Conversation History**
  * 🔄 Save past conversations
  * 🔄 Reference previous chats
  * 🔄 Delete conversation history
  * 📍 Database: `ChatConversation` model

#### **Technical Implementation** 🔧 Priority: HIGH
* 🔄 **AI Integration**
  * 🔄 Use existing multi-provider AI system (Claude/OpenAI/Gemini)
  * 🔄 Meal history context injection into prompts
  * 🔄 Structured output for recipe recommendations
  * 🔄 Streaming responses for chat UX
  * 📍 Backend: Chat service with AI providers

* 🔄 **Meal History Indexing**
  * 🔄 Index meal history for fast queries
  * 🔄 Pre-compute common aggregations
  * 🔄 Cache frequent insights
  * 📍 Backend: Meal history analytics cache

* 🔄 **Database Models**
  * 🔄 `ChatConversation` - Stores chat sessions
  * 🔄 `ChatMessage` - Individual messages
  * 🔄 `NutritionInsight` - Cached insights
  * 🔄 `MealHistoryIndex` - Searchable meal index
  * 📍 Database: New Prisma models

* 🔄 **API Endpoints**
  * 🔄 `POST /api/chat/message` - Send message, get AI response
  * 🔄 `GET /api/chat/history` - Get conversation history
  * 🔄 `GET /api/nutrition/insights` - Get pre-computed insights
  * 🔄 `GET /api/nutrition/gaps` - Get nutritional gaps
  * 🔄 `GET /api/meal-history/search` - Search meals
  * 📍 Backend: New chat and nutrition endpoints

---

## **Implementation Priority Summary**

### Highest Priority (Start Here)
1. **Technical Debt Refactoring** - All screens need component splitting before feature work
2. **Offline Support** - Critical for in-store shopping and cooking mode
3. **AI Nutrition Assistant** - High-value differentiator feature
4. **Accessibility** - Important for inclusivity and app store requirements

### Medium Priority
1. **Smart Collections & Batch Operations** - Quality of life improvements
2. **Calendar Integration** - Meal planning enhancement
3. **Family/Household Features** - Expands user base
4. **Voice & Photo Search** - Modern UX expectations

### Lower Priority (Future)
1. **Social Features** - Requires critical mass of users
2. **Gamification** - Nice to have, not essential
3. **Advanced Analytics** - Depends on data volume
4. **Recipe Versioning** - Power user feature
