// backend/src/services/discoveryMilestoneService.ts
// ROADMAP 4.0 Tier J5 — Discovery milestones (single-fire celebrations).
//
// Tracks first-of-X discovery moments for each user — first photo upload, first
// leftover reused into a recipe, first time using each appliance. Streak-free
// by design: each milestone fires once and never re-triggers. Persisted as a
// JSON-stringified array on User.discoveryMilestones (SQLite has no Json type).

import { prisma } from '../lib/prisma';

const APPLIANCE_KEYS = [
  'ninja-creami',
  'air-fryer',
  'instant-pot',
  'sous-vide',
  'dutch-oven',
  'cast-iron',
  'grill',
  'smoker',
] as const;

export const KNOWN_MILESTONE_KEYS: readonly string[] = [
  'first-photo',
  'first-leftover',
  ...APPLIANCE_KEYS.map((slug) => `first-appliance:${slug}`),
];

export const isKnownMilestoneKey = (key: string): boolean => {
  if (!key) return false;
  return KNOWN_MILESTONE_KEYS.includes(key);
};

export const buildAppliancesMilestoneKey = (applianceName: string): string | null => {
  const trimmed = applianceName?.trim?.() ?? '';
  if (!trimmed) return null;
  const slug = trimmed.toLowerCase().replace(/\s+/g, '-');
  return `first-appliance:${slug}`;
};

const parseStored = (raw: string | null | undefined): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

export interface MarkMilestoneResult {
  alreadyAchieved: boolean;
  newlyAchieved: boolean;
}

export const markMilestone = async (
  userId: string,
  key: string,
): Promise<MarkMilestoneResult> => {
  if (!userId) throw new Error('userId required');
  if (!isKnownMilestoneKey(key)) throw new Error(`Unknown milestone key: ${key}`);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { discoveryMilestones: true },
  });
  const existing = parseStored(user?.discoveryMilestones);
  if (existing.includes(key)) {
    return { alreadyAchieved: true, newlyAchieved: false };
  }
  const next = [...existing, key];
  await prisma.user.update({
    where: { id: userId },
    data: { discoveryMilestones: JSON.stringify(next) },
  });
  return { alreadyAchieved: false, newlyAchieved: true };
};

export const getMilestonesAchieved = async (userId: string): Promise<string[]> => {
  if (!userId) return [];
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { discoveryMilestones: true },
  });
  return parseStored(user?.discoveryMilestones);
};

export interface MilestoneCopy {
  title: string;
  body: string;
}

const APPLIANCE_LABELS: Record<string, string> = {
  'ninja-creami': 'Ninja Creami',
  'air-fryer': 'Air Fryer',
  'instant-pot': 'Instant Pot',
  'sous-vide': 'Sous Vide',
  'dutch-oven': 'Dutch Oven',
  'cast-iron': 'Cast Iron',
  grill: 'Grill',
  smoker: 'Smoker',
};

export const describeMilestone = (key: string): MilestoneCopy | null => {
  if (!isKnownMilestoneKey(key)) return null;
  if (key === 'first-photo') {
    return {
      title: 'First plate, framed.',
      body: 'You photographed your cook. The kitchen has memory now.',
    };
  }
  if (key === 'first-leftover') {
    return {
      title: 'A leftover earns a second life.',
      body: 'You turned yesterday\'s pot into today\'s dinner. That\'s how it\'s done.',
    };
  }
  if (key.startsWith('first-appliance:')) {
    const slug = key.slice('first-appliance:'.length);
    const label = APPLIANCE_LABELS[slug] ?? slug;
    return {
      title: `${label}, unlocked.`,
      body: `Your first cook with the ${label}. The pantry just expanded.`,
    };
  }
  return null;
};
