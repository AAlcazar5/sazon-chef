// backend/src/config/globalSnacksSeedConfig.ts
// Group 11 Phase 4 — global snacks & macro-friendly desserts seed config.
//
// Targets ~635 snack/dessert recipes across functional categories. Run via
// `npm run seed:ai -- --config snacks`.

export interface SnackCategoryTarget {
  category: string;
  recipeCount: number;
  promptHint: string;
}

export const GLOBAL_SNACKS_SEED: SnackCategoryTarget[] = [
  {
    category: 'Protein Ice Cream & Frozen Treats',
    recipeCount: 60,
    promptHint:
      'Ninja Creami / blender ice cream — Greek yogurt + protein powder + milk + monkfruit/stevia base, with global flavor variations (Thai mango sticky rice, Persian rosewater, Mexican horchata, Japanese matcha, Italian stracciatella).',
  },
  {
    category: 'Protein Mug Cakes & Single-Serve Bakes',
    recipeCount: 50,
    promptHint:
      'Microwave mug cake or single-serve oven bake under 350 cal with ≥25g protein. Global flavors: Persian saffron, Filipino ube, Mexican tres leches, Vietnamese coffee.',
  },
  {
    category: 'Cottage Cheese / Greek Yogurt Bowls',
    recipeCount: 45,
    promptHint:
      'High-protein savory or sweet bowl built around cottage cheese or Greek yogurt. Toppings drawn from global cuisines (labneh + zaatar, ricotta + honey + nuts, skyr + berries + cardamom).',
  },
  {
    category: 'Protein Pancakes & Waffles',
    recipeCount: 35,
    promptHint:
      'Single-serve pancake/waffle ≥20g protein, ≤400 cal. Global takes: Dutch baby with stewed fruit, Korean hotteok-style, Brazilian tapioca crepes, Ethiopian teff pancakes.',
  },
  {
    category: 'Macro-Friendly Cookies & Bars',
    recipeCount: 40,
    promptHint:
      '≤200 cal cookies/bars with ≥10g protein. Global flavors: Italian biscotti, Japanese sesame, Middle Eastern tahini, Filipino polvoron.',
  },
  {
    category: 'High-Protein Smoothies',
    recipeCount: 35,
    promptHint:
      '≥30g protein smoothies with global flavor pairings: Indian mango lassi, Brazilian açaí, Vietnamese avocado, Mexican horchata, Persian melon-rosewater.',
  },
  {
    category: 'Lightened Global Desserts',
    recipeCount: 80,
    promptHint:
      'Traditional desserts with macro-friendly adjustments — Persian faloodeh (180 cal), Filipino bibingka (lower-cal coconut + protein), Greek galaktoboureko (protein custard), Mexican churros (air-fried).',
  },
  {
    category: 'Savory Global Snacks',
    recipeCount: 75,
    promptHint:
      'Portion-controlled savory snacks with ≥10g protein: Lebanese labneh balls, Indian chana chaat, Japanese onigiri, Brazilian pão de queijo (protein-modified), Korean tteokbokki (lightened).',
  },
  {
    category: 'Roasted Chickpeas / Edamame / Nuts',
    recipeCount: 35,
    promptHint:
      'Spiced roasted-protein snacks — global spice blends (zaatar, garam masala, harissa, gochugaru, sumac).',
  },
  {
    category: 'Hummus & Dip Variations',
    recipeCount: 40,
    promptHint:
      'Bean/legume-based dips beyond classic hummus — Egyptian ful, Greek fava, Filipino tinapa, Mexican refried-bean variations, Lebanese muhammara.',
  },
  {
    category: 'Protein Granola & Bites',
    recipeCount: 30,
    promptHint:
      'No-bake protein bites + baked granola with ≥8g protein per serving. Global flavors: Indian masala chai, Mexican chocolate, Italian cantucci, Moroccan rosewater + pistachio.',
  },
  {
    category: 'Frozen Fruit Treats',
    recipeCount: 30,
    promptHint:
      'Sorbet, granita, mango lassi pops, Italian granita, Mexican paletas — all under 150 cal per serving with real fruit base.',
  },
  {
    category: 'Macro-Friendly Pastries',
    recipeCount: 30,
    promptHint:
      'Filo-based, phyllo-based, or thin-crust pastries lightened — Greek spanakopita, Turkish börek (lean filling), Moroccan b\'stilla (protein swap).',
  },
  {
    category: 'Tea-Time Snacks Around the World',
    recipeCount: 30,
    promptHint:
      'Light afternoon snacks paired with tea: British cucumber sandwich (lean), Japanese mochi (protein-modified), Moroccan mint-tea cookies (lower sugar), Indian samosa chaat (air-fried).',
  },
  {
    category: 'Holiday & Celebration Desserts',
    recipeCount: 20,
    promptHint:
      'Holiday classics with macro adjustments — Mexican rosca de reyes, Filipino bibingka, Italian panettone, Persian halva — keeping celebration feel while reducing 30%+ calories.',
  },
];

export interface SnackSeedSummary {
  totalCategories: number;
  totalRecipes: number;
}

export const summarizeSnacksSeed = (): SnackSeedSummary => ({
  totalCategories: GLOBAL_SNACKS_SEED.length,
  totalRecipes: GLOBAL_SNACKS_SEED.reduce((acc, c) => acc + c.recipeCount, 0),
});
