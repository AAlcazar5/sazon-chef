// backend/src/modules/mealPlan/mealPlanSchemas.ts
//
// Tier L L2 — single source of truth for MealPlan enum-shaped columns.
// Prisma stores planningMode as `String?` because SQLite has no enum type;
// this module is the runtime enforcement layer Prisma can't provide.

import { z } from 'zod';

export const PlanningModeSchema = z.enum(['cut', 'maintain', 'build']);

export type PlanningMode = z.infer<typeof PlanningModeSchema>;

/**
 * Coerce an inbound `planningMode` value (typically from `req.body`) to a
 * validated `PlanningMode | null`. Empty / null / undefined are treated as
 * "not specified" and return null so the planner can fall back to the user's
 * fitnessGoal mapping. Any *other* invalid value throws so the controller
 * can return 400 instead of silently writing garbage to the column.
 */
export function parsePlanningMode(input: unknown): PlanningMode | null {
  if (input === null || input === undefined || input === '') {
    return null;
  }
  const r = PlanningModeSchema.safeParse(input);
  if (!r.success) {
    throw new Error(
      `Invalid planningMode: expected one of cut|maintain|build, got ${JSON.stringify(input)}`,
    );
  }
  return r.data;
}

/**
 * Non-throwing variant for reading legacy DB values: returns null on any
 * invalid string instead of throwing. Use for `mealPlan.planningMode` after
 * a `findUnique` etc. — historical rows pre-date enum enforcement.
 */
export function coercePlanningMode(input: unknown): PlanningMode | null {
  if (input === null || input === undefined || input === '') {
    return null;
  }
  const r = PlanningModeSchema.safeParse(input);
  return r.success ? r.data : null;
}
