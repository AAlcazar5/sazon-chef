// backend/scripts/seedGlazedBites.ts
// ROADMAP 4.0 D13 — Glazed Protein Bites family expansion.
//
// Anchor MealComponents already seeded (`glazed_bite` style tag) — this seed
// adds the recipe rows so they show up in browse, plate-builder, and Today's
// hero rotation. Style: cubed protein + soy/honey/sesame/rice-vinegar
// marinade, finishing in toaster-oven, skillet, or air fryer.
//
// Pure data builder is exported for testability; live `main()` upserts.

import { PrismaClient } from '@prisma/client';

export const GLAZED_BITE_TAG = 'glazed_bite';
export type DietaryBucket = 'omnivore' | 'vegetarian' | 'pescatarian' | 'dairy-free' | 'gluten-free';

export interface GlazedBiteRecipe {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  mealType: string;
  cookTime: number;
  servings: number;
  difficulty: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  protein_kind: string;
  dietaryBuckets: DietaryBucket[];
  ingredients: string[];
  instructions: string[];
  tagsJson: string;
}

const tagsFor = (extra: string[] = []): string =>
  JSON.stringify([GLAZED_BITE_TAG, ...extra]);

interface BuildArgs {
  id: string;
  title: string;
  cuisine: string;
  flavor: string;
  protein: string;
  finishing: string;
  dietaryBuckets: DietaryBucket[];
  extraIngredients?: string[];
  cuisineFlavorNote?: string;
  glutenFreeSoyAlternative?: boolean;
}

const buildBite = (a: BuildArgs): GlazedBiteRecipe => {
  const baseSoy = a.glutenFreeSoyAlternative ? 'tamari (gluten-free soy sauce)' : 'low-sodium soy sauce';
  const ingredients = [
    `12 oz ${a.protein}, cut into 1-inch cubes`,
    `3 tbsp ${baseSoy}`,
    '2 tbsp honey',
    '1 tbsp toasted sesame oil',
    '1 tbsp rice vinegar',
    '1 tbsp toasted sesame seeds',
    '2 cloves garlic, minced',
    '1-inch knob ginger, grated',
    '1 tbsp avocado oil',
    '2 scallions, sliced (garnish)',
    ...(a.extraIngredients ?? []),
  ];
  const instructions: string[] = [];
  instructions.push(
    `Whisk ${baseSoy}, honey, sesame oil, rice vinegar, garlic, ginger in a bowl to make the glaze.`,
  );
  instructions.push(`Toss ${a.protein} cubes in half the glaze; marinate 15 minutes.`);
  if (a.finishing === 'toaster_oven') {
    instructions.push('Spread cubes on a foil-lined toaster-oven tray. Roast at 425°F for 12 minutes, brushing remaining glaze halfway.');
  } else if (a.finishing === 'skillet_sear') {
    instructions.push('Heat avocado oil in a skillet over medium-high. Sear cubes 2 minutes per side until caramelized; pour remaining glaze in to coat.');
  } else if (a.finishing === 'air_fryer') {
    instructions.push('Air-fry at 400°F for 10 minutes, shaking once. Brush remaining glaze and air-fry 2 more minutes.');
  } else {
    instructions.push('Pan-roast in a hot oven at 425°F for 12 minutes, brushing remaining glaze halfway.');
  }
  instructions.push('Top with toasted sesame seeds and scallions; serve immediately.');

  return {
    id: a.id,
    title: a.title,
    description: a.cuisineFlavorNote ?? `${a.flavor} glaze on cubed ${a.protein}, finished in ${a.finishing.replace('_', ' ')}.`,
    cuisine: a.cuisine,
    mealType: 'dinner',
    cookTime: 25,
    servings: 2,
    difficulty: 'easy',
    calories: 420,
    protein: a.protein.includes('tofu') || a.protein.includes('halloumi') || a.protein.includes('paneer') ? 30 : 38,
    carbs: 18,
    fat: a.protein.includes('halloumi') || a.protein.includes('paneer') ? 26 : 18,
    fiber: 2,
    protein_kind: a.protein,
    dietaryBuckets: a.dietaryBuckets,
    ingredients,
    instructions,
    tagsJson: tagsFor([a.flavor.replace(/[^a-z0-9]/gi, '_').toLowerCase()]),
  };
};

export const buildGlazedBitesSeed = (): GlazedBiteRecipe[] => {
  const list: GlazedBiteRecipe[] = [];

  // Ground turkey (4) — dairy-free, gluten-free if tamari used
  list.push(buildBite({
    id: 'gb-turkey-classic-toaster',
    title: 'Glazed Turkey Bites (Classic Soy-Honey)',
    cuisine: 'Asian',
    flavor: 'classic soy-honey',
    protein: 'ground turkey',
    finishing: 'toaster_oven',
    dietaryBuckets: ['omnivore', 'dairy-free'],
  }));
  list.push(buildBite({
    id: 'gb-turkey-gochujang',
    title: 'Gochujang-Glazed Turkey Bites',
    cuisine: 'Korean',
    flavor: 'gochujang',
    protein: 'ground turkey',
    finishing: 'skillet_sear',
    dietaryBuckets: ['omnivore', 'dairy-free'],
    extraIngredients: ['1 tbsp gochujang'],
  }));
  list.push(buildBite({
    id: 'gb-turkey-teriyaki',
    title: 'Teriyaki Turkey Bites, Air-Fried',
    cuisine: 'Japanese',
    flavor: 'teriyaki',
    protein: 'ground turkey',
    finishing: 'air_fryer',
    dietaryBuckets: ['omnivore', 'dairy-free'],
    extraIngredients: ['1 tbsp mirin'],
  }));
  list.push(buildBite({
    id: 'gb-turkey-miso-maple',
    title: 'Miso-Maple Turkey Bites',
    cuisine: 'Japanese',
    flavor: 'miso-maple',
    protein: 'ground turkey',
    finishing: 'toaster_oven',
    dietaryBuckets: ['omnivore', 'dairy-free'],
    extraIngredients: ['1 tbsp white miso', '1 tbsp maple syrup'],
  }));

  // Sliced steak (4)
  list.push(buildBite({
    id: 'gb-steak-classic',
    title: 'Soy-Honey Glazed Sliced Steak Bites',
    cuisine: 'Asian',
    flavor: 'classic soy-honey',
    protein: 'sirloin steak',
    finishing: 'skillet_sear',
    dietaryBuckets: ['omnivore', 'dairy-free'],
  }));
  list.push(buildBite({
    id: 'gb-steak-hoisin',
    title: 'Hoisin-Glazed Steak Bites',
    cuisine: 'Chinese',
    flavor: 'hoisin',
    protein: 'sirloin steak',
    finishing: 'skillet_sear',
    dietaryBuckets: ['omnivore', 'dairy-free'],
    extraIngredients: ['1 tbsp hoisin sauce'],
  }));
  list.push(buildBite({
    id: 'gb-steak-gochujang',
    title: 'Gochujang Steak Bites',
    cuisine: 'Korean',
    flavor: 'gochujang',
    protein: 'flank steak',
    finishing: 'skillet_sear',
    dietaryBuckets: ['omnivore', 'dairy-free'],
    extraIngredients: ['1 tbsp gochujang'],
  }));
  list.push(buildBite({
    id: 'gb-steak-peanut-lime',
    title: 'Peanut-Lime Glazed Steak Bites',
    cuisine: 'Thai',
    flavor: 'peanut-lime',
    protein: 'sirloin steak',
    finishing: 'skillet_sear',
    dietaryBuckets: ['omnivore', 'dairy-free'],
    extraIngredients: ['2 tbsp peanut butter', '1 tbsp lime juice'],
  }));

  // Halloumi (3) — vegetarian
  list.push(buildBite({
    id: 'gb-halloumi-classic',
    title: 'Soy-Honey-Sesame Glazed Halloumi Bites',
    cuisine: 'Asian',
    flavor: 'classic soy-honey',
    protein: 'halloumi',
    finishing: 'skillet_sear',
    dietaryBuckets: ['vegetarian'],
  }));
  list.push(buildBite({
    id: 'gb-halloumi-teriyaki',
    title: 'Teriyaki Halloumi Bites',
    cuisine: 'Japanese',
    flavor: 'teriyaki',
    protein: 'halloumi',
    finishing: 'toaster_oven',
    dietaryBuckets: ['vegetarian'],
    extraIngredients: ['1 tbsp mirin'],
  }));
  list.push(buildBite({
    id: 'gb-halloumi-miso-maple',
    title: 'Miso-Maple Halloumi Bites',
    cuisine: 'Japanese',
    flavor: 'miso-maple',
    protein: 'halloumi',
    finishing: 'toaster_oven',
    dietaryBuckets: ['vegetarian'],
    extraIngredients: ['1 tbsp white miso', '1 tbsp maple syrup'],
  }));

  // Paneer (3) — vegetarian
  list.push(buildBite({
    id: 'gb-paneer-classic',
    title: 'Soy-Honey-Sesame Glazed Paneer Bites',
    cuisine: 'Indian',
    flavor: 'classic soy-honey',
    protein: 'paneer',
    finishing: 'skillet_sear',
    dietaryBuckets: ['vegetarian'],
  }));
  list.push(buildBite({
    id: 'gb-paneer-gochujang',
    title: 'Gochujang Glazed Paneer Bites',
    cuisine: 'Korean',
    flavor: 'gochujang',
    protein: 'paneer',
    finishing: 'air_fryer',
    dietaryBuckets: ['vegetarian'],
    extraIngredients: ['1 tbsp gochujang'],
  }));
  list.push(buildBite({
    id: 'gb-paneer-hoisin',
    title: 'Hoisin Paneer Bites with Sesame',
    cuisine: 'Chinese',
    flavor: 'hoisin',
    protein: 'paneer',
    finishing: 'skillet_sear',
    dietaryBuckets: ['vegetarian'],
    extraIngredients: ['1 tbsp hoisin sauce'],
  }));

  // Tofu (3) — dairy-free + vegetarian + (gf via tamari)
  list.push(buildBite({
    id: 'gb-tofu-classic-gf',
    title: 'Tamari-Honey-Sesame Glazed Tofu Bites (Gluten-Free)',
    cuisine: 'Asian',
    flavor: 'classic tamari-honey',
    protein: 'extra-firm tofu',
    finishing: 'air_fryer',
    dietaryBuckets: ['vegetarian', 'dairy-free', 'gluten-free'],
    glutenFreeSoyAlternative: true,
  }));
  list.push(buildBite({
    id: 'gb-tofu-teriyaki',
    title: 'Teriyaki Tofu Bites',
    cuisine: 'Japanese',
    flavor: 'teriyaki',
    protein: 'extra-firm tofu',
    finishing: 'toaster_oven',
    dietaryBuckets: ['vegetarian', 'dairy-free'],
    extraIngredients: ['1 tbsp mirin'],
  }));
  list.push(buildBite({
    id: 'gb-tofu-peanut-lime',
    title: 'Peanut-Lime Tofu Bites',
    cuisine: 'Thai',
    flavor: 'peanut-lime',
    protein: 'extra-firm tofu',
    finishing: 'skillet_sear',
    dietaryBuckets: ['vegetarian', 'dairy-free'],
    extraIngredients: ['2 tbsp peanut butter', '1 tbsp lime juice'],
  }));

  // Shrimp (3) — pescatarian + dairy-free
  list.push(buildBite({
    id: 'gb-shrimp-classic',
    title: 'Soy-Honey-Sesame Glazed Shrimp Bites',
    cuisine: 'Asian',
    flavor: 'classic soy-honey',
    protein: 'shrimp',
    finishing: 'skillet_sear',
    dietaryBuckets: ['pescatarian', 'dairy-free'],
  }));
  list.push(buildBite({
    id: 'gb-shrimp-gochujang',
    title: 'Gochujang Glazed Shrimp Bites',
    cuisine: 'Korean',
    flavor: 'gochujang',
    protein: 'shrimp',
    finishing: 'skillet_sear',
    dietaryBuckets: ['pescatarian', 'dairy-free'],
    extraIngredients: ['1 tbsp gochujang'],
  }));
  list.push(buildBite({
    id: 'gb-shrimp-miso-maple',
    title: 'Miso-Maple Shrimp Bites, Toaster-Oven',
    cuisine: 'Japanese',
    flavor: 'miso-maple',
    protein: 'shrimp',
    finishing: 'toaster_oven',
    dietaryBuckets: ['pescatarian', 'dairy-free'],
    extraIngredients: ['1 tbsp white miso', '1 tbsp maple syrup'],
  }));

  // Bonus: salmon (1) for >20 count and pescatarian variety
  list.push(buildBite({
    id: 'gb-salmon-classic',
    title: 'Soy-Honey-Sesame Glazed Salmon Bites',
    cuisine: 'Asian',
    flavor: 'classic soy-honey',
    protein: 'salmon fillet',
    finishing: 'toaster_oven',
    dietaryBuckets: ['pescatarian', 'dairy-free'],
  }));

  return list;
};

export const filterGlazedBites = <T extends { tagsJson?: string | null }>(
  recipes: T[],
): T[] => {
  const result: T[] = [];
  for (const r of recipes) {
    if (!r.tagsJson) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(r.tagsJson);
    } catch {
      continue;
    }
    if (!Array.isArray(parsed)) continue;
    if (parsed.includes(GLAZED_BITE_TAG)) result.push(r);
  }
  return result;
};

export const main = async (): Promise<void> => {
  const prisma = new PrismaClient();
  try {
    const seed = buildGlazedBitesSeed();
    let created = 0;
    let updated = 0;
    for (const r of seed) {
      const existing = await prisma.recipe.findUnique({ where: { id: r.id } });
      const data = {
        id: r.id,
        title: r.title,
        description: r.description,
        cuisine: r.cuisine,
        mealType: r.mealType,
        cookTime: r.cookTime,
        servings: r.servings,
        difficulty: r.difficulty,
        calories: r.calories,
        protein: r.protein,
        carbs: r.carbs,
        fat: r.fat,
        fiber: r.fiber ?? null,
        tagsJson: r.tagsJson,
        source: 'database',
      };
      await prisma.recipe.upsert({
        where: { id: r.id },
        create: data,
        update: { tagsJson: r.tagsJson, description: r.description },
      });
      if (existing) updated += 1;
      else created += 1;
    }
    // eslint-disable-next-line no-console
    console.log(
      `seedGlazedBites: created=${created} updated=${updated} total=${seed.length}`,
    );
  } finally {
    await prisma.$disconnect();
  }
};

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('seedGlazedBites failed:', err);
    process.exit(1);
  });
}
