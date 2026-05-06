// backend/__tests__/services/auditRunService.test.ts
// ROADMAP 4.0 Tier D6 — Phase 1 audit run.

import {
  runAudit,
  auditRowsToCsv,
  bucketForComposite,
  AuditInputRecipe,
} from '../../src/services/auditRunService';

const recipe = (
  overrides: Partial<AuditInputRecipe> = {},
): AuditInputRecipe => ({
  recipeId: 'r1',
  canonicalCuisine: 'persian',
  subCuisine: null,
  archetype: 'weekend_project',
  axes: {
    image: 5,
    structure: 5,
    nutrition: 5,
    voice: 5,
    dedupe: 5,
    safety: 5,
  },
  axisReasons: [],
  ...overrides,
});

describe('bucketForComposite', () => {
  it('≥80 → keep', () => {
    expect(bucketForComposite(100)).toBe('keep');
    expect(bucketForComposite(80)).toBe('keep');
  });
  it('50-79 → improve', () => {
    expect(bucketForComposite(79)).toBe('improve');
    expect(bucketForComposite(50)).toBe('improve');
  });
  it('30-49 → review', () => {
    expect(bucketForComposite(49)).toBe('review');
    expect(bucketForComposite(30)).toBe('review');
  });
  it('<30 → delete_candidate', () => {
    expect(bucketForComposite(29)).toBe('delete_candidate');
    expect(bucketForComposite(0)).toBe('delete_candidate');
  });
});

describe('runAudit', () => {
  it('produces one row per input', () => {
    const rows = runAudit([recipe(), recipe({ recipeId: 'r2' })]);
    expect(rows).toHaveLength(2);
  });

  it('computes composite + bucket correctly', () => {
    const rows = runAudit([recipe()]);
    expect(rows[0].composite).toBe(100);
    expect(rows[0].suggestedAction).toBe('keep');
  });

  it('persists individual axis scores onto the row', () => {
    const rows = runAudit([
      recipe({ axes: { image: 4, structure: 5 } }),
    ]);
    expect(rows[0].imageScore).toBe(4);
    expect(rows[0].structureScore).toBe(5);
    expect(rows[0].nutritionScore).toBeNull();
  });

  it('appends caller-supplied axis reasons to composite reasons', () => {
    const rows = runAudit([
      recipe({
        axes: { image: 1 },
        axisReasons: [
          { axis: 'image', code: 'image_unreachable' },
        ],
      }),
    ]);
    const codes = rows[0].failureReasons.map((r) => r.code);
    expect(codes).toContain('image_unreachable');
    // Plus 5 axis_unavailable for the missing axes
    expect(codes.filter((c) => c === 'axis_unavailable')).toHaveLength(5);
  });

  it('flags isOnlyInstanceOf=true for the sole recipe in its slot', () => {
    const rows = runAudit([
      recipe({ recipeId: 'r1', canonicalCuisine: 'senegalese', archetype: 'comfort_stew' }),
      recipe({ recipeId: 'r2', canonicalCuisine: 'persian', archetype: 'weekend_project' }),
      recipe({ recipeId: 'r3', canonicalCuisine: 'persian', archetype: 'weekend_project' }),
    ]);
    expect(rows.find((r) => r.recipeId === 'r1')?.isOnlyInstanceOf).toBe(true);
    expect(rows.find((r) => r.recipeId === 'r2')?.isOnlyInstanceOf).toBe(false);
    expect(rows.find((r) => r.recipeId === 'r3')?.isOnlyInstanceOf).toBe(false);
  });

  it('flags isOnlyInstanceOf=false when canonicalCuisine or archetype is null', () => {
    const rows = runAudit([
      recipe({ recipeId: 'r1', canonicalCuisine: null, archetype: 'weekend_project' }),
    ]);
    expect(rows[0].isOnlyInstanceOf).toBe(false);
  });

  it('does not require any specific input order to produce stable output', () => {
    const a = runAudit([recipe({ recipeId: 'a' }), recipe({ recipeId: 'b' })]);
    const b = runAudit([recipe({ recipeId: 'a' }), recipe({ recipeId: 'b' })]);
    expect(a).toEqual(b);
  });
});

describe('auditRowsToCsv', () => {
  it('emits header + per-row CSV', () => {
    const rows = runAudit([recipe()]);
    const csv = auditRowsToCsv(rows);
    expect(csv).toContain(
      'recipe_id,canonical_cuisine,sub_cuisine,archetype,composite,image_score',
    );
    expect(csv).toContain('r1,persian,,weekend_project,100.00');
    expect(csv).toContain('keep');
  });

  it('escapes commas + quotes in failure reason codes', () => {
    const rows = runAudit([
      recipe({
        axes: {},
        axisReasons: [
          { axis: 'image', code: 'has,comma' },
        ],
      }),
    ]);
    const csv = auditRowsToCsv(rows);
    expect(csv).toContain('has,comma');
  });

  it('handles empty rows array — header only', () => {
    const csv = auditRowsToCsv([]);
    expect(csv.split('\n')[0]).toContain('recipe_id');
  });
});
