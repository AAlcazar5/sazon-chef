// backend/scripts/seedCravingsMadeReal.ts
// ROADMAP 4.0 D12 — "Cravings, Made Real" smart collection seed.
//
// The card name (formerly "Fast Food Makeovers") is now an ingredient-quality
// promise: comfort-food cravings rebuilt with real, whole, from-scratch
// ingredients — grass-fed beef on a brioche bun, hand-cut fries, real
// cheddar/gruyere instead of "skinny" or "low-cal" anything.
//
// Voice: per `plans/persona.md`, never say "macro-friendly", "skinny",
// "low-cal". The tier is *real food made well*, not reduction.
//
// Pure data-builder (`buildCravingsMadeRealSeed`) is exported so tests can
// assert shape without DB calls. The default-export `main()` upserts.

import { PrismaClient } from '@prisma/client';

export const CRAVINGS_MADE_REAL_TAG = 'cravings_made_real';

export interface CravingsMadeRealRecipe {
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
  ingredients: string[];
  instructions: string[];
  tagsJson: string;
}

const tagsFor = (extra: string[] = []): string =>
  JSON.stringify([CRAVINGS_MADE_REAL_TAG, ...extra]);

/**
 * Hand-curated seed: ten craving-class recipes, each rebuilt with quality
 * ingredients rather than reduced macros. Descriptions explicitly call out
 * the ingredient choices (grass-fed, hand-made, aged cheddar, etc.) so the
 * UI can lead with provenance, not numbers.
 */
export const buildCravingsMadeRealSeed = (): CravingsMadeRealRecipe[] => [
  {
    id: 'cmr-real-burger',
    title: 'Real-Ingredient Smash Burger',
    description:
      'Grass-fed beef smashed thin on cast iron, melted aged cheddar, butter-toasted brioche, hand-cut bread-and-butter pickles. The burger you want, made with real food.',
    cuisine: 'American',
    mealType: 'dinner',
    cookTime: 20,
    servings: 2,
    difficulty: 'easy',
    calories: 720,
    protein: 42,
    carbs: 38,
    fat: 42,
    fiber: 2,
    ingredients: [
      '8 oz grass-fed ground beef (80/20)',
      '2 brioche buns',
      '2 slices aged cheddar',
      '4 leaves butter lettuce',
      '4 slices hand-cut bread-and-butter pickle',
      '2 tbsp cultured butter',
      '1 small white onion, shaved',
      'flaky sea salt + black pepper',
    ],
    instructions: [
      'Heat a cast-iron skillet over high until it smokes faintly.',
      'Form beef into two loose 4 oz balls. Salt the tops.',
      'Place balls in skillet, smash flat with a spatula, cook 90 seconds.',
      'Flip, top with cheese, cover 30 seconds to melt.',
      'Toast brioche cut-side down in cultured butter.',
      'Build with pickle, lettuce, shaved onion. Serve immediately.',
    ],
    tagsJson: tagsFor(['burger', 'cast_iron']),
  },
  {
    id: 'cmr-from-scratch-nuggets',
    title: 'From-Scratch Chicken Nuggets',
    description:
      'Real chicken thigh hand-breaded in panko, buttermilk-brined for tenderness, baked or air-fried. No mystery meat — whole-muscle nuggets you actually recognize.',
    cuisine: 'American',
    mealType: 'dinner',
    cookTime: 30,
    servings: 3,
    difficulty: 'easy',
    calories: 480,
    protein: 36,
    carbs: 28,
    fat: 22,
    fiber: 1,
    ingredients: [
      '1 lb boneless chicken thigh',
      '1 cup cultured buttermilk',
      '1.5 cups panko breadcrumbs',
      '0.5 cup all-purpose flour',
      '1 tsp smoked paprika',
      '1 tsp garlic powder',
      '1 tsp kosher salt',
      '0.5 tsp black pepper',
      '1 large egg',
      '2 tbsp avocado oil',
    ],
    instructions: [
      'Cut chicken into 1.5-inch pieces; brine in buttermilk + salt 30 minutes.',
      'Combine panko, flour, paprika, garlic, salt, pepper.',
      'Beat egg in a second bowl.',
      'Drain chicken, dredge in egg then panko mix.',
      'Air-fry 400°F for 12 minutes, flipping once. Or bake at 425°F 18 minutes.',
      'Rest 2 minutes; serve with honey-mustard or hot honey.',
    ],
    tagsJson: tagsFor(['nuggets', 'air_fryer']),
  },
  {
    id: 'cmr-handmade-pizza',
    title: 'Hand-Made Pizza Margherita',
    description:
      'House-made dough fermented overnight, San Marzano tomatoes hand-crushed, fresh mozzarella, real basil. The pizza that ruins delivery for you forever.',
    cuisine: 'Italian',
    mealType: 'dinner',
    cookTime: 90,
    servings: 4,
    difficulty: 'medium',
    calories: 580,
    protein: 24,
    carbs: 72,
    fat: 22,
    fiber: 4,
    ingredients: [
      '500g 00 flour',
      '325ml warm water',
      '2g instant yeast',
      '10g kosher salt',
      '1 can San Marzano whole tomatoes (28 oz)',
      '8 oz fresh mozzarella',
      '0.25 cup extra-virgin olive oil',
      'fresh basil leaves',
      'flaky sea salt',
    ],
    instructions: [
      'Mix flour, water, yeast, salt; knead 10 min. Cold-ferment 24 hours.',
      'Divide dough into 4 balls; rest 1 hour at room temp.',
      'Hand-stretch each ball into a 12-inch round (no rolling pin).',
      'Crush tomatoes by hand; salt lightly.',
      'Top with sauce, torn mozzarella, drizzle of oil.',
      'Bake on a screaming-hot pizza stone at 550°F for 6-8 minutes.',
      'Finish with fresh basil and flaky salt.',
    ],
    tagsJson: tagsFor(['pizza']),
  },
  {
    id: 'cmr-real-mac-cheese',
    title: 'Real Mac and Cheese with Cheddar + Gruyere',
    description:
      'Aged cheddar, nutty gruyere, whole milk, butter, hand-grated. No powders, no fluorescent orange — just real cheese sauce on al dente pasta.',
    cuisine: 'American',
    mealType: 'dinner',
    cookTime: 35,
    servings: 4,
    difficulty: 'easy',
    calories: 650,
    protein: 26,
    carbs: 58,
    fat: 36,
    fiber: 2,
    ingredients: [
      '1 lb cavatappi or elbow pasta',
      '4 tbsp cultured butter',
      '4 tbsp all-purpose flour',
      '3 cups whole milk',
      '8 oz aged cheddar, hand-grated',
      '4 oz gruyere, hand-grated',
      '0.5 tsp freshly grated nutmeg',
      '1 tsp kosher salt',
      '0.5 cup panko + 1 tbsp butter (topping)',
    ],
    instructions: [
      'Cook pasta 1 minute under al dente; reserve 0.5 cup pasta water.',
      'Melt butter, whisk in flour, cook 90 seconds.',
      'Whisk in milk; bring to a simmer until thickened.',
      'Off heat, add cheeses by handful, stirring smooth.',
      'Season with nutmeg, salt; fold in pasta + a splash of pasta water.',
      'Top with buttered panko; broil 2 minutes until golden.',
    ],
    tagsJson: tagsFor(['mac_and_cheese']),
  },
  {
    id: 'cmr-real-fried-chicken-sandwich',
    title: 'Real-Ingredient Fried Chicken Sandwich',
    description:
      'Buttermilk-brined chicken thigh, dredged in seasoned flour, fried in cast iron. Real brioche, hand-shredded slaw, hot honey from a bottle without a marketing budget.',
    cuisine: 'American',
    mealType: 'dinner',
    cookTime: 45,
    servings: 2,
    difficulty: 'medium',
    calories: 780,
    protein: 44,
    carbs: 64,
    fat: 38,
    fiber: 3,
    ingredients: [
      '2 boneless chicken thighs',
      '1 cup cultured buttermilk',
      '1 cup all-purpose flour',
      '1 tbsp smoked paprika',
      '1 tsp cayenne',
      '1 tsp kosher salt',
      '2 brioche buns',
      '1 cup shredded green cabbage',
      '2 tbsp hot honey',
      '2 cups peanut oil for frying',
    ],
    instructions: [
      'Brine chicken in buttermilk + salt for at least 4 hours.',
      'Dredge in flour seasoned with paprika, cayenne, salt.',
      'Fry in 350°F peanut oil for 6-7 minutes until golden.',
      'Rest 3 minutes on a wire rack.',
      'Toast brioche; build with chicken, slaw, hot honey drizzle.',
    ],
    tagsJson: tagsFor(['fried_chicken', 'cast_iron']),
  },
  {
    id: 'cmr-real-tacos',
    title: 'Real Carne Asada Tacos',
    description:
      'Skirt steak marinated in real lime, cilantro, garlic. Fresh corn tortillas warmed on an open flame, hand-chopped onion + cilantro, salsa from real tomatillos.',
    cuisine: 'Mexican',
    mealType: 'dinner',
    cookTime: 40,
    servings: 3,
    difficulty: 'medium',
    calories: 540,
    protein: 32,
    carbs: 42,
    fat: 24,
    fiber: 5,
    ingredients: [
      '1 lb skirt steak',
      '4 cloves garlic, minced',
      '0.25 cup fresh lime juice',
      '0.25 cup chopped cilantro',
      '2 tbsp olive oil',
      '1 tsp cumin',
      '1 tsp kosher salt',
      '12 fresh corn tortillas',
      '1 small white onion, finely chopped',
      '0.5 cup chopped cilantro (garnish)',
      '0.5 lb tomatillos (for salsa)',
      '1 jalapeño',
    ],
    instructions: [
      'Marinate steak 30 min in lime, garlic, cilantro, oil, cumin, salt.',
      'Char tomatillos + jalapeño on a comal; blend with salt for salsa verde.',
      'Sear steak 3 minutes per side over high heat; rest 5 minutes.',
      'Slice against the grain.',
      'Warm tortillas on open flame 10 seconds per side.',
      'Build with steak, onion, cilantro, salsa verde.',
    ],
    tagsJson: tagsFor(['tacos']),
  },
  {
    id: 'cmr-real-cheesesteak',
    title: 'Real Philly Cheesesteak',
    description:
      'Ribeye sliced thin against the grain, real provolone (no Cheez Whiz unless you want it), griddled onions, fresh hoagie roll. Whole-food version, every component.',
    cuisine: 'American',
    mealType: 'dinner',
    cookTime: 25,
    servings: 2,
    difficulty: 'easy',
    calories: 820,
    protein: 48,
    carbs: 56,
    fat: 44,
    fiber: 3,
    ingredients: [
      '12 oz ribeye, partially frozen',
      '2 fresh hoagie rolls',
      '6 slices aged provolone',
      '1 large yellow onion, sliced',
      '2 tbsp avocado oil',
      'kosher salt + black pepper',
    ],
    instructions: [
      'Slice ribeye paper-thin while still firm.',
      'Caramelize onion in oil over medium-low for 12 minutes.',
      'Push onion aside; griddle ribeye on high, chopping with the spatula.',
      'Combine meat + onion; lay provolone on top to melt.',
      'Scoop into split, lightly toasted hoagie rolls.',
    ],
    tagsJson: tagsFor(['cheesesteak']),
  },
  {
    id: 'cmr-real-fish-and-chips',
    title: 'Real Beer-Battered Fish and Chips',
    description:
      'Wild-caught cod, batter from real ale, hand-cut russet potatoes double-fried in real beef tallow (or peanut oil). Vinegar from a real bottle, lemon from a real lemon.',
    cuisine: 'British',
    mealType: 'dinner',
    cookTime: 50,
    servings: 2,
    difficulty: 'medium',
    calories: 780,
    protein: 38,
    carbs: 78,
    fat: 36,
    fiber: 6,
    ingredients: [
      '12 oz wild-caught cod',
      '2 large russet potatoes',
      '1 cup all-purpose flour',
      '1 cup cold ale',
      '1 tsp baking powder',
      '1 tsp kosher salt',
      '4 cups peanut oil for frying',
      'malt vinegar + lemon wedges',
    ],
    instructions: [
      'Cut potatoes into 0.5-inch wedges; soak in cold water 20 min.',
      'Pat dry; first fry at 300°F for 6 minutes, drain.',
      'Whisk flour, baking powder, salt, then cold ale until smooth.',
      'Heat oil to 375°F; dip cod in batter, fry 4-5 min per side.',
      'Refry potatoes at 375°F until crisp, 3 minutes.',
      'Salt immediately; serve with malt vinegar + lemon.',
    ],
    tagsJson: tagsFor(['fish_and_chips']),
  },
  {
    id: 'cmr-real-fried-rice',
    title: 'Real Wok-Hei Fried Rice',
    description:
      'Day-old jasmine rice, real soy + Shaoxing wine, eggs from real chickens, scallions hand-sliced. Wok-hei from actually high heat, not a flavor packet.',
    cuisine: 'Chinese',
    mealType: 'dinner',
    cookTime: 15,
    servings: 2,
    difficulty: 'medium',
    calories: 520,
    protein: 18,
    carbs: 68,
    fat: 18,
    fiber: 3,
    ingredients: [
      '3 cups day-old cooked jasmine rice',
      '2 large eggs',
      '3 scallions, sliced',
      '2 cloves garlic, minced',
      '2 tbsp soy sauce',
      '1 tbsp Shaoxing wine',
      '1 tsp sesame oil',
      '2 tbsp avocado oil',
      '1 tsp sugar',
      '0.5 tsp white pepper',
    ],
    instructions: [
      'Heat wok or carbon-steel pan until smoking.',
      'Scramble eggs in oil; remove.',
      'Add aromatics; toss in rice, breaking up clumps.',
      'Sear rice undisturbed 30 seconds at a time, then toss.',
      'Add soy, wine, sugar, pepper; fold in scallions + eggs.',
      'Finish with sesame oil off heat.',
    ],
    tagsJson: tagsFor(['fried_rice', 'wok']),
  },
  {
    id: 'cmr-real-mozz-sticks',
    title: 'Real Mozzarella Sticks with House Marinara',
    description:
      'Block of real fresh mozzarella, hand-breaded twice for crunch, fried in real oil. Marinara from whole San Marzano tomatoes, real garlic, real basil.',
    cuisine: 'Italian',
    mealType: 'snack',
    cookTime: 30,
    servings: 4,
    difficulty: 'easy',
    calories: 460,
    protein: 22,
    carbs: 36,
    fat: 26,
    fiber: 2,
    ingredients: [
      '12 oz block fresh mozzarella',
      '0.5 cup all-purpose flour',
      '2 large eggs, beaten',
      '1.5 cups panko breadcrumbs',
      '1 tsp Italian seasoning',
      '0.5 tsp kosher salt',
      '4 cups peanut oil for frying',
      '1 can San Marzano tomatoes',
      '3 cloves garlic, minced',
      '2 tbsp olive oil',
      'fresh basil',
    ],
    instructions: [
      'Cut mozzarella into 0.5x0.5x3 inch sticks; freeze 1 hour.',
      'Dredge frozen sticks: flour → egg → panko → egg → panko (twice).',
      'Refreeze 30 minutes.',
      'For marinara: simmer crushed tomatoes, garlic, oil, basil 15 minutes.',
      'Fry sticks at 365°F for 60-90 seconds until golden.',
      'Serve immediately with warm marinara.',
    ],
    tagsJson: tagsFor(['mozzarella_sticks']),
  },
  {
    id: 'cmr-real-chicken-tenders',
    title: 'Real Chicken Tenders, Hand-Breaded',
    description:
      'Whole chicken tenderloin, hand-cut, double-dipped in seasoned panko, fried golden. Real honey-mustard from grainy mustard + real honey.',
    cuisine: 'American',
    mealType: 'dinner',
    cookTime: 25,
    servings: 3,
    difficulty: 'easy',
    calories: 540,
    protein: 38,
    carbs: 32,
    fat: 26,
    fiber: 1,
    ingredients: [
      '1 lb chicken tenderloins',
      '1 cup cultured buttermilk',
      '1 cup all-purpose flour',
      '2 eggs',
      '2 cups panko breadcrumbs',
      '1 tsp smoked paprika',
      '1 tsp garlic powder',
      '1 tsp kosher salt',
      '0.5 tsp black pepper',
      '4 cups peanut oil',
      '0.25 cup whole-grain mustard',
      '2 tbsp real honey',
    ],
    instructions: [
      'Brine tenders in buttermilk + salt 1 hour.',
      'Set up flour, beaten egg, seasoned panko stations.',
      'Dredge each tender: flour → egg → panko, pressing firmly.',
      'Fry at 350°F for 4-5 minutes per side until 165°F internal.',
      'Whisk mustard + honey for dipping sauce.',
      'Serve immediately on a wire rack.',
    ],
    tagsJson: tagsFor(['chicken_tenders']),
  },
];

/** Pure helper: filters a candidate list to the smart-collection subset. */
export const filterCravingsMadeReal = <T extends { tagsJson?: string | null }>(
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
    if (parsed.includes(CRAVINGS_MADE_REAL_TAG)) result.push(r);
  }
  return result;
};

/** Live runner — upserts the seed into the database. */
export const main = async (): Promise<void> => {
  const prisma = new PrismaClient();
  try {
    const seed = buildCravingsMadeRealSeed();
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
      `seedCravingsMadeReal: created=${created} updated=${updated} total=${seed.length}`,
    );
  } finally {
    await prisma.$disconnect();
  }
};

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('seedCravingsMadeReal failed:', err);
    process.exit(1);
  });
}
