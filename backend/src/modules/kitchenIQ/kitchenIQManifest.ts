// Group 10S: Kitchen IQ unlock manifest — backend mirror of the frontend card library.
// Only the unlock structure is duplicated; full card content stays in
// `frontend/lib/kitchenIQ/cards.ts`. Card IDs MUST match the frontend file.

export type UnlockType = 'cook_count' | 'cuisine_count' | 'ingredient_used' | 'none';

export interface KitchenIQUnlockCondition {
  type: UnlockType;
  threshold?: number;
  value?: string;
}

export interface KitchenIQManifestEntry {
  id: string;
  unlockCondition: KitchenIQUnlockCondition;
}

export const KITCHEN_IQ_MANIFEST: KitchenIQManifestEntry[] = [
  // Nutrient deep dives
  { id: 'nut-magnesium', unlockCondition: { type: 'cook_count', threshold: 5 } },
  { id: 'nut-iron', unlockCondition: { type: 'cook_count', threshold: 15 } },
  { id: 'nut-zinc', unlockCondition: { type: 'cook_count', threshold: 15 } },
  { id: 'nut-omega3', unlockCondition: { type: 'cook_count', threshold: 15 } },
  { id: 'nut-fiber', unlockCondition: { type: 'cook_count', threshold: 5 } },
  { id: 'nut-potassium', unlockCondition: { type: 'cook_count', threshold: 10 } },
  { id: 'nut-b12', unlockCondition: { type: 'cook_count', threshold: 10 } },
  { id: 'nut-vitamin-d', unlockCondition: { type: 'cook_count', threshold: 10 } },
  { id: 'nut-protein', unlockCondition: { type: 'none' } },
  { id: 'nut-creatine', unlockCondition: { type: 'cook_count', threshold: 15 } },
  { id: 'nut-collagen', unlockCondition: { type: 'cook_count', threshold: 20 } },
  { id: 'nut-electrolytes', unlockCondition: { type: 'cook_count', threshold: 5 } },

  // Ingredient spotlights
  { id: 'ing-turmeric', unlockCondition: { type: 'ingredient_used', value: 'turmeric' } },
  { id: 'ing-ginger', unlockCondition: { type: 'ingredient_used', value: 'ginger' } },
  { id: 'ing-acv', unlockCondition: { type: 'ingredient_used', value: 'apple cider vinegar' } },
  { id: 'ing-fermented', unlockCondition: { type: 'cuisine_count', threshold: 5 } },
  { id: 'ing-leafy-greens', unlockCondition: { type: 'cook_count', threshold: 5 } },
  { id: 'ing-legumes', unlockCondition: { type: 'cook_count', threshold: 5 } },
  { id: 'ing-seeds', unlockCondition: { type: 'cook_count', threshold: 10 } },
  { id: 'ing-garlic', unlockCondition: { type: 'ingredient_used', value: 'garlic' } },
  { id: 'ing-cinnamon', unlockCondition: { type: 'ingredient_used', value: 'cinnamon' } },
  { id: 'ing-bone-broth', unlockCondition: { type: 'cook_count', threshold: 20 } },

  // Concepts
  { id: 'con-protein-per-cal', unlockCondition: { type: 'cook_count', threshold: 5 } },
  { id: 'con-meal-timing', unlockCondition: { type: 'cook_count', threshold: 10 } },
  { id: 'con-volume-eating', unlockCondition: { type: 'none' } },
  { id: 'con-reading-labels', unlockCondition: { type: 'none' } },
  { id: 'con-anti-inflammatory', unlockCondition: { type: 'cook_count', threshold: 15 } },

  // Cuisine health stories
  { id: 'cui-okinawa', unlockCondition: { type: 'cuisine_count', threshold: 5 } },
  { id: 'cui-mediterranean', unlockCondition: { type: 'cuisine_count', threshold: 5 } },
  { id: 'cui-ethiopian', unlockCondition: { type: 'cuisine_count', threshold: 8 } },
  { id: 'cui-korean-ferment', unlockCondition: { type: 'cuisine_count', threshold: 5 } },
  { id: 'cui-latin', unlockCondition: { type: 'cuisine_count', threshold: 3 } },
];
