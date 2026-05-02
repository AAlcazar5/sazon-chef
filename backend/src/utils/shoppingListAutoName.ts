// backend/src/utils/shoppingListAutoName.ts
// Auto-derive a shopping list name from its source: recipes, meal plan week, or item aisles.

import { prisma } from '../lib/prisma';
import { categorizeItem } from './aisleCategorizer';

interface WeekRange {
  start: Date;
  end: Date;
}

interface DeriveListNameInput {
  sourceRecipeIds?: string[];
  weekRange?: WeekRange;
  items?: { name: string }[];
}

const CAP = 30;

function capTitle(title: string): string {
  if (title.length <= CAP) return title;
  return title.slice(0, CAP) + '…';
}

function mondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatMonthDay(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // Use UTC methods to avoid timezone-induced off-by-one when a string like
  // '2025-03-03' is parsed as midnight UTC and getMonth/getDate returns the
  // local-timezone previous day.
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

async function nameFromRecipes(sourceRecipeIds: string[]): Promise<string> {
  if (sourceRecipeIds.length === 0) return 'Shopping List';

  const first = await prisma.recipe.findUnique({
    where: { id: sourceRecipeIds[0] },
    select: { title: true },
  });

  if (!first) return 'Shopping List';

  const capped = capTitle(first.title);
  if (sourceRecipeIds.length === 1) return capped;

  const rest = sourceRecipeIds.length - 1;
  return `${capped} + ${rest} more`;
}

function nameFromWeekRange(weekRange: WeekRange): string {
  const currentMonday = mondayOfWeek(new Date());
  const rangeMonday = mondayOfWeek(weekRange.start);

  if (isSameDate(currentMonday, rangeMonday)) return 'This week';
  return `Week of ${formatMonthDay(weekRange.start)}`;
}

function nameFromItems(items: { name: string }[]): string {
  if (items.length === 0) return 'Shopping List';

  const aisleCounts = new Map<string, number>();
  for (const item of items) {
    const aisle = categorizeItem(item.name);
    if (aisle) {
      aisleCounts.set(aisle, (aisleCounts.get(aisle) ?? 0) + 1);
    }
  }

  if (aisleCounts.size === 0) return 'Shopping List';

  const sorted = [...aisleCounts.entries()].sort((a, b) => b[1] - a[1]);

  if (sorted.length === 1) return `${sorted[0][0]} run`;
  return `${sorted[0][0]} + ${sorted[1][0]} run`;
}

export async function deriveListName(input: DeriveListNameInput): Promise<string> {
  const { sourceRecipeIds, weekRange, items } = input;

  if (sourceRecipeIds && sourceRecipeIds.length > 0) {
    return nameFromRecipes(sourceRecipeIds);
  }

  if (weekRange) {
    return nameFromWeekRange(weekRange);
  }

  if (items) {
    return nameFromItems(items);
  }

  return 'Shopping List';
}
