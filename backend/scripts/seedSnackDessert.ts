// backend/scripts/seedSnackDessert.ts
//
// Pure planner for the focused snack/dessert seed run
// (seed-snacks-desserts.ts). The cuisine-floor seed is driven by per-cuisine
// targets and a MEAL_TYPES rotation that is ~88% breakfast/lunch/dinner, so it
// structurally cannot widen the snack/dessert catalog. This planner is
// theme-driven instead: a curated catalog of N=1 snack/dessert archetypes
// (parfaits, Ninja Creami protein ice cream, whole-food vegan snacks, protein
// snacks, …) crossed with a specificity nudge — the same positive-diversity
// pattern proven in seedDiversity.pickDiversityAxis.
//
// cuisine is left free (no cuisineOverride): these are cross-cultural lifestyle
// snacks/desserts; pinning a cuisine would fight the theme steer. The model
// assigns a fitting cuisine and the catalog gets natural spread.
//
// Steers are brand-voice clean: no "macro-friendly" / goal-verdict framing.
// Protein/fiber are named as nutrients (allowed), never as a verdict.

export type SnackDessertMealType = 'snack' | 'dessert';

export interface SnackDessertTheme {
  /** Stable identifier for breakdown reporting + offset rotation. */
  key: string;
  mealType: SnackDessertMealType;
  /** Positive steer fed to aiRecipeService via styleHint. */
  styleHint: string;
}

export interface SnackDessertJob {
  mealType: SnackDessertMealType;
  styleHint: string;
  themeKey: string;
}

// User-named buckets first (parfaits, Ninja Creami ice cream, whole-food vegan,
// protein snacks), then the adjacent lifestyle long-tail. Each steer is a
// positive archetype — concrete enough to push the model off the single
// prototypical "granola bar" without naming a specific dish.
export const SNACK_DESSERT_THEMES: readonly SnackDessertTheme[] = [
  {
    key: 'yogurt_parfait',
    mealType: 'snack',
    styleHint:
      'a layered Greek-yogurt-and-fruit parfait, high in protein with no refined sugar',
  },
  {
    key: 'creami_protein_ice_cream',
    mealType: 'dessert',
    styleHint:
      'a protein-forward Ninja Creami ice cream — blended then frozen, naturally sweetened, creamy not icy',
  },
  {
    key: 'creami_fruit_sorbet',
    mealType: 'dessert',
    styleHint:
      'a Ninja Creami fruit sorbet or gelato built on whole frozen fruit, no added sugar',
  },
  {
    key: 'vegan_energy_bites',
    mealType: 'snack',
    styleHint:
      'a no-bake whole-food vegan energy bite — dates, nuts, seeds, zero animal products',
  },
  {
    key: 'protein_savory_snack',
    mealType: 'snack',
    styleHint:
      'a high-protein savory snack that satisfies between meals, made from real whole ingredients',
  },
  {
    key: 'nice_cream',
    mealType: 'dessert',
    styleHint:
      'a frozen-banana "nice cream" soft serve, dairy-free and naturally sweet',
  },
  {
    key: 'chia_pudding',
    mealType: 'snack',
    styleHint:
      'a chia or overnight pudding with fruit and a protein boost, no refined sugar',
  },
  {
    key: 'frozen_yogurt_bark',
    mealType: 'dessert',
    styleHint:
      'a frozen Greek-yogurt bark studded with fruit and nuts, naturally sweetened',
  },
  {
    key: 'roasted_legume_crunch',
    mealType: 'snack',
    styleHint:
      'a crunchy roasted chickpea, edamame, or fava snack mix, savory and high in fiber',
  },
  {
    key: 'cottage_cheese_bowl',
    mealType: 'snack',
    styleHint:
      'a savory or sweet whipped cottage cheese bowl, high in protein with fresh toppings',
  },
  {
    key: 'protein_mug_cake',
    mealType: 'dessert',
    styleHint:
      'a single-serving protein mug cake or baked oat cup, naturally sweetened',
  },
  {
    key: 'fruit_nut_butter',
    mealType: 'snack',
    styleHint:
      'a fresh-fruit-and-nut-butter snack plate, whole-food and naturally sweet',
  },
  {
    key: 'vegan_dip_crudite',
    mealType: 'snack',
    styleHint:
      'a whole-food vegan dip or spread with crisp vegetables to dip, no animal products',
  },
  {
    key: 'protein_smoothie_bowl',
    mealType: 'snack',
    styleHint:
      'a thick spoonable protein smoothie bowl topped with whole fruit and seeds',
  },
  {
    key: 'date_stuffed_treat',
    mealType: 'dessert',
    styleHint:
      'a stuffed-date or fruit-and-nut confection that tastes indulgent but uses only whole ingredients',
  },
  {
    key: 'baked_protein_bar',
    mealType: 'snack',
    styleHint:
      'a homemade baked protein or granola bar, naturally sweetened and portable',
  },
];

// Specificity nudges advance once the theme list wraps, so the first
// themes×nudges jobs are all distinct steers before anything repeats. None of
// these introduce goal-verdict or macro-cult vocabulary.
export const SPECIFICITY_NUDGES: readonly string[] = [
  'a quick no-cook version',
  'a make-ahead batch version',
  'a single-serving version',
  'a seasonal-fruit version',
  'an indulgent-tasting but lightened version',
];

// ──────────────────────────────────────────────────────────────────────────
// International snack mode. The theme-driven plan above leaves cuisine free,
// so the model defaults to American/Global. This mode pins a rotating roster
// of world cuisines crossed with universal snack archetypes so the catalog
// gains authentic regional snacks (onigiri, chaat, börek, coxinha, puff-puff,
// miang kham, …) instead of more parfaits. Cuisine names match the catalog's
// canonical display names so they normalize cleanly.
// ──────────────────────────────────────────────────────────────────────────
export interface InternationalSnackJob {
  cuisine: string;
  mealType: 'snack';
  styleHint: string;
  themeKey: string;
}

export interface InternationalDessertJob {
  cuisine: string;
  mealType: 'dessert';
  styleHint: string;
  themeKey: string;
}

export interface InternationalSauceJob {
  cuisine: string;
  mealType: 'sauce';
  styleHint: string;
  themeKey: string;
}

export const INTERNATIONAL_SNACK_CUISINES: readonly string[] = [
  // East / SE / South Asia
  'Japanese', 'Korean', 'Chinese', 'Thai', 'Vietnamese', 'Filipino',
  'Indonesian', 'Malaysian', 'Indian', 'Pakistani', 'Sri Lankan', 'Nepali',
  // MENA
  'Lebanese', 'Levantine', 'Turkish', 'Persian', 'Moroccan', 'Egyptian',
  // Sub-Saharan Africa
  'Ethiopian', 'Nigerian', 'Senegalese', 'South African', 'Ghanaian',
  // Latin America & Caribbean
  'Mexican', 'Peruvian', 'Brazilian', 'Colombian', 'Argentinian',
  'Cuban', 'Jamaican',
  // Europe long-tail (snack-rich, under-covered)
  'Greek', 'Spanish', 'Portuguese', 'Polish', 'Hungarian', 'Georgian',
];

// Universal snack shapes, phrased so each reads naturally for any cuisine.
// Brand-voice clean: no goal-verdict / macro-cult vocabulary.
export const INTERNATIONAL_SNACK_ARCHETYPES: readonly string[] = [
  'a traditional street-vendor snack eaten on the go',
  'a fried or crispy hand-held snack bite',
  'a savory stuffed pastry or filled-dough snack',
  'a roasted, toasted, or spiced nut, seed, or legume snack mix',
  'a fresh dip or spread served with its traditional dipper',
  'a steamed, griddled, or grilled small-plate snack',
  'a lightly sweetened teatime nibble made from whole ingredients',
  'a pickled, fermented, or cured small bite',
];

export const INTL_NUDGES: readonly string[] = [
  'regional and lesser-known, not the single most famous one',
  'a rustic everyday home-style version',
  'a festive or holiday version',
  'a modern lighter take grounded in tradition',
  'drawn from a specific sub-region, not the national icon',
];

/**
 * Deterministic international snack plan. Cuisine rotates fastest (by job
 * index, shifted by `cuisineOffset`), so every cuisine is hit once before any
 * repeats — maximizing regional spread. The archetype advances once the
 * cuisine list wraps; the specificity nudge advances once the archetype list
 * wraps. mealType is always 'snack' (this mode is snack-focused).
 */
export function buildInternationalSnackPlan(
  count: number,
  opts: { cuisineOffset?: number } = {},
): InternationalSnackJob[] {
  if (count <= 0) return [];
  const cuisines = INTERNATIONAL_SNACK_CUISINES;
  const archetypes = INTERNATIONAL_SNACK_ARCHETYPES;
  const offset = Math.trunc(opts.cuisineOffset ?? 0);

  const plan: InternationalSnackJob[] = [];
  for (let i = 0; i < count; i += 1) {
    const idx = i + offset;
    const c = ((idx % cuisines.length) + cuisines.length) % cuisines.length;
    const a = Math.floor(Math.abs(idx) / cuisines.length) % archetypes.length;
    const n =
      Math.floor(Math.abs(idx) / (cuisines.length * archetypes.length)) %
      INTL_NUDGES.length;
    const cuisine = cuisines[c];
    plan.push({
      cuisine,
      mealType: 'snack',
      styleHint: `${archetypes[a]} authentic to ${cuisine} cuisine — ${INTL_NUDGES[n]}`,
      themeKey: `${cuisine}:${a}`,
    });
  }
  return plan;
}

// Universal dessert shapes, phrased to read naturally for any cuisine.
// Brand-voice clean: no goal-verdict / macro-cult vocabulary. Reuses
// INTERNATIONAL_SNACK_CUISINES for the world-cuisine roster (same broad
// spread; desserts travel the same regions as snacks).
export const INTERNATIONAL_DESSERT_ARCHETYPES: readonly string[] = [
  'a traditional festive or celebration sweet',
  'a milk-, custard-, or cheese-based dessert',
  'a fried, griddled, or syrup-soaked sweet',
  'a fresh-fruit-forward dessert',
  'a pastry or layered baked sweet',
  'a frozen or chilled dessert',
  'a rice-, semolina-, or grain-based pudding',
  'a nut-, honey-, or date-sweetened confection',
];

/**
 * Deterministic international dessert plan. Same rotation contract as
 * buildInternationalSnackPlan (cuisine fastest, archetype on cuisine-wrap,
 * nudge on archetype-wrap) but mealType is always 'dessert' and the
 * archetypes are sweet. Fixes the catalog's thin, Western-skewed dessert
 * coverage with authentic regional sweets.
 */
export function buildInternationalDessertPlan(
  count: number,
  opts: { cuisineOffset?: number } = {},
): InternationalDessertJob[] {
  if (count <= 0) return [];
  const cuisines = INTERNATIONAL_SNACK_CUISINES;
  const archetypes = INTERNATIONAL_DESSERT_ARCHETYPES;
  const offset = Math.trunc(opts.cuisineOffset ?? 0);

  const plan: InternationalDessertJob[] = [];
  for (let i = 0; i < count; i += 1) {
    const idx = i + offset;
    const c = ((idx % cuisines.length) + cuisines.length) % cuisines.length;
    const a = Math.floor(Math.abs(idx) / cuisines.length) % archetypes.length;
    const n =
      Math.floor(Math.abs(idx) / (cuisines.length * archetypes.length)) %
      INTL_NUDGES.length;
    const cuisine = cuisines[c];
    plan.push({
      cuisine,
      mealType: 'dessert',
      styleHint: `${archetypes[a]} authentic to ${cuisine} cuisine — ${INTL_NUDGES[n]}`,
      themeKey: `${cuisine}:${a}`,
    });
  }
  return plan;
}

// Universal sauce/condiment shapes, phrased to read naturally for any
// cuisine. Brand-voice clean. Sauces are a flavor accompaniment, never a
// standalone meal (the aiRecipeService 'sauce' prompt branch reinforces this).
export const INTERNATIONAL_SAUCE_ARCHETYPES: readonly string[] = [
  'a fresh herb-and-oil sauce',
  'a yogurt- or dairy-based cooling sauce or dip',
  'a chili paste or hot sauce',
  'a nut- or seed-based sauce',
  'a tangy vinaigrette or salad dressing',
  'a fermented or umami-rich condiment',
  'a cooked tomato- or vegetable-based sauce',
  'a sweet-and-sour or fruit-based condiment',
];

/**
 * Deterministic international sauce plan. Same rotation contract as
 * buildInternationalDessertPlan but mealType is always 'sauce' and the
 * archetypes are condiments/dressings/dips. Seeds a browsable world-sauce
 * catalog (tzatziki, chimichurri, harissa, romesco, nuoc cham, …).
 */
export function buildInternationalSaucePlan(
  count: number,
  opts: { cuisineOffset?: number } = {},
): InternationalSauceJob[] {
  if (count <= 0) return [];
  const cuisines = INTERNATIONAL_SNACK_CUISINES;
  const archetypes = INTERNATIONAL_SAUCE_ARCHETYPES;
  const offset = Math.trunc(opts.cuisineOffset ?? 0);

  const plan: InternationalSauceJob[] = [];
  for (let i = 0; i < count; i += 1) {
    const idx = i + offset;
    const c = ((idx % cuisines.length) + cuisines.length) % cuisines.length;
    const a = Math.floor(Math.abs(idx) / cuisines.length) % archetypes.length;
    const n =
      Math.floor(Math.abs(idx) / (cuisines.length * archetypes.length)) %
      INTL_NUDGES.length;
    const cuisine = cuisines[c];
    plan.push({
      cuisine,
      mealType: 'sauce',
      styleHint: `${archetypes[a]} authentic to ${cuisine} cuisine — ${INTL_NUDGES[n]}`,
      themeKey: `${cuisine}:${a}`,
    });
  }
  return plan;
}

/**
 * Deterministic theme-driven plan. Theme rotates fastest (by job index,
 * shifted by `themeOffset`); the specificity nudge advances once the theme
 * list wraps — mirrors seedDiversity.pickDiversityAxis so the first
 * themes×nudges steers are all unique, maximizing catalog breadth before the
 * dedup guard starts discarding collisions.
 */
export function buildSnackDessertPlan(
  count: number,
  opts: { themeOffset?: number } = {},
): SnackDessertJob[] {
  if (count <= 0) return [];
  const themes = SNACK_DESSERT_THEMES;
  const nudges = SPECIFICITY_NUDGES;
  const offset = Math.trunc(opts.themeOffset ?? 0);

  const plan: SnackDessertJob[] = [];
  for (let i = 0; i < count; i += 1) {
    const idx = i + offset;
    const t = ((idx % themes.length) + themes.length) % themes.length;
    const theme = themes[t];
    const n =
      Math.floor(Math.abs(idx) / themes.length) % nudges.length;
    plan.push({
      mealType: theme.mealType,
      styleHint: `${theme.styleHint} — ${nudges[n]}`,
      themeKey: theme.key,
    });
  }
  return plan;
}
