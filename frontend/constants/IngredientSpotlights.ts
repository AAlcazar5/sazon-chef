// frontend/constants/IngredientSpotlights.ts
// 52 weekly ingredient spotlights, indexed by ISO week number.
// ~17 entries tagged as fiber or omega-3 heroes (per ROADMAP_2.5 §3.5).

export interface IngredientSpotlight {
  ingredient: string;
  tagline: string;
  /** Search filter — tapping the card searches for this */
  searchFilter: string;
  fiberHighlight?: boolean;
  omega3Highlight?: boolean;
}

export const INGREDIENT_SPOTLIGHTS: IngredientSpotlight[] = [
  // Week 1–4 (Jan)
  { ingredient: 'Lentils', tagline: 'High in fiber and plant protein. A one-pot powerhouse.', searchFilter: 'lentil', fiberHighlight: true },
  { ingredient: 'Citrus', tagline: 'Peak-season oranges, lemons, and grapefruit. Vitamin C boost.', searchFilter: 'citrus' },
  { ingredient: 'Salmon', tagline: 'Rich in omega-3 fatty acids. Great for brain and heart health.', searchFilter: 'salmon', omega3Highlight: true },
  { ingredient: 'Sweet Potato', tagline: 'Naturally sweet, loaded with beta-carotene and fiber.', searchFilter: 'sweet potato', fiberHighlight: true },
  // Week 5–8 (Feb)
  { ingredient: 'Avocado', tagline: 'Heart-healthy fats, potassium, and 10g fiber per fruit.', searchFilter: 'avocado', fiberHighlight: true, omega3Highlight: true },
  { ingredient: 'Ginger', tagline: 'Anti-inflammatory root. Adds warmth to soups and stir-fries.', searchFilter: 'ginger' },
  { ingredient: 'Black Beans', tagline: '15g fiber per cup. The quiet hero of Latin cooking.', searchFilter: 'black bean', fiberHighlight: true },
  { ingredient: 'Turmeric', tagline: 'Curcumin-rich spice. Golden lattes, curries, and rice.', searchFilter: 'turmeric' },
  // Week 9–12 (Mar)
  { ingredient: 'Chia Seeds', tagline: '10g fiber per ounce + omega-3s. Add to smoothies or pudding.', searchFilter: 'chia', fiberHighlight: true, omega3Highlight: true },
  { ingredient: 'Asparagus', tagline: "Spring's signature vegetable. Rich in folate.", searchFilter: 'asparagus' },
  { ingredient: 'Oats', tagline: 'Beta-glucan fiber lowers cholesterol. Overnight oats are a 2-min meal.', searchFilter: 'oat', fiberHighlight: true },
  { ingredient: 'Spinach', tagline: 'Iron, calcium, and magnesium in every handful.', searchFilter: 'spinach' },
  // Week 13–16 (Apr)
  { ingredient: 'Chickpeas', tagline: '12g fiber per cup. Hummus, roasted, or in a curry.', searchFilter: 'chickpea', fiberHighlight: true },
  { ingredient: 'Miso', tagline: 'Probiotic-rich ferment. Adds umami depth to dressings and soups.', searchFilter: 'miso' },
  { ingredient: 'Walnuts', tagline: 'The only tree nut rich in omega-3 ALA. A brain food snack.', searchFilter: 'walnut', omega3Highlight: true },
  { ingredient: 'Peas', tagline: 'Spring peas are tiny fiber bombs: 9g per cup.', searchFilter: 'peas', fiberHighlight: true },
  // Week 17–20 (May)
  { ingredient: 'Flaxseed', tagline: 'Ground flax: omega-3s + lignans. Stir into yogurt or batter.', searchFilter: 'flax', fiberHighlight: true, omega3Highlight: true },
  { ingredient: 'Strawberry', tagline: 'Peak in May. Antioxidants and vitamin C.', searchFilter: 'strawberry' },
  { ingredient: 'Quinoa', tagline: 'Complete plant protein with 5g fiber per cup.', searchFilter: 'quinoa', fiberHighlight: true },
  { ingredient: 'Basil', tagline: 'Fresh herb season starts now. Pesto, caprese, Thai basil stir-fry.', searchFilter: 'basil' },
  // Week 21–24 (Jun)
  { ingredient: 'Sardines', tagline: 'Tiny fish, huge omega-3 payload. Sustainable protein.', searchFilter: 'sardine', omega3Highlight: true },
  { ingredient: 'Tomato', tagline: 'Lycopene peaks in summer. Salsas, salads, and roasted sauces.', searchFilter: 'tomato' },
  { ingredient: 'Broccoli', tagline: '5g fiber per cup + sulforaphane. Steam or roast for max nutrients.', searchFilter: 'broccoli', fiberHighlight: true },
  { ingredient: 'Corn', tagline: 'Summer staple. Grilled, in salads, or as elote.', searchFilter: 'corn' },
  // Week 25–28 (Jul)
  { ingredient: 'Hemp Seeds', tagline: 'Complete protein + omega-3s + omega-6s. Sprinkle on everything.', searchFilter: 'hemp', omega3Highlight: true },
  { ingredient: 'Zucchini', tagline: 'Grill it, spiralize it, bake it into bread. Versatile summer squash.', searchFilter: 'zucchini' },
  { ingredient: 'Edamame', tagline: '8g fiber + 17g protein per cup. The perfect snack.', searchFilter: 'edamame', fiberHighlight: true },
  { ingredient: 'Mango', tagline: 'Tropical sweetness meets vitamin A. Smoothie or salsa.', searchFilter: 'mango' },
  // Week 29–32 (Aug)
  { ingredient: 'Mackerel', tagline: 'Omega-3 content rivals salmon. Affordable and sustainable.', searchFilter: 'mackerel', omega3Highlight: true },
  { ingredient: 'Eggplant', tagline: 'Peak in late summer. Baba ganoush, parmigiana, grilled.', searchFilter: 'eggplant' },
  { ingredient: 'Brown Rice', tagline: 'Whole-grain fiber + manganese. A simple side that delivers.', searchFilter: 'brown rice', fiberHighlight: true },
  { ingredient: 'Peach', tagline: 'Stone fruit season. Grilled peach salad anyone?', searchFilter: 'peach' },
  // Week 33–36 (Sep)
  { ingredient: 'Brussels Sprouts', tagline: '4g fiber per cup. Roasted with balsamic = fall magic.', searchFilter: 'brussels sprout', fiberHighlight: true },
  { ingredient: 'Apple', tagline: 'Fall harvest. 4g fiber in the skin alone. Eat the whole thing.', searchFilter: 'apple', fiberHighlight: true },
  { ingredient: 'Tahini', tagline: 'Sesame-based richness. Iron, calcium, and healthy fats.', searchFilter: 'tahini' },
  { ingredient: 'Mushroom', tagline: 'Vitamin D, umami, and meaty texture. Sauté or roast.', searchFilter: 'mushroom' },
  // Week 37–40 (Oct)
  { ingredient: 'Pumpkin', tagline: 'Not just for pie — soups, risotto, and overnight oats.', searchFilter: 'pumpkin' },
  { ingredient: 'Cauliflower', tagline: 'Rice it, mash it, roast it whole. Low-carb, high-vitamin C.', searchFilter: 'cauliflower' },
  { ingredient: 'Kidney Beans', tagline: '13g fiber per cup. Essential for chili and Rajma.', searchFilter: 'kidney bean', fiberHighlight: true },
  { ingredient: 'Cranberry', tagline: 'Fall superfruit. Dried in salads or fresh in sauces.', searchFilter: 'cranberry' },
  // Week 41–44 (Nov)
  { ingredient: 'Butternut Squash', tagline: 'Creamy, sweet, and packed with vitamin A.', searchFilter: 'butternut squash' },
  { ingredient: 'Kale', tagline: 'Fiber, iron, and calcium. Massage it for salads, braise it for sides.', searchFilter: 'kale', fiberHighlight: true },
  { ingredient: 'Pecans', tagline: 'Heart-healthy fats and a touch of omega-3. Perfect for baking.', searchFilter: 'pecan', omega3Highlight: true },
  { ingredient: 'Pomegranate', tagline: 'Antioxidant jewels. Top yogurt, salads, or grain bowls.', searchFilter: 'pomegranate' },
  // Week 45–48 (Dec)
  { ingredient: 'Split Peas', tagline: '16g fiber per cup. Dal or split pea soup = winter comfort.', searchFilter: 'split pea', fiberHighlight: true },
  { ingredient: 'Coconut', tagline: 'Healthy fats and tropical flavor. Curries, baking, smoothies.', searchFilter: 'coconut' },
  { ingredient: 'Cinnamon', tagline: 'Blood sugar support + warmth. Lattes, oatmeal, roasted veg.', searchFilter: 'cinnamon' },
  { ingredient: 'Beet', tagline: 'Nitrates for blood flow, fiber for the gut. Roast or juice.', searchFilter: 'beet', fiberHighlight: true },
  // Week 49–52 (Late Dec)
  { ingredient: 'Dark Chocolate', tagline: '70%+ cacao: flavanols, iron, and magnesium. Treat yourself.', searchFilter: 'chocolate' },
  { ingredient: 'Garlic', tagline: 'Allicin: the compound that makes everything taste (and feel) better.', searchFilter: 'garlic' },
  { ingredient: 'Artichoke', tagline: '10g fiber each. Steamed with lemon butter = perfection.', searchFilter: 'artichoke', fiberHighlight: true },
  { ingredient: 'Rosemary', tagline: 'Aromatic herb for roasts, breads, and focaccia.', searchFilter: 'rosemary' },
];

/** Get this week's spotlight (deterministic — based on ISO week number) */
export function getWeeklySpotlight(): IngredientSpotlight {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.floor(dayOfYear / 7);
  return INGREDIENT_SPOTLIGHTS[weekNumber % INGREDIENT_SPOTLIGHTS.length];
}
