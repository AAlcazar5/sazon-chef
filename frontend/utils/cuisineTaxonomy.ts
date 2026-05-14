// frontend/utils/cuisineTaxonomy.ts
// Region-grouped cuisine list for the hierarchical filter picker.
// Mirror of the canonical roster in backend/src/data/cuisineTaxonomy.ts —
// regional groupings + display names + emojis only (no aliases or sub-cuisines,
// since the filter UI only needs canonical names + glyphs).
//
// If you add or rename a cuisine in the backend taxonomy, update it here too.

export interface CuisineEntry {
  name: string;
  emoji: string;
}

export interface CuisineRegion {
  key: string;
  label: string;
  emoji: string;
  cuisines: CuisineEntry[];
}

const c = (name: string, emoji: string): CuisineEntry => ({ name, emoji });

export const CUISINE_REGIONS: CuisineRegion[] = [
  {
    key: 'europe',
    label: 'Europe',
    emoji: '🥖',
    cuisines: [
      c('Italian', '🍝'),
      c('French', '🥐'),
      c('Spanish', '🥘'),
      c('Greek', '🫒'),
      c('Portuguese', '🐟'),
      c('British', '🫖'),
      c('Scandinavian', '🐟'),
      c('Balkan', '🥟'),
      c('German', '🥨'),
      c('Austrian', '🥧'),
      c('Hungarian', '🌶️'),
      c('Polish', '🥟'),
      c('Russian', '🍲'),
      c('Ukrainian', '🥣'),
      c('Georgian', '🍞'),
    ],
  },
  {
    key: 'mena',
    label: 'Middle East & N. Africa',
    emoji: '🥙',
    cuisines: [
      c('Levantine', '🧆'),
      c('Lebanese', '🧆'),
      c('Persian', '🍚'),
      c('Turkish', '🥙'),
      c('Moroccan', '🍲'),
      c('Tunisian', '🌶️'),
      c('Egyptian', '🫓'),
      c('Yemeni', '🍯'),
      c('Israeli', '🥙'),
    ],
  },
  {
    key: 'africa',
    label: 'Sub-Saharan Africa',
    emoji: '🥘',
    cuisines: [
      c('Ethiopian', '🫓'),
      c('Eritrean', '🫓'),
      c('Nigerian', '🍛'),
      c('Ghanaian', '🥜'),
      c('Senegalese', '🐟'),
      c('Ivorian', '🍌'),
      c('South African', '🥩'),
      c('Kenyan', '🌽'),
      c('Somali', '🐪'),
    ],
  },
  {
    key: 'east_asia',
    label: 'East Asia',
    emoji: '🥢',
    cuisines: [
      c('Chinese', '🥡'),
      c('Japanese', '🍱'),
      c('Korean', '🥘'),
      c('Mongolian', '🥩'),
      c('Tibetan', '🥟'),
    ],
  },
  {
    key: 'southeast_asia',
    label: 'Southeast Asia',
    emoji: '🍜',
    cuisines: [
      c('Thai', '🍜'),
      c('Vietnamese', '🍲'),
      c('Filipino', '🍢'),
      c('Indonesian', '🍢'),
      c('Malaysian', '🍤'),
      c('Singaporean', '🦀'),
      c('Burmese', '🍵'),
      c('Lao', '🌶️'),
      c('Khmer', '🥢'),
    ],
  },
  {
    key: 'south_asia',
    label: 'South Asia',
    emoji: '🍛',
    cuisines: [
      c('Indian', '🍛'),
      c('Pakistani', '🫓'),
      c('Sri Lankan', '🌶️'),
      c('Nepali', '🥟'),
    ],
  },
  {
    key: 'latin_america',
    label: 'Latin America',
    emoji: '🌮',
    cuisines: [
      c('Mexican', '🌮'),
      c('Peruvian', '🐟'),
      c('Brazilian', '🥩'),
      c('Colombian', '🫓'),
      c('Argentinian', '🥩'),
      c('Chilean', '🌶️'),
      c('Cuban', '🥪'),
      c('Puerto Rican', '🍌'),
      c('Dominican', '🍚'),
      c('Salvadorean', '🫓'),
      c('Guatemalan', '🌽'),
      c('Venezuelan', '🫓'),
      c('Trinidadian', '🌶️'),
      c('Jamaican', '🌶️'),
    ],
  },
  {
    key: 'north_america',
    label: 'North America',
    emoji: '🍔',
    cuisines: [
      c('American', '🍔'),
      c('American Southern', '🍗'),
      c('Cajun', '🦐'),
      c('Hawaiian', '🍍'),
      c('Canadian', '🍁'),
    ],
  },
  {
    key: 'oceania',
    label: 'Oceania',
    emoji: '🦐',
    cuisines: [
      c('Australian', '🦘'),
      c('Pacific Islander', '🥥'),
    ],
  },
];

/** Flat list of every canonical cuisine name — derived from the regions. */
export const ALL_CUISINES: string[] = CUISINE_REGIONS.flatMap((r) =>
  r.cuisines.map((cu) => cu.name),
);

/** Map a cuisine back to its region key (for badge counts on category chips). */
export function regionForCuisine(cuisine: string): string | null {
  for (const region of CUISINE_REGIONS) {
    if (region.cuisines.some((c) => c.name === cuisine)) return region.key;
  }
  return null;
}

/** Look up the emoji for a specific cuisine. */
export function emojiForCuisine(cuisine: string): string | null {
  for (const region of CUISINE_REGIONS) {
    const found = region.cuisines.find((c) => c.name === cuisine);
    if (found) return found.emoji;
  }
  return null;
}
