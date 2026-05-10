// P4: long lists must use a virtualized component (FlatList / FlashList),
// not <ScrollView>{items.map(...)}</ScrollView>.
//
// This test maintains a whitelist of files that have been migrated. As more
// lists are migrated, append to MIGRATED_FILES. The test asserts each file
// uses FlatList or FlashList AND does not contain a top-level ScrollView+map
// pattern over its dataset.

import { readFileSync } from 'fs';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../..');

interface ListContract {
  file: string;
  // The variable name (or expression fragment) that holds the dataset.
  // The check fails if the file contains `<dataset>.map(` while the file
  // also contains `<ScrollView` and no `<FlatList` / `<FlashList`.
  dataset: string;
}

const MIGRATED_FILES: ListContract[] = [
  { file: 'components/cookbook/RecentlySavedSection.tsx', dataset: 'recipes' },
  { file: 'components/home/SeasonalPicksSection.tsx', dataset: 'seasonal' },
  { file: 'components/cookbook/CollectionCarousel.tsx', dataset: 'recipes' },
  { file: 'components/cookbook/CollectionFilterRow.tsx', dataset: 'collections' },
  { file: 'components/cookbook/CollectionChips.tsx', dataset: 'collections' },
  { file: 'components/today/DiscoveryStrip.tsx', dataset: 'visible' },
  { file: 'components/today/NutritionStrip.tsx', dataset: 'pills' },
  { file: 'components/today/QuickActionRow.tsx', dataset: 'sortedActions' },
  { file: 'components/home/RecipeCarouselSection.tsx', dataset: 'recipes' },
  { file: 'components/home/RecipeSectionsGrid.tsx', dataset: 'recipes' },
];

describe('P4: list virtualization', () => {
  it.each(MIGRATED_FILES)(
    '$file uses FlatList/FlashList instead of ScrollView + .map for $dataset',
    ({ file, dataset }) => {
      const abs = path.join(REPO_ROOT, file);
      const src = readFileSync(abs, 'utf8');

      const usesFlatList = /<FlatList\b/.test(src) || /<FlashList\b/.test(src);
      expect(usesFlatList).toBe(true);

      // Ensure the dataset is rendered through FlatList/FlashList (data prop)
      // rather than a literal `<ScrollView>{dataset.map(...)}</ScrollView>`.
      const datasetMapRe = new RegExp(`\\b${dataset}\\.map\\(`);
      const hasMapCall = datasetMapRe.test(src);
      const hasScrollViewWrap = /<ScrollView[\s\S]*<\/ScrollView>/.test(src);

      // The combination is forbidden. data flowing into FlatList is fine.
      const forbidden = hasMapCall && hasScrollViewWrap;
      if (forbidden) {
        // Allow the case where FlatList wraps the dataset and ScrollView
        // is only a parent for unrelated content; check that the .map
        // call is *not* inside a ScrollView block.
        const lines = src.split('\n');
        let depth = 0;
        let inScrollView = false;
        let mapInScroll = false;
        for (const line of lines) {
          if (/<ScrollView\b/.test(line)) {
            inScrollView = true;
            depth = 1;
          } else if (inScrollView) {
            const opens = (line.match(/<ScrollView\b/g) ?? []).length;
            const closes = (line.match(/<\/ScrollView>/g) ?? []).length;
            depth += opens - closes;
            if (datasetMapRe.test(line)) mapInScroll = true;
            if (depth <= 0) inScrollView = false;
          }
        }
        expect(mapInScroll).toBe(false);
      }
    },
  );
});
