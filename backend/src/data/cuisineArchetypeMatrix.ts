// backend/src/data/cuisineArchetypeMatrix.ts
// ROADMAP 4.0 Tier D4 — Dish archetype coverage matrix.
//
// Defines the 8 archetypes every cuisine should cover and the
// per-cuisine status (required / optional / n/a) for each. Coverage
// reporting (D5) reads this to identify gaps.

import { listAllCanonicals } from './cuisineTaxonomy';

export const ARCHETYPES = [
  'weeknight_main',
  'weekend_project',
  'comfort_stew',
  'rice_or_grain',
  'vegetable_forward',
  'sweet_or_dessert',
  'breakfast',
  'quick_lunch',
] as const;

export type Archetype = (typeof ARCHETYPES)[number];

export type CoverageStatus = 'required' | 'optional' | 'n/a';

const DEFAULT_STATUS: Record<Archetype, CoverageStatus> = {
  weeknight_main: 'required',
  weekend_project: 'optional',
  comfort_stew: 'optional',
  rice_or_grain: 'optional',
  vegetable_forward: 'optional',
  sweet_or_dessert: 'optional',
  breakfast: 'optional',
  quick_lunch: 'optional',
};

// Per-cuisine overrides where the archetype is either core to the
// cuisine (required) or doesn't have a native expression (n/a).
// Cuisines not listed inherit the default matrix.
const OVERRIDES: Record<string, Partial<Record<Archetype, CoverageStatus>>> = {
  italian: { weekend_project: 'required', rice_or_grain: 'required' },
  french: { weekend_project: 'required', sweet_or_dessert: 'required' },
  spanish: { rice_or_grain: 'required', quick_lunch: 'required' },
  greek: { vegetable_forward: 'required' },
  portuguese: {},
  british: { breakfast: 'required', comfort_stew: 'required' },
  scandinavian: { breakfast: 'required' },
  balkan: { comfort_stew: 'required' },
  german: { comfort_stew: 'required' },
  austrian: { sweet_or_dessert: 'required' },
  hungarian: { comfort_stew: 'required' },
  polish: { comfort_stew: 'required' },
  russian: { comfort_stew: 'required', breakfast: 'required' },
  ukrainian: { comfort_stew: 'required' },
  georgian: { vegetable_forward: 'required' },

  levantine: { vegetable_forward: 'required', breakfast: 'required' },
  persian: { weekend_project: 'required', rice_or_grain: 'required' },
  turkish: { breakfast: 'required', vegetable_forward: 'required' },
  moroccan: { weekend_project: 'required', comfort_stew: 'required' },
  tunisian: { vegetable_forward: 'required' },
  egyptian: { vegetable_forward: 'required' },
  yemeni: { comfort_stew: 'required' },
  israeli: { breakfast: 'required', vegetable_forward: 'required' },

  ethiopian: { vegetable_forward: 'required', comfort_stew: 'required' },
  eritrean: { vegetable_forward: 'required', comfort_stew: 'required' },
  nigerian: { comfort_stew: 'required', rice_or_grain: 'required' },
  ghanaian: { comfort_stew: 'required' },
  senegalese: { rice_or_grain: 'required', comfort_stew: 'required' },
  ivorian: {},
  south_african: {},
  kenyan: {},
  somali: { rice_or_grain: 'required' },

  chinese: { rice_or_grain: 'required', quick_lunch: 'required' },
  japanese: { rice_or_grain: 'required', breakfast: 'required' },
  korean: { rice_or_grain: 'required', vegetable_forward: 'required' },
  mongolian: { comfort_stew: 'required' },
  tibetan: {},

  thai: { quick_lunch: 'required', rice_or_grain: 'required' },
  vietnamese: { breakfast: 'required', quick_lunch: 'required' },
  filipino: { rice_or_grain: 'required', breakfast: 'required' },
  indonesian: { rice_or_grain: 'required' },
  malaysian: { rice_or_grain: 'required' },
  singaporean: { rice_or_grain: 'required', breakfast: 'required' },
  burmese: { rice_or_grain: 'required' },
  lao: { rice_or_grain: 'required' },
  khmer: { rice_or_grain: 'required' },

  indian: {
    weekend_project: 'required',
    rice_or_grain: 'required',
    vegetable_forward: 'required',
    breakfast: 'required',
  },
  pakistani: { rice_or_grain: 'required', weekend_project: 'required' },
  sri_lankan: { rice_or_grain: 'required' },
  nepali: { rice_or_grain: 'required' },

  mexican: {
    breakfast: 'required',
    rice_or_grain: 'required',
    quick_lunch: 'required',
  },
  peruvian: { rice_or_grain: 'required', vegetable_forward: 'required' },
  brazilian: { rice_or_grain: 'required', comfort_stew: 'required' },
  colombian: { breakfast: 'required', comfort_stew: 'required' },
  argentinian: { weekend_project: 'required' },
  chilean: {},
  cuban: { rice_or_grain: 'required' },
  puerto_rican: { rice_or_grain: 'required' },
  dominican: { rice_or_grain: 'required' },
  salvadorean: { breakfast: 'required' },
  guatemalan: {},
  venezuelan: { breakfast: 'required' },
  trinidadian: { rice_or_grain: 'required' },
  jamaican: { rice_or_grain: 'required' },

  american: {
    breakfast: 'required',
    quick_lunch: 'required',
    weekend_project: 'required',
  },
  hawaiian: { rice_or_grain: 'required' },
  canadian: { breakfast: 'required' },

  australian: { breakfast: 'required' },
  pacific_islander: { rice_or_grain: 'required' },

  // Deprecated umbrellas — minimal matrix; recipes here get re-categorized
  // in the D6 audit.
  mediterranean: {},
  asian: {},
  middle_eastern: {},
  north_african: {},
  latin_american: {},
};

/**
 * Returns the coverage status for `cuisine × archetype`. Falls back to
 * the default matrix when no override exists.
 * Returns null if the cuisine is unknown.
 */
export function getCuisineArchetypeStatus(
  canonical: string,
  archetype: Archetype,
): CoverageStatus | null {
  if (!isKnownCanonical(canonical)) return null;
  const override = OVERRIDES[canonical]?.[archetype];
  return override ?? DEFAULT_STATUS[archetype];
}

let _knownCanonicalsCache: Set<string> | null = null;
function isKnownCanonical(canonical: string): boolean {
  if (!_knownCanonicalsCache) {
    _knownCanonicalsCache = new Set(
      listAllCanonicals().map((c) => c.canonical),
    );
  }
  return _knownCanonicalsCache.has(canonical);
}

// ──────────────────────────────────────────────────────────────────────────
// Archetype assignment
// ──────────────────────────────────────────────────────────────────────────

export interface AssignArchetypeInput {
  cookTimeMin: number;
  courseType: string | null; // 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | null
  ingredientNames: string[];
  title: string;
}

const GRAIN_MARKERS = [
  'rice',
  'quinoa',
  'couscous',
  'polenta',
  'farro',
  'bulgur',
  'barley',
  'millet',
  'noodle',
  'pasta',
  'orzo',
  'risotto',
  'biryani',
  'pilaf',
  'paella',
  'tahdig',
];

const STEW_MARKERS = [
  'stew',
  'braise',
  'braised',
  'tagine',
  'ragout',
  'curry',
  'chili',
  'goulash',
  'pot-au-feu',
  'gumbo',
  'cassoulet',
  'pho',
  'ramen',
  'soup',
  'broth',
  'borscht',
  'fesenjan',
  'sinigang',
  'maafe',
  'doro wat',
];

const PROTEIN_MARKERS = [
  'chicken',
  'turkey',
  'beef',
  'pork',
  'lamb',
  'duck',
  'fish',
  'salmon',
  'tuna',
  'cod',
  'shrimp',
  'tofu',
  'tempeh',
  'egg',
];

function lowerJoin(strings: string[]): string {
  return strings.join(' ').toLowerCase();
}

export function assignArchetype(input: AssignArchetypeInput): Archetype {
  const course = input.courseType?.toLowerCase() ?? '';
  if (course === 'breakfast') return 'breakfast';
  if (course === 'dessert') return 'sweet_or_dessert';

  const haystack = `${input.title.toLowerCase()} ${lowerJoin(input.ingredientNames)}`;

  // Stew-style recognized regardless of cook time
  if (STEW_MARKERS.some((m) => haystack.includes(m))) {
    return 'comfort_stew';
  }

  if (input.cookTimeMin > 60) {
    return 'weekend_project';
  }

  if (input.cookTimeMin <= 20 && course !== 'dinner') {
    return 'quick_lunch';
  }

  if (GRAIN_MARKERS.some((m) => haystack.includes(m))) {
    return 'rice_or_grain';
  }

  // Vegetable-forward: no protein source detected in ingredients
  const ingredientsLower = input.ingredientNames
    .join(' ')
    .toLowerCase();
  const hasProtein = PROTEIN_MARKERS.some((m) =>
    ingredientsLower.includes(m),
  );
  if (!hasProtein) {
    return 'vegetable_forward';
  }

  return 'weeknight_main';
}
