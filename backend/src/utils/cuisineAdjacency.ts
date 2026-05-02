// backend/src/utils/cuisineAdjacency.ts
// Group 11 Phase 1 — Cuisine Adjacency Engine.
//
// A typed, weighted, bidirectional adjacency graph mapping every cuisine to
// its related cuisines. Used by the recommendation engine to broaden taste
// matches ("you like Persian → here's Afghan and Iraqi too").
//
// Relationship types:
//   - subcuisine: Persian → Middle Eastern (specific → broader family)
//   - sibling:    Nigerian ↔ Ghanaian (same region, shared techniques)
//   - diaspora:   Soul Food ↔ West African (historic culinary lineage)
//   - technique:  Burmese ↔ Yunnan Chinese (cross-region shared technique)
//
// Weights are in [0, 1]. Higher = more taste-similarity.

export type AdjacencyRelationship = 'subcuisine' | 'sibling' | 'diaspora' | 'technique';

export interface CuisineAdjacency {
  cuisine: string;
  relationship: AdjacencyRelationship;
  weight: number;
}

// Cuisine families — used for browse UI, recommendation context, and as the
// canonical "parent family" for getCuisineFamily().
export const CUISINE_FAMILIES: Record<string, string[]> = {
  'Latin American': [
    'Mexican', 'Puerto Rican', 'Cuban', 'Dominican', 'Salvadorean', 'Honduran',
    'Guatemalan', 'Nicaraguan', 'Costa Rican', 'Venezuelan', 'Colombian', 'Peruvian',
    'Brazilian', 'Argentinian', 'Chilean', 'Ecuadorean', 'Uruguayan', 'Bolivian',
    'Paraguayan', 'Haitian', 'Panamanian', 'Guyanese', 'Belizean', 'Surinamese',
  ],
  'African': [
    'Nigerian', 'Ghanaian', 'Senegalese', 'Cameroonian', 'Ivorian', 'Ethiopian',
    'Eritrean', 'Somali', 'Kenyan', 'Tanzanian', 'Ugandan', 'Congolese',
    'Mozambican', 'South African', 'Malagasy', 'Sudanese', 'North African',
    'Tunisian', 'Algerian',
  ],
  'Middle Eastern & Persian': [
    'Lebanese', 'Turkish', 'Persian', 'Iraqi', 'Kurdish', 'Palestinian', 'Yemeni',
    'Syrian', 'Jordanian', 'Saudi', 'Emirati', 'Omani', 'Afghan', 'Egyptian', 'Moroccan',
  ],
  'East & Southeast Asian': [
    'Chinese', 'Japanese', 'Korean', 'Taiwanese', 'Okinawan', 'Thai', 'Vietnamese',
    'Burmese', 'Lao', 'Cambodian', 'Filipino', 'Indonesian', 'Malaysian', 'Singaporean',
    'Mongolian',
  ],
  'South Asian': [
    'Indian', 'Pakistani', 'Bangladeshi', 'Sri Lankan', 'Nepali', 'Tibetan', 'Bhutanese',
  ],
  'European - Western': [
    'Italian', 'French', 'Spanish', 'Basque', 'Portuguese', 'Dutch', 'Belgian',
    'Swiss', 'British', 'Scottish', 'Irish', 'Icelandic',
  ],
  'European - Nordic': ['Swedish', 'Danish', 'Norwegian', 'Finnish'],
  'European - Central & Eastern': [
    'German', 'Austrian', 'Polish', 'Czech', 'Hungarian', 'Romanian', 'Bulgarian',
    'Albanian', 'Croatian', 'Serbian', 'Lithuanian',
  ],
  'European - Mediterranean': ['Greek', 'Cypriot', 'Maltese'],
  'Central Asian & Caucasus': ['Uzbek', 'Georgian', 'Armenian', 'Azerbaijani', 'Kazakh'],
  'American & Canadian': [
    'American', 'Canadian', 'Southern', 'Soul Food', 'Cajun/Creole', 'Tex-Mex',
    'New England', 'Hawaiian', 'Californian',
  ],
  'Caribbean': [
    'Jamaican', 'Trinidadian', 'Barbadian',
  ],
  'Pacific & Oceanian': [
    'Australian', 'New Zealand/Maori', 'Fijian', 'Polynesian',
  ],
  'Mediterranean': ['Mediterranean'],
  'Fusion & Modern': ['Fusion Asian', 'Modern Australian'],
};

// Reverse index: cuisine → family name (for fast lookup).
const FAMILY_BY_CUISINE: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const [family, cuisines] of Object.entries(CUISINE_FAMILIES)) {
    for (const c of cuisines) {
      if (!(c in m)) m[c] = family;
    }
  }
  return m;
})();

// Hand-curated adjacencies (subset — extends the legacy map in recipeSimilarity.ts
// with relationship + weight). Adjacency is auto-bidirectionalized at module load.
const RAW_ADJACENCIES: Record<string, CuisineAdjacency[]> = {
  // East & Southeast Asia
  'Thai': [
    { cuisine: 'Lao', relationship: 'sibling', weight: 0.85 },
    { cuisine: 'Vietnamese', relationship: 'sibling', weight: 0.7 },
    { cuisine: 'Burmese', relationship: 'sibling', weight: 0.65 },
    { cuisine: 'Cambodian', relationship: 'sibling', weight: 0.7 },
    { cuisine: 'Malaysian', relationship: 'technique', weight: 0.55 },
  ],
  'Vietnamese': [
    { cuisine: 'Cambodian', relationship: 'sibling', weight: 0.7 },
    { cuisine: 'Chinese', relationship: 'technique', weight: 0.55 },
  ],
  'Burmese': [
    { cuisine: 'Indian', relationship: 'technique', weight: 0.45 },
    { cuisine: 'Chinese', relationship: 'technique', weight: 0.5 },
  ],
  'Malaysian': [
    { cuisine: 'Indonesian', relationship: 'sibling', weight: 0.85 },
    { cuisine: 'Singaporean', relationship: 'sibling', weight: 0.85 },
    { cuisine: 'Chinese', relationship: 'diaspora', weight: 0.4 },
  ],
  'Indonesian': [
    { cuisine: 'Singaporean', relationship: 'sibling', weight: 0.7 },
  ],
  'Chinese': [
    { cuisine: 'Japanese', relationship: 'technique', weight: 0.45 },
    { cuisine: 'Korean', relationship: 'technique', weight: 0.45 },
    { cuisine: 'Taiwanese', relationship: 'sibling', weight: 0.85 },
    { cuisine: 'Mongolian', relationship: 'technique', weight: 0.5 },
  ],
  'Japanese': [
    { cuisine: 'Korean', relationship: 'technique', weight: 0.55 },
    { cuisine: 'Okinawan', relationship: 'subcuisine', weight: 0.85 },
  ],
  'Filipino': [
    { cuisine: 'Malaysian', relationship: 'sibling', weight: 0.55 },
    { cuisine: 'Spanish', relationship: 'diaspora', weight: 0.4 },
  ],

  // South Asia
  'Indian': [
    { cuisine: 'Pakistani', relationship: 'sibling', weight: 0.9 },
    { cuisine: 'Bangladeshi', relationship: 'sibling', weight: 0.8 },
    { cuisine: 'Sri Lankan', relationship: 'sibling', weight: 0.7 },
    { cuisine: 'Nepali', relationship: 'sibling', weight: 0.65 },
  ],
  'Pakistani': [
    { cuisine: 'Afghan', relationship: 'sibling', weight: 0.7 },
  ],
  'Nepali': [
    { cuisine: 'Tibetan', relationship: 'sibling', weight: 0.85 },
    { cuisine: 'Bhutanese', relationship: 'sibling', weight: 0.7 },
  ],

  // Middle East & Persian
  'Persian': [
    { cuisine: 'Afghan', relationship: 'sibling', weight: 0.8 },
    { cuisine: 'Iraqi', relationship: 'sibling', weight: 0.65 },
    { cuisine: 'Kurdish', relationship: 'sibling', weight: 0.7 },
    { cuisine: 'Azerbaijani', relationship: 'sibling', weight: 0.65 },
  ],
  'Lebanese': [
    { cuisine: 'Syrian', relationship: 'sibling', weight: 0.9 },
    { cuisine: 'Palestinian', relationship: 'sibling', weight: 0.85 },
    { cuisine: 'Jordanian', relationship: 'sibling', weight: 0.85 },
    { cuisine: 'Turkish', relationship: 'sibling', weight: 0.7 },
  ],
  'Turkish': [
    { cuisine: 'Greek', relationship: 'sibling', weight: 0.7 },
    { cuisine: 'Armenian', relationship: 'sibling', weight: 0.7 },
    { cuisine: 'Azerbaijani', relationship: 'sibling', weight: 0.7 },
  ],

  // Africa
  'Nigerian': [
    { cuisine: 'Ghanaian', relationship: 'sibling', weight: 0.85 },
    { cuisine: 'Cameroonian', relationship: 'sibling', weight: 0.7 },
    { cuisine: 'Senegalese', relationship: 'sibling', weight: 0.55 },
    { cuisine: 'Soul Food', relationship: 'diaspora', weight: 0.5 },
  ],
  'Ghanaian': [
    { cuisine: 'Ivorian', relationship: 'sibling', weight: 0.8 },
    { cuisine: 'Senegalese', relationship: 'sibling', weight: 0.6 },
  ],
  'Ethiopian': [
    { cuisine: 'Eritrean', relationship: 'sibling', weight: 0.95 },
    { cuisine: 'Somali', relationship: 'sibling', weight: 0.55 },
  ],
  'Kenyan': [
    { cuisine: 'Tanzanian', relationship: 'sibling', weight: 0.85 },
    { cuisine: 'Ugandan', relationship: 'sibling', weight: 0.75 },
  ],
  'North African': [
    { cuisine: 'Moroccan', relationship: 'sibling', weight: 0.9 },
    { cuisine: 'Tunisian', relationship: 'sibling', weight: 0.85 },
    { cuisine: 'Algerian', relationship: 'sibling', weight: 0.85 },
  ],

  // Latin America
  'Mexican': [
    { cuisine: 'Tex-Mex', relationship: 'diaspora', weight: 0.7 },
    { cuisine: 'Guatemalan', relationship: 'sibling', weight: 0.7 },
    { cuisine: 'Salvadorean', relationship: 'sibling', weight: 0.65 },
    { cuisine: 'Honduran', relationship: 'sibling', weight: 0.6 },
    { cuisine: 'Belizean', relationship: 'sibling', weight: 0.55 },
  ],
  'Cuban': [
    { cuisine: 'Puerto Rican', relationship: 'sibling', weight: 0.8 },
    { cuisine: 'Dominican', relationship: 'sibling', weight: 0.8 },
    { cuisine: 'Haitian', relationship: 'sibling', weight: 0.65 },
  ],
  'Puerto Rican': [
    { cuisine: 'Dominican', relationship: 'sibling', weight: 0.85 },
  ],
  'Salvadorean': [
    { cuisine: 'Honduran', relationship: 'sibling', weight: 0.85 },
    { cuisine: 'Guatemalan', relationship: 'sibling', weight: 0.85 },
    { cuisine: 'Nicaraguan', relationship: 'sibling', weight: 0.75 },
    { cuisine: 'Costa Rican', relationship: 'sibling', weight: 0.7 },
  ],
  'Peruvian': [
    { cuisine: 'Ecuadorean', relationship: 'sibling', weight: 0.75 },
    { cuisine: 'Bolivian', relationship: 'sibling', weight: 0.7 },
    { cuisine: 'Japanese', relationship: 'diaspora', weight: 0.45 },
  ],
  'Brazilian': [
    { cuisine: 'Portuguese', relationship: 'diaspora', weight: 0.6 },
  ],
  'Argentinian': [
    { cuisine: 'Uruguayan', relationship: 'sibling', weight: 0.9 },
    { cuisine: 'Chilean', relationship: 'sibling', weight: 0.7 },
    { cuisine: 'Italian', relationship: 'diaspora', weight: 0.45 },
  ],
  'Guyanese': [
    { cuisine: 'Surinamese', relationship: 'sibling', weight: 0.85 },
    { cuisine: 'Trinidadian', relationship: 'sibling', weight: 0.75 },
    { cuisine: 'Indian', relationship: 'diaspora', weight: 0.55 },
  ],

  // Europe
  'Italian': [
    { cuisine: 'French', relationship: 'sibling', weight: 0.6 },
    { cuisine: 'Spanish', relationship: 'sibling', weight: 0.55 },
    { cuisine: 'Greek', relationship: 'sibling', weight: 0.55 },
  ],
  'Spanish': [
    { cuisine: 'Portuguese', relationship: 'sibling', weight: 0.75 },
    { cuisine: 'Basque', relationship: 'subcuisine', weight: 0.85 },
  ],
  'Swedish': [
    { cuisine: 'Norwegian', relationship: 'sibling', weight: 0.9 },
    { cuisine: 'Danish', relationship: 'sibling', weight: 0.9 },
    { cuisine: 'Finnish', relationship: 'sibling', weight: 0.7 },
  ],
  'Polish': [
    { cuisine: 'Lithuanian', relationship: 'sibling', weight: 0.7 },
    { cuisine: 'Czech', relationship: 'sibling', weight: 0.65 },
    { cuisine: 'Hungarian', relationship: 'sibling', weight: 0.55 },
  ],
  'Croatian': [
    { cuisine: 'Serbian', relationship: 'sibling', weight: 0.85 },
    { cuisine: 'Albanian', relationship: 'sibling', weight: 0.6 },
  ],
  'Romanian': [
    { cuisine: 'Bulgarian', relationship: 'sibling', weight: 0.7 },
    { cuisine: 'Hungarian', relationship: 'sibling', weight: 0.55 },
  ],

  // Caucasus & Central Asia
  'Armenian': [
    { cuisine: 'Georgian', relationship: 'sibling', weight: 0.7 },
    { cuisine: 'Azerbaijani', relationship: 'sibling', weight: 0.6 },
  ],

  // American Regional
  'Soul Food': [
    { cuisine: 'Southern', relationship: 'sibling', weight: 0.85 },
    { cuisine: 'Cajun/Creole', relationship: 'sibling', weight: 0.6 },
  ],
  'Cajun/Creole': [
    { cuisine: 'Southern', relationship: 'sibling', weight: 0.7 },
    { cuisine: 'French', relationship: 'diaspora', weight: 0.45 },
  ],
};

// Build the bidirectional, deduped adjacency map at module load.
// If A→B exists with weight w, ensure B→A exists with the same weight (unless
// the reverse was authored explicitly, in which case the explicit value wins).
const ADJACENCY_MAP: Map<string, CuisineAdjacency[]> = (() => {
  const map = new Map<string, CuisineAdjacency[]>();
  const addEdge = (from: string, edge: CuisineAdjacency) => {
    const list = map.get(from) ?? [];
    if (!list.some((e) => e.cuisine === edge.cuisine)) {
      list.push(edge);
      map.set(from, list);
    }
  };
  for (const [from, edges] of Object.entries(RAW_ADJACENCIES)) {
    for (const edge of edges) {
      addEdge(from, edge);
      addEdge(edge.cuisine, { cuisine: from, relationship: edge.relationship, weight: edge.weight });
    }
  }
  return map;
})();

export const getAdjacentCuisines = (cuisine: string): CuisineAdjacency[] => {
  return [...(ADJACENCY_MAP.get(cuisine) ?? [])];
};

export const getCuisineFamily = (cuisine: string): string | null => {
  return FAMILY_BY_CUISINE[cuisine] ?? null;
};

// Convenience: combined exact + adjacent score.
// `exactBoost` is the boost a user gets when they like the exact cuisine.
// Adjacent cuisines are scaled by `weight * 0.6` (per roadmap spec) to ensure
// they never exceed exact match.
export const ADJACENT_SCALE = 0.6;

export const calculateAdjacencyBoost = (
  userLikedCuisines: string[],
  recipeCuisine: string,
  exactBoost: number
): number => {
  if (userLikedCuisines.includes(recipeCuisine)) return exactBoost;
  let bestAdjacency = 0;
  for (const liked of userLikedCuisines) {
    const adjacencies = getAdjacentCuisines(liked);
    const match = adjacencies.find((a) => a.cuisine === recipeCuisine);
    if (match && match.weight > bestAdjacency) {
      bestAdjacency = match.weight;
    }
  }
  return exactBoost * bestAdjacency * ADJACENT_SCALE;
};

// Internal: list of all cuisines covered by either families or adjacency.
export const __ALL_DEFINED_CUISINES = (() => {
  const set = new Set<string>();
  for (const cuisines of Object.values(CUISINE_FAMILIES)) {
    for (const c of cuisines) set.add(c);
  }
  for (const k of ADJACENCY_MAP.keys()) set.add(k);
  return [...set];
})();
