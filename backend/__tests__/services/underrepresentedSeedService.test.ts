// backend/__tests__/services/underrepresentedSeedService.test.ts
// ROADMAP 4.0 Tier D10 — Underrepresented-cuisine seed run.

import {
  buildSeedPlan,
  runSeedBatch,
  buildSeedPlanFromDefaults,
  MIN_QUALITY_TO_COMMIT,
  TARGET_RECIPES_PER_REQUIRED_SLOT,
  SeedRunDeps,
  GeneratedRecipe,
  SlotCoverage,
} from '../../src/services/underrepresentedSeedService';

const tinyList = [
  {
    canonical: 'senegalese',
    subCuisine: null,
    displayName: 'Senegalese',
    rationale: 'long enough rationale to satisfy the structural test',
    archetypeTargets: {
      weeknight_main: { required: true, canonicalDishes: ['mafe', 'yassa poulet'] },
      rice_or_grain: { required: true, canonicalDishes: ['thieboudienne'] },
      vegetable_forward: { required: false, canonicalDishes: ['salade niçoise'] },
    },
    advisors: ['Pierre Thiam'],
  },
] as const;

describe('buildSeedPlan', () => {
  it('queues required slots when existing count is below target', () => {
    const plan = buildSeedPlan(tinyList, []);
    const main = plan.find((p) => p.archetype === 'weeknight_main');
    expect(main).toBeDefined();
    expect(main!.generateCount).toBe(TARGET_RECIPES_PER_REQUIRED_SLOT);
    expect(main!.required).toBe(true);
  });

  it('skips slots already at target', () => {
    const coverage: SlotCoverage[] = [
      {
        canonical: 'senegalese',
        subCuisine: null,
        archetype: 'weeknight_main',
        existingCount: TARGET_RECIPES_PER_REQUIRED_SLOT,
      },
    ];
    const plan = buildSeedPlan(tinyList, coverage);
    const main = plan.find((p) => p.archetype === 'weeknight_main');
    expect(main).toBeUndefined();
  });

  it('shrinks generateCount when partial coverage exists', () => {
    const coverage: SlotCoverage[] = [
      {
        canonical: 'senegalese',
        subCuisine: null,
        archetype: 'weeknight_main',
        existingCount: 1,
      },
    ];
    const plan = buildSeedPlan(tinyList, coverage);
    const main = plan.find((p) => p.archetype === 'weeknight_main');
    expect(main!.generateCount).toBe(TARGET_RECIPES_PER_REQUIRED_SLOT - 1);
  });

  it('puts required slots before optional', () => {
    const plan = buildSeedPlan(tinyList, []);
    const requiredIdx = plan.findIndex((p) => p.required);
    const optionalIdx = plan.findIndex((p) => !p.required);
    if (optionalIdx !== -1) {
      expect(requiredIdx).toBeLessThan(optionalIdx);
    }
  });

  it('pulls candidate dishes from D9', () => {
    const plan = buildSeedPlan(tinyList, []);
    const main = plan.find((p) => p.archetype === 'weeknight_main');
    expect(main!.candidateDishes).toContain('mafe');
  });

  it('buildSeedPlanFromDefaults reads the full UNDERREPRESENTED list', () => {
    const plan = buildSeedPlanFromDefaults([]);
    expect(plan.length).toBeGreaterThan(40); // 18 cuisines × ≥4 slots each
  });
});

const fakeRecipe = (
  overrides: Partial<GeneratedRecipe> = {},
): GeneratedRecipe => ({
  title: 'Senegalese Mafe',
  canonicalCuisine: 'senegalese',
  subCuisine: null,
  archetype: 'weeknight_main',
  embedding: null,
  qualityScore: 85,
  payload: {},
  ...overrides,
});

describe('runSeedBatch', () => {
  function makeDeps(
    overrides: Partial<SeedRunDeps> = {},
  ): SeedRunDeps & {
    persistCalls: GeneratedRecipe[];
    generateCalls: number;
  } {
    const persistCalls: GeneratedRecipe[] = [];
    let generateCalls = 0;
    const deps: any = {
      persistCalls,
      get generateCalls() {
        return generateCalls;
      },
      generate: overrides.generate ?? (async () => {
        generateCalls++;
        return fakeRecipe();
      }),
      fetchCatalogEmbeddings: overrides.fetchCatalogEmbeddings ?? (async () => []),
      persist: overrides.persist ?? (async (r: GeneratedRecipe) => {
        persistCalls.push(r);
      }),
    };
    // Wrap default generate to count
    if (!overrides.generate) {
      deps.generate = async (...args: any[]) => {
        generateCalls++;
        return fakeRecipe();
      };
    }
    Object.defineProperty(deps, 'generateCalls', {
      get: () => generateCalls,
    });
    return deps;
  }

  it('commits recipes that pass quality + dedupe', async () => {
    const plan = buildSeedPlan(tinyList, []);
    const deps = makeDeps();
    const result = await runSeedBatch(plan, deps);
    expect(result.stats.committed).toBeGreaterThan(0);
    expect(deps.persistCalls.length).toBe(result.stats.committed);
  });

  it('rejects recipes below quality threshold', async () => {
    const plan = buildSeedPlan(tinyList, []);
    const deps = makeDeps({
      generate: async () => fakeRecipe({ qualityScore: MIN_QUALITY_TO_COMMIT - 1 }),
    });
    const result = await runSeedBatch(plan, deps);
    expect(result.stats.rejectedLowQuality).toBeGreaterThan(0);
    expect(result.stats.committed).toBe(0);
  });

  it('rejects duplicates (cosine sim ≥ threshold)', async () => {
    const plan = buildSeedPlan(tinyList, []);
    const sharedEmbedding = [1, 0, 0, 0];
    const deps = makeDeps({
      generate: async () => fakeRecipe({ embedding: sharedEmbedding }),
      fetchCatalogEmbeddings: async () => [
        { recipeId: 'existing', embedding: [0.999, 0.001, 0.001, 0.001] },
      ],
    });
    const result = await runSeedBatch(plan, deps);
    expect(result.stats.rejectedDuplicate).toBeGreaterThan(0);
  });

  it('counts failures when generate throws', async () => {
    const plan = buildSeedPlan(tinyList, []);
    const deps = makeDeps({
      generate: async () => {
        throw new Error('LLM down');
      },
    });
    const result = await runSeedBatch(plan, deps);
    expect(result.stats.failed).toBeGreaterThan(0);
    expect(result.stats.committed).toBe(0);
  });

  it('honors maxGenerations cost cap', async () => {
    const plan = buildSeedPlan(tinyList, []);
    const deps = makeDeps();
    const result = await runSeedBatch(plan, deps, { maxGenerations: 2 });
    expect(result.stats.totalAttempts).toBe(2);
  });

  it('honors dryRun — never calls persist', async () => {
    const plan = buildSeedPlan(tinyList, []);
    const deps = makeDeps();
    const result = await runSeedBatch(plan, deps, { dryRun: true });
    expect(result.stats.committed).toBeGreaterThan(0);
    expect(deps.persistCalls).toEqual([]);
  });

  it('passes correct slot + dish into generate', async () => {
    const plan = buildSeedPlan(tinyList, []);
    const seenDishes: string[] = [];
    const deps = makeDeps({
      generate: async (slot, dish) => {
        seenDishes.push(dish);
        return fakeRecipe();
      },
    });
    await runSeedBatch(plan, deps);
    expect(seenDishes).toContain('mafe');
  });
});
