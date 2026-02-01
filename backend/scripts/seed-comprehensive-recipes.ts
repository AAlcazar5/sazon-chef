// backend/scripts/seed-comprehensive-recipes.ts
// Comprehensive script to seed database with 3000+ diverse, macro-friendly recipes
// across 40+ cuisines, dietary categories, and fitness goals
// This creates a shared recipe pool that all users can access

import { PrismaClient } from '@prisma/client';
import { AIRecipeService } from '../src/services/aiRecipeService';

const prisma = new PrismaClient();
const aiRecipeService = new AIRecipeService();

// ============================================================================
// CONFIGURATION: 3000+ recipes across global cuisines and functional categories
// ============================================================================

// ============================================================================
// SECTION 1: GLOBAL CUISINES (40+ cuisines)
// ============================================================================

interface CuisineTarget {
  name: string;
  recipesTotal: number;
  mealTypes: {
    breakfast: number;
    lunch: number;
    dinner: number;
    snack: number;
    dessert: number;
  };
  description: string; // For AI context
}

const GLOBAL_CUISINES: CuisineTarget[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // MEDITERRANEAN & EUROPEAN (Strong health/macro alignment)
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'Mediterranean',
    recipesTotal: 80,
    mealTypes: { breakfast: 12, lunch: 22, dinner: 26, snack: 10, dessert: 10 },
    description: 'Greek, Turkish, Lebanese fusion - olive oil, fresh vegetables, lean proteins, whole grains'
  },
  {
    name: 'Italian',
    recipesTotal: 75,
    mealTypes: { breakfast: 10, lunch: 22, dinner: 28, snack: 8, dessert: 7 },
    description: 'Pasta, risotto, regional specialties - tomatoes, olive oil, fresh herbs, quality proteins'
  },
  {
    name: 'French',
    recipesTotal: 60,
    mealTypes: { breakfast: 10, lunch: 16, dinner: 22, snack: 6, dessert: 6 },
    description: 'Classic and modern bistro - sauces, techniques, refined flavors'
  },
  {
    name: 'Spanish',
    recipesTotal: 55,
    mealTypes: { breakfast: 8, lunch: 16, dinner: 20, snack: 6, dessert: 5 },
    description: 'Tapas, paella, regional dishes - seafood, olive oil, paprika, saffron'
  },
  {
    name: 'Greek',
    recipesTotal: 55,
    mealTypes: { breakfast: 10, lunch: 15, dinner: 20, snack: 5, dessert: 5 },
    description: 'Ancient flavors, modern health focus - yogurt, feta, olive oil, fresh vegetables'
  },
  {
    name: 'German',
    recipesTotal: 45,
    mealTypes: { breakfast: 8, lunch: 12, dinner: 16, snack: 5, dessert: 4 },
    description: 'Hearty, protein-rich - sausages, schnitzel, potatoes, cabbage'
  },
  {
    name: 'Scandinavian',
    recipesTotal: 45,
    mealTypes: { breakfast: 10, lunch: 12, dinner: 15, snack: 4, dessert: 4 },
    description: 'Clean, simple, seafood-forward - salmon, rye, dairy, root vegetables'
  },
  {
    name: 'Polish',
    recipesTotal: 40,
    mealTypes: { breakfast: 6, lunch: 12, dinner: 14, snack: 4, dessert: 4 },
    description: 'Comfort food - pierogi, soups, hearty stews, sausages'
  },
  {
    name: 'Russian',
    recipesTotal: 40,
    mealTypes: { breakfast: 8, lunch: 10, dinner: 14, snack: 4, dessert: 4 },
    description: 'Hearty stews, dumplings - borscht, pelmeni, buckwheat'
  },
  {
    name: 'Hungarian',
    recipesTotal: 35,
    mealTypes: { breakfast: 5, lunch: 10, dinner: 14, snack: 3, dessert: 3 },
    description: 'Paprika-rich, comfort food - goulash, paprikash, stuffed peppers'
  },
  {
    name: 'Ukrainian',
    recipesTotal: 35,
    mealTypes: { breakfast: 6, lunch: 10, dinner: 12, snack: 4, dessert: 3 },
    description: 'Hearty dishes - borscht variations, varenyky, chicken Kyiv'
  },
  {
    name: 'Czech',
    recipesTotal: 30,
    mealTypes: { breakfast: 4, lunch: 8, dinner: 12, snack: 3, dessert: 3 },
    description: 'Central European comfort - svíčková, trdelník, dumplings'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ASIAN CUISINES (Diverse macro profiles)
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'Japanese',
    recipesTotal: 70,
    mealTypes: { breakfast: 10, lunch: 20, dinner: 25, snack: 8, dessert: 7 },
    description: 'Sushi, ramen, healthy bowls - fish, rice, miso, vegetables, umami'
  },
  {
    name: 'Chinese',
    recipesTotal: 70,
    mealTypes: { breakfast: 10, lunch: 20, dinner: 25, snack: 8, dessert: 7 },
    description: 'Regional variety (Szechuan, Cantonese) - stir-fries, dumplings, noodles'
  },
  {
    name: 'Thai',
    recipesTotal: 60,
    mealTypes: { breakfast: 8, lunch: 18, dinner: 22, snack: 7, dessert: 5 },
    description: 'Balance of flavors, curry-forward - lemongrass, coconut, chilies, fish sauce'
  },
  {
    name: 'Korean',
    recipesTotal: 60,
    mealTypes: { breakfast: 8, lunch: 18, dinner: 22, snack: 6, dessert: 6 },
    description: 'Fermented foods, BBQ, bowls - kimchi, gochujang, sesame, banchan'
  },
  {
    name: 'Vietnamese',
    recipesTotal: 55,
    mealTypes: { breakfast: 10, lunch: 16, dinner: 20, snack: 5, dessert: 4 },
    description: 'Fresh, light, herb-forward - pho, banh mi, fresh herbs, fish sauce'
  },
  {
    name: 'Indian',
    recipesTotal: 70,
    mealTypes: { breakfast: 12, lunch: 20, dinner: 25, snack: 8, dessert: 5 },
    description: 'Regional variety, vegetarian-friendly - spices, legumes, rice, flatbreads'
  },
  {
    name: 'Filipino',
    recipesTotal: 45,
    mealTypes: { breakfast: 10, lunch: 12, dinner: 15, snack: 4, dessert: 4 },
    description: 'Sweet-savory balance, comfort food - adobo, sinigang, rice dishes'
  },
  {
    name: 'Indonesian',
    recipesTotal: 45,
    mealTypes: { breakfast: 8, lunch: 12, dinner: 16, snack: 5, dessert: 4 },
    description: 'Nasi goreng, satay, rendang - peanuts, coconut, spices, rice'
  },
  {
    name: 'Malaysian',
    recipesTotal: 45,
    mealTypes: { breakfast: 8, lunch: 12, dinner: 16, snack: 5, dessert: 4 },
    description: 'Laksa, nasi lemak, roti canai - coconut, spices, multicultural fusion'
  },
  {
    name: 'Singaporean',
    recipesTotal: 40,
    mealTypes: { breakfast: 6, lunch: 12, dinner: 14, snack: 4, dessert: 4 },
    description: 'Hawker culture - Hainanese chicken rice, chili crab, kaya toast'
  },
  {
    name: 'Pakistani',
    recipesTotal: 40,
    mealTypes: { breakfast: 6, lunch: 12, dinner: 14, snack: 4, dessert: 4 },
    description: 'Nihari, biryani variations, seekh kebabs - aromatic spices, meat dishes'
  },
  {
    name: 'Sri Lankan',
    recipesTotal: 35,
    mealTypes: { breakfast: 6, lunch: 10, dinner: 12, snack: 4, dessert: 3 },
    description: 'Hoppers, kottu, deviled dishes - coconut, curry leaves, cinnamon'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CENTRAL ASIAN
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'Uzbek',
    recipesTotal: 35,
    mealTypes: { breakfast: 5, lunch: 10, dinner: 14, snack: 3, dessert: 3 },
    description: 'Plov, manti, shashlik - lamb, rice, cumin, dried fruits'
  },
  {
    name: 'Georgian',
    recipesTotal: 35,
    mealTypes: { breakfast: 6, lunch: 10, dinner: 12, snack: 4, dessert: 3 },
    description: 'Khachapuri, khinkali, pkhali - cheese, walnuts, herbs, wine'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // AMERICAS (Macro-friendly options)
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'American',
    recipesTotal: 80,
    mealTypes: { breakfast: 18, lunch: 20, dinner: 26, snack: 10, dessert: 6 },
    description: 'Classic comfort, modern healthy - burgers, BBQ, salads, brunch'
  },
  {
    name: 'Mexican',
    recipesTotal: 75,
    mealTypes: { breakfast: 15, lunch: 20, dinner: 25, snack: 10, dessert: 5 },
    description: 'Tacos, protein-rich beans - corn, chilies, lime, fresh salsas'
  },
  {
    name: 'Latin American',
    recipesTotal: 50,
    mealTypes: { breakfast: 10, lunch: 14, dinner: 18, snack: 5, dessert: 3 },
    description: 'Pan-Latin diversity - empanadas, ceviche, arroz con pollo'
  },
  {
    name: 'Brazilian',
    recipesTotal: 45,
    mealTypes: { breakfast: 8, lunch: 12, dinner: 16, snack: 5, dessert: 4 },
    description: 'BBQ, tropical flavors - churrasco, feijoada, açaí'
  },
  {
    name: 'Peruvian',
    recipesTotal: 40,
    mealTypes: { breakfast: 6, lunch: 12, dinner: 14, snack: 4, dessert: 4 },
    description: 'Ceviche, lomo saltado, causa - lime, aji peppers, potatoes'
  },
  {
    name: 'Argentinian',
    recipesTotal: 40,
    mealTypes: { breakfast: 6, lunch: 10, dinner: 16, snack: 4, dessert: 4 },
    description: 'Asado, milanesa, chimichurri - beef, herbs, empanadas'
  },
  {
    name: 'Colombian',
    recipesTotal: 35,
    mealTypes: { breakfast: 8, lunch: 10, dinner: 12, snack: 3, dessert: 2 },
    description: 'Bandeja paisa, arepas, sancocho - beans, plantains, corn'
  },
  {
    name: 'Caribbean',
    recipesTotal: 45,
    mealTypes: { breakfast: 8, lunch: 12, dinner: 16, snack: 5, dessert: 4 },
    description: 'Island fusion, jerk spices - coconut, tropical fruits, rice & peas'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MIDDLE EASTERN & NORTH AFRICAN
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'Middle Eastern',
    recipesTotal: 60,
    mealTypes: { breakfast: 12, lunch: 16, dinner: 20, snack: 7, dessert: 5 },
    description: 'Mezze, grilled meats, aromatic - hummus, kebabs, spices'
  },
  {
    name: 'Moroccan',
    recipesTotal: 45,
    mealTypes: { breakfast: 6, lunch: 12, dinner: 18, snack: 5, dessert: 4 },
    description: 'Tagines, couscous, spice blends - preserved lemons, olives, dried fruits'
  },
  {
    name: 'Turkish',
    recipesTotal: 50,
    mealTypes: { breakfast: 12, lunch: 12, dinner: 18, snack: 4, dessert: 4 },
    description: 'Meze, kebabs, breakfast spreads - yogurt, eggplant, lamb'
  },
  {
    name: 'Lebanese',
    recipesTotal: 45,
    mealTypes: { breakfast: 8, lunch: 12, dinner: 16, snack: 5, dessert: 4 },
    description: 'Healthy mezze, grilled proteins - tabbouleh, hummus, grilled halloumi'
  },
  {
    name: 'Egyptian',
    recipesTotal: 35,
    mealTypes: { breakfast: 8, lunch: 10, dinner: 12, snack: 3, dessert: 2 },
    description: 'Koshari, ful medames, molokhia - legumes, rice, greens'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // AFRICAN CUISINES
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'Ethiopian',
    recipesTotal: 40,
    mealTypes: { breakfast: 6, lunch: 12, dinner: 14, snack: 4, dessert: 4 },
    description: 'Injera-based, vegetarian options - berbere spice, lentils, stews'
  },
  {
    name: 'West African',
    recipesTotal: 40,
    mealTypes: { breakfast: 6, lunch: 12, dinner: 14, snack: 4, dessert: 4 },
    description: 'Stews, jollof, plantains - peanuts, tomatoes, okra, fufu'
  },
  {
    name: 'South African',
    recipesTotal: 35,
    mealTypes: { breakfast: 6, lunch: 10, dinner: 12, snack: 4, dessert: 3 },
    description: 'Bobotie, bunny chow, braai - diverse influences, BBQ culture'
  },
  {
    name: 'East African',
    recipesTotal: 30,
    mealTypes: { breakfast: 5, lunch: 8, dinner: 12, snack: 3, dessert: 2 },
    description: 'Ugali, nyama choma, pilau - grilled meats, spiced rice'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PACIFIC & OCEANIAN
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'Hawaiian',
    recipesTotal: 40,
    mealTypes: { breakfast: 8, lunch: 12, dinner: 12, snack: 4, dessert: 4 },
    description: 'Poke bowls, loco moco, tropical - fresh fish, rice, tropical fruits'
  },
  {
    name: 'Australian',
    recipesTotal: 40,
    mealTypes: { breakfast: 12, lunch: 10, dinner: 12, snack: 3, dessert: 3 },
    description: 'Brunch culture, diverse influences - avocado, barramundi, BBQ'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FUSION & MODERN
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'Fusion Asian',
    recipesTotal: 45,
    mealTypes: { breakfast: 6, lunch: 14, dinner: 16, snack: 5, dessert: 4 },
    description: 'East-meets-West creativity - Korean tacos, sushi burritos, ramen burgers'
  },
  {
    name: 'Californian',
    recipesTotal: 50,
    mealTypes: { breakfast: 12, lunch: 14, dinner: 16, snack: 4, dessert: 4 },
    description: 'Fresh, health-conscious, farm-to-table - Buddha bowls, grain bowls, smoothies'
  },
];

// ============================================================================
// SECTION 2: FUNCTIONAL/GOAL-BASED CATEGORIES
// ============================================================================

interface FunctionalCategory {
  name: string;
  recipesTotal: number;
  mealTypes: {
    breakfast: number;
    lunch: number;
    dinner: number;
    snack: number;
    dessert: number;
  };
  macroProfile: {
    calories: { min: number; max: number };
    protein: { min: number; max: number };
    carbs: { min: number; max: number };
    fat: { min: number; max: number };
    fiber?: { min: number; max: number };
  };
  aiInstruction: string; // Specific instruction for AI
}

const FUNCTIONAL_CATEGORIES: FunctionalCategory[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // FITNESS & PERFORMANCE
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'High Protein',
    recipesTotal: 100,
    mealTypes: { breakfast: 20, lunch: 25, dinner: 30, snack: 15, dessert: 10 },
    macroProfile: {
      calories: { min: 300, max: 700 },
      protein: { min: 40, max: 70 },
      carbs: { min: 15, max: 50 },
      fat: { min: 10, max: 30 }
    },
    aiInstruction: 'This recipe MUST be high-protein (40g+ protein per serving). Focus on lean meats, fish, eggs, Greek yogurt, cottage cheese, legumes, or protein powder as main protein sources. Great for muscle building and satiety.'
  },
  {
    name: 'Pre-Workout',
    recipesTotal: 50,
    mealTypes: { breakfast: 15, lunch: 10, dinner: 5, snack: 15, dessert: 5 },
    macroProfile: {
      calories: { min: 200, max: 400 },
      protein: { min: 15, max: 30 },
      carbs: { min: 30, max: 60 },
      fat: { min: 5, max: 15 }
    },
    aiInstruction: 'This is a PRE-WORKOUT recipe. Focus on quick-digesting carbs with moderate protein and LOW fat. Should provide energy for exercise without being heavy. Examples: oatmeal with banana, rice cakes with honey, fruit smoothie with protein.'
  },
  {
    name: 'Post-Workout Recovery',
    recipesTotal: 60,
    mealTypes: { breakfast: 10, lunch: 15, dinner: 15, snack: 10, dessert: 10 },
    macroProfile: {
      calories: { min: 300, max: 600 },
      protein: { min: 35, max: 55 },
      carbs: { min: 35, max: 70 },
      fat: { min: 8, max: 20 }
    },
    aiInstruction: 'This is a POST-WORKOUT RECOVERY recipe. Must have HIGH protein (35g+) for muscle repair AND fast carbs for glycogen replenishment. Perfect for after training. Examples: protein shake with banana, chicken and rice bowl, Greek yogurt parfait with granola.'
  },
  {
    name: 'Muscle Building',
    recipesTotal: 60,
    mealTypes: { breakfast: 12, lunch: 15, dinner: 20, snack: 8, dessert: 5 },
    macroProfile: {
      calories: { min: 500, max: 900 },
      protein: { min: 45, max: 70 },
      carbs: { min: 45, max: 90 },
      fat: { min: 15, max: 35 }
    },
    aiInstruction: 'This is a MUSCLE BUILDING recipe. High calories with HIGH protein (45g+) to support muscle growth. Include quality carbs for energy and performance. Calorie-dense but nutritious. Examples: beef and rice bowl, salmon with quinoa, protein pancakes.'
  },
  {
    name: 'Endurance Fuel',
    recipesTotal: 45,
    mealTypes: { breakfast: 12, lunch: 12, dinner: 12, snack: 6, dessert: 3 },
    macroProfile: {
      calories: { min: 400, max: 700 },
      protein: { min: 20, max: 35 },
      carbs: { min: 60, max: 100 },
      fat: { min: 10, max: 25 }
    },
    aiInstruction: 'This is an ENDURANCE FUEL recipe for athletes. Focus on COMPLEX CARBS for sustained energy with moderate protein. Include whole grains, oats, sweet potatoes, pasta. Great for runners, cyclists, and endurance sports.'
  },
  {
    name: 'Low Carb',
    recipesTotal: 80,
    mealTypes: { breakfast: 15, lunch: 22, dinner: 28, snack: 10, dessert: 5 },
    macroProfile: {
      calories: { min: 300, max: 650 },
      protein: { min: 30, max: 55 },
      carbs: { min: 5, max: 30 },
      fat: { min: 20, max: 45 }
    },
    aiInstruction: 'This recipe MUST be LOW-CARB (under 30g carbs per serving). Avoid pasta, rice, bread, potatoes, and high-carb vegetables. Use cauliflower rice, zucchini noodles, leafy greens as bases. Higher fat for satiety.'
  },
  {
    name: 'Keto-Friendly',
    recipesTotal: 60,
    mealTypes: { breakfast: 12, lunch: 16, dinner: 20, snack: 8, dessert: 4 },
    macroProfile: {
      calories: { min: 350, max: 700 },
      protein: { min: 25, max: 45 },
      carbs: { min: 2, max: 15 },
      fat: { min: 30, max: 55 }
    },
    aiInstruction: 'This recipe MUST be KETO-FRIENDLY (under 15g NET carbs). Very high fat, moderate protein, minimal carbs. Use avocado, olive oil, nuts, cheese, fatty fish. No grains, sugar, high-carb vegetables, or fruit (except berries in moderation).'
  },
  {
    name: 'High Fiber',
    recipesTotal: 70,
    mealTypes: { breakfast: 15, lunch: 18, dinner: 22, snack: 10, dessert: 5 },
    macroProfile: {
      calories: { min: 300, max: 600 },
      protein: { min: 20, max: 45 },
      carbs: { min: 35, max: 70 },
      fat: { min: 10, max: 25 },
      fiber: { min: 10, max: 25 }
    },
    aiInstruction: 'This recipe MUST be HIGH-FIBER (10g+ fiber per serving). Focus on whole grains, legumes, vegetables, fruits, nuts, and seeds. Great for digestive health, satiety, and blood sugar control. Include foods like oats, beans, lentils, broccoli, berries, chia seeds, flaxseeds.'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // WELLNESS & LIFESTYLE
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'Anti-Inflammatory',
    recipesTotal: 50,
    mealTypes: { breakfast: 10, lunch: 14, dinner: 18, snack: 5, dessert: 3 },
    macroProfile: {
      calories: { min: 300, max: 600 },
      protein: { min: 25, max: 45 },
      carbs: { min: 25, max: 55 },
      fat: { min: 15, max: 30 }
    },
    aiInstruction: 'This is an ANTI-INFLAMMATORY recipe. MUST include anti-inflammatory ingredients: turmeric, ginger, fatty fish (salmon, sardines), olive oil, leafy greens, berries, nuts. AVOID: processed foods, refined sugars, seed oils, red meat.'
  },
  {
    name: 'Gut Health',
    recipesTotal: 45,
    mealTypes: { breakfast: 12, lunch: 12, dinner: 14, snack: 5, dessert: 2 },
    macroProfile: {
      calories: { min: 300, max: 550 },
      protein: { min: 20, max: 40 },
      carbs: { min: 30, max: 60 },
      fat: { min: 10, max: 25 },
      fiber: { min: 8, max: 20 }
    },
    aiInstruction: 'This is a GUT HEALTH recipe. MUST include fermented foods (yogurt, kefir, kimchi, sauerkraut, miso) OR prebiotic fiber (garlic, onion, leeks, asparagus, oats, bananas). High fiber is essential. Supports microbiome health.'
  },
  {
    name: 'Heart Healthy',
    recipesTotal: 50,
    mealTypes: { breakfast: 10, lunch: 14, dinner: 18, snack: 5, dessert: 3 },
    macroProfile: {
      calories: { min: 300, max: 550 },
      protein: { min: 25, max: 45 },
      carbs: { min: 30, max: 55 },
      fat: { min: 12, max: 25 }
    },
    aiInstruction: 'This is a HEART HEALTHY recipe. LOW sodium, focus on healthy fats (olive oil, avocado, nuts, fatty fish). Include whole grains, fiber-rich foods. AVOID: excessive saturated fat, processed meats, high sodium ingredients.'
  },
  {
    name: 'Brain Food',
    recipesTotal: 40,
    mealTypes: { breakfast: 10, lunch: 12, dinner: 12, snack: 4, dessert: 2 },
    macroProfile: {
      calories: { min: 350, max: 600 },
      protein: { min: 25, max: 45 },
      carbs: { min: 25, max: 50 },
      fat: { min: 18, max: 35 }
    },
    aiInstruction: 'This is a BRAIN FOOD recipe for cognitive health. MUST include omega-3 rich foods (fatty fish, walnuts, flaxseeds), antioxidants (blueberries, dark leafy greens), and low glycemic ingredients. Great for focus and mental clarity.'
  },
  {
    name: 'Immunity Boosting',
    recipesTotal: 40,
    mealTypes: { breakfast: 10, lunch: 10, dinner: 12, snack: 5, dessert: 3 },
    macroProfile: {
      calories: { min: 300, max: 550 },
      protein: { min: 25, max: 45 },
      carbs: { min: 30, max: 55 },
      fat: { min: 10, max: 25 }
    },
    aiInstruction: 'This is an IMMUNITY BOOSTING recipe. MUST include vitamin C (citrus, bell peppers, broccoli), zinc (shellfish, legumes, nuts), vitamin D (fatty fish, eggs), and antioxidants. Include garlic, ginger, turmeric, elderberry when possible.'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DIETARY RESTRICTIONS
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'Vegetarian',
    recipesTotal: 80,
    mealTypes: { breakfast: 15, lunch: 22, dinner: 28, snack: 10, dessert: 5 },
    macroProfile: {
      calories: { min: 300, max: 650 },
      protein: { min: 20, max: 45 },
      carbs: { min: 35, max: 70 },
      fat: { min: 12, max: 30 }
    },
    aiInstruction: 'This recipe MUST be VEGETARIAN (no meat, poultry, or fish). Use plant proteins: tofu, tempeh, legumes, eggs, dairy, quinoa. Ensure adequate protein from multiple sources.'
  },
  {
    name: 'Vegan',
    recipesTotal: 70,
    mealTypes: { breakfast: 12, lunch: 20, dinner: 25, snack: 8, dessert: 5 },
    macroProfile: {
      calories: { min: 300, max: 650 },
      protein: { min: 18, max: 40 },
      carbs: { min: 40, max: 80 },
      fat: { min: 12, max: 30 }
    },
    aiInstruction: 'This recipe MUST be VEGAN (no animal products whatsoever). No meat, fish, eggs, dairy, honey. Use plant proteins: tofu, tempeh, seitan, legumes, nutritional yeast, nuts, seeds.'
  },
  {
    name: 'Gluten-Free',
    recipesTotal: 60,
    mealTypes: { breakfast: 12, lunch: 16, dinner: 22, snack: 6, dessert: 4 },
    macroProfile: {
      calories: { min: 300, max: 650 },
      protein: { min: 25, max: 50 },
      carbs: { min: 30, max: 65 },
      fat: { min: 12, max: 30 }
    },
    aiInstruction: 'This recipe MUST be GLUTEN-FREE. No wheat, barley, rye, or cross-contaminated oats. Use rice, quinoa, potatoes, corn, certified GF oats, almond flour, coconut flour.'
  },
  {
    name: 'Dairy-Free',
    recipesTotal: 50,
    mealTypes: { breakfast: 10, lunch: 14, dinner: 18, snack: 5, dessert: 3 },
    macroProfile: {
      calories: { min: 300, max: 650 },
      protein: { min: 25, max: 50 },
      carbs: { min: 30, max: 65 },
      fat: { min: 12, max: 30 }
    },
    aiInstruction: 'This recipe MUST be DAIRY-FREE. No milk, cheese, butter, cream, yogurt, or whey. Use alternatives: almond milk, coconut milk, cashew cream, nutritional yeast, vegan cheese.'
  },
  {
    name: 'Paleo',
    recipesTotal: 50,
    mealTypes: { breakfast: 10, lunch: 14, dinner: 18, snack: 5, dessert: 3 },
    macroProfile: {
      calories: { min: 350, max: 700 },
      protein: { min: 30, max: 55 },
      carbs: { min: 20, max: 50 },
      fat: { min: 20, max: 40 }
    },
    aiInstruction: 'This recipe MUST be PALEO. No grains, legumes, dairy, refined sugar, or processed foods. Focus on: meat, fish, eggs, vegetables, fruits, nuts, seeds. Use natural sweeteners (honey, maple) sparingly.'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TIME & CONVENIENCE
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'Quick Meals',
    recipesTotal: 80,
    mealTypes: { breakfast: 20, lunch: 22, dinner: 25, snack: 10, dessert: 3 },
    macroProfile: {
      calories: { min: 300, max: 600 },
      protein: { min: 25, max: 50 },
      carbs: { min: 30, max: 60 },
      fat: { min: 10, max: 25 }
    },
    aiInstruction: 'This recipe MUST be QUICK to prepare (under 20 minutes total cook time). Focus on simple techniques, minimal ingredients (under 8), one-pan/one-pot methods. Perfect for busy weeknights.'
  },
  {
    name: '5-Ingredient Meals',
    recipesTotal: 50,
    mealTypes: { breakfast: 12, lunch: 14, dinner: 18, snack: 4, dessert: 2 },
    macroProfile: {
      calories: { min: 300, max: 600 },
      protein: { min: 25, max: 50 },
      carbs: { min: 25, max: 55 },
      fat: { min: 10, max: 25 }
    },
    aiInstruction: 'This recipe MUST use only 5 MAIN INGREDIENTS (not counting salt, pepper, oil, water). Minimal shopping, maximum flavor. Simple and accessible for beginners.'
  },
  {
    name: 'One-Pot Wonders',
    recipesTotal: 50,
    mealTypes: { breakfast: 8, lunch: 14, dinner: 22, snack: 4, dessert: 2 },
    macroProfile: {
      calories: { min: 350, max: 650 },
      protein: { min: 30, max: 55 },
      carbs: { min: 35, max: 65 },
      fat: { min: 12, max: 28 }
    },
    aiInstruction: 'This is a ONE-POT recipe. Everything cooks in a single pot, pan, or sheet pan for minimal cleanup. Great for meal prep and batch cooking. Include soups, stews, casseroles, sheet pan dinners.'
  },
  {
    name: 'Meal Prep Friendly',
    recipesTotal: 70,
    mealTypes: { breakfast: 12, lunch: 22, dinner: 28, snack: 5, dessert: 3 },
    macroProfile: {
      calories: { min: 350, max: 650 },
      protein: { min: 30, max: 55 },
      carbs: { min: 35, max: 65 },
      fat: { min: 12, max: 28 }
    },
    aiInstruction: 'This recipe is MEAL PREP FRIENDLY. Must reheat well, store for 4-5 days in fridge, and taste good cold or reheated. Scales easily for batch cooking. Include storage tips in instructions.'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BUDGET & ACCESSIBILITY
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'Budget-Friendly',
    recipesTotal: 60,
    mealTypes: { breakfast: 12, lunch: 16, dinner: 22, snack: 6, dessert: 4 },
    macroProfile: {
      calories: { min: 350, max: 650 },
      protein: { min: 25, max: 50 },
      carbs: { min: 40, max: 70 },
      fat: { min: 10, max: 25 }
    },
    aiInstruction: 'This recipe MUST be BUDGET-FRIENDLY (under $3 per serving). Use affordable proteins: eggs, beans, lentils, chicken thighs, canned fish. Avoid expensive ingredients. Bulk staples like rice, oats, potatoes.'
  },
  {
    name: 'Pantry Staples',
    recipesTotal: 45,
    mealTypes: { breakfast: 10, lunch: 12, dinner: 18, snack: 3, dessert: 2 },
    macroProfile: {
      calories: { min: 350, max: 600 },
      protein: { min: 20, max: 45 },
      carbs: { min: 40, max: 70 },
      fat: { min: 10, max: 25 }
    },
    aiInstruction: 'This recipe uses primarily PANTRY STAPLES - shelf-stable ingredients. Canned goods, dried pasta/grains, dried beans, nuts, oils. Minimal fresh ingredients (maybe 1-2). Great for when you cannot go shopping.'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FITNESS DESSERTS (including user's protein ice cream style)
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'Protein Desserts',
    recipesTotal: 50,
    mealTypes: { breakfast: 0, lunch: 0, dinner: 0, snack: 20, dessert: 30 },
    macroProfile: {
      calories: { min: 200, max: 450 },
      protein: { min: 20, max: 50 },
      carbs: { min: 20, max: 50 },
      fat: { min: 5, max: 20 }
    },
    aiInstruction: `This is a HIGH-PROTEIN DESSERT recipe. Must have 20g+ protein per serving while tasting like a treat.
Examples to inspire (create unique variations):
- Protein ice cream (Greek yogurt + whey protein + almond milk + sweetener + pudding mix + cookie crumbles) - Ninja Creami style
- Protein cheesecake, protein brownies, protein mousse, protein cookies
- Anabolic French toast, protein pancakes with toppings
- Greek yogurt bark, protein mug cakes, cottage cheese desserts
Use: whey/casein protein, Greek yogurt, cottage cheese, egg whites, protein powder.
Sweeten with: monk fruit, stevia, erythritol, or small amounts of honey/maple.
Make it INDULGENT while being macro-friendly!`
  },
  {
    name: 'Low-Cal Desserts',
    recipesTotal: 40,
    mealTypes: { breakfast: 0, lunch: 0, dinner: 0, snack: 15, dessert: 25 },
    macroProfile: {
      calories: { min: 80, max: 200 },
      protein: { min: 3, max: 15 },
      carbs: { min: 10, max: 35 },
      fat: { min: 2, max: 10 }
    },
    aiInstruction: 'This is a LOW-CALORIE DESSERT (under 200 calories per serving). Light but satisfying. Use: fresh fruit, sugar-free gelatin, whipped egg whites, light dairy, frozen fruit. Examples: frozen yogurt, fruit sorbet, angel food cake, chia pudding, grilled fruit.'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SUPERFOOD CATEGORIES
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'Superfood Bowls',
    recipesTotal: 45,
    mealTypes: { breakfast: 15, lunch: 15, dinner: 10, snack: 3, dessert: 2 },
    macroProfile: {
      calories: { min: 350, max: 600 },
      protein: { min: 20, max: 40 },
      carbs: { min: 40, max: 70 },
      fat: { min: 15, max: 30 }
    },
    aiInstruction: 'This is a SUPERFOOD BOWL recipe. Must include multiple superfoods: açaí, quinoa, chia seeds, kale, spinach, blueberries, goji berries, hemp seeds, flaxseeds, spirulina. Colorful, nutrient-dense, Instagram-worthy bowl format.'
  },
  {
    name: 'Green Power',
    recipesTotal: 40,
    mealTypes: { breakfast: 10, lunch: 12, dinner: 12, snack: 4, dessert: 2 },
    macroProfile: {
      calories: { min: 250, max: 500 },
      protein: { min: 15, max: 35 },
      carbs: { min: 25, max: 50 },
      fat: { min: 10, max: 25 }
    },
    aiInstruction: 'This is a GREEN POWER recipe featuring leafy greens prominently. MUST include: kale, spinach, arugula, Swiss chard, collard greens, or spirulina. Green smoothies, salads, sautéed greens, green soups. Chlorophyll-rich and detoxifying.'
  },
];

// ============================================================================
// MACRO PROFILES BY MEAL TYPE (for cuisine seeding)
// ============================================================================

const MEAL_TYPE_MACROS = {
  regular: {
    breakfast: { calories: 500, protein: 35, carbs: 50, fat: 20 },
    lunch: { calories: 600, protein: 45, carbs: 55, fat: 22 },
    dinner: { calories: 700, protein: 50, carbs: 60, fat: 25 },
    snack: { calories: 250, protein: 15, carbs: 25, fat: 12 },
    dessert: { calories: 300, protein: 10, carbs: 45, fat: 12 },
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if recipe with same title already exists
async function recipeExists(title: string): Promise<boolean> {
  const existing = await prisma.recipe.findFirst({
    where: {
      title: {
        equals: title,
        mode: 'insensitive',
      },
    },
  });
  return !!existing;
}

// Generate random macros within a range
function randomInRange(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

// ============================================================================
// RECIPE GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate a cuisine-based recipe
 */
async function generateCuisineRecipe(
  cuisine: CuisineTarget,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert',
  attempt: number = 1
): Promise<boolean> {
  const maxAttempts = 3;

  try {
    const macros = MEAL_TYPE_MACROS.regular[mealType];

    console.log(`  🍽️  [${cuisine.name}] Generating ${mealType}... [Attempt ${attempt}]`);

    const recipe = await aiRecipeService.generateRecipe({
      userId: null,
      macroGoals: macros,
      mealType,
      cuisineOverride: cuisine.name,
      userPreferences: {
        likedCuisines: [cuisine.name],
        dietaryRestrictions: [],
        bannedIngredients: [],
        spiceLevel: 'medium',
        cookTimePreference: 45,
      },
    });

    // Check for duplicate before saving
    const isDuplicate = await recipeExists(recipe.title);
    if (isDuplicate) {
      console.log(`  ⚠️  Duplicate: "${recipe.title}" - retrying`);
      if (attempt < maxAttempts) {
        await delay(1000);
        return generateCuisineRecipe(cuisine, mealType, attempt + 1);
      }
      return false;
    }

    await aiRecipeService.saveGeneratedRecipe(recipe, null);
    console.log(`  ✅ "${recipe.title}" (${recipe.calories} cal, ${recipe.protein}g protein)`);
    return true;
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message?.substring(0, 80)}`);
    if (attempt < maxAttempts) {
      await delay(2000);
      return generateCuisineRecipe(cuisine, mealType, attempt + 1);
    }
    return false;
  }
}

/**
 * Generate a functional category recipe
 */
async function generateFunctionalRecipe(
  category: FunctionalCategory,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert',
  attempt: number = 1
): Promise<boolean> {
  const maxAttempts = 3;

  try {
    // Generate macros within the category's range
    const macros = {
      calories: randomInRange(category.macroProfile.calories.min, category.macroProfile.calories.max),
      protein: randomInRange(category.macroProfile.protein.min, category.macroProfile.protein.max),
      carbs: randomInRange(category.macroProfile.carbs.min, category.macroProfile.carbs.max),
      fat: randomInRange(category.macroProfile.fat.min, category.macroProfile.fat.max),
    };

    console.log(`  🎯 [${category.name}] Generating ${mealType}... [Attempt ${attempt}]`);

    // Build dietary restrictions based on category
    const dietaryRestrictions: string[] = [];
    if (category.name === 'Vegetarian') dietaryRestrictions.push('vegetarian');
    if (category.name === 'Vegan') dietaryRestrictions.push('vegan');
    if (category.name === 'Gluten-Free') dietaryRestrictions.push('gluten-free');
    if (category.name === 'Dairy-Free') dietaryRestrictions.push('dairy-free');

    // Pick a random cuisine to add variety
    const randomCuisines = ['Mediterranean', 'American', 'Asian', 'Mexican', 'Italian', 'Japanese', 'Indian', 'Thai'];
    const randomCuisine = randomCuisines[Math.floor(Math.random() * randomCuisines.length)];

    const recipe = await aiRecipeService.generateRecipe({
      userId: null,
      macroGoals: macros,
      mealType,
      cuisineOverride: randomCuisine,
      userPreferences: {
        likedCuisines: [randomCuisine],
        dietaryRestrictions,
        bannedIngredients: [],
        spiceLevel: 'medium',
        cookTimePreference: category.name === 'Quick Meals' ? 20 : 45,
      },
      maxCookTimeForMeal: category.name === 'Quick Meals' ? 20 : undefined,
    });

    // Check for duplicate
    const isDuplicate = await recipeExists(recipe.title);
    if (isDuplicate) {
      console.log(`  ⚠️  Duplicate: "${recipe.title}" - retrying`);
      if (attempt < maxAttempts) {
        await delay(1000);
        return generateFunctionalRecipe(category, mealType, attempt + 1);
      }
      return false;
    }

    await aiRecipeService.saveGeneratedRecipe(recipe, null);
    console.log(`  ✅ "${recipe.title}" (${recipe.calories} cal, ${recipe.protein}g protein, ${recipe.cookTime} min)`);
    return true;
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message?.substring(0, 80)}`);
    if (attempt < maxAttempts) {
      await delay(2000);
      return generateFunctionalRecipe(category, mealType, attempt + 1);
    }
    return false;
  }
}

// ============================================================================
// MAIN SEEDING FUNCTION
// ============================================================================

async function seedComprehensiveDatabase() {
  console.log('🌱 COMPREHENSIVE RECIPE DATABASE SEEDING');
  console.log('═'.repeat(70));

  const cuisineTotal = GLOBAL_CUISINES.reduce((sum, c) => sum + c.recipesTotal, 0);
  const functionalTotal = FUNCTIONAL_CATEGORIES.reduce((sum, c) => sum + c.recipesTotal, 0);
  const grandTotal = cuisineTotal + functionalTotal;

  console.log(`📊 Target: ${grandTotal} recipes total`);
  console.log(`   • ${cuisineTotal} cuisine-based recipes across ${GLOBAL_CUISINES.length} cuisines`);
  console.log(`   • ${functionalTotal} functional category recipes across ${FUNCTIONAL_CATEGORIES.length} categories`);
  console.log('');

  const stats = {
    cuisineGenerated: 0,
    cuisineFailed: 0,
    functionalGenerated: 0,
    functionalFailed: 0,
    skipped: 0,
  };

  const startTime = Date.now();

  // Get current database count
  const currentTotal = await prisma.recipe.count({ where: { isUserCreated: false } });
  console.log(`📦 Current recipes in database: ${currentTotal}`);
  console.log('');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 1: SEED GLOBAL CUISINES
  // ─────────────────────────────────────────────────────────────────────────
  console.log('═'.repeat(70));
  console.log('PHASE 1: GLOBAL CUISINES');
  console.log('═'.repeat(70));

  for (const cuisine of GLOBAL_CUISINES) {
    // Check existing count for this cuisine
    const existingCount = await prisma.recipe.count({
      where: { cuisine: cuisine.name, isUserCreated: false },
    });

    const needed = Math.max(0, cuisine.recipesTotal - existingCount);

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📦 ${cuisine.name.toUpperCase()}`);
    console.log(`   ${cuisine.description}`);
    console.log(`   Target: ${cuisine.recipesTotal} | Existing: ${existingCount} | Needed: ${needed}`);
    console.log(`${'─'.repeat(60)}`);

    if (needed === 0) {
      console.log(`   ⏭️  Already at target, skipping...`);
      stats.skipped += cuisine.recipesTotal;
      continue;
    }

    // Generate recipes for each meal type
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'] as const;
    let generatedForCuisine = 0;

    for (const mealType of mealTypes) {
      const targetForMealType = cuisine.mealTypes[mealType];
      if (targetForMealType === 0) continue;

      // Proportional number to generate
      const proportionalNeeded = Math.ceil((needed * targetForMealType) / cuisine.recipesTotal);

      for (let i = 0; i < proportionalNeeded && generatedForCuisine < needed; i++) {
        const success = await generateCuisineRecipe(cuisine, mealType);

        if (success) {
          stats.cuisineGenerated++;
          generatedForCuisine++;
        } else {
          stats.cuisineFailed++;
        }

        // Rate limiting
        await delay(1500);
      }
    }

    console.log(`   📊 ${cuisine.name}: +${generatedForCuisine} generated`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 2: SEED FUNCTIONAL CATEGORIES
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(70));
  console.log('PHASE 2: FUNCTIONAL CATEGORIES');
  console.log('═'.repeat(70));

  for (const category of FUNCTIONAL_CATEGORIES) {
    // For functional categories, we check by looking at recipe tags/properties
    // Since we don't have a category field, we'll just generate the target amount
    // In a real implementation, you'd want to track these separately

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🎯 ${category.name.toUpperCase()}`);
    console.log(`   ${category.aiInstruction.substring(0, 80)}...`);
    console.log(`   Target: ${category.recipesTotal} recipes`);
    console.log(`${'─'.repeat(60)}`);

    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'] as const;
    let generatedForCategory = 0;

    for (const mealType of mealTypes) {
      const targetForMealType = category.mealTypes[mealType];
      if (targetForMealType === 0) continue;

      for (let i = 0; i < targetForMealType; i++) {
        const success = await generateFunctionalRecipe(category, mealType);

        if (success) {
          stats.functionalGenerated++;
          generatedForCategory++;
        } else {
          stats.functionalFailed++;
        }

        // Rate limiting
        await delay(1500);
      }
    }

    console.log(`   📊 ${category.name}: +${generatedForCategory} generated`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FINAL SUMMARY
  // ─────────────────────────────────────────────────────────────────────────
  const endTime = Date.now();
  const durationMinutes = Math.round((endTime - startTime) / 1000 / 60);

  const finalTotal = await prisma.recipe.count({ where: { isUserCreated: false } });
  const finalByCuisine = await prisma.recipe.groupBy({
    by: ['cuisine'],
    where: { isUserCreated: false },
    _count: true,
  });

  console.log('\n' + '═'.repeat(70));
  console.log('📊 COMPREHENSIVE SEEDING SUMMARY');
  console.log('═'.repeat(70));
  console.log(`\n✅ Cuisine Recipes Generated: ${stats.cuisineGenerated}`);
  console.log(`❌ Cuisine Recipes Failed: ${stats.cuisineFailed}`);
  console.log(`✅ Functional Recipes Generated: ${stats.functionalGenerated}`);
  console.log(`❌ Functional Recipes Failed: ${stats.functionalFailed}`);
  console.log(`⏭️  Skipped (already existed): ${stats.skipped}`);
  console.log(`⏱️  Duration: ${durationMinutes} minutes`);
  console.log(`\n💾 Final Database Total: ${finalTotal} recipes`);

  console.log('\n📦 Cuisine Distribution:');
  finalByCuisine
    .sort((a, b) => b._count - a._count)
    .slice(0, 20)
    .forEach(item => {
      const bar = '█'.repeat(Math.floor(item._count / 3));
      console.log(`   ${item.cuisine.padEnd(18)} ${item._count.toString().padStart(4)} ${bar}`);
    });

  if (finalByCuisine.length > 20) {
    console.log(`   ... and ${finalByCuisine.length - 20} more cuisines`);
  }
}

// ============================================================================
// RUN SEEDING
// ============================================================================

seedComprehensiveDatabase()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\n🎉 Comprehensive seeding complete!');
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('\n❌ Seeding error:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
