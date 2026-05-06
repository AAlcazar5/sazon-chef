// backend/scripts/seedApplianceExpansions.ts
// ROADMAP 4.0 D14 — Appliance-specific expansions seed.
//
// Targets:
//   - Ninja Creami:  30 protein ice creams (varied bases + flavors)
//   - Air Fryer:     25 weeknight savories (wings, fries, vegetables, etc.)
//   - Waffle Maker:  20 sweet + savory variations (traditional, chaffle,
//                    cornbread, brownie, hash brown, etc.)
//
// Canonical appliance keys mirror `applianceTaggerService` so the existing
// chip filter picks the recipes up automatically. Each recipe sets the
// `appliances` JSON column directly.
//
// Pure data builder is exported for testability; live `main()` upserts.

import { PrismaClient } from '@prisma/client';

export type ApplianceKey = 'ninja_creami' | 'air_fryer' | 'waffle_maker';

export interface ApplianceRecipe {
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
  appliances: string;
}

const appliancesJson = (...keys: ApplianceKey[]): string => JSON.stringify(keys);

// ────────────────────────────────────────────────────────────────────────────
// Ninja Creami — 30 protein ice creams
// ────────────────────────────────────────────────────────────────────────────

interface CreamiInput {
  id: string;
  title: string;
  base: 'whole-milk' | 'skim' | 'greek-yogurt' | 'protein-shake' | 'oat';
  flavor: string;
  extraIngredients?: string[];
  mixIns?: string[];
  cuisine?: string;
  mealType?: string;
}

const baseIngredients = (base: CreamiInput['base']): string[] => {
  switch (base) {
    case 'whole-milk':
      return ['1 cup whole milk', '0.25 cup heavy cream', '2 tbsp granulated sugar', '1 scoop (30g) whey protein'];
    case 'skim':
      return ['1.25 cups skim milk', '2 tbsp sugar', '1 scoop (30g) casein protein'];
    case 'greek-yogurt':
      return ['1 cup non-fat Greek yogurt', '0.5 cup whole milk', '2 tbsp honey'];
    case 'protein-shake':
      return ['1 ready-to-drink protein shake (11 oz)', '1 tbsp sugar-free pudding mix'];
    case 'oat':
      return ['1.25 cups oat milk', '2 tbsp maple syrup', '1 scoop vegan protein'];
  }
};

const buildCreami = (i: CreamiInput): ApplianceRecipe => {
  const ingredients = [
    ...baseIngredients(i.base),
    ...(i.extraIngredients ?? []),
    ...(i.mixIns ? [`mix-ins: ${i.mixIns.join(', ')}`] : []),
  ];
  const instructions = [
    `Whisk ${i.flavor} flavoring into the ${i.base} base until smooth.`,
    'Pour into a Ninja Creami pint container; freeze level for at least 24 hours.',
    'Run the Ninja Creami "Lite Ice Cream" or "Protein" spin cycle once.',
    'If the result is crumbly, add a splash of milk and re-spin.',
    ...(i.mixIns ? ['Use the "Mix-In" function to fold in mix-ins; spin briefly.'] : []),
    'Scoop and serve immediately, or re-freeze with a smoothed surface.',
  ];
  return {
    id: i.id,
    title: i.title,
    description: `${i.flavor} protein ice cream — ${i.base} base, spun in the Ninja Creami.`,
    cuisine: i.cuisine ?? 'American',
    mealType: i.mealType ?? 'dessert',
    cookTime: 10,
    servings: 2,
    difficulty: 'easy',
    calories: 280,
    protein: 24,
    carbs: 28,
    fat: 8,
    fiber: 1,
    ingredients,
    instructions,
    appliances: appliancesJson('ninja_creami'),
  };
};

const creamiSeeds = (): ApplianceRecipe[] => [
  buildCreami({ id: 'creami-vanilla-classic', title: 'Vanilla Bean Protein Ice Cream', base: 'whole-milk', flavor: 'vanilla bean', extraIngredients: ['1 tsp vanilla bean paste'] }),
  buildCreami({ id: 'creami-vanilla-skim', title: 'Skim Vanilla Protein Ice Cream', base: 'skim', flavor: 'vanilla' }),
  buildCreami({ id: 'creami-vanilla-greek', title: 'Greek Yogurt Vanilla Ice Cream', base: 'greek-yogurt', flavor: 'vanilla', extraIngredients: ['1 tsp vanilla extract'] }),
  buildCreami({ id: 'creami-chocolate-fudge', title: 'Double Chocolate Fudge Protein Ice Cream', base: 'whole-milk', flavor: 'cocoa-fudge', extraIngredients: ['2 tbsp cocoa powder', '1 tbsp cocoa nibs'] }),
  buildCreami({ id: 'creami-chocolate-skim', title: 'Skim Chocolate Protein Ice Cream', base: 'skim', flavor: 'cocoa', extraIngredients: ['2 tbsp cocoa powder'] }),
  buildCreami({ id: 'creami-chocolate-shake', title: 'Chocolate Shake Protein Ice Cream', base: 'protein-shake', flavor: 'chocolate', extraIngredients: ['1 tbsp cocoa powder'] }),
  buildCreami({ id: 'creami-cookie-dough-classic', title: 'Cookie Dough Protein Ice Cream', base: 'whole-milk', flavor: 'cookie dough', mixIns: ['edible cookie dough chunks'] }),
  buildCreami({ id: 'creami-cookie-dough-greek', title: 'Greek Yogurt Cookie Dough Ice Cream', base: 'greek-yogurt', flavor: 'cookie dough', mixIns: ['mini chocolate chips', 'edible cookie dough'] }),
  buildCreami({ id: 'creami-cookie-dough-vegan', title: 'Vegan Cookie Dough Oat Ice Cream', base: 'oat', flavor: 'cookie dough', mixIns: ['vegan cookie dough chunks'] }),
  buildCreami({ id: 'creami-strawberry-fresh', title: 'Strawberry Protein Ice Cream', base: 'whole-milk', flavor: 'strawberry', extraIngredients: ['0.5 cup hulled strawberries, mashed'] }),
  buildCreami({ id: 'creami-strawberry-greek', title: 'Greek Yogurt Strawberry Ice Cream', base: 'greek-yogurt', flavor: 'strawberry', extraIngredients: ['0.5 cup strawberry puree'] }),
  buildCreami({ id: 'creami-mango-coconut', title: 'Mango Coconut Protein Ice Cream', base: 'oat', flavor: 'mango-coconut', extraIngredients: ['0.5 cup mango puree', '2 tbsp coconut cream'] }),
  buildCreami({ id: 'creami-blueberry-greek', title: 'Blueberry Greek Yogurt Ice Cream', base: 'greek-yogurt', flavor: 'blueberry', extraIngredients: ['0.5 cup blueberries'] }),
  buildCreami({ id: 'creami-mixed-berry-shake', title: 'Mixed Berry Protein Shake Ice Cream', base: 'protein-shake', flavor: 'mixed berry', extraIngredients: ['0.5 cup frozen mixed berries'] }),
  buildCreami({ id: 'creami-banana-pb', title: 'Banana Peanut Butter Ice Cream', base: 'whole-milk', flavor: 'banana-peanut-butter', extraIngredients: ['1 ripe banana', '2 tbsp peanut butter'] }),
  buildCreami({ id: 'creami-matcha-classic', title: 'Matcha Protein Ice Cream', base: 'whole-milk', flavor: 'matcha', extraIngredients: ['1 tbsp ceremonial matcha powder'], cuisine: 'Japanese' }),
  buildCreami({ id: 'creami-matcha-oat', title: 'Vegan Matcha Oat Ice Cream', base: 'oat', flavor: 'matcha', extraIngredients: ['1 tbsp matcha powder'], cuisine: 'Japanese' }),
  buildCreami({ id: 'creami-coffee-mocha', title: 'Coffee Mocha Protein Ice Cream', base: 'whole-milk', flavor: 'coffee-mocha', extraIngredients: ['2 tbsp espresso powder', '1 tbsp cocoa'] }),
  buildCreami({ id: 'creami-cinnamon-roll', title: 'Cinnamon Roll Protein Ice Cream', base: 'whole-milk', flavor: 'cinnamon roll', extraIngredients: ['1 tsp cinnamon'], mixIns: ['cinnamon swirl sauce'] }),
  buildCreami({ id: 'creami-pumpkin-spice', title: 'Pumpkin Spice Greek Yogurt Ice Cream', base: 'greek-yogurt', flavor: 'pumpkin spice', extraIngredients: ['0.5 cup pumpkin puree', '1 tsp pumpkin spice'] }),
  buildCreami({ id: 'creami-mint-chip', title: 'Mint Chocolate Chip Protein Ice Cream', base: 'whole-milk', flavor: 'mint', extraIngredients: ['0.25 tsp mint extract'], mixIns: ['dark chocolate chips'] }),
  buildCreami({ id: 'creami-rocky-road', title: 'Rocky Road Protein Ice Cream', base: 'whole-milk', flavor: 'cocoa', extraIngredients: ['2 tbsp cocoa powder'], mixIns: ['mini marshmallows', 'almonds'] }),
  buildCreami({ id: 'creami-cookies-cream', title: 'Cookies and Cream Protein Ice Cream', base: 'whole-milk', flavor: 'vanilla', mixIns: ['crushed chocolate sandwich cookies'] }),
  buildCreami({ id: 'creami-salted-caramel', title: 'Salted Caramel Protein Ice Cream', base: 'whole-milk', flavor: 'caramel', extraIngredients: ['2 tbsp caramel sauce', '0.25 tsp flaky sea salt'] }),
  buildCreami({ id: 'creami-pistachio', title: 'Pistachio Protein Ice Cream', base: 'whole-milk', flavor: 'pistachio', extraIngredients: ['0.25 cup pistachio paste'] }),
  buildCreami({ id: 'creami-chai-oat', title: 'Vegan Chai Oat Ice Cream', base: 'oat', flavor: 'chai', extraIngredients: ['1 tsp chai spice blend'] }),
  buildCreami({ id: 'creami-honey-lavender', title: 'Honey Lavender Greek Ice Cream', base: 'greek-yogurt', flavor: 'honey-lavender', extraIngredients: ['1 tbsp dried culinary lavender', '2 tbsp honey'] }),
  buildCreami({ id: 'creami-raspberry-shake', title: 'Raspberry Protein Shake Ice Cream', base: 'protein-shake', flavor: 'raspberry', extraIngredients: ['0.5 cup raspberries'] }),
  buildCreami({ id: 'creami-apple-pie', title: 'Apple Pie Protein Ice Cream', base: 'whole-milk', flavor: 'apple pie', extraIngredients: ['0.5 cup spiced apple compote'], mixIns: ['graham cracker crumbs'] }),
  buildCreami({ id: 'creami-tiramisu', title: 'Tiramisu Protein Ice Cream', base: 'whole-milk', flavor: 'tiramisu', extraIngredients: ['1 tbsp espresso', '1 tsp marsala extract'], mixIns: ['ladyfinger crumbles', 'cocoa dust'], cuisine: 'Italian' }),
];

// ────────────────────────────────────────────────────────────────────────────
// Air Fryer — 25 recipes
// ────────────────────────────────────────────────────────────────────────────

interface AfInput {
  id: string;
  title: string;
  cuisine: string;
  mealType: string;
  ingredients: string[];
  steps: string[];
}

const buildAirFryer = (i: AfInput): ApplianceRecipe => ({
  id: i.id,
  title: i.title,
  description: `${i.title} — air-fryer weeknight, 20 min or less.`,
  cuisine: i.cuisine,
  mealType: i.mealType,
  cookTime: 20,
  servings: 2,
  difficulty: 'easy',
  calories: 380,
  protein: 28,
  carbs: 24,
  fat: 18,
  fiber: 3,
  ingredients: i.ingredients,
  instructions: i.steps,
  appliances: appliancesJson('air_fryer'),
});

const airFryerSeeds = (): ApplianceRecipe[] => [
  buildAirFryer({ id: 'af-buffalo-wings', title: 'Air Fryer Buffalo Wings', cuisine: 'American', mealType: 'snack', ingredients: ['1.5 lb chicken wings', '1 tsp baking powder', 'salt + pepper', '0.25 cup buffalo sauce', '2 tbsp butter'], steps: ['Pat wings dry, toss with baking powder + salt.', 'Air-fry 400°F for 22 minutes, flipping halfway.', 'Toss with melted butter + buffalo sauce.'] }),
  buildAirFryer({ id: 'af-lemon-pepper-wings', title: 'Lemon Pepper Air-Fryer Wings', cuisine: 'American', mealType: 'snack', ingredients: ['1.5 lb wings', '2 tbsp lemon pepper seasoning', '1 tbsp olive oil'], steps: ['Toss wings with oil + lemon pepper.', 'Air-fry 400°F for 22 minutes.', 'Squeeze fresh lemon over before serving.'] }),
  buildAirFryer({ id: 'af-soy-garlic-wings', title: 'Soy-Garlic Air-Fryer Wings', cuisine: 'Korean', mealType: 'snack', ingredients: ['1.5 lb wings', '0.25 cup soy sauce', '3 cloves garlic', '2 tbsp brown sugar', '1 tbsp rice vinegar'], steps: ['Toss wings with cornstarch.', 'Air-fry 400°F for 22 minutes.', 'Simmer glaze ingredients; toss wings to coat.'] }),
  buildAirFryer({ id: 'af-french-fries', title: 'Crispy Air-Fryer French Fries', cuisine: 'American', mealType: 'snack', ingredients: ['2 large russet potatoes', '1 tbsp olive oil', 'kosher salt'], steps: ['Cut potatoes into 0.25-inch fries; soak 20 min in cold water.', 'Pat dry, toss with oil.', 'Air-fry 380°F for 18 minutes, shaking twice.'] }),
  buildAirFryer({ id: 'af-sweet-potato-fries', title: 'Air-Fryer Sweet Potato Fries', cuisine: 'American', mealType: 'snack', ingredients: ['2 sweet potatoes', '1 tbsp avocado oil', '1 tsp smoked paprika'], steps: ['Cut into fries, toss with oil + paprika.', 'Air-fry 380°F for 16 minutes, tossing halfway.', 'Salt immediately.'] }),
  buildAirFryer({ id: 'af-zucchini-fries', title: 'Parmesan Zucchini Fries (Air Fryer)', cuisine: 'Italian', mealType: 'snack', ingredients: ['2 zucchini', '1 cup panko', '0.25 cup parmesan', '1 egg'], steps: ['Cut zucchini into sticks.', 'Dredge in egg, then panko-parmesan mix.', 'Air-fry 400°F for 8 minutes until golden.'] }),
  buildAirFryer({ id: 'af-chicken-thighs', title: 'Crispy Air-Fryer Chicken Thighs', cuisine: 'American', mealType: 'dinner', ingredients: ['4 bone-in chicken thighs', '1 tbsp olive oil', 'salt + pepper + paprika'], steps: ['Pat thighs dry; season generously.', 'Air-fry skin-side-up at 400°F for 22 minutes until 165°F.', 'Rest 5 minutes.'] }),
  buildAirFryer({ id: 'af-chicken-tenders', title: 'Air-Fryer Chicken Tenders', cuisine: 'American', mealType: 'dinner', ingredients: ['1 lb chicken tenders', '1 cup panko', '0.5 cup flour', '1 egg', 'salt + pepper'], steps: ['Dredge tenders: flour → egg → panko.', 'Air-fry 400°F for 12 minutes, flipping halfway.', 'Rest 2 minutes; serve.'] }),
  buildAirFryer({ id: 'af-chicken-breast', title: 'Juicy Air-Fryer Chicken Breast', cuisine: 'American', mealType: 'dinner', ingredients: ['2 chicken breasts', '1 tbsp olive oil', 'Italian seasoning', 'salt + pepper'], steps: ['Pound breasts to even thickness; oil + season.', 'Air-fry 380°F for 14 minutes (165°F internal).', 'Rest 5 minutes; slice.'] }),
  buildAirFryer({ id: 'af-brussels-sprouts', title: 'Crispy Air-Fryer Brussels Sprouts', cuisine: 'American', mealType: 'dinner', ingredients: ['1 lb brussels sprouts', '1 tbsp olive oil', '1 tsp salt'], steps: ['Halve sprouts; toss with oil + salt.', 'Air-fry 390°F for 14 minutes, shaking twice.', 'Finish with lemon + flaky salt.'] }),
  buildAirFryer({ id: 'af-balsamic-brussels', title: 'Balsamic Honey Brussels (Air Fryer)', cuisine: 'American', mealType: 'dinner', ingredients: ['1 lb brussels', '2 tbsp balsamic glaze', '1 tbsp honey', '1 tbsp olive oil'], steps: ['Halve and oil sprouts.', 'Air-fry 390°F for 12 minutes.', 'Toss with balsamic + honey; air-fry 2 more minutes.'] }),
  buildAirFryer({ id: 'af-broccoli', title: 'Air-Fryer Lemon Broccoli', cuisine: 'American', mealType: 'dinner', ingredients: ['1 head broccoli (florets)', '1 tbsp olive oil', '1 lemon', 'salt'], steps: ['Toss florets with oil + salt.', 'Air-fry 400°F for 8 minutes, shaking once.', 'Squeeze lemon over before serving.'] }),
  buildAirFryer({ id: 'af-cauliflower', title: 'Spiced Air-Fryer Cauliflower', cuisine: 'Indian', mealType: 'dinner', ingredients: ['1 head cauliflower', '1 tbsp ghee', '1 tsp curry powder', '0.5 tsp turmeric', 'salt'], steps: ['Toss florets with ghee + spices.', 'Air-fry 380°F for 14 minutes, shaking halfway.', 'Squeeze lime over to serve.'] }),
  buildAirFryer({ id: 'af-asparagus', title: 'Air-Fryer Lemon Garlic Asparagus', cuisine: 'American', mealType: 'dinner', ingredients: ['1 bunch asparagus', '1 tbsp olive oil', '2 cloves garlic', '1 lemon'], steps: ['Trim asparagus; toss with oil + minced garlic.', 'Air-fry 380°F for 7 minutes.', 'Squeeze lemon to serve.'] }),
  buildAirFryer({ id: 'af-salmon-honey', title: 'Honey-Glazed Air-Fryer Salmon', cuisine: 'American', mealType: 'dinner', ingredients: ['2 salmon fillets', '2 tbsp honey', '1 tbsp soy sauce', '1 tsp grated ginger'], steps: ['Brush salmon with glaze.', 'Air-fry 400°F for 8 minutes.', 'Brush with remaining glaze; rest 1 minute.'] }),
  buildAirFryer({ id: 'af-cod', title: 'Air-Fryer Lemon Pepper Cod', cuisine: 'American', mealType: 'dinner', ingredients: ['2 cod fillets', '1 tbsp olive oil', 'lemon pepper seasoning'], steps: ['Pat cod dry; oil + season.', 'Air-fry 400°F for 9 minutes.', 'Serve with lemon wedges.'] }),
  buildAirFryer({ id: 'af-shrimp', title: 'Garlic Butter Air-Fryer Shrimp', cuisine: 'American', mealType: 'dinner', ingredients: ['1 lb shrimp', '2 tbsp butter', '3 cloves garlic', 'parsley'], steps: ['Toss shrimp with melted garlic butter.', 'Air-fry 400°F for 6 minutes.', 'Garnish with parsley.'] }),
  buildAirFryer({ id: 'af-tofu-crispy', title: 'Crispy Air-Fryer Tofu', cuisine: 'Asian', mealType: 'dinner', ingredients: ['14 oz extra-firm tofu', '2 tbsp cornstarch', '1 tbsp soy sauce', '1 tsp sesame oil'], steps: ['Press tofu 15 minutes; cube.', 'Toss with cornstarch + sauces.', 'Air-fry 400°F for 14 minutes, tossing halfway.'] }),
  buildAirFryer({ id: 'af-tofu-buffalo', title: 'Buffalo Tofu Bites (Air Fryer)', cuisine: 'American', mealType: 'snack', ingredients: ['14 oz extra-firm tofu', '0.25 cup buffalo sauce', '2 tbsp cornstarch'], steps: ['Cube tofu; toss with cornstarch.', 'Air-fry 400°F for 14 minutes.', 'Toss with buffalo sauce; air-fry 2 more minutes.'] }),
  buildAirFryer({ id: 'af-veggie-egg-rolls', title: 'Air-Fryer Veggie Egg Rolls', cuisine: 'Chinese', mealType: 'snack', ingredients: ['8 egg roll wrappers', '2 cups shredded cabbage', '1 carrot grated', '2 tbsp soy sauce', '1 tsp sesame oil'], steps: ['Sauté veg + sauces; cool.', 'Roll into wrappers; brush with oil.', 'Air-fry 380°F for 8 minutes, flipping once.'] }),
  buildAirFryer({ id: 'af-mozzarella-sticks', title: 'Air-Fryer Mozzarella Sticks', cuisine: 'Italian', mealType: 'snack', ingredients: ['12 string cheese sticks', '1 cup panko', '0.5 cup flour', '2 eggs'], steps: ['Freeze cheese 1 hour; double-bread.', 'Air-fry 390°F for 6 minutes from frozen.', 'Serve with marinara.'] }),
  buildAirFryer({ id: 'af-bacon', title: 'Air-Fryer Bacon', cuisine: 'American', mealType: 'breakfast', ingredients: ['8 slices bacon'], steps: ['Lay bacon flat in basket.', 'Air-fry 380°F for 8 minutes for crisp.', 'Drain on paper towels.'] }),
  buildAirFryer({ id: 'af-eggplant-parmesan', title: 'Air-Fryer Eggplant Parmesan', cuisine: 'Italian', mealType: 'dinner', ingredients: ['1 eggplant', '1 cup panko', '0.5 cup parmesan', '1 cup marinara', '4 oz mozzarella', '1 egg'], steps: ['Slice eggplant; bread in egg + panko-parm.', 'Air-fry 380°F for 12 minutes.', 'Top with marinara + mozzarella; air-fry 4 minutes.'] }),
  buildAirFryer({ id: 'af-meatballs', title: 'Air-Fryer Italian Meatballs', cuisine: 'Italian', mealType: 'dinner', ingredients: ['1 lb ground beef', '0.5 cup breadcrumbs', '1 egg', '0.25 cup parmesan', 'parsley'], steps: ['Mix all; form into 1.5-inch balls.', 'Air-fry 380°F for 11 minutes.', 'Toss in marinara.'] }),
  buildAirFryer({ id: 'af-zucchini-chips', title: 'Crispy Air-Fryer Zucchini Chips', cuisine: 'American', mealType: 'snack', ingredients: ['2 zucchini', '1 tbsp olive oil', 'salt + pepper'], steps: ['Slice zucchini thin; oil + season.', 'Air-fry 360°F for 14 minutes, flipping halfway.', 'Cool to crisp.'] }),
  buildAirFryer({ id: 'af-falafel', title: 'Air-Fryer Falafel', cuisine: 'Middle Eastern', mealType: 'dinner', ingredients: ['1 can chickpeas', '0.25 cup parsley', '2 cloves garlic', '0.5 tsp cumin', '2 tbsp flour'], steps: ['Pulse all in a processor.', 'Form 12 balls; brush with oil.', 'Air-fry 380°F for 14 minutes.'] }),
];

// ────────────────────────────────────────────────────────────────────────────
// Waffle Maker — 20 recipes
// ────────────────────────────────────────────────────────────────────────────

interface WafInput {
  id: string;
  title: string;
  cuisine: string;
  mealType: string;
  ingredients: string[];
  steps: string[];
  cookMinutes?: number;
}

const buildWaffle = (i: WafInput): ApplianceRecipe => ({
  id: i.id,
  title: i.title,
  description: `${i.title} — pressed in the waffle iron.`,
  cuisine: i.cuisine,
  mealType: i.mealType,
  cookTime: i.cookMinutes ?? 15,
  servings: 2,
  difficulty: 'easy',
  calories: 320,
  protein: 14,
  carbs: 38,
  fat: 14,
  fiber: 2,
  ingredients: i.ingredients,
  instructions: i.steps,
  appliances: appliancesJson('waffle_maker'),
});

const waffleSeeds = (): ApplianceRecipe[] => [
  buildWaffle({ id: 'wm-classic-buttermilk', title: 'Classic Buttermilk Waffles', cuisine: 'American', mealType: 'breakfast', ingredients: ['2 cups flour', '2 cups buttermilk', '2 eggs', '4 tbsp butter melted', '2 tbsp sugar', '1 tsp baking soda'], steps: ['Whisk dry; whisk wet; combine.', 'Preheat waffle iron; brush with butter.', 'Cook each waffle 4 minutes until golden.'] }),
  buildWaffle({ id: 'wm-belgian', title: 'Belgian Yeast Waffles', cuisine: 'Belgian', mealType: 'breakfast', ingredients: ['2 cups flour', '1.5 cups warm milk', '2 eggs', '4 tbsp butter', '1 tsp instant yeast', '1 tbsp sugar'], steps: ['Mix and rest batter 1 hour.', 'Cook in deep waffle iron 5 minutes.', 'Serve with whipped cream + berries.'] }),
  buildWaffle({ id: 'wm-protein', title: 'Protein Power Waffles', cuisine: 'American', mealType: 'breakfast', ingredients: ['1 cup oat flour', '1 scoop vanilla protein', '1 cup milk', '2 eggs', '1 tsp baking powder'], steps: ['Whisk all into a smooth batter.', 'Cook in waffle iron 4 minutes.', 'Top with Greek yogurt + berries.'] }),
  buildWaffle({ id: 'wm-chaffle-classic', title: 'Classic Cheddar Chaffle', cuisine: 'American', mealType: 'breakfast', ingredients: ['1 large egg', '0.5 cup shredded cheddar', '1 tbsp almond flour'], steps: ['Whisk egg + cheese + flour.', 'Pour into a preheated waffle maker; cook 3 minutes.', 'Use the chaffle as a low-carb sandwich bread.'] }),
  buildWaffle({ id: 'wm-chaffle-pizza', title: 'Pizza Chaffle', cuisine: 'Italian', mealType: 'lunch', ingredients: ['1 egg', '0.5 cup mozzarella', '1 tbsp marinara', 'pepperoni'], steps: ['Whisk egg + mozz; cook in waffle iron 3 minutes for a chaffle.', 'Top with marinara + pepperoni; broil 1 minute.'] }),
  buildWaffle({ id: 'wm-hash-brown', title: 'Hash Brown Waffles', cuisine: 'American', mealType: 'breakfast', ingredients: ['3 cups shredded russet potato', '1 egg', '0.25 cup grated parmesan', 'salt + pepper'], steps: ['Squeeze potato dry in a towel.', 'Mix with egg + parm.', 'Press in waffle iron 6 minutes until crisp.'] }),
  buildWaffle({ id: 'wm-cornbread', title: 'Cornbread Waffles', cuisine: 'American', mealType: 'dinner', ingredients: ['1 cup cornmeal', '1 cup flour', '1 cup buttermilk', '1 egg', '4 tbsp butter', '2 tbsp honey', '1 tsp baking powder'], steps: ['Whisk dry; whisk wet; combine.', 'Cook in waffle iron 4 minutes.', 'Serve with chili or honey butter.'] }),
  buildWaffle({ id: 'wm-cornbread-jalapeno', title: 'Jalapeño Cheddar Cornbread Waffles', cuisine: 'American', mealType: 'dinner', ingredients: ['1 cup cornmeal', '1 cup flour', '1 cup buttermilk', '1 egg', '0.5 cup cheddar', '1 jalapeño minced', '1 tsp baking powder'], steps: ['Mix all in one bowl.', 'Cook in waffle iron 4 minutes.', 'Serve warm with butter.'] }),
  buildWaffle({ id: 'wm-brownie', title: 'Brownie Waffles', cuisine: 'American', mealType: 'dessert', ingredients: ['0.75 cup flour', '0.5 cup cocoa powder', '0.75 cup sugar', '2 eggs', '0.5 cup melted butter', '1 tsp vanilla'], steps: ['Whisk wet; fold in dry.', 'Cook in waffle iron 4 minutes.', 'Top with ice cream + chocolate sauce.'] }),
  buildWaffle({ id: 'wm-cinnamon-roll', title: 'Cinnamon Roll Waffles', cuisine: 'American', mealType: 'breakfast', ingredients: ['1 can refrigerated cinnamon rolls (8 ct)'], steps: ['Place each cinnamon roll in waffle iron.', 'Cook 3 minutes until crisp.', 'Drizzle with included frosting.'] }),
  buildWaffle({ id: 'wm-pumpkin', title: 'Pumpkin Spice Waffles', cuisine: 'American', mealType: 'breakfast', ingredients: ['2 cups flour', '0.5 cup pumpkin puree', '1 cup milk', '2 eggs', '4 tbsp butter', '1 tsp pumpkin spice', '2 tbsp brown sugar'], steps: ['Whisk all in one bowl.', 'Cook in waffle iron 4 minutes.', 'Top with maple syrup.'] }),
  buildWaffle({ id: 'wm-banana-walnut', title: 'Banana Walnut Waffles', cuisine: 'American', mealType: 'breakfast', ingredients: ['2 cups flour', '1 ripe banana mashed', '1.5 cups milk', '2 eggs', '0.5 cup walnuts', '1 tsp baking powder'], steps: ['Whisk; fold in walnuts.', 'Cook in waffle iron 4 minutes.', 'Drizzle with maple syrup.'] }),
  buildWaffle({ id: 'wm-blueberry-lemon', title: 'Blueberry Lemon Waffles', cuisine: 'American', mealType: 'breakfast', ingredients: ['2 cups flour', '1.5 cups milk', '2 eggs', '4 tbsp butter', '1 lemon zested', '1 cup blueberries', '1 tsp baking powder'], steps: ['Whisk; fold in zest + berries.', 'Cook in waffle iron 4 minutes per waffle.', 'Top with lemon glaze.'] }),
  buildWaffle({ id: 'wm-savory-chive', title: 'Savory Chive Goat Cheese Waffles', cuisine: 'American', mealType: 'lunch', ingredients: ['2 cups flour', '1.5 cups milk', '2 eggs', '4 tbsp butter', '0.25 cup chopped chives', '0.5 cup goat cheese', '1 tsp baking powder'], steps: ['Whisk; fold in chives + crumbled goat cheese.', 'Cook in waffle iron 4 minutes per waffle.', 'Top with smoked salmon.'] }),
  buildWaffle({ id: 'wm-buffalo-chicken-chaffle', title: 'Buffalo Chicken Chaffle', cuisine: 'American', mealType: 'lunch', ingredients: ['1 egg', '0.5 cup mozzarella', '0.5 cup shredded chicken', '2 tbsp buffalo sauce'], steps: ['Mix all in a bowl.', 'Cook in waffle iron 4 minutes for a savory chaffle.', 'Drizzle with extra buffalo + ranch.'] }),
  buildWaffle({ id: 'wm-ham-cheese-chaffle', title: 'Ham and Swiss Chaffle', cuisine: 'American', mealType: 'lunch', ingredients: ['1 egg', '0.5 cup swiss cheese', '0.5 cup diced ham'], steps: ['Whisk all; cook in waffle iron 3 minutes for a chaffle.', 'Sandwich with mustard.'] }),
  buildWaffle({ id: 'wm-mochi-waffle', title: 'Crispy Mochi Waffles', cuisine: 'Japanese', mealType: 'dessert', ingredients: ['1 cup mochiko (sweet rice flour)', '1 cup coconut milk', '1 egg', '0.25 cup sugar', '1 tsp matcha (optional)'], steps: ['Whisk all into a thin batter.', 'Cook in waffle iron 5 minutes for crisp shell.', 'Serve with sweetened condensed milk.'] }),
  buildWaffle({ id: 'wm-liege', title: 'Liège Pearl Sugar Waffles', cuisine: 'Belgian', mealType: 'breakfast', ingredients: ['2 cups flour', '0.5 cup pearl sugar', '0.75 cup warm milk', '2 eggs', '0.5 cup butter', '1 tsp instant yeast'], steps: ['Knead a stiff brioche dough; rest 1 hour.', 'Fold in pearl sugar.', 'Cook in waffle iron 4 minutes per waffle.'] }),
  buildWaffle({ id: 'wm-falafel-waffle', title: 'Falafel Waffles', cuisine: 'Middle Eastern', mealType: 'lunch', ingredients: ['1 can chickpeas', '0.25 cup parsley', '0.5 cup flour', '2 cloves garlic', '0.5 tsp cumin', '1 egg'], steps: ['Pulse all into a thick batter.', 'Press in waffle iron 5 minutes until crisp.', 'Serve with tahini sauce.'] }),
  buildWaffle({ id: 'wm-red-velvet', title: 'Red Velvet Waffles', cuisine: 'American', mealType: 'dessert', ingredients: ['2 cups flour', '2 tbsp cocoa', '1.5 cups buttermilk', '2 eggs', '0.25 cup butter', '2 tbsp red food color', '1 tsp baking powder', '0.25 cup sugar'], steps: ['Whisk all.', 'Cook in waffle iron 4 minutes.', 'Top with cream cheese glaze.'] }),
];

export const buildApplianceExpansionsSeed = (): ApplianceRecipe[] => [
  ...creamiSeeds(),
  ...airFryerSeeds(),
  ...waffleSeeds(),
];

export const filterByAppliance = <T extends { appliances?: string | null }>(
  recipes: T[],
  key: ApplianceKey,
): T[] => {
  const result: T[] = [];
  for (const r of recipes) {
    if (!r.appliances) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(r.appliances);
    } catch {
      continue;
    }
    if (!Array.isArray(parsed)) continue;
    if (parsed.includes(key)) result.push(r);
  }
  return result;
};

export const main = async (): Promise<void> => {
  const prisma = new PrismaClient();
  try {
    const seed = buildApplianceExpansionsSeed();
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
        appliances: r.appliances,
        source: 'database',
      };
      await prisma.recipe.upsert({
        where: { id: r.id },
        create: data,
        update: { appliances: r.appliances, description: r.description },
      });
      if (existing) updated += 1;
      else created += 1;
    }
    // eslint-disable-next-line no-console
    console.log(
      `seedApplianceExpansions: created=${created} updated=${updated} total=${seed.length}`,
    );
  } finally {
    await prisma.$disconnect();
  }
};

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('seedApplianceExpansions failed:', err);
    process.exit(1);
  });
}
