// backend/tests/modules/mealPlanSchemas.test.ts
// Tier L L2 — planningMode enum guard. Validates the zod schema that backs
// MealPlan.planningMode (was a bare-string column with a `// 'cut' | 'maintain'
// | 'build'` comment).

import { PlanningModeSchema, parsePlanningMode } from '../../src/modules/mealPlan/mealPlanSchemas';

describe('PlanningModeSchema', () => {
  it.each(['cut', 'maintain', 'build'])('accepts %s', (mode) => {
    const r = PlanningModeSchema.safeParse(mode);
    expect(r.success).toBe(true);
  });

  it('rejects unknown strings', () => {
    expect(PlanningModeSchema.safeParse('bulk').success).toBe(false);
    expect(PlanningModeSchema.safeParse('CUT').success).toBe(false);
    expect(PlanningModeSchema.safeParse('').success).toBe(false);
    expect(PlanningModeSchema.safeParse(null).success).toBe(false);
  });
});

describe('parsePlanningMode', () => {
  it('returns the value when valid', () => {
    expect(parsePlanningMode('cut')).toBe('cut');
    expect(parsePlanningMode('build')).toBe('build');
    expect(parsePlanningMode('maintain')).toBe('maintain');
  });

  it('returns null for null/undefined/empty', () => {
    expect(parsePlanningMode(null)).toBeNull();
    expect(parsePlanningMode(undefined)).toBeNull();
    expect(parsePlanningMode('')).toBeNull();
  });

  it('throws on invalid strings so the controller can 400', () => {
    expect(() => parsePlanningMode('bulk')).toThrow(/planningMode/);
    expect(() => parsePlanningMode('cutting')).toThrow(/planningMode/);
    expect(() => parsePlanningMode(123 as unknown as string)).toThrow(/planningMode/);
  });
});
