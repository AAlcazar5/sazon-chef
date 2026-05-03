// backend/src/services/recentPlatesService.ts
// Group 10X-Cleanup — counts the user's cooked plates and green-vegetable
// occurrences in the rolling 7-day window, used by the composer's
// "Eat the rainbow" hint banner.

import { prisma } from '../lib/prisma';

export interface WeeklyPlateSummary {
  totalPlatesThisWeek: number;
  greenVegCount: number;
}

const GREEN_VEG_NAME_PATTERNS = [
  'spinach',
  'broccoli',
  'kale',
  'arugula',
  'asparagus',
  'green bean',
  'brussels',
  'bok choy',
  'collard',
  'swiss chard',
  'zucchini',
  'green pea',
  'edamame',
];

interface PlateComponent {
  slot: string;
  componentId: string;
}

const isGreenName = (name: string): boolean => {
  const lower = name.toLowerCase();
  return GREEN_VEG_NAME_PATTERNS.some((p) => lower.includes(p));
};

export const computeWeeklyPlateSummary = async (
  userId: string,
): Promise<WeeklyPlateSummary> => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const plates = await prisma.composedPlate.findMany({
    where: { userId, createdAt: { gte: sevenDaysAgo } },
    select: { componentIds: true },
  });

  if (plates.length === 0) {
    return { totalPlatesThisWeek: 0, greenVegCount: 0 };
  }

  const vegIdsAcrossWeek: string[] = [];
  for (const plate of plates) {
    let parsed: PlateComponent[] = [];
    try {
      parsed = JSON.parse(plate.componentIds);
    } catch {
      continue;
    }
    if (!Array.isArray(parsed)) continue;
    for (const c of parsed) {
      if (c?.slot === 'vegetable' && typeof c.componentId === 'string') {
        vegIdsAcrossWeek.push(c.componentId);
      }
    }
  }

  if (vegIdsAcrossWeek.length === 0) {
    return { totalPlatesThisWeek: plates.length, greenVegCount: 0 };
  }

  const components = await prisma.mealComponent.findMany({
    where: { id: { in: Array.from(new Set(vegIdsAcrossWeek)) } },
    select: { id: true, name: true },
  });

  const greenIds = new Set(
    components.filter((c) => isGreenName(c.name)).map((c) => c.id),
  );
  const greenVegCount = vegIdsAcrossWeek.filter((id) => greenIds.has(id)).length;

  return {
    totalPlatesThisWeek: plates.length,
    greenVegCount,
  };
};
