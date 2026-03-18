// frontend/constants/MicronutrientAnnotations.ts
// Static "why it matters" annotations for the Micronutrient Spotlight Panel.
// Ranked by most commonly deficient in Western diets.

export interface MicronutrientInfo {
  name: string;
  key: string; // Spoonacular nutrition key
  dailyValue: number; // mg or mcg depending on unit
  unit: string;
  annotation: string;
}

export const MICRONUTRIENTS: MicronutrientInfo[] = [
  {
    name: 'Fiber',
    key: 'fiber',
    dailyValue: 28, // g, FDA daily value
    unit: 'g',
    annotation: 'Feeds gut bacteria, slows sugar absorption. Linked to lower colon cancer risk.',
  },
  {
    name: 'Omega-3 (ALA)',
    key: 'omega3',
    dailyValue: 1.6, // g
    unit: 'g',
    annotation: 'Anti-inflammatory fatty acid. Supports brain and heart health.',
  },
  {
    name: 'Magnesium',
    key: 'magnesium',
    dailyValue: 420, // mg
    unit: 'mg',
    annotation: 'Involved in 300+ enzyme reactions. Most adults are deficient.',
  },
  {
    name: 'Vitamin D',
    key: 'vitaminD',
    dailyValue: 20, // mcg
    unit: 'mcg',
    annotation: 'Essential for bone health and immune function. Hard to get from food alone.',
  },
  {
    name: 'Potassium',
    key: 'potassium',
    dailyValue: 4700, // mg
    unit: 'mg',
    annotation: 'Regulates blood pressure and fluid balance. Bananas are just the start.',
  },
  {
    name: 'Iron',
    key: 'iron',
    dailyValue: 18, // mg
    unit: 'mg',
    annotation: 'Carries oxygen in blood. Plant sources need vitamin C for better absorption.',
  },
  {
    name: 'Folate',
    key: 'folate',
    dailyValue: 400, // mcg DFE
    unit: 'mcg',
    annotation: 'Critical for cell division and DNA synthesis. Essential during pregnancy.',
  },
];

export const FIBER_BADGE_MIN_GRAMS = 8;
