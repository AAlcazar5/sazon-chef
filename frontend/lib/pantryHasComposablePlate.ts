import type { PantryItem } from '../types';

export type PantrySlot = 'protein' | 'grain' | 'produce' | 'condiment';

const PROTEIN_KEYWORDS: readonly string[] = [
  'chicken', 'beef', 'pork', 'turkey', 'lamb', 'salmon', 'tuna', 'shrimp',
  'cod', 'tilapia', 'tofu', 'tempeh', 'seitan', 'egg', 'lentil', 'chickpea',
  'bean', 'edamame',
];

const GRAIN_KEYWORDS: readonly string[] = [
  'rice', 'quinoa', 'farro', 'barley', 'oat', 'pasta', 'noodle', 'couscous',
  'bulgur', 'tortilla', 'bread', 'sweet potato', 'potato',
];

const CONDIMENT_KEYWORDS: readonly string[] = [
  'oil', 'vinegar', 'soy sauce', 'sriracha', 'mayo', 'mustard', 'ketchup',
  'tahini', 'hummus', 'yogurt', 'sour cream', 'pesto', 'salsa', 'hot sauce',
  'butter', 'honey', 'maple', 'jam',
];

const PRODUCE_CATEGORIES: readonly string[] = ['produce', 'vegetables', 'vegetable', 'fruit', 'fruits'];

const matches = (name: string, keywords: readonly string[]): boolean =>
  keywords.some((k) => name.includes(k));

export const classifyPantrySlot = (item: PantryItem): PantrySlot | null => {
  const name = item.name.toLowerCase().trim();
  const category = (item.category ?? '').toLowerCase().trim();

  if (matches(name, PROTEIN_KEYWORDS)) return 'protein';
  if (matches(name, GRAIN_KEYWORDS)) return 'grain';
  if (PRODUCE_CATEGORIES.includes(category)) return 'produce';
  if (matches(name, CONDIMENT_KEYWORDS)) return 'condiment';
  return null;
};

export const pantryHasComposablePlate = (items: readonly PantryItem[]): boolean => {
  if (items.length < 4) return false;
  const slots = items.reduce<Set<PantrySlot>>((acc, item) => {
    const slot = classifyPantrySlot(item);
    return slot ? new Set([...acc, slot]) : acc;
  }, new Set());
  return slots.size >= 3;
};
