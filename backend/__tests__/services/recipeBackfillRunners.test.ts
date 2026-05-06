// backend/__tests__/services/recipeBackfillRunners.test.ts
// ROADMAP 4.0 Tier D8 — Improve-bucket backfill runners.

import {
  backfillImage,
  backfillNutrition,
  rewriteCopy,
  preservesRecipeSubstance,
  RecipeCopySnapshot,
} from '../../src/services/recipeBackfillRunners';

describe('backfillImage', () => {
  it('updates when new score is higher', async () => {
    const updates: any[] = [];
    const r = await backfillImage('r1', {
      fetchCurrent: async () => ({ imageUrl: 'old.jpg', currentScore: 2 }),
      generateImage: async () => 'new.jpg',
      scoreImage: async () => 5,
      updateImage: async (id, url) => {
        updates.push({ id, url });
      },
    });
    expect(r.outcome).toBe('updated');
    expect(r.oldScore).toBe(2);
    expect(r.newScore).toBe(5);
    expect(updates).toEqual([{ id: 'r1', url: 'new.jpg' }]);
  });

  it('skips on regression (new score < current)', async () => {
    let updateCalled = false;
    const r = await backfillImage('r1', {
      fetchCurrent: async () => ({ imageUrl: 'old.jpg', currentScore: 5 }),
      generateImage: async () => 'new.jpg',
      scoreImage: async () => 3,
      updateImage: async () => {
        updateCalled = true;
      },
    });
    expect(r.outcome).toBe('skipped');
    expect(r.reason).toContain('regression');
    expect(updateCalled).toBe(false);
  });

  it('updates when current score is null (no prior score)', async () => {
    const updates: any[] = [];
    const r = await backfillImage('r1', {
      fetchCurrent: async () => ({ imageUrl: null, currentScore: null }),
      generateImage: async () => 'new.jpg',
      scoreImage: async () => 4,
      updateImage: async (id, url) => {
        updates.push({ id, url });
      },
    });
    expect(r.outcome).toBe('updated');
    expect(updates).toHaveLength(1);
  });

  it('returns failed when generateImage throws', async () => {
    const r = await backfillImage('r1', {
      fetchCurrent: async () => ({ imageUrl: 'old.jpg', currentScore: 2 }),
      generateImage: async () => {
        throw new Error('boom');
      },
      scoreImage: async () => 5,
      updateImage: async () => {},
    });
    expect(r.outcome).toBe('failed');
    expect(r.reason).toContain('generate failed');
  });

  it('returns failed on empty recipeId', async () => {
    const r = await backfillImage('', {
      fetchCurrent: async () => ({ imageUrl: null, currentScore: null }),
      generateImage: async () => 'x',
      scoreImage: async () => 5,
      updateImage: async () => {},
    });
    expect(r.outcome).toBe('failed');
  });
});

describe('backfillNutrition', () => {
  it('skips when FDC inputs are unchanged (idempotent)', async () => {
    let updateCalled = false;
    const r = await backfillNutrition('r1', {
      fetchCurrent: async () => ({
        inputHash: 'h-stable',
        score: 4,
        payload: {},
      }),
      recompute: async () => ({
        inputHash: 'h-stable',
        score: 4,
        payload: {},
      }),
      updateAggregate: async () => {
        updateCalled = true;
      },
    });
    expect(r.outcome).toBe('skipped');
    expect(r.reason).toContain('unchanged');
    expect(updateCalled).toBe(false);
  });

  it('updates when FDC hash changes (new ingredient profile)', async () => {
    const updates: any[] = [];
    const r = await backfillNutrition('r1', {
      fetchCurrent: async () => ({
        inputHash: 'h-old',
        score: 3,
        payload: {},
      }),
      recompute: async () => ({
        inputHash: 'h-new',
        score: 5,
        payload: {},
      }),
      updateAggregate: async (id, agg) => {
        updates.push({ id, agg });
      },
    });
    expect(r.outcome).toBe('updated');
    expect(r.oldScore).toBe(3);
    expect(r.newScore).toBe(5);
    expect(updates).toHaveLength(1);
  });

  it('updates when no prior aggregate exists', async () => {
    const updates: any[] = [];
    const r = await backfillNutrition('r1', {
      fetchCurrent: async () => null,
      recompute: async () => ({
        inputHash: 'h-fresh',
        score: 4,
        payload: {},
      }),
      updateAggregate: async (id, agg) => {
        updates.push({ id, agg });
      },
    });
    expect(r.outcome).toBe('updated');
    expect(r.oldScore).toBeNull();
    expect(updates).toHaveLength(1);
  });

  it('returns failed when recompute throws', async () => {
    const r = await backfillNutrition('r1', {
      fetchCurrent: async () => null,
      recompute: async () => {
        throw new Error('FDC down');
      },
      updateAggregate: async () => {},
    });
    expect(r.outcome).toBe('failed');
    expect(r.reason).toContain('recompute failed');
  });
});

const baseRecipe = (
  overrides: Partial<RecipeCopySnapshot> = {},
): RecipeCopySnapshot => ({
  title: 'BEST EVER Persian Tahdig',
  description: 'Crush your macros with this guilt-free comfort dish.',
  ingredients: [
    { name: 'basmati rice', quantity: '2', unit: 'cups' },
    { name: 'saffron', quantity: '1', unit: 'pinch' },
  ],
  instructions: ['Soak rice.', 'Layer in pot.', 'Crisp the bottom.'],
  cookTimeMin: 30,
  prepTimeMin: 10,
  ...overrides,
});

describe('rewriteCopy', () => {
  it('updates when new voice score is higher', async () => {
    const updates: any[] = [];
    const r = await rewriteCopy('r1', {
      fetchRecipe: async () => baseRecipe(),
      scoreVoice: async () => 2,
      rewrite: async () => ({
        title: 'Persian Tahdig with Saffron',
        description:
          'Crispy golden saffron rice with a delicate crust, the kind of dish that makes a Tuesday feel like a celebration.',
        voiceScore: 5,
      }),
      updateCopy: async (id, next) => {
        updates.push({ id, next });
      },
    });
    expect(r.outcome).toBe('updated');
    expect(r.oldScore).toBe(2);
    expect(r.newScore).toBe(5);
    expect(updates[0].next.title).not.toContain('BEST EVER');
  });

  it('skips on regression', async () => {
    let updateCalled = false;
    const r = await rewriteCopy('r1', {
      fetchRecipe: async () => baseRecipe(),
      scoreVoice: async () => 4,
      rewrite: async () => ({
        title: 'Worse',
        description: 'worse',
        voiceScore: 2,
      }),
      updateCopy: async () => {
        updateCalled = true;
      },
    });
    expect(r.outcome).toBe('skipped');
    expect(updateCalled).toBe(false);
  });

  it('returns failed when rewrite throws', async () => {
    const r = await rewriteCopy('r1', {
      fetchRecipe: async () => baseRecipe(),
      scoreVoice: async () => 2,
      rewrite: async () => {
        throw new Error('LLM down');
      },
      updateCopy: async () => {},
    });
    expect(r.outcome).toBe('failed');
  });
});

describe('preservesRecipeSubstance', () => {
  it('returns true when ingredients + instructions + times match', () => {
    const a = baseRecipe();
    const b = { ...baseRecipe(), title: 'Different', description: 'different' };
    expect(preservesRecipeSubstance(a, b)).toBe(true);
  });

  it('rejects ingredient mutation', () => {
    const a = baseRecipe();
    const b = {
      ...baseRecipe(),
      ingredients: [
        { name: 'jasmine rice', quantity: '2', unit: 'cups' },
        { name: 'saffron', quantity: '1', unit: 'pinch' },
      ],
    };
    expect(preservesRecipeSubstance(a, b)).toBe(false);
  });

  it('rejects instruction mutation', () => {
    const a = baseRecipe();
    const b = {
      ...baseRecipe(),
      instructions: ['Soak rice.', 'Different.', 'Crisp the bottom.'],
    };
    expect(preservesRecipeSubstance(a, b)).toBe(false);
  });

  it('rejects cook-time mutation', () => {
    const a = baseRecipe();
    const b = { ...baseRecipe(), cookTimeMin: 45 };
    expect(preservesRecipeSubstance(a, b)).toBe(false);
  });

  it('rejects ingredient-count change', () => {
    const a = baseRecipe();
    const b = {
      ...baseRecipe(),
      ingredients: [{ name: 'basmati rice', quantity: '2', unit: 'cups' }],
    };
    expect(preservesRecipeSubstance(a, b)).toBe(false);
  });
});
