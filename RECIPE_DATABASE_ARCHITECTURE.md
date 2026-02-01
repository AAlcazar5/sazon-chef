# Sazon Chef - Centralized Recipe Database Architecture

## Overview

Sazon Chef uses a **single centralized recipe database** that all users access and share. Personalization is achieved through intelligent scoring, not duplicate recipes.

## Architecture

### Database Structure

```
Recipes Table
├── id (PK)
├── title
├── cuisine
├── mealType (breakfast, lunch, dinner, snack, dessert)
├── calories, protein, carbs, fat
├── cookTime
├── difficulty
├── imageUrl
├── isUserCreated: false ← KEY: Marks as shared system recipe
├── ingredients (relationship)
└── instructions (relationship)

User Preferences (Optional, for personalization scoring)
├── userId
├── likedCuisines[]
├── bannedIngredients[]
├── dietaryRestrictions[]
├── cookTimePreference
└── macroGoals{}
```

### Data Flow

```
User Requests /api/recipes
    ↓
[getRecipes endpoint]
    ↓
WHERE isUserCreated = false  ← Filter for shared recipes only
    ↓
Apply filters: cuisine, mealType, cookTime, search
    ↓
Get user preferences (if data sharing enabled)
    ↓
Score recipes based on:
  • User cuisine preferences (60%)
  • Banned ingredients (veto)
  • Cook time preference (20%)
  • Macro alignment (15%)
  • Behavioral history (likes/dislikes)
  • Temporal context (time of day)
    ↓
Sort by score, paginate (20 per page)
    ↓
Return recipes with personalized scores
```

## Key Files

### Endpoint: [src/modules/recipe/recipeController.ts:186](src/modules/recipe/recipeController.ts#L186)

**`getRecipes()` method**:
- Line 206: `const where: any = { isUserCreated: false };`
- All queries filter for shared recipes
- User preferences used for scoring, not filtering

### Filtering Chain

1. **Database Level** (SQL WHERE):
   - `isUserCreated: false` - Only shared recipes
   - Cuisine filter (optional)
   - Meal type filter (optional)
   - Cook time filter (optional)
   - Search filter (optional)

2. **Scoring Level** (JavaScript):
   - Quick discriminatory scoring based on user preferences
   - Behavioral scoring (liked/disliked recipes)
   - Temporal scoring (time of day)
   - Health goal alignment

3. **Response Level**:
   - Sorted by personalized score
   - Paginated (default 10, max 50 per page)
   - Includes score breakdown for each recipe

## Centralization Benefits

### ✅ Single Source of Truth
- One database of recipes
- No duplication
- Consistent updates

### ✅ Scalability
- Add recipes once, all users benefit
- 100 recipes serve unlimited users
- Efficient pagination (showing 20 at a time)

### ✅ Quality Control
- Curated recipe pool
- Consistent data standards
- Easy to update/remove recipes

### ✅ Personalization Without Duplication
- Each user sees different ordering
- Scores reflect their preferences
- No storage bloat

### ✅ Privacy Respect
- Recipes are system data (not personal)
- User preferences optional (data sharing flag)
- Behavioral data kept separate

## Current Status

### Shared Recipe Database
- **Total recipes**: 21 (growing to 100+)
- **All recipes**: `isUserCreated: false` ✅
- **All users**: Access same pool ✅
- **Filter field**: `isUserCreated` in WHERE clause ✅

### Pagination
- Expected behavior when 100+ recipes:
  - Show 20 recipes per page
  - Enable pagination controls
  - Current state: Only 21 recipes, so shows all 21

### Meal Type Coverage
| Type | Count | Status |
|------|-------|--------|
| Breakfast | 6 | ✅ |
| Lunch | 3 | ⏳ Growing |
| Dinner | 2 | ⏳ Growing |
| Snack | 0 | ⏳ Coming |
| Dessert | 0 | ⏳ Coming |
| Unspecified | 10 | ⚠️ Legacy |

### Generation in Progress
- Running: `npm run seed:100`
- Target: 100 recipes across 14 cuisines
- Includes: All meal types (breakfast, lunch, dinner, snack, dessert)
- Current: Generating Mediterranean recipes, moving through cuisines

## How It Works - Example

**Scenario**: User with Mediterranean + Italian + Mexican preferences, 2000 cal/day

1. User requests `/api/recipes?page=0&limit=20`
2. System filters: `WHERE isUserCreated = false` (gets all 100 shared recipes)
3. System scores each recipe:
   - Mediterranean: +40 points (liked cuisine)
   - Italian: +40 points (liked cuisine)
   - Mexican: +40 points (liked cuisine)
   - French: -30 points (not in preferences)
   - Asian: 0 points (neutral)
4. System sorts by score and returns top 20
5. **Same 100 recipes shown to all users, just in different order based on their preferences**

## Best Practices

### ✅ DO
- Use `isUserCreated: false` for all shared recipes
- Score based on user preferences
- Allow pagination (20-50 per page)
- Show score breakdown to users
- Support filtering by cuisine, mealType, cookTime
- Respect user preference opt-ins (data sharing)

### ❌ DON'T
- Create duplicate recipes per user
- Store recipes in user-specific tables
- Hide recipes based on preferences (filter in scoring, not WHERE)
- Load all recipes into memory at once

## Migration Path

### Current (21 recipes)
```
All recipes → isUserCreated = false ✅
Pagination unavailable (all fit on one page)
```

### Target (100+ recipes)
```
All recipes → isUserCreated = false ✅
Pagination available (20 per page)
Users see personalized ordering
All users benefit from full recipe pool
```

## Admin Operations

### Add New Recipes
```bash
npm run seed:100        # Add 100 recipes
npm run seed:1000       # Add 1000 recipes
npm run seed:ai         # Add AI-generated recipes
```

### Query Shared Recipes
```typescript
const sharedRecipes = await prisma.recipe.findMany({
  where: { isUserCreated: false }
});
```

### User-Specific Operations (Separate from shared pool)
```typescript
// Liked recipes (user's saved/liked feedback)
const likedRecipes = await prisma.recipeFeedback.findMany({
  where: { userId, liked: true }
});

// Saved recipes (user's bookmarks)
const savedRecipes = await prisma.savedRecipe.findMany({
  where: { userId }
});
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                  All Users (100+)                       │
│            Each sees different ordering                 │
└──────────┬──────────────────────────────┬───────────────┘
           │                              │
           │ Score based on               │ Score based on
           │ preferences 1                │ preferences 2
           ↓                              ↓
┌──────────────────────────────────────────────────────────┐
│         Centralized Shared Recipe Database               │
│               (isUserCreated = false)                    │
│  100+ recipes across 14 cuisines, 5 meal types          │
│                                                          │
│  • Mediterranean (12)  • Italian (10)   • Mexican (10)  │
│  • American (9)        • Japanese (9)   • Indian (9)    │
│  • Thai (8)            • Chinese (8)    • Korean (7)    │
│  • Middle Eastern (6)  • French (5)     • Vietnamese (4)│
│  • Brazilian (2)       • Caribbean (1)                  │
│                                                          │
│  All recipes available to all users                     │
│  Personalization through scoring, not duplication       │
└──────────────────────────────────────────────────────────┘
```

---

**Status**: ✅ Architecture Correct | ⏳ Data Population In Progress
**Last Updated**: 2026-01-22
