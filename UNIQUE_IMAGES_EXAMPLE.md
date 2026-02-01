# Quick Integration Example

## Option 1: Runtime Variation (Fastest - No DB Changes)

This is the **recommended approach** for immediate results. It works with your existing database without any changes.

### Integration into Recipe Controller

```typescript
// backend/src/modules/recipe/recipeController.ts
import { varyImageUrlsForPage } from '@/utils/runtimeImageVariation';

export const recipeController = {
  async getRecipes(req: Request, res: Response) {
    try {
      const page = Math.max(0, parseInt(req.query.page as string) || 0);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = page * limit;

      // ... your existing filter logic ...

      // Fetch recipes from database
      const recipes = await prisma.recipe.findMany({
        skip: offset,
        take: limit,
        where: where,
        // ... rest of your query
      });

      // 🎯 ADD THIS: Vary images for unique display per page
      const recipesWithVariedImages = varyImageUrlsForPage(recipes, offset);

      res.json({
        recipes: recipesWithVariedImages,
        // ... rest of your response
      });
    } catch (error) {
      // ... error handling
    }
  },

  async getRecipesOptimized(req: Request, res: Response) {
    try {
      const page = Math.max(0, parseInt(req.query.page as string) || 0);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));

      // ... your existing logic to fetch recipes ...

      const result = await fetchRecipesOptimized(prefs, {
        limit,
        page,
        filters,
      });

      // 🎯 ADD THIS: Vary images for unique display
      result.recipes = varyImageUrlsForPage(result.recipes, page * limit);

      res.json(result);
    } catch (error) {
      // ... error handling
    }
  },
};
```

### Why This Approach?

✅ **Zero database changes** - Works immediately
✅ **No API calls** - Uses existing image URLs
✅ **Fast** - Just modifies URL parameters
✅ **Reversible** - No permanent changes
✅ **Effective** - Creates visual variety via Unsplash CDN cropping

## Option 2: Database Update (One-Time Fix)

If you want to permanently ensure unique images in your database:

### Step 1: Run the Script

```bash
cd backend
npm run ensure:unique-images
```

This will:
1. Scan all recipes for duplicate images
2. Fetch new unique images from Unsplash
3. Update the database
4. Process in batches with rate limit respect

### Step 2: Update Future Seeding

When seeding new recipes, use the helper:

```typescript
// In your seeding script
import { assignUniqueImagesToRecipes } from '@/utils/uniqueImageHelper';

async function seedRecipes() {
  // Get current recipe count
  const existingCount = await prisma.recipe.count();

  // Generate new recipes
  const newRecipes = [...]; // Your recipe generation logic

  // Assign unique images based on position
  const recipesWithImages = await assignUniqueImagesToRecipes(
    newRecipes,
    existingCount  // Start from existing count
  );

  // Save to database
  await prisma.recipe.createMany({
    data: recipesWithImages,
  });
}
```

## Option 3: Hybrid (Best of Both Worlds)

Combine both approaches for maximum variety:

```typescript
// 1. One-time database fix
// Run: npm run ensure:unique-images

// 2. Apply runtime variation in controller
import { varyImageUrlsForPage } from '@/utils/runtimeImageVariation';

async getRecipes(req: Request, res: Response) {
  const recipes = await fetchRecipes(...);

  // Even though DB has unique images, add extra variety
  const varied = varyImageUrlsForPage(recipes, offset);

  res.json(varied);
}
```

## Testing Your Implementation

### Test 1: Check for Duplicates

```typescript
import { detectDuplicateImages, logImageDuplicateStats } from '@/utils/runtimeImageVariation';

// In your test or controller
const recipes = await getRecipesForPage(0, 20);

// Log statistics
logImageDuplicateStats(recipes, 0);
// Output: ✅ Page 0: All 20 recipes have unique images

// Or check programmatically
const duplicates = detectDuplicateImages(recipes);
if (duplicates.size === 0) {
  console.log('Success! All images are unique');
}
```

### Test 2: Visual Inspection

1. Start your backend: `npm run dev`
2. Fetch first page: `GET /api/recipes?page=0&limit=20`
3. Check that all 20 recipes have different `imageUrl` values
4. Fetch second page: `GET /api/recipes?page=1&limit=20`
5. Verify these 20 also have different images

### Test 3: Performance Check

```typescript
// Measure runtime variation performance
const start = Date.now();
const varied = varyImageUrlsForPage(recipes, offset);
const duration = Date.now() - start;

console.log(`Runtime variation took ${duration}ms`); // Should be <5ms
```

## Common Issues & Solutions

### Issue: Still seeing duplicate images

**Solution 1:** Make sure you're calling `varyImageUrlsForPage()` in your controller:
```typescript
const varied = varyImageUrlsForPage(recipes, offset);
res.json(varied); // Return varied, not recipes
```

**Solution 2:** Clear your app cache:
```typescript
// Expo app
import { Image } from 'expo-image';
await Image.clearDiskCache();
await Image.clearMemoryCache();
```

### Issue: Images look too different/cropped

**Solution:** The runtime variation uses Unsplash's smart cropping. If you prefer completely different images, use Option 2 (database update) instead.

### Issue: Script fails with rate limit error

**Solution:** Add delays between batches in [ensure-unique-images.ts](backend/scripts/ensure-unique-images.ts):
```typescript
// Increase delay
await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds
```

## Quick Start (30 seconds)

1. **Add one import to your controller:**
```typescript
import { varyImageUrlsForPage } from '@/utils/runtimeImageVariation';
```

2. **Add one line before returning recipes:**
```typescript
const varied = varyImageUrlsForPage(recipes, page * limit);
res.json(varied);
```

3. **Done!** Test by fetching recipes and checking for unique images.

## Performance Impact

| Approach | Speed | API Calls | DB Changes | Variety Level |
|----------|-------|-----------|------------|---------------|
| Runtime Variation | ⚡ <5ms | ❌ None | ❌ None | ⭐⭐⭐ Good |
| Database Update | 🐌 ~1s/batch | ✅ Many | ✅ Permanent | ⭐⭐⭐⭐ Better |
| Hybrid | ⚡ <5ms | ✅ One-time | ✅ One-time | ⭐⭐⭐⭐⭐ Best |

## Recommendation

**For immediate results:** Use **Option 1** (Runtime Variation)
- Add 2 lines of code
- Works instantly
- No database changes
- No API calls

**For long-term solution:** Use **Option 3** (Hybrid)
- Run `npm run ensure:unique-images` once
- Apply runtime variation in controllers
- Best variety
- Optimal performance
