# Ensuring Unique Images Per Page - Guide

## Problem
When fetching recipes from Unsplash, similar recipes (e.g., multiple pasta dishes) often get the same image because they use the same search query. This creates a poor user experience where multiple recipes on the same page have identical images.

## Solution
We've implemented a **multi-layered approach** to ensure unique images for each recipe on a page:

### 1. Enhanced ImageService (Database-Level)
The `imageService.searchFoodImage()` method now supports pagination parameters:
- `page`: 1-based page number (fetches different result sets from Unsplash)
- `resultIndex`: 0-29 index to select specific result from the page

```typescript
// Example: Get different images for the same recipe
const photo1 = await imageService.searchFoodImage({
  recipeName: "Chicken Pasta",
  cuisine: "Italian",
  page: 1,
  resultIndex: 0  // Gets 1st result
});

const photo2 = await imageService.searchFoodImage({
  recipeName: "Chicken Pasta",
  cuisine: "Italian",
  page: 1,
  resultIndex: 5  // Gets 6th result
});
```

### 2. Unique Image Helper (Batch Processing)
Location: `backend/src/utils/uniqueImageHelper.ts`

Utilities for assigning unique images to batches of recipes:

```typescript
import { assignUniqueImagesToRecipes } from '@/utils/uniqueImageHelper';

// When fetching a page of recipes
const recipes = await prisma.recipe.findMany({
  skip: page * limit,
  take: limit,
});

// Assign unique images based on their position
const recipesWithUniqueImages = await assignUniqueImagesToRecipes(
  recipes,
  page * limit  // Global starting index
);
```

**Key functions:**
- `assignUniqueImagesToRecipes()` - Assigns unique images to a batch
- `getUniqueResultIndex()` - Generates consistent index from recipe properties
- `refreshDuplicateImages()` - Finds and replaces duplicate images

### 3. Runtime Image Variation (No API Calls)
Location: `backend/src/utils/runtimeImageVariation.ts`

Lightweight approach that adds URL parameters to vary existing Unsplash images:

```typescript
import { varyImageUrlsForPage } from '@/utils/runtimeImageVariation';

// Get recipes from database
const recipes = await getRecipes(page, limit);

// Add variety to images without new API calls
const variedRecipes = varyImageUrlsForPage(
  recipes,
  page * limit
);
```

This approach:
- Uses Unsplash's CDN crop parameters (`crop=edges|entropy|faces|focalpoint`)
- No additional API calls needed
- Changes are applied at runtime, not stored in DB
- Perfect for ensuring visual variety in the UI

**Key functions:**
- `varyImageUrlsForPage()` - Adds URL parameters for variety
- `detectDuplicateImages()` - Finds duplicate image URLs
- `logImageDuplicateStats()` - Logs duplicate statistics for debugging

## Usage Scenarios

### Scenario 1: Seeding New Recipes
When adding recipes to the database, ensure they get unique images from the start:

```typescript
import { assignUniqueImagesToRecipes } from '@/utils/uniqueImageHelper';

const newRecipes = [...]; // Your recipes
const startIndex = existingRecipeCount; // Continue from existing count

const recipesWithImages = await assignUniqueImagesToRecipes(
  newRecipes,
  startIndex
);

// Save to database
await prisma.recipe.createMany({ data: recipesWithImages });
```

### Scenario 2: Fixing Existing Database
Run the script to fix duplicate images in your existing database:

```bash
npm run ensure:unique-images
```

This script:
- Scans all recipes for duplicate images
- Processes them in batches of 20 (one page)
- Assigns unique images based on position
- Updates the database
- Respects Unsplash API rate limits

### Scenario 3: Runtime Variation (Recommended for Production)
The fastest approach - no database updates needed:

```typescript
// In your recipe controller
async getRecipes(req: Request, res: Response) {
  const page = parseInt(req.query.page as string) || 0;
  const limit = parseInt(req.query.limit as string) || 20;

  // Fetch recipes from database
  const recipes = await prisma.recipe.findMany({
    skip: page * limit,
    take: limit,
  });

  // Add image variety at runtime
  const recipesWithVariedImages = varyImageUrlsForPage(
    recipes,
    page * limit
  );

  res.json(recipesWithVariedImages);
}
```

## Implementation Strategy

### For New Projects
1. Use `assignUniqueImagesToRecipes()` during initial seeding
2. Apply `varyImageUrlsForPage()` at runtime for extra variety

### For Existing Projects
1. Run `npm run ensure:unique-images` once to fix existing duplicates
2. Update seeding scripts to use `assignUniqueImagesToRecipes()`
3. Apply `varyImageUrlsForPage()` in API responses for runtime variety

## Best Practices

### 1. Batch Size Recommendation
Process recipes in batches of 20-30 (one page) to:
- Match typical UI pagination
- Maximize Unsplash API efficiency (30 results per request)
- Balance API rate limits

### 2. API Rate Limits
Unsplash free tier: **50 requests/hour**

When processing batches:
```typescript
// Add delays between batches
await processRecipeBatch(batch1);
await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
await processRecipeBatch(batch2);
```

### 3. Monitoring Duplicates
Use the helper to detect and log duplicates:

```typescript
import { logImageDuplicateStats } from '@/utils/runtimeImageVariation';

const recipes = await getRecipesForPage(pageNumber);
logImageDuplicateStats(recipes, pageNumber);
// Output: ✅ Page 2: All 20 recipes have unique images
```

### 4. Fallback Strategy
The system gracefully handles failures:
- Falls back to `source.unsplash.com` if API key missing
- Returns original recipe if image fetch fails
- Logs errors without crashing

## Technical Details

### How It Works

#### 1. Global Index Calculation
```
globalIndex = page * limit + recipeIndexInBatch
```

For page 2 with limit 20:
- Recipe 0: globalIndex = 40
- Recipe 1: globalIndex = 41
- Recipe 19: globalIndex = 59

#### 2. Unsplash Page Selection
```
unsplashPage = floor(globalIndex / 30) + 1
resultIndex = globalIndex % 30
```

This cycles through Unsplash's result pages:
- Recipes 0-29: Unsplash page 1
- Recipes 30-59: Unsplash page 2
- Recipes 60-89: Unsplash page 3

#### 3. Runtime Variation
Uses Unsplash's CDN parameters:
```
Original: https://images.unsplash.com/photo-123
Varied:   https://images.unsplash.com/photo-123?w=800&h=600&crop=entropy
```

Different `crop` modes provide visual variety:
- `edges`: Detects and preserves edges
- `entropy`: Maximizes visual complexity
- `faces`: Focuses on detected faces
- `focalpoint`: Uses image focal point

## Migration Guide

### Step 1: Update ImageService (✅ Done)
The `imageService` now supports `page` and `resultIndex` parameters.

### Step 2: Choose Your Approach

**Option A: Database Update (Permanent)**
```bash
npm run ensure:unique-images
```

**Option B: Runtime Variation (Fast, no DB changes)**
Update your API endpoints:
```typescript
import { varyImageUrlsForPage } from '@/utils/runtimeImageVariation';

// In your controller
const recipes = await fetchRecipes(...);
const varied = varyImageUrlsForPage(recipes, offset);
res.json(varied);
```

**Option C: Hybrid (Best of both)**
1. Run `ensure:unique-images` once for base diversity
2. Apply `varyImageUrlsForPage()` at runtime for extra variety

### Step 3: Update Seeding Scripts
For new recipes, use the helper:
```typescript
import { assignUniqueImagesToRecipes } from '@/utils/uniqueImageHelper';

const recipes = [...]; // Generated recipes
const withImages = await assignUniqueImagesToRecipes(recipes, 0);
await saveRecipes(withImages);
```

## Testing

### Test Unique Images Per Page
```bash
# Seed recipes
npm run seed:100

# Run the unique images script
npm run ensure:unique-images

# Check the results
# Fetch page 1 and verify all 20 recipes have different images
# Fetch page 2 and verify all 20 recipes have different images
```

### Test Runtime Variation
```typescript
import { detectDuplicateImages, logImageDuplicateStats } from '@/utils/runtimeImageVariation';

const recipes = await getRecipes(0, 20);
const duplicates = detectDuplicateImages(recipes);

console.log(`Found ${duplicates.size} duplicates`);
logImageDuplicateStats(recipes, 0);
```

## Summary

You now have **three tools** to ensure unique images:

1. **ImageService** - Enhanced with pagination support
2. **uniqueImageHelper** - For database-level uniqueness
3. **runtimeImageVariation** - For fast, runtime variety

**Recommended approach:**
- Use **runtimeImageVariation** for immediate results (no DB changes, instant)
- Run **ensure:unique-images** script occasionally to clean up the database
- Use **uniqueImageHelper** when seeding new recipes

This ensures every recipe on a page has a unique, visually distinct image!
