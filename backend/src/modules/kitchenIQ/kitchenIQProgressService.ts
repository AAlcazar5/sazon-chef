// Group 10S: Kitchen IQ progress service.
// Pure: takes cooking-stat snapshot + ingredient list + previously-notified ids
// and returns the unlock state. No I/O — controller wires Prisma.

import { KITCHEN_IQ_MANIFEST, type KitchenIQManifestEntry } from './kitchenIQManifest';

export interface ProgressInput {
  recipesCookedAllTime: number;
  cuisinesExploredCount: number;
  ingredientsCooked: string[];
  lastCheckedUnlocks: string[];
}

export interface ProgressOutput {
  totalCards: number;
  unlockedCount: number;
  unlockedIds: string[];
  newUnlocks: string[];
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function isUnlocked(entry: KitchenIQManifestEntry, input: ProgressInput): boolean {
  const cond = entry.unlockCondition;
  switch (cond.type) {
    case 'none':
      return true;
    case 'cook_count':
      return input.recipesCookedAllTime >= (cond.threshold ?? Infinity);
    case 'cuisine_count':
      return input.cuisinesExploredCount >= (cond.threshold ?? Infinity);
    case 'ingredient_used': {
      if (!cond.value) return false;
      const target = normalize(cond.value);
      return input.ingredientsCooked.some((ing) => normalize(ing) === target);
    }
    default:
      return false;
  }
}

export function evaluateUnlocks(input: ProgressInput): string[] {
  return KITCHEN_IQ_MANIFEST.filter((entry) => isUnlocked(entry, input)).map((e) => e.id);
}

export function computeProgress(input: ProgressInput): ProgressOutput {
  const unlockedIds = evaluateUnlocks(input);
  const seenSet = new Set(input.lastCheckedUnlocks);
  const newUnlocks = unlockedIds.filter((id) => !seenSet.has(id));
  return {
    totalCards: KITCHEN_IQ_MANIFEST.length,
    unlockedCount: unlockedIds.length,
    unlockedIds,
    newUnlocks,
  };
}
