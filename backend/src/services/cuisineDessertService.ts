// backend/src/services/cuisineDessertService.ts
// ROADMAP 4.0 F2 — cuisine-specific dessert breakdowns.
//
// Static config of canonical desserts per cuisine, surfaced when:
//   1. The user explicitly searches "{cuisine} dessert"
//   2. A cuisine search returns no results and we fall back to "Lightened
//      Global Desserts" — we use this list to seed the fallback.
//
// Coverage is broader than v1 needs but the table is cheap to maintain.
// Post-launch polish: enumerate by usage data — re-rank categories by
// click-through, retire low-CTR rows.
//
// Voice: discovery-first ("you might love…"), never reductive.

import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';

export interface DessertCategory {
  /** Stable id, used in analytics + URL slugs. */
  id: string;
  /** User-facing name. */
  label: string;
  /** Short flavor description. */
  description: string;
  /** Dominant flavor profile. Drives the pastel tint on the UI card. */
  profile: 'fruit-forward' | 'nutty' | 'spiced' | 'creamy' | 'chocolate' | 'citrus' | 'floral';
}

const DESSERTS_BY_CUISINE: Record<string, DessertCategory[]> = {
  italian: [
    { id: 'tiramisu', label: 'Tiramisu', description: 'Espresso-soaked ladyfingers + mascarpone', profile: 'creamy' },
    { id: 'panna-cotta', label: 'Panna Cotta', description: 'Silky cream pudding, often with berry coulis', profile: 'creamy' },
    { id: 'cannoli', label: 'Cannoli', description: 'Crisp shells with sweet ricotta + chocolate', profile: 'creamy' },
    { id: 'affogato', label: 'Affogato', description: 'Vanilla gelato drowned in hot espresso', profile: 'creamy' },
    { id: 'amaretti', label: 'Amaretti', description: 'Almond cookies, soft or crunchy', profile: 'nutty' },
  ],
  french: [
    { id: 'tarte-tatin', label: 'Tarte Tatin', description: 'Caramelized upside-down apple tart', profile: 'fruit-forward' },
    { id: 'creme-brulee', label: 'Crème Brûlée', description: 'Vanilla custard with a torched sugar top', profile: 'creamy' },
    { id: 'mousse-au-chocolat', label: 'Mousse au Chocolat', description: 'Airy dark chocolate mousse', profile: 'chocolate' },
    { id: 'madeleine', label: 'Madeleines', description: 'Shell-shaped lemon-scented cakes', profile: 'citrus' },
    { id: 'clafoutis', label: 'Clafoutis', description: 'Custardy cherry-studded baked dessert', profile: 'fruit-forward' },
  ],
  mexican: [
    { id: 'flan', label: 'Flan', description: 'Caramel-topped milk custard', profile: 'creamy' },
    { id: 'churros', label: 'Churros', description: 'Cinnamon-sugar fried dough with chocolate dip', profile: 'spiced' },
    { id: 'tres-leches', label: 'Tres Leches', description: 'Three-milk soaked sponge cake', profile: 'creamy' },
    { id: 'arroz-con-leche', label: 'Arroz con Leche', description: 'Cinnamon-laced rice pudding', profile: 'spiced' },
    { id: 'paletas', label: 'Paletas', description: 'Fruit ice pops with chili-lime variants', profile: 'fruit-forward' },
  ],
  japanese: [
    { id: 'mochi', label: 'Mochi', description: 'Chewy rice cakes with red-bean or matcha', profile: 'floral' },
    { id: 'dorayaki', label: 'Dorayaki', description: 'Pancakes filled with sweet azuki bean paste', profile: 'nutty' },
    { id: 'matcha-cake', label: 'Matcha Roll', description: 'Whipped-cream sponge with matcha', profile: 'floral' },
    { id: 'taiyaki', label: 'Taiyaki', description: 'Fish-shaped waffle with custard or red bean', profile: 'creamy' },
    { id: 'kanten', label: 'Kanten Jelly', description: 'Agar-set fruit or matcha jellies', profile: 'fruit-forward' },
  ],
  indian: [
    { id: 'gulab-jamun', label: 'Gulab Jamun', description: 'Milk dumplings in cardamom-rose syrup', profile: 'floral' },
    { id: 'kheer', label: 'Kheer', description: 'Cardamom rice pudding with pistachio', profile: 'spiced' },
    { id: 'kulfi', label: 'Kulfi', description: 'Dense pistachio or saffron ice cream', profile: 'nutty' },
    { id: 'rasmalai', label: 'Rasmalai', description: 'Cheese discs in saffron-cardamom milk', profile: 'creamy' },
    { id: 'jalebi', label: 'Jalebi', description: 'Crispy syrup-soaked spirals', profile: 'spiced' },
  ],
  middle_eastern: [
    { id: 'baklava', label: 'Baklava', description: 'Layered phyllo with pistachio + honey', profile: 'nutty' },
    { id: 'kunafa', label: 'Kunafa', description: 'Cheese in shredded phyllo, drenched in syrup', profile: 'creamy' },
    { id: 'maamoul', label: 'Maamoul', description: 'Date-stuffed semolina cookies', profile: 'fruit-forward' },
    { id: 'basbousa', label: 'Basbousa', description: 'Semolina cake soaked in rosewater syrup', profile: 'floral' },
    { id: 'halva', label: 'Halva', description: 'Sesame-paste sweet, often with pistachio', profile: 'nutty' },
  ],
  chinese: [
    { id: 'mango-pudding', label: 'Mango Pudding', description: 'Silky chilled mango set with gelatin', profile: 'fruit-forward' },
    { id: 'red-bean-soup', label: 'Red Bean Soup', description: 'Warm sweet azuki bean soup', profile: 'nutty' },
    { id: 'egg-tarts', label: 'Egg Tarts', description: 'Flaky shells with set egg custard', profile: 'creamy' },
    { id: 'tang-yuan', label: 'Tang Yuan', description: 'Glutinous rice balls in sweet ginger broth', profile: 'spiced' },
  ],
  thai: [
    { id: 'mango-sticky-rice', label: 'Mango Sticky Rice', description: 'Coconut sticky rice + ripe mango', profile: 'fruit-forward' },
    { id: 'bua-loy', label: 'Bua Loy', description: 'Tapioca dumplings in pandan coconut milk', profile: 'creamy' },
    { id: 'sangkaya', label: 'Sangkaya', description: 'Pandan-coconut custard in pumpkin', profile: 'creamy' },
  ],
  greek: [
    { id: 'galaktoboureko', label: 'Galaktoboureko', description: 'Phyllo-wrapped semolina custard', profile: 'creamy' },
    { id: 'loukoumades', label: 'Loukoumades', description: 'Honey-soaked fried dough puffs', profile: 'spiced' },
    { id: 'revani', label: 'Revani', description: 'Citrus-soaked semolina cake', profile: 'citrus' },
  ],
  korean: [
    { id: 'patbingsu', label: 'Patbingsu', description: 'Shaved ice with red bean + condensed milk', profile: 'creamy' },
    { id: 'hotteok', label: 'Hotteok', description: 'Cinnamon-brown-sugar stuffed pancakes', profile: 'spiced' },
    { id: 'yakgwa', label: 'Yakgwa', description: 'Honey-glazed sesame cookies', profile: 'nutty' },
  ],
  vietnamese: [
    { id: 'che', label: 'Chè', description: 'Sweet bean-and-fruit dessert soup', profile: 'fruit-forward' },
    { id: 'banh-flan', label: 'Bánh Flan', description: 'Coffee-tinged Vietnamese flan', profile: 'creamy' },
  ],
  american: [
    { id: 'pie', label: 'Fruit Pies', description: 'Apple, cherry, blueberry, peach', profile: 'fruit-forward' },
    { id: 'brownies', label: 'Brownies', description: 'Fudgy or cakey, with nuts or chips', profile: 'chocolate' },
    { id: 'cheesecake', label: 'Cheesecake', description: 'Classic NY-style or no-bake', profile: 'creamy' },
    { id: 'cookies', label: 'Drop Cookies', description: 'Chocolate chip, oatmeal, snickerdoodle', profile: 'chocolate' },
  ],
};

const GLOBAL_FALLBACK: DessertCategory[] = [
  { id: 'fruit-baked', label: 'Baked Fruit', description: 'Roasted stone fruit or apples with honey', profile: 'fruit-forward' },
  { id: 'yogurt-honey', label: 'Yogurt + Honey', description: 'Tangy + sweet, drizzled with nuts', profile: 'creamy' },
  { id: 'dark-chocolate-bark', label: 'Dark Chocolate Bark', description: 'With sea salt, nuts, or dried fruit', profile: 'chocolate' },
  { id: 'rice-pudding', label: 'Rice Pudding', description: 'Cardamom or cinnamon, hot or cold', profile: 'spiced' },
  { id: 'citrus-segments', label: 'Citrus + Honey', description: 'Orange, blood orange, grapefruit', profile: 'citrus' },
];

const ALIASES: Record<string, string> = {
  'mediterranean': 'middle_eastern',
  'lebanese': 'middle_eastern',
  'turkish': 'middle_eastern',
  'persian': 'middle_eastern',
  'cantonese': 'chinese',
  'sichuan': 'chinese',
  'taiwanese': 'chinese',
};

export function normalizeCuisineKey(input: string): string {
  if (!input) return '';
  const cleaned = input.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return ALIASES[cleaned] ?? cleaned;
}

export function getCategoriesForCuisine(cuisine: string): {
  cuisine: string;
  matched: boolean;
  categories: DessertCategory[];
} {
  const key = normalizeCuisineKey(cuisine);
  const direct = DESSERTS_BY_CUISINE[key];
  if (direct) {
    return { cuisine: key, matched: true, categories: direct };
  }
  return { cuisine: key, matched: false, categories: GLOBAL_FALLBACK };
}

export interface NoResultsRateRow {
  cuisine: string;
  totalQueries: number;
  noResults: number;
  rate: number;
}

const NO_RESULTS_ACTION = 'no_results';

/**
 * Log a "0 results" outcome for a cuisine search. Reuses the
 * CravingSearchEvent table — recipeId is set to the literal '__none__'
 * sentinel so the existing analytics queries can ignore it.
 */
export async function logCuisineSearchNoResults(
  userId: string,
  cuisine: string,
): Promise<void> {
  if (!cuisine.trim()) return;
  try {
    await prisma.cravingSearchEvent.create({
      data: {
        userId,
        cravingQuery: normalizeCuisineKey(cuisine),
        recipeId: '__none__',
        action: NO_RESULTS_ACTION,
      },
    });
  } catch (err) {
    logger.warn({ err, cuisine }, 'cuisineDessert.logNoResults.failed');
  }
}

/**
 * Per-cuisine no-results rate over the trailing window. Surfaces which
 * cuisines have search demand we're failing to satisfy — when rate > 5%
 * for a cuisine, that's the trigger to enumerate dessert content for it.
 */
export async function getNoResultsRates(daysBack = 14): Promise<NoResultsRateRow[]> {
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  const events = await prisma.cravingSearchEvent.findMany({
    where: { createdAt: { gte: since } },
    select: { cravingQuery: true, action: true },
  });

  const totals = new Map<string, { total: number; noResults: number }>();
  for (const e of events) {
    const key = normalizeCuisineKey(e.cravingQuery);
    const row = totals.get(key) ?? { total: 0, noResults: 0 };
    row.total += 1;
    if (e.action === NO_RESULTS_ACTION) row.noResults += 1;
    totals.set(key, row);
  }

  const rows: NoResultsRateRow[] = [];
  for (const [cuisine, { total, noResults }] of totals) {
    rows.push({
      cuisine,
      totalQueries: total,
      noResults,
      rate: total === 0 ? 0 : noResults / total,
    });
  }
  rows.sort((a, b) => b.rate - a.rate);
  return rows;
}

export const __forTest = {
  DESSERTS_BY_CUISINE,
  GLOBAL_FALLBACK,
  ALIASES,
  NO_RESULTS_ACTION,
};
