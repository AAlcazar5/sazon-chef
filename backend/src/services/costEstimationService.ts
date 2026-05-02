// backend/src/services/costEstimationService.ts
// 10W: per-ingredient cost estimation, unit conversion, fallback reasons, in-memory caching.
//
// Replaces the legacy flat-$7 fallback in costCalculator with explicit
// priced/category/unknown sources so the API can be honest about confidence.

import crypto from 'crypto';

export const COST_DISCLAIMER = 'Sazon estimates · prices vary by store';

export const FALLBACK_REASONS = {
  PRICED: 'priced',
  CATEGORY: 'category',
  UNKNOWN: 'unknown',
} as const;

export type CostSource = (typeof FALLBACK_REASONS)[keyof typeof FALLBACK_REASONS];

export interface IngredientInput {
  name: string;
  quantity: number;
  unit: string;
  text?: string;
}

export interface IngredientCostResult {
  cost: number;
  source: CostSource;
  matchedKey?: string;
  grams?: number;
}

interface PriceEntry {
  min: number;
  max: number;
  average: number;
  unit: 'lb' | 'each' | 'cup' | 'bottle' | 'dozen' | 'g' | 'oz' | 'package' | 'can' | 'bunch' | 'head' | 'gallon' | 'loaf' | 'container' | 'clove';
  // Bottle-style entries need a serving size to back out cost-per-gram.
  // e.g. olive oil bottle 500ml ≈ 460g; container of yogurt 32oz ≈ 907g.
  bulkGrams?: number;
}

// ─── Density overrides (g per ml). Default = water = 1.0 ──────────────
const DENSITY_OVERRIDES: Record<string, number> = {
  flour: 0.53,
  'all-purpose flour': 0.53,
  'whole wheat flour': 0.55,
  'almond flour': 0.45,
  'olive oil': 0.92,
  'vegetable oil': 0.92,
  'canola oil': 0.92,
  'coconut oil': 0.92,
  oil: 0.92,
  sugar: 0.85,
  'brown sugar': 0.93,
  'powdered sugar': 0.56,
  honey: 1.42,
  'maple syrup': 1.32,
  rice: 0.78,
  oats: 0.41,
  butter: 0.91,
  milk: 1.03,
  yogurt: 1.04,
  'greek yogurt': 1.05,
  cocoa: 0.45,
  'cocoa powder': 0.45,
  cornstarch: 0.62,
  salt: 1.22,
  'baking powder': 0.9,
  'baking soda': 0.9,
};

// ─── Unit → ml (volume) or g (mass) ────────────────────────────────────
const ML_PER_UNIT: Record<string, number> = {
  cup: 240,
  cups: 240,
  c: 240,
  tbsp: 14.79,
  tablespoon: 14.79,
  tablespoons: 14.79,
  tsp: 4.93,
  teaspoon: 4.93,
  teaspoons: 4.93,
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
  'fl oz': 29.57,
  'fluid ounce': 29.57,
  'fluid ounces': 29.57,
  pint: 473,
  pints: 473,
  quart: 946,
  quarts: 946,
  gallon: 3785,
  gallons: 3785,
};

const G_PER_UNIT: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  oz: 28.35,
  ounce: 28.35,
  ounces: 28.35,
  lb: 453.59,
  lbs: 453.59,
  pound: 453.59,
  pounds: 453.59,
};

const COUNT_UNITS = new Set(['each', 'piece', 'pieces', 'item', 'items', 'whole', 'clove', 'cloves', 'head', 'heads', 'bunch', 'bunches', 'package', 'packages', 'can', 'cans', 'container', 'containers', 'bottle', 'bottles', 'dozen', 'loaf', 'loaves']);

/**
 * Convert (quantity, unit, ingredientName) → grams.
 * Falls back to water density (1.0) when the ingredient has no override.
 * Returns NaN for count-based units (caller should price by piece).
 */
export function toGrams(quantity: number, unit: string, ingredientName: string): number {
  const u = unit.toLowerCase().trim();

  if (G_PER_UNIT[u] !== undefined) {
    return Math.round(quantity * G_PER_UNIT[u] * 100) / 100;
  }

  if (ML_PER_UNIT[u] !== undefined) {
    const ml = quantity * ML_PER_UNIT[u];
    const density = lookupDensity(ingredientName);
    return Math.round(ml * density * 100) / 100;
  }

  if (COUNT_UNITS.has(u)) {
    return NaN;
  }

  return NaN;
}

function lookupDensity(name: string): number {
  const n = name.toLowerCase().trim();
  if (DENSITY_OVERRIDES[n] !== undefined) return DENSITY_OVERRIDES[n];
  // partial match — first key that appears in the name
  for (const key of Object.keys(DENSITY_OVERRIDES)) {
    if (n.includes(key)) return DENSITY_OVERRIDES[key];
  }
  return 1.0;
}

// ─── Per-ingredient price table (~300 entries) ─────────────────────────
// Sourced from average US grocery pricing 2024-2025. Each entry's `unit`
// is the *priced unit*; bulkGrams lets us convert mass → cost for items
// that ship in bottles/containers/etc.
const PRICE_TABLE: Record<string, PriceEntry> = {
  // ─── Proteins (per lb unless noted) ──
  'chicken breast': { min: 5.0, max: 7.0, average: 6.0, unit: 'lb' },
  'chicken thigh': { min: 3.5, max: 5.5, average: 4.5, unit: 'lb' },
  'chicken thighs': { min: 3.5, max: 5.5, average: 4.5, unit: 'lb' },
  'chicken wings': { min: 3.5, max: 6.0, average: 4.7, unit: 'lb' },
  'whole chicken': { min: 1.5, max: 3.0, average: 2.2, unit: 'lb' },
  'ground chicken': { min: 4.5, max: 6.5, average: 5.5, unit: 'lb' },
  'ground turkey': { min: 4.5, max: 6.5, average: 5.5, unit: 'lb' },
  'turkey breast': { min: 5.5, max: 8.0, average: 6.7, unit: 'lb' },
  'ground beef': { min: 5.0, max: 8.0, average: 6.5, unit: 'lb' },
  beef: { min: 6.0, max: 12.0, average: 8.5, unit: 'lb' },
  'beef chuck': { min: 5.5, max: 8.0, average: 6.7, unit: 'lb' },
  'beef sirloin': { min: 8.0, max: 12.0, average: 10.0, unit: 'lb' },
  steak: { min: 9.0, max: 18.0, average: 12.5, unit: 'lb' },
  ribeye: { min: 12.0, max: 22.0, average: 16.0, unit: 'lb' },
  'pork chop': { min: 4.0, max: 7.0, average: 5.5, unit: 'lb' },
  'pork loin': { min: 3.5, max: 5.5, average: 4.5, unit: 'lb' },
  'pork shoulder': { min: 2.5, max: 4.5, average: 3.5, unit: 'lb' },
  'ground pork': { min: 4.0, max: 6.0, average: 5.0, unit: 'lb' },
  bacon: { min: 6.0, max: 9.0, average: 7.5, unit: 'lb' },
  sausage: { min: 4.5, max: 7.5, average: 5.5, unit: 'lb' },
  ham: { min: 4.0, max: 7.0, average: 5.5, unit: 'lb' },
  salmon: { min: 9.0, max: 16.0, average: 12.0, unit: 'lb' },
  tuna: { min: 8.0, max: 14.0, average: 10.5, unit: 'lb' },
  cod: { min: 8.0, max: 13.0, average: 10.0, unit: 'lb' },
  tilapia: { min: 5.0, max: 8.0, average: 6.5, unit: 'lb' },
  shrimp: { min: 8.0, max: 15.0, average: 11.0, unit: 'lb' },
  scallops: { min: 18.0, max: 28.0, average: 22.0, unit: 'lb' },
  lobster: { min: 15.0, max: 28.0, average: 20.0, unit: 'lb' },
  crab: { min: 14.0, max: 22.0, average: 17.5, unit: 'lb' },
  tofu: { min: 2.0, max: 4.0, average: 2.8, unit: 'package', bulkGrams: 397 },
  tempeh: { min: 3.5, max: 5.5, average: 4.3, unit: 'package', bulkGrams: 227 },
  seitan: { min: 4.0, max: 6.5, average: 5.0, unit: 'package', bulkGrams: 227 },
  egg: { min: 0.25, max: 0.45, average: 0.32, unit: 'each' },
  eggs: { min: 3.0, max: 6.0, average: 4.5, unit: 'dozen' },
  'egg whites': { min: 4.0, max: 6.5, average: 5.0, unit: 'container', bulkGrams: 454 },
  lamb: { min: 8.0, max: 14.0, average: 11.0, unit: 'lb' },
  duck: { min: 7.0, max: 12.0, average: 9.5, unit: 'lb' },

  // ─── Produce ──
  tomato: { min: 0.5, max: 2.0, average: 1.0, unit: 'each' },
  tomatoes: { min: 0.5, max: 2.0, average: 1.0, unit: 'each' },
  'cherry tomatoes': { min: 3.0, max: 5.0, average: 4.0, unit: 'lb' },
  'roma tomato': { min: 0.4, max: 1.0, average: 0.6, unit: 'each' },
  onion: { min: 0.6, max: 1.4, average: 0.9, unit: 'each' },
  onions: { min: 0.6, max: 1.4, average: 0.9, unit: 'each' },
  'red onion': { min: 0.8, max: 1.6, average: 1.1, unit: 'each' },
  'yellow onion': { min: 0.6, max: 1.2, average: 0.8, unit: 'each' },
  'green onion': { min: 1.0, max: 2.0, average: 1.4, unit: 'bunch' },
  scallion: { min: 1.0, max: 2.0, average: 1.4, unit: 'bunch' },
  scallions: { min: 1.0, max: 2.0, average: 1.4, unit: 'bunch' },
  shallot: { min: 0.5, max: 1.2, average: 0.8, unit: 'each' },
  garlic: { min: 0.6, max: 1.5, average: 0.9, unit: 'head' },
  'garlic clove': { min: 0.08, max: 0.2, average: 0.12, unit: 'clove' },
  ginger: { min: 4.0, max: 7.0, average: 5.0, unit: 'lb' },
  'bell pepper': { min: 1.0, max: 2.5, average: 1.6, unit: 'each' },
  'bell peppers': { min: 1.0, max: 2.5, average: 1.6, unit: 'each' },
  'red pepper': { min: 1.2, max: 2.8, average: 1.8, unit: 'each' },
  'green pepper': { min: 0.8, max: 1.8, average: 1.2, unit: 'each' },
  jalapeño: { min: 0.2, max: 0.5, average: 0.3, unit: 'each' },
  jalapeno: { min: 0.2, max: 0.5, average: 0.3, unit: 'each' },
  serrano: { min: 0.2, max: 0.5, average: 0.3, unit: 'each' },
  habanero: { min: 0.4, max: 0.8, average: 0.6, unit: 'each' },
  'chili pepper': { min: 0.3, max: 0.6, average: 0.4, unit: 'each' },
  lettuce: { min: 1.5, max: 3.5, average: 2.3, unit: 'head' },
  romaine: { min: 2.5, max: 4.5, average: 3.3, unit: 'head' },
  'iceberg lettuce': { min: 1.5, max: 3.0, average: 2.0, unit: 'head' },
  arugula: { min: 3.0, max: 5.0, average: 4.0, unit: 'package', bulkGrams: 142 },
  kale: { min: 2.0, max: 3.5, average: 2.7, unit: 'bunch' },
  spinach: { min: 2.5, max: 4.5, average: 3.3, unit: 'package', bulkGrams: 142 },
  cabbage: { min: 1.5, max: 3.5, average: 2.3, unit: 'head' },
  'red cabbage': { min: 2.0, max: 4.0, average: 2.8, unit: 'head' },
  'napa cabbage': { min: 2.0, max: 4.5, average: 3.0, unit: 'head' },
  'bok choy': { min: 1.5, max: 3.5, average: 2.5, unit: 'lb' },
  carrot: { min: 0.2, max: 0.5, average: 0.3, unit: 'each' },
  carrots: { min: 1.0, max: 2.5, average: 1.6, unit: 'lb' },
  celery: { min: 1.5, max: 3.0, average: 2.2, unit: 'bunch' },
  potato: { min: 0.4, max: 0.9, average: 0.6, unit: 'each' },
  potatoes: { min: 0.8, max: 2.0, average: 1.3, unit: 'lb' },
  'sweet potato': { min: 0.8, max: 1.5, average: 1.1, unit: 'each' },
  'sweet potatoes': { min: 1.5, max: 2.8, average: 2.0, unit: 'lb' },
  'russet potato': { min: 0.5, max: 1.0, average: 0.7, unit: 'each' },
  'red potato': { min: 0.4, max: 0.9, average: 0.6, unit: 'each' },
  yam: { min: 1.0, max: 2.0, average: 1.4, unit: 'lb' },
  mushroom: { min: 3.0, max: 6.0, average: 4.5, unit: 'lb' },
  mushrooms: { min: 3.0, max: 6.0, average: 4.5, unit: 'lb' },
  'shiitake mushrooms': { min: 7.0, max: 12.0, average: 9.0, unit: 'lb' },
  'portobello mushrooms': { min: 4.5, max: 8.0, average: 6.0, unit: 'lb' },
  broccoli: { min: 1.5, max: 3.0, average: 2.2, unit: 'head' },
  cauliflower: { min: 2.0, max: 4.5, average: 3.0, unit: 'head' },
  cucumber: { min: 0.7, max: 1.5, average: 1.0, unit: 'each' },
  zucchini: { min: 1.0, max: 2.5, average: 1.6, unit: 'lb' },
  squash: { min: 1.0, max: 2.5, average: 1.6, unit: 'lb' },
  'butternut squash': { min: 1.5, max: 3.0, average: 2.0, unit: 'lb' },
  'spaghetti squash': { min: 1.5, max: 3.0, average: 2.0, unit: 'lb' },
  pumpkin: { min: 0.5, max: 1.2, average: 0.8, unit: 'lb' },
  eggplant: { min: 1.5, max: 3.5, average: 2.3, unit: 'lb' },
  asparagus: { min: 3.5, max: 6.5, average: 4.8, unit: 'lb' },
  'green beans': { min: 2.0, max: 4.0, average: 2.8, unit: 'lb' },
  peas: { min: 2.0, max: 4.0, average: 2.8, unit: 'lb' },
  corn: { min: 0.4, max: 1.0, average: 0.6, unit: 'each' },
  'corn on the cob': { min: 0.4, max: 1.0, average: 0.6, unit: 'each' },
  'frozen corn': { min: 1.5, max: 3.0, average: 2.2, unit: 'package', bulkGrams: 454 },
  okra: { min: 2.5, max: 4.5, average: 3.3, unit: 'lb' },
  artichoke: { min: 2.0, max: 3.5, average: 2.7, unit: 'each' },
  beet: { min: 1.5, max: 3.0, average: 2.2, unit: 'lb' },
  beets: { min: 1.5, max: 3.0, average: 2.2, unit: 'lb' },
  radish: { min: 1.5, max: 3.0, average: 2.2, unit: 'bunch' },
  turnip: { min: 1.0, max: 2.5, average: 1.6, unit: 'lb' },
  parsnip: { min: 2.0, max: 3.5, average: 2.7, unit: 'lb' },
  leek: { min: 1.5, max: 3.0, average: 2.2, unit: 'each' },
  fennel: { min: 2.0, max: 4.0, average: 2.8, unit: 'each' },
  avocado: { min: 1.0, max: 2.5, average: 1.6, unit: 'each' },
  avocados: { min: 1.0, max: 2.5, average: 1.6, unit: 'each' },

  // ─── Fruit ──
  apple: { min: 0.5, max: 1.5, average: 0.9, unit: 'each' },
  apples: { min: 1.5, max: 3.5, average: 2.3, unit: 'lb' },
  banana: { min: 0.2, max: 0.4, average: 0.3, unit: 'each' },
  bananas: { min: 0.4, max: 0.8, average: 0.6, unit: 'lb' },
  orange: { min: 0.5, max: 1.2, average: 0.8, unit: 'each' },
  oranges: { min: 1.5, max: 3.0, average: 2.0, unit: 'lb' },
  lemon: { min: 0.5, max: 1.0, average: 0.7, unit: 'each' },
  lemons: { min: 1.5, max: 3.0, average: 2.0, unit: 'lb' },
  lime: { min: 0.3, max: 0.7, average: 0.5, unit: 'each' },
  limes: { min: 1.5, max: 3.0, average: 2.0, unit: 'lb' },
  grapefruit: { min: 1.0, max: 2.0, average: 1.4, unit: 'each' },
  strawberries: { min: 3.0, max: 6.0, average: 4.5, unit: 'lb' },
  blueberries: { min: 3.5, max: 6.5, average: 5.0, unit: 'lb' },
  raspberries: { min: 4.5, max: 7.5, average: 6.0, unit: 'lb' },
  blackberries: { min: 4.0, max: 7.0, average: 5.5, unit: 'lb' },
  grapes: { min: 2.0, max: 4.5, average: 3.0, unit: 'lb' },
  pineapple: { min: 3.0, max: 6.0, average: 4.5, unit: 'each' },
  mango: { min: 1.0, max: 2.5, average: 1.6, unit: 'each' },
  papaya: { min: 2.5, max: 5.0, average: 3.5, unit: 'each' },
  pear: { min: 0.7, max: 1.6, average: 1.1, unit: 'each' },
  peach: { min: 0.6, max: 1.4, average: 1.0, unit: 'each' },
  plum: { min: 0.5, max: 1.2, average: 0.8, unit: 'each' },
  cherry: { min: 4.5, max: 8.0, average: 6.0, unit: 'lb' },
  cherries: { min: 4.5, max: 8.0, average: 6.0, unit: 'lb' },
  watermelon: { min: 4.0, max: 8.0, average: 6.0, unit: 'each' },
  cantaloupe: { min: 3.0, max: 5.5, average: 4.0, unit: 'each' },
  kiwi: { min: 0.5, max: 1.0, average: 0.7, unit: 'each' },
  pomegranate: { min: 2.5, max: 4.5, average: 3.3, unit: 'each' },
  coconut: { min: 3.0, max: 5.0, average: 4.0, unit: 'each' },
  raisins: { min: 2.5, max: 4.5, average: 3.3, unit: 'package', bulkGrams: 454 },
  dates: { min: 4.5, max: 8.0, average: 6.0, unit: 'package', bulkGrams: 227 },

  // ─── Dairy ──
  milk: { min: 3.0, max: 5.5, average: 4.0, unit: 'gallon', bulkGrams: 3900 },
  'whole milk': { min: 3.5, max: 6.0, average: 4.5, unit: 'gallon', bulkGrams: 3900 },
  'skim milk': { min: 3.0, max: 5.5, average: 4.0, unit: 'gallon', bulkGrams: 3900 },
  'almond milk': { min: 3.5, max: 5.5, average: 4.3, unit: 'container', bulkGrams: 1900 },
  'oat milk': { min: 4.0, max: 6.0, average: 4.8, unit: 'container', bulkGrams: 1900 },
  'soy milk': { min: 3.5, max: 5.5, average: 4.3, unit: 'container', bulkGrams: 1900 },
  'coconut milk': { min: 1.5, max: 3.5, average: 2.3, unit: 'can', bulkGrams: 400 },
  'heavy cream': { min: 4.0, max: 7.0, average: 5.3, unit: 'container', bulkGrams: 473 },
  'half and half': { min: 3.5, max: 5.5, average: 4.3, unit: 'container', bulkGrams: 946 },
  cheese: { min: 4.5, max: 9.0, average: 6.5, unit: 'lb' },
  'cheddar cheese': { min: 4.5, max: 8.5, average: 6.3, unit: 'lb' },
  'mozzarella cheese': { min: 4.5, max: 8.5, average: 6.3, unit: 'lb' },
  'parmesan cheese': { min: 12.0, max: 22.0, average: 16.0, unit: 'lb' },
  'feta cheese': { min: 6.5, max: 11.0, average: 8.5, unit: 'lb' },
  'goat cheese': { min: 8.0, max: 14.0, average: 10.5, unit: 'lb' },
  'cream cheese': { min: 3.0, max: 5.5, average: 4.0, unit: 'package', bulkGrams: 227 },
  ricotta: { min: 4.5, max: 7.0, average: 5.5, unit: 'container', bulkGrams: 425 },
  'cottage cheese': { min: 3.0, max: 5.5, average: 4.0, unit: 'container', bulkGrams: 454 },
  butter: { min: 4.5, max: 7.5, average: 5.5, unit: 'lb' },
  'unsalted butter': { min: 4.5, max: 7.5, average: 5.5, unit: 'lb' },
  yogurt: { min: 3.5, max: 6.5, average: 4.8, unit: 'container', bulkGrams: 907 },
  'greek yogurt': { min: 4.0, max: 7.5, average: 5.5, unit: 'container', bulkGrams: 907 },
  'sour cream': { min: 2.5, max: 4.5, average: 3.3, unit: 'container', bulkGrams: 454 },

  // ─── Grains & Pantry ──
  rice: { min: 1.5, max: 3.5, average: 2.3, unit: 'lb' },
  'white rice': { min: 1.0, max: 2.5, average: 1.6, unit: 'lb' },
  'brown rice': { min: 1.5, max: 3.5, average: 2.3, unit: 'lb' },
  'jasmine rice': { min: 2.0, max: 4.0, average: 2.8, unit: 'lb' },
  'basmati rice': { min: 2.5, max: 4.5, average: 3.3, unit: 'lb' },
  'wild rice': { min: 5.0, max: 8.5, average: 6.5, unit: 'lb' },
  pasta: { min: 1.5, max: 3.5, average: 2.3, unit: 'lb' },
  spaghetti: { min: 1.5, max: 3.0, average: 2.0, unit: 'lb' },
  penne: { min: 1.5, max: 3.0, average: 2.0, unit: 'lb' },
  fettuccine: { min: 1.5, max: 3.5, average: 2.3, unit: 'lb' },
  lasagna: { min: 2.0, max: 4.0, average: 2.8, unit: 'lb' },
  noodles: { min: 1.5, max: 3.5, average: 2.3, unit: 'lb' },
  flour: { min: 0.7, max: 1.8, average: 1.0, unit: 'lb' },
  'all-purpose flour': { min: 0.7, max: 1.8, average: 1.0, unit: 'lb' },
  'whole wheat flour': { min: 1.5, max: 3.0, average: 2.0, unit: 'lb' },
  'almond flour': { min: 8.0, max: 14.0, average: 10.5, unit: 'lb' },
  'coconut flour': { min: 6.0, max: 10.0, average: 7.5, unit: 'lb' },
  'bread flour': { min: 1.0, max: 2.5, average: 1.6, unit: 'lb' },
  cornmeal: { min: 1.5, max: 3.0, average: 2.0, unit: 'lb' },
  cornstarch: { min: 2.5, max: 4.5, average: 3.3, unit: 'package', bulkGrams: 454 },
  sugar: { min: 0.7, max: 1.8, average: 1.1, unit: 'lb' },
  'brown sugar': { min: 1.5, max: 3.0, average: 2.0, unit: 'lb' },
  'powdered sugar': { min: 2.0, max: 3.5, average: 2.7, unit: 'lb' },
  honey: { min: 6.0, max: 12.0, average: 8.5, unit: 'container', bulkGrams: 680 },
  'maple syrup': { min: 8.0, max: 16.0, average: 11.0, unit: 'bottle', bulkGrams: 354 },
  'agave nectar': { min: 5.0, max: 9.0, average: 6.8, unit: 'bottle', bulkGrams: 330 },
  oats: { min: 2.5, max: 5.0, average: 3.5, unit: 'package', bulkGrams: 794 },
  'rolled oats': { min: 2.5, max: 5.0, average: 3.5, unit: 'package', bulkGrams: 794 },
  'steel-cut oats': { min: 4.0, max: 7.0, average: 5.3, unit: 'package', bulkGrams: 680 },
  quinoa: { min: 4.0, max: 7.5, average: 5.5, unit: 'lb' },
  barley: { min: 1.5, max: 3.0, average: 2.2, unit: 'lb' },
  bulgur: { min: 2.5, max: 4.5, average: 3.3, unit: 'lb' },
  farro: { min: 4.0, max: 7.0, average: 5.3, unit: 'lb' },
  couscous: { min: 3.0, max: 5.5, average: 4.0, unit: 'lb' },
  bread: { min: 3.0, max: 6.5, average: 4.5, unit: 'loaf' },
  'sourdough bread': { min: 4.5, max: 8.0, average: 6.0, unit: 'loaf' },
  'whole wheat bread': { min: 3.5, max: 6.5, average: 4.8, unit: 'loaf' },
  'pita bread': { min: 2.5, max: 4.5, average: 3.3, unit: 'package', bulkGrams: 340 },
  tortilla: { min: 3.0, max: 5.5, average: 4.0, unit: 'package', bulkGrams: 454 },
  tortillas: { min: 3.0, max: 5.5, average: 4.0, unit: 'package', bulkGrams: 454 },
  'corn tortillas': { min: 2.5, max: 4.5, average: 3.3, unit: 'package', bulkGrams: 454 },
  'flour tortillas': { min: 3.0, max: 5.5, average: 4.0, unit: 'package', bulkGrams: 454 },
  bagel: { min: 0.7, max: 1.5, average: 1.0, unit: 'each' },
  bagels: { min: 4.0, max: 7.0, average: 5.3, unit: 'package', bulkGrams: 567 },
  cereal: { min: 3.5, max: 6.5, average: 4.8, unit: 'package', bulkGrams: 454 },
  granola: { min: 4.5, max: 8.0, average: 6.0, unit: 'package', bulkGrams: 340 },

  // ─── Beans & legumes ──
  'black beans': { min: 1.0, max: 2.5, average: 1.6, unit: 'can', bulkGrams: 425 },
  'kidney beans': { min: 1.0, max: 2.5, average: 1.6, unit: 'can', bulkGrams: 425 },
  'pinto beans': { min: 1.0, max: 2.5, average: 1.6, unit: 'can', bulkGrams: 425 },
  'navy beans': { min: 1.0, max: 2.5, average: 1.6, unit: 'can', bulkGrams: 425 },
  'cannellini beans': { min: 1.5, max: 3.0, average: 2.0, unit: 'can', bulkGrams: 425 },
  'garbanzo beans': { min: 1.0, max: 2.5, average: 1.6, unit: 'can', bulkGrams: 425 },
  chickpeas: { min: 1.0, max: 2.5, average: 1.6, unit: 'can', bulkGrams: 425 },
  lentils: { min: 1.5, max: 3.5, average: 2.3, unit: 'lb' },
  'red lentils': { min: 2.0, max: 4.0, average: 2.8, unit: 'lb' },
  'green lentils': { min: 2.0, max: 4.0, average: 2.8, unit: 'lb' },
  'split peas': { min: 1.5, max: 3.0, average: 2.0, unit: 'lb' },
  edamame: { min: 3.5, max: 6.0, average: 4.5, unit: 'package', bulkGrams: 454 },
  hummus: { min: 3.5, max: 6.5, average: 4.8, unit: 'container', bulkGrams: 283 },

  // ─── Nuts & seeds ──
  almonds: { min: 6.0, max: 11.0, average: 8.0, unit: 'lb' },
  walnuts: { min: 6.5, max: 12.0, average: 9.0, unit: 'lb' },
  pecans: { min: 8.0, max: 14.0, average: 10.5, unit: 'lb' },
  cashews: { min: 7.0, max: 13.0, average: 9.5, unit: 'lb' },
  pistachios: { min: 8.0, max: 14.0, average: 10.5, unit: 'lb' },
  'peanut butter': { min: 3.5, max: 7.0, average: 5.0, unit: 'container', bulkGrams: 454 },
  'almond butter': { min: 7.0, max: 13.0, average: 9.5, unit: 'container', bulkGrams: 454 },
  peanuts: { min: 3.5, max: 6.5, average: 4.8, unit: 'lb' },
  'pine nuts': { min: 14.0, max: 24.0, average: 18.5, unit: 'lb' },
  'pumpkin seeds': { min: 4.0, max: 7.5, average: 5.5, unit: 'lb' },
  'sunflower seeds': { min: 2.5, max: 4.5, average: 3.3, unit: 'lb' },
  'sesame seeds': { min: 4.0, max: 7.0, average: 5.3, unit: 'package', bulkGrams: 227 },
  'chia seeds': { min: 5.0, max: 9.0, average: 6.8, unit: 'package', bulkGrams: 340 },
  'flax seeds': { min: 3.5, max: 6.5, average: 4.8, unit: 'package', bulkGrams: 454 },
  'hemp seeds': { min: 8.0, max: 14.0, average: 10.5, unit: 'package', bulkGrams: 340 },

  // ─── Oils & vinegars ──
  'olive oil': { min: 7.0, max: 14.0, average: 9.5, unit: 'bottle', bulkGrams: 460 },
  'extra virgin olive oil': { min: 9.0, max: 18.0, average: 12.5, unit: 'bottle', bulkGrams: 460 },
  'vegetable oil': { min: 3.0, max: 6.0, average: 4.3, unit: 'bottle', bulkGrams: 880 },
  'canola oil': { min: 3.0, max: 6.0, average: 4.3, unit: 'bottle', bulkGrams: 880 },
  'avocado oil': { min: 8.0, max: 14.0, average: 10.5, unit: 'bottle', bulkGrams: 460 },
  'coconut oil': { min: 6.0, max: 11.0, average: 8.0, unit: 'container', bulkGrams: 414 },
  'sesame oil': { min: 5.0, max: 9.0, average: 6.8, unit: 'bottle', bulkGrams: 230 },
  oil: { min: 5.0, max: 9.0, average: 6.8, unit: 'bottle', bulkGrams: 460 },
  vinegar: { min: 2.5, max: 5.0, average: 3.5, unit: 'bottle', bulkGrams: 473 },
  'apple cider vinegar': { min: 3.0, max: 6.0, average: 4.3, unit: 'bottle', bulkGrams: 473 },
  'balsamic vinegar': { min: 4.5, max: 9.0, average: 6.5, unit: 'bottle', bulkGrams: 473 },
  'red wine vinegar': { min: 3.5, max: 6.5, average: 4.8, unit: 'bottle', bulkGrams: 473 },
  'rice vinegar': { min: 3.0, max: 6.0, average: 4.3, unit: 'bottle', bulkGrams: 354 },

  // ─── Condiments & sauces ──
  'soy sauce': { min: 3.0, max: 6.0, average: 4.3, unit: 'bottle', bulkGrams: 296 },
  'tamari sauce': { min: 4.5, max: 8.0, average: 6.0, unit: 'bottle', bulkGrams: 296 },
  'fish sauce': { min: 4.0, max: 7.0, average: 5.3, unit: 'bottle', bulkGrams: 354 },
  'oyster sauce': { min: 3.5, max: 6.5, average: 4.8, unit: 'bottle', bulkGrams: 510 },
  'hoisin sauce': { min: 3.5, max: 6.5, average: 4.8, unit: 'bottle', bulkGrams: 240 },
  'sriracha sauce': { min: 4.0, max: 7.0, average: 5.3, unit: 'bottle', bulkGrams: 482 },
  'hot sauce': { min: 3.0, max: 6.0, average: 4.3, unit: 'bottle', bulkGrams: 148 },
  'tomato sauce': { min: 1.0, max: 2.5, average: 1.6, unit: 'can', bulkGrams: 425 },
  'tomato paste': { min: 0.8, max: 2.0, average: 1.3, unit: 'can', bulkGrams: 170 },
  'pasta sauce': { min: 2.5, max: 5.5, average: 3.8, unit: 'bottle', bulkGrams: 680 },
  'marinara sauce': { min: 2.5, max: 5.5, average: 3.8, unit: 'bottle', bulkGrams: 680 },
  ketchup: { min: 2.5, max: 5.0, average: 3.5, unit: 'bottle', bulkGrams: 567 },
  mustard: { min: 2.0, max: 4.0, average: 2.8, unit: 'bottle', bulkGrams: 312 },
  mayonnaise: { min: 3.5, max: 6.5, average: 4.8, unit: 'container', bulkGrams: 887 },
  'salad dressing': { min: 2.5, max: 5.5, average: 3.8, unit: 'bottle', bulkGrams: 473 },
  pesto: { min: 4.5, max: 8.0, average: 6.0, unit: 'container', bulkGrams: 198 },
  salsa: { min: 3.0, max: 6.0, average: 4.3, unit: 'bottle', bulkGrams: 454 },
  'worcestershire sauce': { min: 3.0, max: 5.5, average: 4.0, unit: 'bottle', bulkGrams: 296 },
  'bbq sauce': { min: 2.5, max: 5.0, average: 3.5, unit: 'bottle', bulkGrams: 510 },
  'teriyaki sauce': { min: 3.5, max: 6.0, average: 4.5, unit: 'bottle', bulkGrams: 296 },
  'curry paste': { min: 4.0, max: 7.0, average: 5.3, unit: 'container', bulkGrams: 113 },

  // ─── Spices & herbs ──
  salt: { min: 0.8, max: 2.5, average: 1.5, unit: 'container', bulkGrams: 737 },
  'sea salt': { min: 2.5, max: 5.5, average: 3.8, unit: 'container', bulkGrams: 454 },
  'black pepper': { min: 3.5, max: 7.0, average: 5.0, unit: 'container', bulkGrams: 113 },
  pepper: { min: 3.5, max: 7.0, average: 5.0, unit: 'container', bulkGrams: 113 },
  paprika: { min: 3.0, max: 6.0, average: 4.3, unit: 'container', bulkGrams: 65 },
  'smoked paprika': { min: 4.0, max: 7.5, average: 5.5, unit: 'container', bulkGrams: 65 },
  cumin: { min: 3.0, max: 6.5, average: 4.3, unit: 'container', bulkGrams: 65 },
  coriander: { min: 3.0, max: 6.0, average: 4.3, unit: 'container', bulkGrams: 65 },
  turmeric: { min: 3.5, max: 7.0, average: 5.0, unit: 'container', bulkGrams: 65 },
  cinnamon: { min: 3.0, max: 6.5, average: 4.3, unit: 'container', bulkGrams: 65 },
  nutmeg: { min: 4.0, max: 8.0, average: 5.5, unit: 'container', bulkGrams: 50 },
  'chili powder': { min: 3.0, max: 6.0, average: 4.3, unit: 'container', bulkGrams: 65 },
  oregano: { min: 3.0, max: 6.0, average: 4.3, unit: 'container', bulkGrams: 30 },
  basil: { min: 2.5, max: 5.0, average: 3.5, unit: 'bunch' },
  'dried basil': { min: 3.0, max: 6.0, average: 4.3, unit: 'container', bulkGrams: 30 },
  cilantro: { min: 1.0, max: 2.5, average: 1.6, unit: 'bunch' },
  parsley: { min: 1.5, max: 3.0, average: 2.0, unit: 'bunch' },
  thyme: { min: 2.0, max: 4.0, average: 2.8, unit: 'bunch' },
  rosemary: { min: 2.0, max: 4.0, average: 2.8, unit: 'bunch' },
  sage: { min: 2.0, max: 4.0, average: 2.8, unit: 'bunch' },
  mint: { min: 1.5, max: 3.5, average: 2.3, unit: 'bunch' },
  dill: { min: 1.5, max: 3.0, average: 2.0, unit: 'bunch' },
  bay: { min: 3.5, max: 6.5, average: 4.8, unit: 'container', bulkGrams: 30 },
  'bay leaves': { min: 3.5, max: 6.5, average: 4.8, unit: 'container', bulkGrams: 30 },
  'red pepper flakes': { min: 3.0, max: 5.5, average: 4.0, unit: 'container', bulkGrams: 30 },
  'garlic powder': { min: 2.5, max: 5.5, average: 3.8, unit: 'container', bulkGrams: 95 },
  'onion powder': { min: 2.5, max: 5.5, average: 3.8, unit: 'container', bulkGrams: 95 },
  'italian seasoning': { min: 3.0, max: 6.0, average: 4.3, unit: 'container', bulkGrams: 30 },
  'taco seasoning': { min: 1.5, max: 3.5, average: 2.3, unit: 'package', bulkGrams: 28 },
  'cajun seasoning': { min: 3.5, max: 6.5, average: 4.8, unit: 'container', bulkGrams: 95 },
  'garam masala': { min: 4.0, max: 7.5, average: 5.5, unit: 'container', bulkGrams: 65 },

  // ─── Baking ──
  'baking powder': { min: 2.0, max: 4.0, average: 2.8, unit: 'container', bulkGrams: 227 },
  'baking soda': { min: 1.0, max: 2.5, average: 1.6, unit: 'container', bulkGrams: 454 },
  yeast: { min: 3.0, max: 5.5, average: 4.0, unit: 'package', bulkGrams: 28 },
  'active dry yeast': { min: 3.0, max: 5.5, average: 4.0, unit: 'package', bulkGrams: 28 },
  'vanilla extract': { min: 5.0, max: 12.0, average: 8.0, unit: 'bottle', bulkGrams: 59 },
  'almond extract': { min: 4.5, max: 9.0, average: 6.5, unit: 'bottle', bulkGrams: 59 },
  cocoa: { min: 3.5, max: 7.0, average: 5.0, unit: 'container', bulkGrams: 227 },
  'cocoa powder': { min: 3.5, max: 7.0, average: 5.0, unit: 'container', bulkGrams: 227 },
  'chocolate chips': { min: 3.5, max: 6.5, average: 4.8, unit: 'package', bulkGrams: 340 },
  'dark chocolate': { min: 4.0, max: 8.0, average: 5.8, unit: 'package', bulkGrams: 100 },
  'milk chocolate': { min: 3.0, max: 6.5, average: 4.5, unit: 'package', bulkGrams: 100 },
  'white chocolate': { min: 3.5, max: 7.0, average: 5.0, unit: 'package', bulkGrams: 100 },
  marshmallows: { min: 2.0, max: 4.0, average: 2.8, unit: 'package', bulkGrams: 283 },
  'graham crackers': { min: 3.0, max: 5.5, average: 4.0, unit: 'package', bulkGrams: 408 },
  'condensed milk': { min: 2.5, max: 4.5, average: 3.3, unit: 'can', bulkGrams: 397 },
  'evaporated milk': { min: 1.5, max: 3.0, average: 2.0, unit: 'can', bulkGrams: 354 },

  // ─── Frozen ──
  'frozen peas': { min: 1.5, max: 3.0, average: 2.2, unit: 'package', bulkGrams: 454 },
  'frozen broccoli': { min: 2.0, max: 4.0, average: 2.8, unit: 'package', bulkGrams: 454 },
  'frozen spinach': { min: 1.5, max: 3.0, average: 2.2, unit: 'package', bulkGrams: 283 },
  'frozen berries': { min: 4.0, max: 7.5, average: 5.5, unit: 'package', bulkGrams: 454 },
  'frozen pizza': { min: 4.0, max: 9.0, average: 6.0, unit: 'each' },
  'ice cream': { min: 3.5, max: 7.5, average: 5.3, unit: 'container', bulkGrams: 1420 },

  // ─── Snacks & misc ──
  crackers: { min: 3.0, max: 6.5, average: 4.5, unit: 'package', bulkGrams: 340 },
  chips: { min: 3.5, max: 6.5, average: 4.8, unit: 'package', bulkGrams: 283 },
  popcorn: { min: 2.5, max: 5.5, average: 3.8, unit: 'package', bulkGrams: 397 },
  pretzels: { min: 3.0, max: 5.5, average: 4.0, unit: 'package', bulkGrams: 454 },
  'protein powder': { min: 25.0, max: 55.0, average: 35.0, unit: 'container', bulkGrams: 907 },
  'protein bar': { min: 1.5, max: 3.5, average: 2.3, unit: 'each' },

  // ─── Broths & stocks ──
  'chicken broth': { min: 2.5, max: 4.5, average: 3.3, unit: 'container', bulkGrams: 946 },
  'beef broth': { min: 2.5, max: 4.5, average: 3.3, unit: 'container', bulkGrams: 946 },
  'vegetable broth': { min: 2.5, max: 4.5, average: 3.3, unit: 'container', bulkGrams: 946 },
  'bone broth': { min: 5.5, max: 10.0, average: 7.5, unit: 'container', bulkGrams: 946 },

  // ─── Beverages ──
  water: { min: 1.0, max: 3.0, average: 1.8, unit: 'gallon', bulkGrams: 3785 },
  juice: { min: 3.0, max: 6.0, average: 4.3, unit: 'container', bulkGrams: 1900 },
  'orange juice': { min: 3.5, max: 6.5, average: 4.8, unit: 'container', bulkGrams: 1900 },
  'apple juice': { min: 3.0, max: 6.0, average: 4.3, unit: 'container', bulkGrams: 1900 },
  coffee: { min: 8.0, max: 18.0, average: 12.0, unit: 'package', bulkGrams: 340 },
  tea: { min: 4.0, max: 9.0, average: 6.0, unit: 'package', bulkGrams: 100 },
  wine: { min: 8.0, max: 25.0, average: 14.0, unit: 'bottle', bulkGrams: 750 },

  // ─── Misc canned ──
  'diced tomatoes': { min: 1.0, max: 2.5, average: 1.6, unit: 'can', bulkGrams: 411 },
  'crushed tomatoes': { min: 1.5, max: 3.0, average: 2.0, unit: 'can', bulkGrams: 794 },
  'whole tomatoes': { min: 1.5, max: 3.0, average: 2.0, unit: 'can', bulkGrams: 794 },
  'tuna can': { min: 1.5, max: 3.5, average: 2.3, unit: 'can', bulkGrams: 142 },
  'canned tuna': { min: 1.5, max: 3.5, average: 2.3, unit: 'can', bulkGrams: 142 },
  'canned salmon': { min: 3.5, max: 6.5, average: 4.8, unit: 'can', bulkGrams: 213 },
  olives: { min: 3.5, max: 6.5, average: 4.8, unit: 'container', bulkGrams: 200 },
  capers: { min: 3.0, max: 6.0, average: 4.3, unit: 'container', bulkGrams: 100 },
  pickles: { min: 3.0, max: 5.5, average: 4.0, unit: 'container', bulkGrams: 680 },
  'sauerkraut': { min: 3.0, max: 5.5, average: 4.0, unit: 'container', bulkGrams: 454 },
  kimchi: { min: 5.0, max: 9.0, average: 6.8, unit: 'container', bulkGrams: 454 },
};

// ─── Category fallbacks (NOT flat $7) ─────────────────────────────────
// Tier defaults per major grocery category. Used when the price table
// has no match. Each tier returns an explicit `category` source so callers
// can flag the estimate as lower-confidence.
interface CategoryEstimate {
  costPerUnit: number;
  unit: 'lb' | 'each' | 'container';
}

function categoryEstimate(name: string): CategoryEstimate | null {
  const n = name.toLowerCase();

  if (/(beef|pork|chicken|turkey|lamb|duck|venison|bison|wagyu|brisket|picanha|ribeye|sirloin|chuck|tenderloin|carnitas|pancetta|prosciutto|chorizo|sausage)/.test(n)) {
    return { costPerUnit: 7.5, unit: 'lb' };
  }
  if (/(salmon|tuna|cod|tilapia|halibut|mackerel|sardine|anchovy|trout|bass|snapper|fish|shrimp|prawn|crab|lobster|scallop|squid|octopus|mussel|clam|oyster)/.test(n)) {
    return { costPerUnit: 10.0, unit: 'lb' };
  }
  if (/(cheese|yogurt|milk|butter|cream|kefir|whey|cottage|ricotta|mascarpone)/.test(n)) {
    return { costPerUnit: 5.5, unit: 'lb' };
  }
  if (/(berry|berries|apple|banana|orange|melon|peach|pear|plum|cherry|grape|kiwi|fig|pineapple|mango|papaya|fruit|citrus|lime|lemon)/.test(n)) {
    return { costPerUnit: 2.8, unit: 'lb' };
  }
  if (/(pepper|broccoli|cauliflower|kale|spinach|lettuce|cabbage|carrot|celery|leek|fennel|asparagus|squash|zucchini|cucumber|tomato|onion|garlic|shallot|mushroom|bean|pea|corn|potato|yam|turnip|beet|radish|sprout|chard|romanesco|kohlrabi|bok|veg|greens?|herb|leaf)/.test(n)) {
    return { costPerUnit: 2.5, unit: 'lb' };
  }
  if (/(rice|pasta|noodle|grain|wheat|barley|oat|quinoa|farro|millet|bulgur|couscous|cereal|granola|bread|tortilla|pita|bagel|cracker|muffin|cake|cookie|biscuit|flour)/.test(n)) {
    return { costPerUnit: 2.5, unit: 'lb' };
  }
  if (/(bean|lentil|chickpea|legume|tofu|tempeh|seitan|edamame|hummus|nut|seed|almond|cashew|walnut|pecan|pistachio|peanut|hazelnut|macadamia)/.test(n)) {
    return { costPerUnit: 5.0, unit: 'lb' };
  }
  if (/(oil|vinegar|sauce|paste|dressing|mayo|ketchup|mustard|salsa|syrup|honey|jam|jelly|preserve|spread|butter)/.test(n)) {
    return { costPerUnit: 4.5, unit: 'container' };
  }
  if (/(spice|seasoning|extract|powder|salt|pepper|chili|paprika|cumin|cinnamon|nutmeg|herb|leaves?|sprinkle|rub)/.test(n)) {
    return { costPerUnit: 4.0, unit: 'container' };
  }
  if (/(beverage|drink|juice|coffee|tea|soda|wine|beer|spirit|cocktail|smoothie|lemonade|water)/.test(n)) {
    return { costPerUnit: 4.0, unit: 'container' };
  }
  if (/(snack|chip|popcorn|pretzel|bar|candy|chocolate|dessert|ice cream|frozen yogurt)/.test(n)) {
    return { costPerUnit: 4.5, unit: 'container' };
  }

  return null;
}

// ─── Lookup priced entry ──────────────────────────────────────────────
function lookupPriced(name: string): { entry: PriceEntry; key: string } | null {
  const n = name.toLowerCase().trim();
  if (PRICE_TABLE[n]) return { entry: PRICE_TABLE[n], key: n };

  // Try multi-word descending substring match (longer keys first to prefer specificity)
  const keys = Object.keys(PRICE_TABLE).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (n.includes(key)) return { entry: PRICE_TABLE[key], key };
  }
  return null;
}

// ─── Cost the ingredient ──────────────────────────────────────────────
const PRICED_UNITS_AS_GRAMS: Record<string, number> = {
  lb: 453.59, // priced unit "lb" → 1 unit = 453.59g
};

export function costForIngredient(input: IngredientInput): IngredientCostResult {
  const { name, quantity, unit } = input;
  const u = unit.toLowerCase().trim();
  const priced = lookupPriced(name);

  if (priced) {
    const { entry, key } = priced;
    const grams = toGrams(quantity, u, name);

    // Case 1: priced by piece-style unit (each, head, bunch, can, etc.)
    if (entry.unit === 'each' || entry.unit === 'clove' || entry.unit === 'head' || entry.unit === 'bunch' || entry.unit === 'package' || entry.unit === 'can' || entry.unit === 'container' || entry.unit === 'bottle' || entry.unit === 'dozen' || entry.unit === 'gallon' || entry.unit === 'loaf') {
      // If the consumer asks in the same unit (or a count synonym), price 1:1.
      if (u === entry.unit || (COUNT_UNITS.has(u) && u !== 'oz')) {
        return { cost: round2(quantity * entry.average), source: FALLBACK_REASONS.PRICED, matchedKey: key };
      }
      // Otherwise convert grams → fraction-of-bulk
      if (!Number.isNaN(grams) && entry.bulkGrams) {
        const fraction = grams / entry.bulkGrams;
        return {
          cost: round2(fraction * entry.average),
          source: FALLBACK_REASONS.PRICED,
          matchedKey: key,
          grams,
        };
      }
      // Fallback: assume 1 unit
      return { cost: round2(quantity * entry.average), source: FALLBACK_REASONS.PRICED, matchedKey: key };
    }

    // Case 2: priced by lb (mass)
    if (entry.unit === 'lb') {
      if (!Number.isNaN(grams)) {
        const lb = grams / PRICED_UNITS_AS_GRAMS.lb;
        return { cost: round2(lb * entry.average), source: FALLBACK_REASONS.PRICED, matchedKey: key, grams };
      }
      // count unit — fall back to 1 lb assumption
      return { cost: round2(quantity * entry.average), source: FALLBACK_REASONS.PRICED, matchedKey: key };
    }
  }

  // Category fallback
  const cat = categoryEstimate(name);
  if (cat) {
    const grams = toGrams(quantity, u, name);
    if (cat.unit === 'lb' && !Number.isNaN(grams)) {
      const lb = grams / PRICED_UNITS_AS_GRAMS.lb;
      return { cost: round2(lb * cat.costPerUnit), source: FALLBACK_REASONS.CATEGORY, grams };
    }
    return { cost: round2(quantity * cat.costPerUnit), source: FALLBACK_REASONS.CATEGORY };
  }

  // Unknown → tier-default per-unit, NEVER flat $7
  return { cost: round2(quantity * 1.5), source: FALLBACK_REASONS.UNKNOWN };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Recipe-level cost with caching ───────────────────────────────────
export interface RecipeCostInput {
  id: string;
  servings: number;
  ingredients: IngredientInput[];
}

export interface RecipeCostBreakdownLine {
  name: string;
  quantity: number;
  unit: string;
  cost: number;
  source: CostSource;
}

export interface RecipeCostResult {
  estimatedCost: number;
  estimatedCostPerServing: number;
  source: CostSource;
  breakdown: RecipeCostBreakdownLine[];
  fallbackRatio: number;
  cacheHit: boolean;
  cacheKey: string;
}

const cache = new Map<string, RecipeCostResult>();

export function resetCostCache(): void {
  cache.clear();
}

function ingredientHash(ingredients: IngredientInput[]): string {
  const normalized = ingredients
    .map((i) => `${i.name.toLowerCase().trim()}|${i.quantity}|${i.unit.toLowerCase().trim()}`)
    .join('::');
  return crypto.createHash('sha1').update(normalized).digest('hex').slice(0, 16);
}

export function estimateRecipeCost(recipe: RecipeCostInput): RecipeCostResult {
  const key = `${recipe.id}::${recipe.servings}::${ingredientHash(recipe.ingredients)}`;
  const cached = cache.get(key);
  if (cached) {
    return { ...cached, cacheHit: true };
  }

  const breakdown = recipe.ingredients.map((ing) => {
    const r = costForIngredient(ing);
    return { name: ing.name, quantity: ing.quantity, unit: ing.unit, cost: r.cost, source: r.source };
  });

  const totalCost = breakdown.reduce((sum, b) => sum + b.cost, 0);
  const fallbackCount = breakdown.filter((b) => b.source !== FALLBACK_REASONS.PRICED).length;
  const fallbackRatio = recipe.ingredients.length > 0 ? fallbackCount / recipe.ingredients.length : 0;

  const dominantSource: CostSource =
    breakdown.some((b) => b.source === FALLBACK_REASONS.UNKNOWN)
      ? FALLBACK_REASONS.UNKNOWN
      : breakdown.some((b) => b.source === FALLBACK_REASONS.CATEGORY)
        ? FALLBACK_REASONS.CATEGORY
        : FALLBACK_REASONS.PRICED;

  const result: RecipeCostResult = {
    estimatedCost: round2(totalCost),
    estimatedCostPerServing: round2(totalCost / recipe.servings),
    source: dominantSource,
    breakdown,
    fallbackRatio,
    cacheHit: false,
    cacheKey: key,
  };

  cache.set(key, result);
  return result;
}
