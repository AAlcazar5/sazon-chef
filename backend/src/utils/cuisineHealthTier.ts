// backend/src/utils/cuisineHealthTier.ts
// Group 11 Phase 3 — Health-Forward Recipe Positioning.
//
// Classifies every cuisine into a generation strategy. The AI recipe
// generation prompt is augmented with the tier's prompt addendum so that the
// model produces recipes that play to each cuisine's nutritional strengths.

export type HealthTier = 'naturally_healthy' | 'easily_adapted' | 'hidden_superfoods' | 'protein_forward';

export const TIER_PROMPT_ADDENDUM: Record<HealthTier, string> = {
  naturally_healthy:
    'This cuisine is naturally healthy — emphasize its inherent nutritional strengths (fermentation, lean proteins, vegetables, seafood). Generate as-is and call out the health benefits in the description.',
  easily_adapted:
    'Create a lighter version that preserves authentic flavor — air-fry instead of deep-fry, Greek yogurt for sour cream, cauliflower rice option, leaner cuts where applicable. Include the original technique reference in the description so users know what they are riffing on.',
  hidden_superfoods:
    'Highlight the superfood angle — this cuisine contains ingredients users may not realize are superfoods (fermented staples, legumes, leafy greens, ancient grains). Spotlight the standout ingredient and what it does.',
  protein_forward:
    'This cuisine is naturally high-protein — emphasize lean cuts, grilling/braising technique, and protein per serving. Aim for ≥30g protein per portion when possible.',
};

const NATURALLY_HEALTHY = [
  'Ethiopian', 'Eritrean', 'Okinawan', 'Vietnamese', 'Peruvian', 'Mediterranean',
  'Japanese', 'Korean', 'Greek', 'Lebanese', 'Finnish', 'Fijian', 'Polynesian',
  'Costa Rican', 'New Zealand/Maori',
];

const EASILY_ADAPTED = [
  'Soul Food', 'Cajun/Creole', 'Southern', 'British', 'American', 'Canadian',
  'Mexican', 'Tex-Mex', 'German', 'Dutch', 'Belgian', 'Austrian', 'Hungarian',
  'Polish', 'Czech',
];

const HIDDEN_SUPERFOODS = [
  'Nigerian', 'Burmese', 'Persian', 'Senegalese', 'Ghanaian', 'Romanian',
  'Bulgarian', 'Malagasy', 'Ivorian', 'Sudanese', 'Tunisian',
];

const PROTEIN_FORWARD = [
  'Argentinian', 'Korean', 'Somali', 'Brazilian', 'Turkish', 'Saudi',
  'Mongolian', 'Uruguayan', 'South African', 'Croatian', 'Kenyan', 'Mozambican',
];

const TIER_BY_CUISINE: Record<string, HealthTier> = (() => {
  const m: Record<string, HealthTier> = {};
  for (const c of NATURALLY_HEALTHY) m[c] = 'naturally_healthy';
  for (const c of EASILY_ADAPTED) m[c] = 'easily_adapted';
  for (const c of HIDDEN_SUPERFOODS) m[c] = 'hidden_superfoods';
  for (const c of PROTEIN_FORWARD) m[c] = 'protein_forward';
  return m;
})();

export const getHealthTierForCuisine = (cuisine: string): HealthTier | null => {
  return TIER_BY_CUISINE[cuisine] ?? null;
};

export const getHealthPromptAddendum = (cuisine: string): string => {
  const tier = getHealthTierForCuisine(cuisine);
  return tier ? TIER_PROMPT_ADDENDUM[tier] : '';
};

export const __TIER_BY_CUISINE = TIER_BY_CUISINE;
