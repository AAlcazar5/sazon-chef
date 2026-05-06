// backend/scripts/seedLightenedTechniqueCorpus.ts
// ROADMAP 4.0 Tier J18.3 — Lightened-technique corpus seed.
//
// For each heritage cuisine with a known heavy default (Mexican, Southern,
// Italian-American, Filipino, Caribbean, Indian, Levantine), seed ≥3
// lightened-technique sibling recipes. Each sibling links to its heavy
// "parent" via the new RecipeVariant join (tag='lighter').
//
// Voice: keep the soul, lighten the technique. NEVER frame the lighter
// version as a moral upgrade. Banned vocabulary (enforced by the matching
// test): healthy alternative / guilt-free / skinny / macro-friendly /
// low-fat / diet / cauliflower rice / zucchini noodles / protein-powder.

export const HERITAGE_CUISINES_WITH_HEAVY_DEFAULT = [
  'Mexican',
  'Southern',
  'Italian-American',
  'Filipino',
  'Caribbean',
  'Indian',
  'Levantine',
] as const;

export type LightenedTag = 'weeknight' | 'sunday' | 'campfire' | 'lighter';

export interface LightenedCorpusEntry {
  cuisine: string;
  parentTitle: string;
  title: string;
  techniqueLine: string;
  tag: LightenedTag;
}

// Each cuisine has at minimum 3 lightened siblings paired to a heavy parent.
// Voice rules: invitation, never prescription. Phrases like "same X, less
// Y" are fine because they describe the technique, not a moral upgrade.
export const LIGHTENED_TECHNIQUE_CORPUS: readonly LightenedCorpusEntry[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // MEXICAN
  // ─────────────────────────────────────────────────────────────────────────
  {
    cuisine: 'Mexican',
    parentTitle: 'Tacos al pastor',
    title: 'Charred-corn tacos with chicken thigh',
    techniqueLine: 'pan-charred, same smoke, brighter finish',
    tag: 'lighter',
  },
  {
    cuisine: 'Mexican',
    parentTitle: 'Tortas ahogadas',
    title: 'Grilled torta with avocado',
    techniqueLine: 'grilled, not fried — avocado does the richness',
    tag: 'lighter',
  },
  {
    cuisine: 'Mexican',
    parentTitle: 'Pozole rojo (pork)',
    title: 'Chicken pozole verde',
    techniqueLine: 'tomatillo-bright, broth-forward',
    tag: 'lighter',
  },
  {
    cuisine: 'Mexican',
    parentTitle: 'Enchiladas',
    title: 'Oven-baked enchiladas verdes',
    techniqueLine: 'oven-finished — same melt, brighter sauce',
    tag: 'lighter',
  },
  {
    cuisine: 'Mexican',
    parentTitle: 'Chiles rellenos',
    title: 'Roasted chiles rellenos',
    techniqueLine: 'oven-roasted poblanos — same char, no batter',
    tag: 'lighter',
  },
  {
    cuisine: 'Mexican',
    parentTitle: 'Mole poblano (full plate)',
    title: 'Mole over grilled chicken',
    techniqueLine: 'mole as a sauce, grilled protein underneath',
    tag: 'lighter',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SOUTHERN (US)
  // ─────────────────────────────────────────────────────────────────────────
  {
    cuisine: 'Southern',
    parentTitle: 'Buttermilk fried chicken',
    title: 'Buttermilk-brined air-fried chicken',
    techniqueLine: 'air-fried — same shatter-crust, no deep-fry',
    tag: 'lighter',
  },
  {
    cuisine: 'Southern',
    parentTitle: 'Country-fried steak',
    title: 'Pan-seared steak with sawmill gravy',
    techniqueLine: 'seared, not breaded — gravy still does the work',
    tag: 'lighter',
  },
  {
    cuisine: 'Southern',
    parentTitle: 'Mac and cheese (baked)',
    title: 'Stovetop mac with sharp cheddar',
    techniqueLine: 'stovetop — silky, no roux-heavy bake',
    tag: 'lighter',
  },
  {
    cuisine: 'Southern',
    parentTitle: 'Shrimp and grits (creamy)',
    title: 'Shrimp and grits with corn-broth grits',
    techniqueLine: 'corn-broth grits — same comfort, sharper flavor',
    tag: 'lighter',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ITALIAN-AMERICAN
  // ─────────────────────────────────────────────────────────────────────────
  {
    cuisine: 'Italian-American',
    parentTitle: 'Chicken parmesan',
    title: 'Pan-seared chicken parm with broiled top',
    techniqueLine: 'sauce + cheese broiled separately — crisp, not soaked',
    tag: 'lighter',
  },
  {
    cuisine: 'Italian-American',
    parentTitle: 'Lasagna (full ricotta)',
    title: 'Skillet lasagna with sheet-pan ricotta',
    techniqueLine: 'one-pan — same layers, faster build',
    tag: 'weeknight',
  },
  {
    cuisine: 'Italian-American',
    parentTitle: 'Eggplant parmesan',
    title: 'Roasted eggplant parm',
    techniqueLine: 'roasted slabs — same melt, no fryer',
    tag: 'lighter',
  },
  {
    cuisine: 'Italian-American',
    parentTitle: 'Sunday gravy (long-braised)',
    title: 'Sheet-pan Sunday gravy',
    techniqueLine: 'oven-roasted meatballs + sausage — same depth, fewer pots',
    tag: 'sunday',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FILIPINO
  // ─────────────────────────────────────────────────────────────────────────
  {
    cuisine: 'Filipino',
    parentTitle: 'Lechon kawali',
    title: 'Air-fried pork belly kawali',
    techniqueLine: 'air-fried — same crackle, no oil bath',
    tag: 'lighter',
  },
  {
    cuisine: 'Filipino',
    parentTitle: 'Adobo (long-braised, oily)',
    title: 'Brothy chicken adobo',
    techniqueLine: 'broth-forward adobo — same vinegar punch',
    tag: 'lighter',
  },
  {
    cuisine: 'Filipino',
    parentTitle: 'Lumpia Shanghai',
    title: 'Oven-baked lumpia',
    techniqueLine: 'oven-baked — same crisp wrapper',
    tag: 'lighter',
  },
  {
    cuisine: 'Filipino',
    parentTitle: 'Sisig (sizzling pork belly)',
    title: 'Skillet chicken sisig',
    techniqueLine: 'skillet-finished chicken thigh — same calamansi heat',
    tag: 'lighter',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CARIBBEAN
  // ─────────────────────────────────────────────────────────────────────────
  {
    cuisine: 'Caribbean',
    parentTitle: 'Jerk chicken (deep-charred whole chicken)',
    title: 'Jerk chicken thighs on the grill',
    techniqueLine: 'grilled thighs — same scotch-bonnet heat, faster cook',
    tag: 'weeknight',
  },
  {
    cuisine: 'Caribbean',
    parentTitle: 'Oxtail stew (long-braised)',
    title: 'Pressure-cooker oxtail',
    techniqueLine: 'pressure-cooker tender — same allspice depth',
    tag: 'lighter',
  },
  {
    cuisine: 'Caribbean',
    parentTitle: 'Beef patties (fried)',
    title: 'Baked beef patties',
    techniqueLine: 'oven-baked patties — same flaky crust',
    tag: 'lighter',
  },
  {
    cuisine: 'Caribbean',
    parentTitle: 'Curried goat',
    title: 'Coconut chicken curry, Caribbean-style',
    techniqueLine: 'broth-forward coconut curry — bright, not heavy',
    tag: 'lighter',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // INDIAN
  // ─────────────────────────────────────────────────────────────────────────
  {
    cuisine: 'Indian',
    parentTitle: 'Butter chicken (cream-heavy)',
    title: 'Yogurt-marinated tandoori chicken',
    techniqueLine: 'oven-tandoor with brighter tomato — yogurt does the richness',
    tag: 'lighter',
  },
  {
    cuisine: 'Indian',
    parentTitle: 'Chicken tikka masala (cream + butter)',
    title: 'Tomato-spice chicken tikka',
    techniqueLine: 'tomato-forward sauce — yogurt-finished, brighter',
    tag: 'lighter',
  },
  {
    cuisine: 'Indian',
    parentTitle: 'Biryani (long, layered, ghee-rich)',
    title: 'One-pot chicken biryani',
    techniqueLine: 'one-pot biryani — same layered spice, faster build',
    tag: 'weeknight',
  },
  {
    cuisine: 'Indian',
    parentTitle: 'Saag paneer',
    title: 'Saag with grilled paneer',
    techniqueLine: 'grilled paneer — same char, broth-forward greens',
    tag: 'lighter',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // LEVANTINE
  // ─────────────────────────────────────────────────────────────────────────
  {
    cuisine: 'Levantine',
    parentTitle: 'Falafel (deep-fried)',
    title: 'Baked falafel with tahini',
    techniqueLine: 'oven-baked — same herby crumb',
    tag: 'lighter',
  },
  {
    cuisine: 'Levantine',
    parentTitle: 'Kibbeh (fried)',
    title: 'Baked kibbeh tray',
    techniqueLine: 'tray-baked kibbeh — same crisp top',
    tag: 'lighter',
  },
  {
    cuisine: 'Levantine',
    parentTitle: 'Shawarma (rotisserie, oil-rich)',
    title: 'Sheet-pan chicken shawarma',
    techniqueLine: 'sheet-pan — same spice, blasted edges',
    tag: 'weeknight',
  },
  {
    cuisine: 'Levantine',
    parentTitle: 'Lahmacun (heavy lamb)',
    title: 'Lahmacun with leaner lamb-beef blend',
    techniqueLine: 'oven-baked thin crust — same sumac brightness',
    tag: 'lighter',
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Seed runner — invoked via `ts-node`. Skips when run under jest (corpus
// data is what we test, the writes are best-effort and require a real DB).
// ─────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient } = require('@prisma/client');
  const client = new PrismaClient();

  let createdRecipes = 0;
  let createdVariants = 0;

  for (const entry of LIGHTENED_TECHNIQUE_CORPUS) {
    // Find or create the parent recipe so we can attach the variant.
    const parent = await client.recipe.upsert({
      where: { id: `seed-parent-${slug(entry.parentTitle)}` },
      create: {
        id: `seed-parent-${slug(entry.parentTitle)}`,
        title: entry.parentTitle,
        description: `Heavy-default ${entry.cuisine} dish.`,
        cookTime: 60,
        cuisine: entry.cuisine,
        calories: 700,
        protein: 35,
        carbs: 60,
        fat: 35,
        source: 'seed-lightened-technique',
      },
      update: {},
    });

    const sibling = await client.recipe.upsert({
      where: { id: `seed-sibling-${slug(entry.title)}` },
      create: {
        id: `seed-sibling-${slug(entry.title)}`,
        title: entry.title,
        description: entry.techniqueLine,
        cookTime: 35,
        cuisine: entry.cuisine,
        calories: 520,
        protein: 38,
        carbs: 40,
        fat: 18,
        source: 'seed-lightened-technique',
      },
      update: {},
    });
    createdRecipes += 1;

    await client.recipeVariant.upsert({
      where: {
        recipeId_siblingRecipeId_tag: {
          recipeId: parent.id,
          siblingRecipeId: sibling.id,
          tag: entry.tag,
        },
      },
      create: {
        recipeId: parent.id,
        siblingRecipeId: sibling.id,
        tag: entry.tag,
        techniqueLine: entry.techniqueLine,
      },
      update: { techniqueLine: entry.techniqueLine },
    });
    createdVariants += 1;
  }

  // eslint-disable-next-line no-console
  console.log(
    `[seedLightenedTechniqueCorpus] seeded ${createdRecipes} sibling recipes and ${createdVariants} variant joins.`,
  );
  await client.$disconnect();
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[seedLightenedTechniqueCorpus] failed:', err);
    process.exit(1);
  });
}
