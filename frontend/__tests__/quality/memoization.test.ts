// P6: high-frequency leaf components must be wrapped in React.memo so
// FlatList renderItem callbacks don't cascade re-renders into every card
// when one sibling's state changes.
//
// Whitelist file (`MEMOIZED_COMPONENTS`); each entry asserts the file
// exports a `React.memo`-wrapped variant. Append as more leaves are
// memoized.

import { readFileSync } from 'fs';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../..');

interface MemoContract {
  file: string;
  /** The named export that should be the memoized variant, or null for default export. */
  exportName: string | null;
}

const MEMOIZED_COMPONENTS: MemoContract[] = [
  // Already memoized before this tier — locked here so it doesn't regress.
  { file: 'components/recipe/RecipeCard.tsx', exportName: 'RecipeCard' },
  { file: 'components/cookbook/SmartCollectionCard.tsx', exportName: null },
  { file: 'components/cookbook/CollectionCarousel.tsx', exportName: null },
  { file: 'components/home/RecipeSectionsGrid.tsx', exportName: null },
  // Wave 1 — added in P6.
  { file: 'components/mealPlan/MealSlotCard.tsx', exportName: 'MealSlotCard' },
  { file: 'components/home/EditorialRecipeCard.tsx', exportName: 'EditorialRecipeCard' },
  { file: 'components/ui/WidgetCard.tsx', exportName: null },
];

describe('P6: high-frequency leaf components are memoized', () => {
  it.each(MEMOIZED_COMPONENTS)(
    '$file is wrapped in React.memo',
    ({ file, exportName }) => {
      const abs = path.join(REPO_ROOT, file);
      const src = readFileSync(abs, 'utf8');

      if (exportName) {
        // Named export: `export const X = React.memo(...)` or `export const X = memo(...)`
        const namedExportRe = new RegExp(
          `export\\s+const\\s+${exportName}\\s*=\\s*(?:React\\.)?memo\\s*\\(`,
        );
        expect(namedExportRe.test(src)).toBe(true);
      } else {
        // Default export: `export default React.memo(...)` or `export default memo(...)`
        expect(/export\s+default\s+(?:React\.)?memo\s*\(/.test(src)).toBe(true);
      }
    },
  );
});
