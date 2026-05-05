// backend/src/services/dailyCheckInService.ts
// ROADMAP 4.0 Tier C7 — Daily check-in (backend).
//
// 3-tap, 10s max. Top half: today's nutrition card snapshot. Bottom half:
// 1 conversational reflection + optional Likert hunger/energy/satiety.
// The data + reflection pair is the highest-fidelity adaptation signal in
// the personalization stack.

import { prisma } from '../lib/prisma';

export interface DailyCheckInInput {
  userId: string;
  date: Date;
  /** Optional snapshot of the nutrition card the user tapped. JSON-serializable. */
  nutritionSnapshot?: unknown;
  reflectionText?: string;
  /** 1..5 Likert. */
  hungerNow?: number;
  /** 1..5 Likert. */
  energyAtLastMeal?: number;
  /** 1..5 Likert. */
  satietyFromYesterday?: number;
}

const REFLECTION_MAX_LEN = 500;

export function validateCheckInInput(input: DailyCheckInInput): void {
  if (!input.userId || input.userId.length === 0) {
    throw new Error('validateCheckInInput: userId is required');
  }
  if (!(input.date instanceof Date)) {
    throw new Error('validateCheckInInput: date must be a Date');
  }
  if (
    input.hungerNow !== undefined &&
    (input.hungerNow < 1 || input.hungerNow > 5 || !Number.isFinite(input.hungerNow))
  ) {
    throw new Error('validateCheckInInput: hungerNow must be in 1..5');
  }
  if (
    input.energyAtLastMeal !== undefined &&
    (input.energyAtLastMeal < 1 || input.energyAtLastMeal > 5 || !Number.isFinite(input.energyAtLastMeal))
  ) {
    throw new Error('validateCheckInInput: energyAtLastMeal must be in 1..5');
  }
  if (
    input.satietyFromYesterday !== undefined &&
    (input.satietyFromYesterday < 1 ||
      input.satietyFromYesterday > 5 ||
      !Number.isFinite(input.satietyFromYesterday))
  ) {
    throw new Error('validateCheckInInput: satietyFromYesterday must be in 1..5');
  }
  if (
    typeof input.reflectionText === 'string' &&
    input.reflectionText.length > REFLECTION_MAX_LEN
  ) {
    throw new Error(`validateCheckInInput: reflection text > ${REFLECTION_MAX_LEN} chars`);
  }
}

export async function upsertDailyCheckIn(input: DailyCheckInInput): Promise<void> {
  validateCheckInInput(input);

  const data = {
    userId: input.userId,
    date: input.date,
    nutritionSnapshot:
      input.nutritionSnapshot !== undefined ? JSON.stringify(input.nutritionSnapshot) : null,
    reflectionText: input.reflectionText ?? null,
    hungerNow: input.hungerNow ?? null,
    energyAtLastMeal: input.energyAtLastMeal ?? null,
    satietyFromYesterday: input.satietyFromYesterday ?? null,
  };

  await (prisma as any).dailyCheckIn.upsert({
    where: { userId_date: { userId: input.userId, date: input.date } },
    create: data,
    update: data,
  });
}

export async function getRecentCheckIns(
  userId: string,
  limit: number = 7
): Promise<Array<{
  id: string;
  date: Date;
  hungerNow: number | null;
  energyAtLastMeal: number | null;
  satietyFromYesterday: number | null;
  reflectionText: string | null;
}>> {
  const rows = (await (prisma as any).dailyCheckIn.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: limit,
    select: {
      id: true,
      date: true,
      hungerNow: true,
      energyAtLastMeal: true,
      satietyFromYesterday: true,
      reflectionText: true,
    },
  })) as Array<any>;
  return rows;
}

export type AdaptationSignal =
  | 'low-energy-after-meals'
  | 'frequent-hunger'
  | 'low-satiety';

const RECENT_WINDOW = 5;
const LOW_ENERGY_THRESHOLD = 2; // 1 or 2 = low
const LOW_ENERGY_OCCURRENCES_REQUIRED = 3;
const HIGH_HUNGER_AVG_THRESHOLD = 4;
const LOW_SATIETY_AVG_THRESHOLD = 2;

/**
 * Detect adaptation signals from a window of check-ins. The caller passes
 * the most recent N check-ins; we look at the last 5 to detect patterns.
 */
export function computeAdaptationSignal(
  checkIns: Array<{
    date: Date;
    hungerNow?: number | null;
    energyAtLastMeal?: number | null;
    satietyFromYesterday?: number | null;
  }>
): AdaptationSignal[] {
  if (!checkIns || checkIns.length === 0) return [];
  const recent = checkIns.slice(0, RECENT_WINDOW);
  const signals: AdaptationSignal[] = [];

  const lowEnergyCount = recent.filter(
    (c) => typeof c.energyAtLastMeal === 'number' && c.energyAtLastMeal <= LOW_ENERGY_THRESHOLD
  ).length;
  if (lowEnergyCount >= LOW_ENERGY_OCCURRENCES_REQUIRED) {
    signals.push('low-energy-after-meals');
  }

  const hungerVals = recent
    .map((c) => c.hungerNow)
    .filter((v): v is number => typeof v === 'number');
  if (hungerVals.length >= 3) {
    const avgHunger = hungerVals.reduce((a, b) => a + b, 0) / hungerVals.length;
    if (avgHunger >= HIGH_HUNGER_AVG_THRESHOLD) {
      signals.push('frequent-hunger');
    }
  }

  const satietyVals = recent
    .map((c) => c.satietyFromYesterday)
    .filter((v): v is number => typeof v === 'number');
  if (satietyVals.length >= 3) {
    const avgSatiety = satietyVals.reduce((a, b) => a + b, 0) / satietyVals.length;
    if (avgSatiety <= LOW_SATIETY_AVG_THRESHOLD) {
      signals.push('low-satiety');
    }
  }

  return signals;
}
