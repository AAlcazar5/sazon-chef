// Group 10S: Kitchen IQ — curated knowledge cards.
// Each card declares personalizationKeys so the browse screen ranks by user
// state (cuisine affinity × nutrient gap × ingredient frequency × skill tier),
// not alphabetically.

export type KitchenIQCardType = 'nutrient' | 'ingredient' | 'concept' | 'cuisine_health';
export type KitchenIQSkillTier = 'beginner' | 'cook' | 'chef';
export type KitchenIQVisual = 'icon_list' | 'comparison' | 'scale';

export interface KitchenIQSection {
  heading: string;
  body: string;
  visual?: KitchenIQVisual;
}

export interface KitchenIQTopFood {
  name: string;
  amount: string;
  dvPercent: number;
}

export interface KitchenIQUnlockCondition {
  type: 'cook_count' | 'cuisine_count' | 'ingredient_used' | 'none';
  threshold?: number;
  value?: string;
}

export interface KitchenIQPersonalizationKeys {
  cuisine: string[];
  nutrient: string[];
  ingredient: string[];
  skillTier: KitchenIQSkillTier[];
}

export interface KitchenIQCard {
  id: string;
  type: KitchenIQCardType;
  title: string;
  subtitle: string;
  heroEmoji: string;
  sections: KitchenIQSection[];
  topFoods: KitchenIQTopFood[];
  recipes: string[];
  tags: string[];
  personalizationKeys: KitchenIQPersonalizationKeys;
  unlockCondition?: KitchenIQUnlockCondition;
}

const ALL_TIERS: KitchenIQSkillTier[] = ['beginner', 'cook', 'chef'];

export const KITCHEN_IQ_CARDS: KitchenIQCard[] = [
  // ───────── Nutrient deep dives (12) ─────────
  {
    id: 'nut-magnesium',
    type: 'nutrient',
    title: 'Your Body on Magnesium',
    subtitle: 'The mineral 68% of people are low on',
    heroEmoji: '🧲',
    sections: [
      {
        heading: 'What it does',
        body: 'Magnesium powers 300+ enzyme reactions — muscle recovery, nerve signaling, sleep regulation, blood pressure. Low intake links to cramps, anxiety, and poor sleep.',
      },
      {
        heading: 'How much you need',
        body: 'Adults need 310–420mg/day. Most people get 60–70% of that. Athletes, heavy sweaters, and high-stress people need more.',
        visual: 'scale',
      },
    ],
    topFoods: [
      { name: 'Pumpkin seeds', amount: '1 oz', dvPercent: 37 },
      { name: 'Dark chocolate (70%+)', amount: '1 oz', dvPercent: 16 },
      { name: 'Spinach (cooked)', amount: '½ cup', dvPercent: 19 },
      { name: 'Almonds', amount: '1 oz', dvPercent: 19 },
      { name: 'Black beans', amount: '½ cup', dvPercent: 14 },
    ],
    recipes: [],
    tags: ['magnesium', 'mineral', 'sleep', 'recovery'],
    personalizationKeys: {
      cuisine: ['mexican', 'middle eastern'],
      nutrient: ['magnesium'],
      ingredient: ['pumpkin seeds', 'spinach', 'black beans'],
      skillTier: ALL_TIERS,
    },
    unlockCondition: { type: 'cook_count', threshold: 5 },
  },
  {
    id: 'nut-iron',
    type: 'nutrient',
    title: 'Your Body on Iron',
    subtitle: 'Energy, oxygen, and the absorption tricks nobody teaches',
    heroEmoji: '🔥',
    sections: [
      {
        heading: 'Two kinds of iron',
        body: 'Heme iron (animal sources) absorbs at ~25%. Non-heme (plant sources) absorbs at 5–12% — but pair with vitamin C and you triple it.',
        visual: 'comparison',
      },
      {
        heading: 'Blockers and boosters',
        body: 'Coffee and tea cut iron absorption up to 60% if drunk with meals. Calcium also blocks. Vitamin C (lemon, peppers, tomato) boosts.',
      },
    ],
    topFoods: [
      { name: 'Beef (cooked)', amount: '3 oz', dvPercent: 14 },
      { name: 'Lentils (cooked)', amount: '½ cup', dvPercent: 17 },
      { name: 'Spinach + lemon', amount: '1 cup cooked', dvPercent: 36 },
      { name: 'Dark chocolate (70%+)', amount: '1 oz', dvPercent: 19 },
      { name: 'Oysters', amount: '3 oz', dvPercent: 44 },
    ],
    recipes: [],
    tags: ['iron', 'mineral', 'energy', 'anemia'],
    personalizationKeys: {
      cuisine: ['indian', 'mediterranean'],
      nutrient: ['iron'],
      ingredient: ['spinach', 'lentils', 'beef'],
      skillTier: ALL_TIERS,
    },
    unlockCondition: { type: 'cook_count', threshold: 15 },
  },
  {
    id: 'nut-zinc',
    type: 'nutrient',
    title: 'Your Body on Zinc',
    subtitle: 'Immunity, wound healing, taste — and why athletes need extra',
    heroEmoji: '🛡️',
    sections: [
      {
        heading: 'Why it matters',
        body: 'Zinc runs your immune system, repairs tissue, and protects sperm and skin. Heavy training depletes it through sweat — endurance athletes routinely run low.',
      },
    ],
    topFoods: [
      { name: 'Oysters', amount: '3 oz', dvPercent: 673 },
      { name: 'Beef chuck roast', amount: '3 oz', dvPercent: 64 },
      { name: 'Pumpkin seeds', amount: '1 oz', dvPercent: 21 },
      { name: 'Chickpeas', amount: '½ cup', dvPercent: 12 },
      { name: 'Cashews', amount: '1 oz', dvPercent: 14 },
    ],
    recipes: [],
    tags: ['zinc', 'mineral', 'immunity'],
    personalizationKeys: {
      cuisine: ['french', 'japanese'],
      nutrient: ['zinc'],
      ingredient: ['oysters', 'beef', 'pumpkin seeds'],
      skillTier: ['cook', 'chef'],
    },
    unlockCondition: { type: 'cook_count', threshold: 15 },
  },
  {
    id: 'nut-omega3',
    type: 'nutrient',
    title: 'Your Body on Omega-3s',
    subtitle: 'EPA, DHA, ALA — what they actually do',
    heroEmoji: '🐟',
    sections: [
      {
        heading: 'The three forms',
        body: 'EPA and DHA from fish go straight to brain and heart tissue. ALA from flax/chia/walnuts converts to EPA/DHA at only ~5–10% — eat more if you skip fish.',
        visual: 'comparison',
      },
    ],
    topFoods: [
      { name: 'Salmon (wild)', amount: '3 oz', dvPercent: 100 },
      { name: 'Sardines', amount: '3 oz', dvPercent: 87 },
      { name: 'Walnuts', amount: '1 oz', dvPercent: 161 },
      { name: 'Ground flax', amount: '1 tbsp', dvPercent: 105 },
      { name: 'Chia seeds', amount: '1 tbsp', dvPercent: 89 },
    ],
    recipes: [],
    tags: ['omega-3', 'epa', 'dha', 'fat', 'brain'],
    personalizationKeys: {
      cuisine: ['japanese', 'mediterranean'],
      nutrient: ['omega-3'],
      ingredient: ['salmon', 'sardines', 'walnuts', 'chia seeds'],
      skillTier: ALL_TIERS,
    },
    unlockCondition: { type: 'cook_count', threshold: 15 },
  },
  {
    id: 'nut-fiber',
    type: 'nutrient',
    title: 'Your Body on Fiber',
    subtitle: 'Soluble vs insoluble — and the 30g target most people miss',
    heroEmoji: '🌾',
    sections: [
      {
        heading: 'Two roles',
        body: 'Soluble fiber (oats, beans, apples) feeds gut bacteria and slows sugar. Insoluble fiber (whole grains, veg skins) keeps bowels moving. You need both.',
        visual: 'comparison',
      },
      {
        heading: 'How much',
        body: 'Target 25g (women) / 38g (men). Average American gets 15g. Add a handful of beans, chia, or berries to any meal to close the gap.',
      },
    ],
    topFoods: [
      { name: 'Lentils (cooked)', amount: '½ cup', dvPercent: 28 },
      { name: 'Chia seeds', amount: '1 tbsp', dvPercent: 14 },
      { name: 'Avocado', amount: '½ medium', dvPercent: 25 },
      { name: 'Oats (rolled)', amount: '½ cup dry', dvPercent: 14 },
      { name: 'Black beans', amount: '½ cup', dvPercent: 30 },
    ],
    recipes: [],
    tags: ['fiber', 'gut', 'satiety'],
    personalizationKeys: {
      cuisine: ['mexican', 'mediterranean'],
      nutrient: ['fiber'],
      ingredient: ['lentils', 'chia seeds', 'oats', 'beans'],
      skillTier: ALL_TIERS,
    },
    unlockCondition: { type: 'cook_count', threshold: 5 },
  },
  {
    id: 'nut-potassium',
    type: 'nutrient',
    title: 'Your Body on Potassium',
    subtitle: 'Not just bananas — the mineral that balances sodium',
    heroEmoji: '🍠',
    sections: [
      {
        heading: 'Why it matters',
        body: 'Potassium offsets sodium, lowers blood pressure, and powers muscle function. Sweet potato, white beans, and spinach all out-perform a banana.',
      },
    ],
    topFoods: [
      { name: 'Sweet potato (baked)', amount: '1 medium', dvPercent: 12 },
      { name: 'White beans', amount: '½ cup', dvPercent: 13 },
      { name: 'Spinach (cooked)', amount: '½ cup', dvPercent: 9 },
      { name: 'Banana', amount: '1 medium', dvPercent: 9 },
      { name: 'Avocado', amount: '½ medium', dvPercent: 10 },
    ],
    recipes: [],
    tags: ['potassium', 'mineral', 'blood pressure'],
    personalizationKeys: {
      cuisine: ['american', 'caribbean'],
      nutrient: ['potassium'],
      ingredient: ['sweet potato', 'white beans', 'spinach'],
      skillTier: ALL_TIERS,
    },
    unlockCondition: { type: 'cook_count', threshold: 10 },
  },
  {
    id: 'nut-b12',
    type: 'nutrient',
    title: 'Your Body on B12',
    subtitle: 'Energy, nerves, and why plant-based eaters must supplement',
    heroEmoji: '⚡',
    sections: [
      {
        heading: 'The plant-based gap',
        body: 'B12 is made by bacteria — only animal foods reliably contain it. Plant-based eaters need fortified foods (nutritional yeast, plant milks) or a supplement.',
      },
    ],
    topFoods: [
      { name: 'Clams', amount: '3 oz', dvPercent: 1402 },
      { name: 'Beef liver', amount: '3 oz', dvPercent: 2944 },
      { name: 'Salmon', amount: '3 oz', dvPercent: 80 },
      { name: 'Nutritional yeast (fortified)', amount: '1 tbsp', dvPercent: 130 },
      { name: 'Eggs', amount: '2 large', dvPercent: 38 },
    ],
    recipes: [],
    tags: ['b12', 'vitamin', 'energy'],
    personalizationKeys: {
      cuisine: [],
      nutrient: ['b12'],
      ingredient: ['nutritional yeast', 'salmon', 'eggs'],
      skillTier: ['cook', 'chef'],
    },
    unlockCondition: { type: 'cook_count', threshold: 10 },
  },
  {
    id: 'nut-vitamin-d',
    type: 'nutrient',
    title: 'Your Body on Vitamin D',
    subtitle: 'The sunshine vitamin most people are low on',
    heroEmoji: '☀️',
    sections: [
      {
        heading: 'Bone, immune, mood',
        body: 'Vitamin D regulates calcium absorption, immune defense, and mood. Most adults are deficient — especially in winter, indoors, and at higher latitudes.',
      },
    ],
    topFoods: [
      { name: 'Salmon (wild)', amount: '3 oz', dvPercent: 71 },
      { name: 'Trout', amount: '3 oz', dvPercent: 81 },
      { name: 'Egg yolks', amount: '2 large', dvPercent: 11 },
      { name: 'Fortified milk', amount: '1 cup', dvPercent: 15 },
      { name: 'UV-exposed mushrooms', amount: '1 cup', dvPercent: 18 },
    ],
    recipes: [],
    tags: ['vitamin d', 'sunshine', 'bone'],
    personalizationKeys: {
      cuisine: ['japanese', 'mediterranean'],
      nutrient: ['vitamin d'],
      ingredient: ['salmon', 'eggs', 'mushrooms'],
      skillTier: ALL_TIERS,
    },
    unlockCondition: { type: 'cook_count', threshold: 10 },
  },
  {
    id: 'nut-protein',
    type: 'nutrient',
    title: 'Your Body on Protein',
    subtitle: 'How much you actually need (and the timing myths)',
    heroEmoji: '🧬',
    sections: [
      {
        heading: 'The real target',
        body: 'Active adults need 0.7–1g protein per pound of bodyweight. Daily total matters far more than meal timing — the "anabolic window" is mostly myth.',
        visual: 'scale',
      },
      {
        heading: 'Per-meal threshold',
        body: 'Hit ~30g protein per meal to fully trigger muscle synthesis. Spread across 3–4 meals beats two big ones.',
      },
    ],
    topFoods: [
      { name: 'Chicken breast', amount: '3 oz', dvPercent: 52 },
      { name: 'Greek yogurt (nonfat)', amount: '¾ cup', dvPercent: 36 },
      { name: 'Lentils (cooked)', amount: '½ cup', dvPercent: 18 },
      { name: 'Eggs', amount: '2 large', dvPercent: 24 },
      { name: 'Cottage cheese', amount: '½ cup', dvPercent: 28 },
    ],
    recipes: [],
    tags: ['protein', 'muscle', 'recovery'],
    personalizationKeys: {
      cuisine: [],
      nutrient: ['protein'],
      ingredient: ['chicken breast', 'greek yogurt', 'eggs', 'lentils'],
      skillTier: ALL_TIERS,
    },
    unlockCondition: { type: 'none' },
  },
  {
    id: 'nut-creatine',
    type: 'nutrient',
    title: 'Your Body on Creatine',
    subtitle: 'Not just for the gym — also for your brain',
    heroEmoji: '💪',
    sections: [
      {
        heading: 'What it does',
        body: 'Creatine refills cellular ATP — your muscles and brain run on it. One of the most-studied supplements ever; the safety record is excellent.',
      },
      {
        heading: 'Food vs supplement',
        body: 'Red meat and fish carry small amounts; vegetarians have lower baseline stores and respond strongly to supplementation (3–5g/day).',
      },
    ],
    topFoods: [
      { name: 'Beef (raw)', amount: '1 lb', dvPercent: 70 },
      { name: 'Pork (raw)', amount: '1 lb', dvPercent: 70 },
      { name: 'Herring', amount: '1 lb', dvPercent: 130 },
      { name: 'Salmon', amount: '1 lb', dvPercent: 90 },
      { name: 'Cod', amount: '1 lb', dvPercent: 60 },
    ],
    recipes: [],
    tags: ['creatine', 'muscle', 'cognitive'],
    personalizationKeys: {
      cuisine: ['american', 'japanese'],
      nutrient: ['creatine', 'protein'],
      ingredient: ['beef', 'salmon', 'herring'],
      skillTier: ['cook', 'chef'],
    },
    unlockCondition: { type: 'cook_count', threshold: 15 },
  },
  {
    id: 'nut-collagen',
    type: 'nutrient',
    title: 'Your Body on Collagen',
    subtitle: 'Skin, joints, gut lining — and what supplements actually do',
    heroEmoji: '🦴',
    sections: [
      {
        heading: 'Where it lives',
        body: 'Collagen is the most abundant protein in your body — connective tissue, skin elasticity, joint cushioning. Production drops ~1% per year after age 25.',
      },
      {
        heading: 'The vitamin C link',
        body: 'You can\'t synthesize collagen without vitamin C. Pair collagen sources (bone broth, supplements) with C-rich foods.',
      },
    ],
    topFoods: [
      { name: 'Bone broth', amount: '1 cup', dvPercent: 18 },
      { name: 'Chicken skin', amount: '1 oz', dvPercent: 8 },
      { name: 'Pork rind', amount: '1 oz', dvPercent: 12 },
      { name: 'Sardines (with bones)', amount: '3 oz', dvPercent: 10 },
      { name: 'Egg whites + yolks', amount: '2 large', dvPercent: 6 },
    ],
    recipes: [],
    tags: ['collagen', 'protein', 'joint', 'skin'],
    personalizationKeys: {
      cuisine: ['american', 'french', 'asian'],
      nutrient: ['collagen', 'protein'],
      ingredient: ['bone broth', 'chicken', 'sardines'],
      skillTier: ['chef'],
    },
    unlockCondition: { type: 'cook_count', threshold: 20 },
  },
  {
    id: 'nut-electrolytes',
    type: 'nutrient',
    title: 'Your Body on Electrolytes',
    subtitle: 'Sodium, potassium, magnesium — the trio',
    heroEmoji: '⚡',
    sections: [
      {
        heading: 'Sodium isn\'t the enemy',
        body: 'Active people sweating regularly need MORE sodium, not less. Low-carb diets flush electrolytes — that "keto flu" is mostly an electrolyte crash.',
      },
      {
        heading: 'Homemade electrolyte mix',
        body: '1 tsp salt + ½ tsp lite salt (potassium) + 1 tsp magnesium glycinate powder + lemon + 32 oz water. Cheaper than every commercial drink.',
      },
    ],
    topFoods: [
      { name: 'Pickle juice', amount: '2 oz', dvPercent: 30 },
      { name: 'Coconut water', amount: '8 oz', dvPercent: 17 },
      { name: 'Olives', amount: '5 medium', dvPercent: 7 },
      { name: 'Sea salt', amount: '¼ tsp', dvPercent: 25 },
      { name: 'Banana', amount: '1 medium', dvPercent: 9 },
    ],
    recipes: [],
    tags: ['electrolytes', 'sodium', 'potassium', 'hydration'],
    personalizationKeys: {
      cuisine: ['mediterranean'],
      nutrient: ['sodium', 'potassium', 'magnesium'],
      ingredient: ['salt', 'olives'],
      skillTier: ALL_TIERS,
    },
    unlockCondition: { type: 'cook_count', threshold: 5 },
  },

  // ───────── Ingredient spotlights (10) ─────────
  {
    id: 'ing-turmeric',
    type: 'ingredient',
    title: 'Turmeric: The Golden Anti-Inflammatory',
    subtitle: 'Curcumin, black pepper, and the 2,000% absorption trick',
    heroEmoji: '🌟',
    sections: [
      {
        heading: 'The pepper hack',
        body: 'Curcumin (turmeric\'s active compound) absorbs poorly on its own. Black pepper\'s piperine boosts bioavailability up to 2,000%. A pinch is plenty.',
      },
      {
        heading: 'How to use it',
        body: 'Golden milk, curries, scrambled eggs, lentil soups, smoothies. Always with fat (curcumin is fat-soluble) and pepper.',
      },
    ],
    topFoods: [
      { name: 'Fresh turmeric root', amount: '1 inch', dvPercent: 5 },
      { name: 'Ground turmeric', amount: '1 tsp', dvPercent: 26 },
      { name: 'Curry powder', amount: '1 tbsp', dvPercent: 14 },
      { name: 'Golden milk', amount: '1 cup', dvPercent: 20 },
    ],
    recipes: [],
    tags: ['turmeric', 'curcumin', 'spice', 'anti-inflammatory'],
    personalizationKeys: {
      cuisine: ['indian', 'thai', 'middle eastern'],
      nutrient: ['anti-inflammatory'],
      ingredient: ['turmeric'],
      skillTier: ALL_TIERS,
    },
    unlockCondition: { type: 'ingredient_used', value: 'turmeric' },
  },
  {
    id: 'ing-ginger',
    type: 'ingredient',
    title: 'Ginger: Nature\'s Digestive Aid',
    subtitle: 'Gingerol, anti-nausea, and how to use it',
    heroEmoji: '🫚',
    sections: [
      {
        heading: 'What it does',
        body: 'Gingerol — the active compound — calms nausea, reduces muscle soreness, and modulates inflammation. Clinically validated for morning sickness.',
      },
      {
        heading: 'Fresh vs dried',
        body: 'Fresh ginger is brighter and citrusy; dried is warmer and earthier. Not interchangeable in equal amounts — dried is ~3× more concentrated.',
        visual: 'comparison',
      },
    ],
    topFoods: [
      { name: 'Fresh ginger root', amount: '1 inch', dvPercent: 8 },
      { name: 'Ground ginger', amount: '1 tsp', dvPercent: 12 },
      { name: 'Pickled ginger (gari)', amount: '1 tbsp', dvPercent: 4 },
      { name: 'Ginger tea', amount: '1 cup', dvPercent: 6 },
    ],
    recipes: [],
    tags: ['ginger', 'gingerol', 'spice', 'digestion'],
    personalizationKeys: {
      cuisine: ['asian', 'chinese', 'thai', 'japanese'],
      nutrient: ['anti-inflammatory'],
      ingredient: ['ginger'],
      skillTier: ALL_TIERS,
    },
    unlockCondition: { type: 'ingredient_used', value: 'ginger' },
  },
  {
    id: 'ing-acv',
    type: 'ingredient',
    title: 'Apple Cider Vinegar: What It Actually Does',
    subtitle: 'The blood sugar effect is real. The weight loss claims are not.',
    heroEmoji: '🍎',
    sections: [
      {
        heading: 'The real benefit',
        body: 'A tablespoon of ACV before a starchy meal can blunt the post-meal glucose spike by 20–30%. Effect is consistent across studies.',
      },
      {
        heading: 'Don\'t shoot it',
        body: 'Straight ACV strips tooth enamel. Dilute in water (1 tbsp in 8 oz) or use in dressings, marinades, and sauces.',
      },
    ],
    topFoods: [
      { name: 'ACV with mother', amount: '1 tbsp', dvPercent: 1 },
      { name: 'ACV-shrubs', amount: '4 oz', dvPercent: 2 },
      { name: 'Vinaigrette', amount: '2 tbsp', dvPercent: 1 },
    ],
    recipes: [],
    tags: ['apple cider vinegar', 'acv', 'blood sugar'],
    personalizationKeys: {
      cuisine: [],
      nutrient: ['blood sugar'],
      ingredient: ['apple cider vinegar'],
      skillTier: ['cook', 'chef'],
    },
    unlockCondition: { type: 'ingredient_used', value: 'apple cider vinegar' },
  },
  {
    id: 'ing-fermented',
    type: 'ingredient',
    title: 'Fermented Foods: Your Gut\'s Best Friends',
    subtitle: 'Diversity beats quantity',
    heroEmoji: '🥬',
    sections: [
      {
        heading: 'The gut-brain axis',
        body: 'Probiotic strains diversify your gut microbiome — linked to better mood, immunity, and even cognition. Different ferments carry different strains.',
      },
      {
        heading: 'Heat kills them',
        body: 'Add miso off-heat. Don\'t boil kimchi or sauerkraut. Live cultures die above ~115°F.',
      },
    ],
    topFoods: [
      { name: 'Kimchi', amount: '½ cup', dvPercent: 50 },
      { name: 'Sauerkraut', amount: '½ cup', dvPercent: 30 },
      { name: 'Miso paste', amount: '1 tbsp', dvPercent: 20 },
      { name: 'Kefir', amount: '1 cup', dvPercent: 60 },
      { name: 'Yogurt (live cultures)', amount: '¾ cup', dvPercent: 25 },
    ],
    recipes: [],
    tags: ['fermented', 'kimchi', 'sauerkraut', 'miso', 'probiotic'],
    personalizationKeys: {
      cuisine: ['korean', 'japanese', 'german', 'eastern european'],
      nutrient: ['probiotic', 'gut health'],
      ingredient: ['kimchi', 'sauerkraut', 'miso', 'kefir'],
      skillTier: ['cook', 'chef'],
    },
    unlockCondition: { type: 'cuisine_count', threshold: 5 },
  },
  {
    id: 'ing-leafy-greens',
    type: 'ingredient',
    title: 'Dark Leafy Greens: The Most Underrated Superfood',
    subtitle: 'Iron, calcium, folate, fiber — for almost no calories',
    heroEmoji: '🥬',
    sections: [
      {
        heading: 'Make them taste good',
        body: 'The "I hate kale" crowd ate it raw. Cook it: massage with olive oil + lemon, sauté with garlic, or wilt into pasta. Bitter softens with fat and acid.',
      },
    ],
    topFoods: [
      { name: 'Spinach (cooked)', amount: '1 cup', dvPercent: 36 },
      { name: 'Kale (cooked)', amount: '1 cup', dvPercent: 25 },
      { name: 'Collard greens (cooked)', amount: '1 cup', dvPercent: 25 },
      { name: 'Swiss chard (cooked)', amount: '1 cup', dvPercent: 30 },
    ],
    recipes: [],
    tags: ['greens', 'spinach', 'kale', 'iron', 'folate'],
    personalizationKeys: {
      cuisine: ['mediterranean', 'southern american'],
      nutrient: ['iron', 'folate', 'calcium'],
      ingredient: ['spinach', 'kale', 'collard greens'],
      skillTier: ALL_TIERS,
    },
    unlockCondition: { type: 'cook_count', threshold: 5 },
  },
  {
    id: 'ing-legumes',
    type: 'ingredient',
    title: 'Legumes: The World\'s Most Perfect Food',
    subtitle: 'Protein + fiber + minerals, in every cuisine',
    heroEmoji: '🫘',
    sections: [
      {
        heading: 'Blue Zone staple',
        body: 'Every Blue Zone (where people live longest) eats a cup of legumes daily. Black beans, lentils, chickpeas — pick your favorite.',
      },
      {
        heading: 'Beat the bloat',
        body: 'Soak dried beans 8+ hrs and discard the soak water — leaches the oligosaccharides that cause gas. Canned: rinse thoroughly.',
      },
    ],
    topFoods: [
      { name: 'Black beans', amount: '½ cup', dvPercent: 30 },
      { name: 'Lentils', amount: '½ cup', dvPercent: 28 },
      { name: 'Chickpeas', amount: '½ cup', dvPercent: 26 },
      { name: 'Black-eyed peas', amount: '½ cup', dvPercent: 22 },
      { name: 'Fava beans', amount: '½ cup', dvPercent: 18 },
    ],
    recipes: [],
    tags: ['legumes', 'beans', 'lentils', 'protein', 'fiber'],
    personalizationKeys: {
      cuisine: ['mexican', 'middle eastern', 'indian'],
      nutrient: ['protein', 'fiber', 'iron'],
      ingredient: ['beans', 'lentils', 'chickpeas'],
      skillTier: ALL_TIERS,
    },
    unlockCondition: { type: 'cook_count', threshold: 5 },
  },
  {
    id: 'ing-seeds',
    type: 'ingredient',
    title: 'Seeds: Tiny Nutrition Powerhouses',
    subtitle: 'Sprinkle on anything, transform the meal',
    heroEmoji: '🌱',
    sections: [
      {
        heading: 'Each seed, one benefit',
        body: 'Chia for omega-3 + fiber. Flax for lignans (grind it!). Hemp for complete protein. Pumpkin for magnesium + zinc. Sesame for calcium. Sunflower for vitamin E.',
        visual: 'icon_list',
      },
    ],
    topFoods: [
      { name: 'Chia seeds', amount: '1 tbsp', dvPercent: 14 },
      { name: 'Ground flax', amount: '1 tbsp', dvPercent: 12 },
      { name: 'Hemp seeds', amount: '3 tbsp', dvPercent: 20 },
      { name: 'Pumpkin seeds', amount: '1 oz', dvPercent: 37 },
      { name: 'Sesame seeds', amount: '1 tbsp', dvPercent: 9 },
    ],
    recipes: [],
    tags: ['seeds', 'chia', 'flax', 'hemp', 'pumpkin'],
    personalizationKeys: {
      cuisine: ['middle eastern', 'mexican'],
      nutrient: ['fiber', 'omega-3', 'magnesium'],
      ingredient: ['chia seeds', 'flax seeds', 'hemp seeds', 'pumpkin seeds'],
      skillTier: ALL_TIERS,
    },
    unlockCondition: { type: 'cook_count', threshold: 10 },
  },
  {
    id: 'ing-garlic',
    type: 'ingredient',
    title: 'Garlic: The 10-Minute Rule',
    subtitle: 'Crush it, then wait — that\'s the trick',
    heroEmoji: '🧄',
    sections: [
      {
        heading: 'Why wait',
        body: 'Crushing garlic activates allicin, the compound responsible for most of its cardiovascular and immune benefits. Heat destroys allicin if applied too soon.',
      },
      {
        heading: 'How much matters',
        body: '1–2 cloves daily is the studied dose for cardiovascular benefit. More is fine — your taste tolerance is the limit.',
      },
    ],
    topFoods: [
      { name: 'Fresh garlic clove', amount: '1 clove', dvPercent: 2 },
      { name: 'Roasted garlic', amount: '3 cloves', dvPercent: 5 },
      { name: 'Black garlic', amount: '2 cloves', dvPercent: 3 },
    ],
    recipes: [],
    tags: ['garlic', 'allicin'],
    personalizationKeys: {
      cuisine: ['italian', 'mediterranean', 'chinese', 'korean'],
      nutrient: ['anti-inflammatory'],
      ingredient: ['garlic'],
      skillTier: ['cook', 'chef'],
    },
    unlockCondition: { type: 'ingredient_used', value: 'garlic' },
  },
  {
    id: 'ing-cinnamon',
    type: 'ingredient',
    title: 'Cinnamon: Blood Sugar\'s Best Friend',
    subtitle: 'Ceylon vs Cassia — the type matters',
    heroEmoji: '🍂',
    sections: [
      {
        heading: 'Ceylon vs Cassia',
        body: 'Most grocery cinnamon is Cassia — strong, cheap, and high in coumarin (liver-stress in large doses). Ceylon is milder, safer for daily use.',
        visual: 'comparison',
      },
      {
        heading: 'How to use',
        body: 'A teaspoon in coffee, oatmeal, smoothies, or yogurt. Lowers post-meal blood sugar 10–20% when paired with carbs.',
      },
    ],
    topFoods: [
      { name: 'Ceylon cinnamon', amount: '1 tsp', dvPercent: 8 },
      { name: 'Cassia cinnamon', amount: '1 tsp', dvPercent: 8 },
      { name: 'Cinnamon stick', amount: '1 stick', dvPercent: 5 },
    ],
    recipes: [],
    tags: ['cinnamon', 'spice', 'blood sugar'],
    personalizationKeys: {
      cuisine: ['middle eastern', 'mexican'],
      nutrient: ['blood sugar'],
      ingredient: ['cinnamon'],
      skillTier: ALL_TIERS,
    },
    unlockCondition: { type: 'ingredient_used', value: 'cinnamon' },
  },
  {
    id: 'ing-bone-broth',
    type: 'ingredient',
    title: 'Bone Broth & Collagen-Rich Foods',
    subtitle: 'Glycine, proline, gut lining — and how to make it',
    heroEmoji: '🍲',
    sections: [
      {
        heading: 'Why it matters',
        body: 'Long-simmered bones release glycine + proline (collagen building blocks), gelatin (gut lining support), and minerals.',
      },
      {
        heading: 'Make vs buy',
        body: 'Slow cooker, beef or chicken bones, splash of vinegar (pulls minerals), 12–24 hr simmer. Quality store-bought is fine but $$$.',
      },
    ],
    topFoods: [
      { name: 'Bone broth (homemade)', amount: '1 cup', dvPercent: 18 },
      { name: 'Pho broth', amount: '1 cup', dvPercent: 14 },
      { name: 'Chicken stock (real)', amount: '1 cup', dvPercent: 10 },
      { name: 'Sardines (with bones)', amount: '3 oz', dvPercent: 35 },
    ],
    recipes: [],
    tags: ['bone broth', 'collagen', 'glycine'],
    personalizationKeys: {
      cuisine: ['american', 'french', 'asian'],
      nutrient: ['protein', 'collagen'],
      ingredient: ['bone broth', 'chicken', 'beef'],
      skillTier: ['chef'],
    },
    unlockCondition: { type: 'cook_count', threshold: 20 },
  },

  // ───────── Concepts (5) ─────────
  {
    id: 'con-protein-per-cal',
    type: 'concept',
    title: 'The Protein-Per-Calorie Ratio',
    subtitle: 'How to evaluate any food in 5 seconds',
    heroEmoji: '📐',
    sections: [
      {
        heading: 'The framework',
        body: 'Divide protein grams by calories. >0.10 is excellent (chicken breast, cod, egg whites, cottage cheese). 0.05–0.10 is solid. <0.05 is "carb or fat dominant" — fine, but not for hitting protein targets.',
        visual: 'scale',
      },
    ],
    topFoods: [
      { name: 'Chicken breast (boneless)', amount: '3 oz', dvPercent: 52 },
      { name: 'Cod', amount: '3 oz', dvPercent: 38 },
      { name: 'Egg whites', amount: '2 large', dvPercent: 14 },
      { name: 'Cottage cheese (1%)', amount: '½ cup', dvPercent: 28 },
      { name: 'Greek yogurt (nonfat)', amount: '¾ cup', dvPercent: 36 },
    ],
    recipes: [],
    tags: ['protein', 'macros', 'concept'],
    personalizationKeys: {
      cuisine: [],
      nutrient: ['protein'],
      ingredient: ['chicken breast', 'cod', 'greek yogurt', 'cottage cheese'],
      skillTier: ALL_TIERS,
    },
    unlockCondition: { type: 'cook_count', threshold: 5 },
  },
  {
    id: 'con-meal-timing',
    type: 'concept',
    title: 'Why Meal Timing Matters Less Than You Think',
    subtitle: 'Daily totals win. Pre/post-workout matters a little.',
    heroEmoji: '⏰',
    sections: [
      {
        heading: 'What actually matters',
        body: 'Daily protein total + calorie target are 90% of the result. Frequency (3 vs 5 vs 6 meals) doesn\'t move the needle — adherence does.',
      },
      {
        heading: 'When timing matters',
        body: 'Carbs around training help performance. Protein within 4 hrs post-workout supports recovery. Beyond that — eat when you\'re hungry.',
      },
    ],
    topFoods: [
      { name: 'Pre-workout: oats + banana', amount: '1 cup', dvPercent: 18 },
      { name: 'Post-workout: whey + fruit', amount: '1 scoop', dvPercent: 50 },
      { name: 'Bedtime: cottage cheese', amount: '½ cup', dvPercent: 28 },
    ],
    recipes: [],
    tags: ['timing', 'fasting', 'meals', 'concept'],
    personalizationKeys: {
      cuisine: [],
      nutrient: ['protein'],
      ingredient: [],
      skillTier: ALL_TIERS,
    },
    unlockCondition: { type: 'cook_count', threshold: 10 },
  },
  {
    id: 'con-volume-eating',
    type: 'concept',
    title: 'The Volume Eating Playbook',
    subtitle: 'Eat more, weigh less',
    heroEmoji: '🍽️',
    sections: [
      {
        heading: 'The idea',
        body: 'Some foods fill the stomach for very few calories. Building meals around them lets you eat satisfying portions while keeping totals low.',
      },
      {
        heading: 'The cheat sheet',
        body: 'Cucumber, lettuce, watermelon, berries, air-popped popcorn, egg whites, broth-based soups, zucchini noodles. Bulk first, calorie-dense second.',
      },
    ],
    topFoods: [
      { name: 'Cucumber (water + vit K)', amount: '1 cup', dvPercent: 14 },
      { name: 'Watermelon (lycopene + C)', amount: '1 cup', dvPercent: 12 },
      { name: 'Air-popped popcorn (fiber)', amount: '3 cups', dvPercent: 14 },
      { name: 'Egg whites', amount: '4 large', dvPercent: 28 },
      { name: 'Broth-based soup (sodium)', amount: '1 cup', dvPercent: 35 },
    ],
    recipes: [],
    tags: ['volume', 'satiety', 'cut', 'concept'],
    personalizationKeys: {
      cuisine: [],
      nutrient: ['fiber'],
      ingredient: ['cucumber', 'lettuce', 'watermelon'],
      skillTier: ['beginner'],
    },
    unlockCondition: { type: 'none' },
  },
  {
    id: 'con-reading-labels',
    type: 'concept',
    title: 'Reading Nutrition Labels Like a Pro',
    subtitle: 'What to actually pay attention to',
    heroEmoji: '🏷️',
    sections: [
      {
        heading: 'Serving size first',
        body: 'Many "low cal" labels are per a tiny serving. Multiply by what you\'ll actually eat before judging.',
      },
      {
        heading: 'Ingredients-list rule',
        body: 'Ingredients are listed by weight, descending. If sugar (or any of its 60+ aliases) is in the first 3, it\'s a sugar-dominant product.',
      },
      {
        heading: 'Added vs natural sugar',
        body: 'Added sugars matter. Natural sugars in whole fruit/dairy come with fiber and protein that blunt the response — different metabolic story.',
      },
    ],
    topFoods: [
      { name: 'Plain Greek yogurt (protein)', amount: '¾ cup', dvPercent: 36 },
      { name: 'Whole grain bread (fiber)', amount: '1 slice', dvPercent: 12 },
      { name: 'Old-fashioned oats (fiber)', amount: '½ cup dry', dvPercent: 14 },
    ],
    recipes: [],
    tags: ['labels', 'sugar', 'shopping', 'concept'],
    personalizationKeys: {
      cuisine: [],
      nutrient: [],
      ingredient: [],
      skillTier: ['beginner'],
    },
    unlockCondition: { type: 'none' },
  },
  {
    id: 'con-anti-inflammatory',
    type: 'concept',
    title: 'The Anti-Inflammatory Diet (Without the BS)',
    subtitle: 'What chronic inflammation is, and what actually helps',
    heroEmoji: '🔥',
    sections: [
      {
        heading: 'Foods that help',
        body: 'Omega-3 fish, turmeric, leafy greens, berries, olive oil, dark chocolate, green tea — consistently anti-inflammatory across studies.',
        visual: 'icon_list',
      },
      {
        heading: 'Foods that hurt',
        body: 'Refined sugar, processed seed oils in excess, ultra-processed snacks, heavy alcohol — pro-inflammatory. Frequency matters more than perfection.',
      },
    ],
    topFoods: [
      { name: 'Salmon', amount: '3 oz', dvPercent: 100 },
      { name: 'Turmeric', amount: '1 tsp', dvPercent: 26 },
      { name: 'Spinach', amount: '1 cup', dvPercent: 36 },
      { name: 'Berries (mixed)', amount: '1 cup', dvPercent: 16 },
      { name: 'Olive oil (EVOO)', amount: '1 tbsp', dvPercent: 10 },
    ],
    recipes: [],
    tags: ['inflammation', 'omega-3', 'antioxidant', 'concept'],
    personalizationKeys: {
      cuisine: ['mediterranean'],
      nutrient: ['omega-3', 'antioxidant'],
      ingredient: ['salmon', 'turmeric', 'spinach', 'berries'],
      skillTier: ALL_TIERS,
    },
    unlockCondition: { type: 'cook_count', threshold: 15 },
  },

  // ───────── Cuisine health stories (5) ─────────
  {
    id: 'cui-okinawa',
    type: 'cuisine_health',
    title: 'Why Okinawans Live to 100',
    subtitle: 'Sweet potato, tofu, and "hara hachi bu"',
    heroEmoji: '🌺',
    sections: [
      {
        heading: 'The diet',
        body: 'Purple sweet potato as the daily staple, soy in every form, bitter melon, turmeric, seaweed, almost no red meat. Plant-forward, calorie-light, nutrient-dense.',
      },
      {
        heading: 'The behavior',
        body: 'Hara hachi bu — eat until 80% full. Communal meals, daily movement, strong social ties. The food matters; so does everything around it.',
      },
    ],
    topFoods: [
      { name: 'Purple sweet potato', amount: '1 medium', dvPercent: 16 },
      { name: 'Tofu', amount: '½ cup', dvPercent: 18 },
      { name: 'Bitter melon', amount: '1 cup', dvPercent: 14 },
      { name: 'Seaweed (nori)', amount: '1 sheet', dvPercent: 60 },
    ],
    recipes: [],
    tags: ['okinawa', 'blue zone', 'longevity', 'japanese'],
    personalizationKeys: {
      cuisine: ['japanese', 'okinawan'],
      nutrient: ['fiber', 'antioxidant'],
      ingredient: ['sweet potato', 'tofu', 'seaweed'],
      skillTier: ['cook', 'chef'],
    },
    unlockCondition: { type: 'cuisine_count', threshold: 5 },
  },
  {
    id: 'cui-mediterranean',
    type: 'cuisine_health',
    title: 'The Mediterranean Diet: Why It Actually Works',
    subtitle: 'Olive oil, seafood, legumes — the most-studied diet on earth',
    heroEmoji: '🫒',
    sections: [
      {
        heading: 'It\'s not a "diet"',
        body: 'It\'s how people in southern Italy, Greece, Spain, and parts of Turkey have eaten for centuries. Diet research keeps confirming what their grandparents already knew.',
      },
      {
        heading: 'The pillars',
        body: 'Extra-virgin olive oil daily. Fish 2–3×/week. Legumes 3–4×/week. Vegetables every meal. Wine in moderation, with food. Red meat occasional.',
      },
    ],
    topFoods: [
      { name: 'Extra-virgin olive oil', amount: '2 tbsp', dvPercent: 20 },
      { name: 'Sardines', amount: '3 oz', dvPercent: 87 },
      { name: 'Chickpeas', amount: '½ cup', dvPercent: 26 },
      { name: 'Tomatoes', amount: '1 cup', dvPercent: 8 },
      { name: 'Feta cheese', amount: '1 oz', dvPercent: 14 },
    ],
    recipes: [],
    tags: ['mediterranean', 'olive oil', 'longevity'],
    personalizationKeys: {
      cuisine: ['mediterranean', 'italian', 'greek', 'spanish'],
      nutrient: ['omega-3', 'fiber', 'antioxidant'],
      ingredient: ['olive oil', 'sardines', 'chickpeas', 'tomatoes'],
      skillTier: ALL_TIERS,
    },
    unlockCondition: { type: 'cuisine_count', threshold: 5 },
  },
  {
    id: 'cui-ethiopian',
    type: 'cuisine_health',
    title: 'Ethiopian Cuisine: The Hidden Health Powerhouse',
    subtitle: 'Teff, lentils, and the world\'s only naturally fermented flatbread',
    heroEmoji: '🇪🇹',
    sections: [
      {
        heading: 'Teff',
        body: 'The grain in injera — gluten-free, complete protein, loaded with iron and calcium. Most Americans have never heard of it.',
      },
      {
        heading: 'Plant-forward by default',
        body: 'Wednesdays + Fridays are traditionally vegan in Orthodox Ethiopia. Lentil stews (misir wot, kik alicha), collards (gomen), spiced chickpeas (shiro). Naturally healthful.',
      },
    ],
    topFoods: [
      { name: 'Injera (teff)', amount: '1 piece', dvPercent: 28 },
      { name: 'Misir wot (red lentil)', amount: '1 cup', dvPercent: 30 },
      { name: 'Gomen (collards)', amount: '1 cup', dvPercent: 25 },
      { name: 'Shiro (chickpea)', amount: '1 cup', dvPercent: 22 },
    ],
    recipes: [],
    tags: ['ethiopian', 'teff', 'lentils', 'fermented'],
    personalizationKeys: {
      cuisine: ['ethiopian', 'east african'],
      nutrient: ['iron', 'fiber', 'protein'],
      ingredient: ['lentils', 'teff', 'collard greens'],
      skillTier: ['cook', 'chef'],
    },
    unlockCondition: { type: 'cuisine_count', threshold: 8 },
  },
  {
    id: 'cui-korean-ferment',
    type: 'cuisine_health',
    title: 'Korean Fermentation Culture',
    subtitle: 'Kimchi at every meal — the gut microbiome diversity champion',
    heroEmoji: '🇰🇷',
    sections: [
      {
        heading: 'Diversity wins',
        body: 'Koreans eat 3+ fermented foods daily — kimchi, doenjang (soy paste), gochujang (chili paste), jeotgal (fermented seafood). Each carries different probiotic strains.',
      },
      {
        heading: 'Why it matters',
        body: 'Microbiome diversity correlates with better mood, immunity, and metabolism. Eating one yogurt isn\'t the same as rotating across multiple ferments.',
      },
    ],
    topFoods: [
      { name: 'Kimchi', amount: '½ cup', dvPercent: 50 },
      { name: 'Doenjang stew', amount: '1 cup', dvPercent: 30 },
      { name: 'Gochujang', amount: '1 tbsp', dvPercent: 8 },
      { name: 'Banchan (assorted)', amount: '½ cup', dvPercent: 20 },
    ],
    recipes: [],
    tags: ['korean', 'kimchi', 'fermentation', 'probiotic'],
    personalizationKeys: {
      cuisine: ['korean'],
      nutrient: ['probiotic', 'gut health'],
      ingredient: ['kimchi', 'gochujang'],
      skillTier: ['cook', 'chef'],
    },
    unlockCondition: { type: 'cuisine_count', threshold: 5 },
  },
  {
    id: 'cui-latin',
    type: 'cuisine_health',
    title: 'Latin American Superfoods You Already Know',
    subtitle: 'Quinoa, chia, beans, plantains — they came from here',
    heroEmoji: '🌎',
    sections: [
      {
        heading: 'The originals',
        body: 'Quinoa (Bolivia, Peru), chia (Mexico, Guatemala), avocado (Mexico), black beans (everywhere), plantains (resistant starch), tomatillos. The "superfood" movement borrowed from this region.',
      },
      {
        heading: 'Sofrito = antioxidant base',
        body: 'Tomato + onion + pepper + garlic, slow-cooked. The base of half of Latin cuisine. Quietly delivering the most bioactive compounds in your plate.',
      },
    ],
    topFoods: [
      { name: 'Quinoa', amount: '½ cup cooked', dvPercent: 16 },
      { name: 'Black beans', amount: '½ cup', dvPercent: 30 },
      { name: 'Avocado', amount: '½ medium', dvPercent: 25 },
      { name: 'Plantain (green)', amount: '1 medium', dvPercent: 15 },
      { name: 'Tomatillos', amount: '1 cup', dvPercent: 10 },
    ],
    recipes: [],
    tags: ['latin', 'mexican', 'caribbean', 'andean'],
    personalizationKeys: {
      cuisine: ['mexican', 'caribbean', 'peruvian', 'cuban'],
      nutrient: ['fiber', 'protein', 'antioxidant'],
      ingredient: ['quinoa', 'black beans', 'avocado', 'plantain'],
      skillTier: ALL_TIERS,
    },
    unlockCondition: { type: 'cuisine_count', threshold: 3 },
  },
];
