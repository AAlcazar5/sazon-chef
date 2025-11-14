// frontend/constants/Superfoods.ts
// Superfood categories matching backend/src/utils/superfoodDetection.ts

export interface SuperfoodCategory {
  id: string;
  name: string;
  description: string;
  emoji?: string;
}

export const SUPERFOOD_CATEGORIES: SuperfoodCategory[] = [
  { id: 'beans', name: 'Beans & Legumes', description: 'Black beans, chickpeas, lentils, etc.', emoji: '🫘' },
  { id: 'oliveOil', name: 'Olive Oil', description: 'Extra virgin olive oil and healthy fats', emoji: '🫒' },
  { id: 'fermented', name: 'Fermented Foods', description: 'Kimchi, yogurt, sauerkraut, miso, etc.', emoji: '🥬' },
  { id: 'ginger', name: 'Ginger', description: 'Fresh or ground ginger', emoji: '🫚' },
  { id: 'turmeric', name: 'Turmeric', description: 'Turmeric and curcumin', emoji: '🟡' },
  { id: 'cod', name: 'Cod', description: 'Cod fish (Omega-3 rich)', emoji: '🐟' },
  { id: 'sardines', name: 'Sardines', description: 'Sardines (Omega-3 rich)', emoji: '🐟' },
  { id: 'salmon', name: 'Salmon', description: 'Salmon (Omega-3 rich)', emoji: '🐟' },
  { id: 'mackerel', name: 'Mackerel', description: 'Mackerel (Omega-3 rich)', emoji: '🐟' },
  { id: 'herring', name: 'Herring', description: 'Herring (Omega-3 rich)', emoji: '🐟' },
  { id: 'blueberries', name: 'Blueberries', description: 'Blueberries and other berries', emoji: '🫐' },
  { id: 'strawberries', name: 'Strawberries', description: 'Strawberries', emoji: '🍓' },
  { id: 'raspberries', name: 'Raspberries', description: 'Raspberries', emoji: '🫐' },
  { id: 'blackberries', name: 'Blackberries', description: 'Blackberries', emoji: '🫐' },
  { id: 'spinach', name: 'Spinach', description: 'Spinach and leafy greens', emoji: '🥬' },
  { id: 'kale', name: 'Kale', description: 'Kale', emoji: '🥬' },
  { id: 'arugula', name: 'Arugula', description: 'Arugula/rocket', emoji: '🥬' },
  { id: 'almonds', name: 'Almonds', description: 'Almonds and almond products', emoji: '🥜' },
  { id: 'walnuts', name: 'Walnuts', description: 'Walnuts', emoji: '🥜' },
  { id: 'chiaSeeds', name: 'Chia Seeds', description: 'Chia seeds', emoji: '🌱' },
  { id: 'flaxSeeds', name: 'Flax Seeds', description: 'Flax seeds', emoji: '🌾' },
  { id: 'quinoa', name: 'Quinoa', description: 'Quinoa', emoji: '🌾' },
  { id: 'oats', name: 'Oats', description: 'Oats and oatmeal', emoji: '🌾' },
  { id: 'brownRice', name: 'Brown Rice', description: 'Brown rice', emoji: '🌾' },
  { id: 'avocado', name: 'Avocado', description: 'Avocado and avocado oil', emoji: '🥑' },
  { id: 'sweetPotato', name: 'Sweet Potato', description: 'Sweet potatoes/yams', emoji: '🍠' },
  { id: 'broccoli', name: 'Broccoli', description: 'Broccoli', emoji: '🥦' },
  { id: 'garlic', name: 'Garlic', description: 'Garlic', emoji: '🧄' },
];

