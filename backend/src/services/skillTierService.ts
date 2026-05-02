// backend/src/services/skillTierService.ts
// Group 10X Phase 9 — composer skill tier progression.
//
// Tier auto-promotes after N plates cooked. Each tier unlocks more slots and
// more complex components.

import { prisma } from '../lib/prisma';

export type SkillTier = 'beginner' | 'cook' | 'chef';

export const TIER_THRESHOLDS: Record<Exclude<SkillTier, 'beginner'>, number> = {
  cook: 5,
  chef: 20,
};

const SLOTS_BY_TIER: Record<SkillTier, string[]> = {
  beginner: ['protein', 'base', 'vegetable'],
  cook: ['protein', 'base', 'vegetable', 'sauce'],
  chef: ['protein', 'base', 'vegetable', 'sauce', 'garnish'],
};

const MAX_COMPLEXITY_BY_TIER: Record<SkillTier, number> = {
  beginner: 1,
  cook: 2,
  chef: 99,
};

export const computeSkillTier = (platesCooked: number): SkillTier => {
  if (platesCooked >= TIER_THRESHOLDS.chef) return 'chef';
  if (platesCooked >= TIER_THRESHOLDS.cook) return 'cook';
  return 'beginner';
};

export const visibleSlotsForTier = (tier: SkillTier): string[] => SLOTS_BY_TIER[tier];

export const filterComponentsByTier = <T extends { slot: string; complexity?: number }>(
  components: T[],
  tier: SkillTier
): T[] => {
  const allowedSlots = new Set(SLOTS_BY_TIER[tier]);
  const maxComplexity = MAX_COMPLEXITY_BY_TIER[tier];
  return components.filter((c) => {
    if (!allowedSlots.has(c.slot)) return false;
    const cx = c.complexity ?? 1;
    return cx <= maxComplexity;
  });
};

export const getUserSkillTier = async (userId: string): Promise<SkillTier> => {
  const platesCooked = await (prisma as any).composedPlate.count({
    where: { userId },
  });
  return computeSkillTier(platesCooked);
};
