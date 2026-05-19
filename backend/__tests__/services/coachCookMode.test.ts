// W-C1 — Free-tier DeepSeek + cost-ceiling degrade.
//
// Two contracts, RED-first (module does not exist yet):
//  (1) free tier cooks on DeepSeek (provider order); premium stays Anthropic
//  (2) cost-ceiling trip → step-nav + scale STILL succeed with ZERO provider
//      calls (a spy proves the LLM is never invoked on the degrade path)
//
// Roadmap W-C1 **Test:** integration — free tier → DeepSeek provider order;
// ceiling tripped → scale still succeeds, spy asserts 0 provider calls.

import {
  resolveCookProviderOrder,
  navigateStep,
  serveCookOperation,
  planCookTurn,
} from '../../src/services/coachCookMode';

const ORIGINAL_ENV = process.env.COACH_LLM_PROVIDER;
afterEach(() => {
  if (ORIGINAL_ENV === undefined) delete process.env.COACH_LLM_PROVIDER;
  else process.env.COACH_LLM_PROVIDER = ORIGINAL_ENV;
});

describe('resolveCookProviderOrder', () => {
  it('free tier → DeepSeek first, Anthropic fallback', () => {
    delete process.env.COACH_LLM_PROVIDER;
    expect(resolveCookProviderOrder('free')).toEqual(['deepseek', 'anthropic']);
  });

  it('premium stays Anthropic-only (brand voice / tool reliability)', () => {
    delete process.env.COACH_LLM_PROVIDER;
    expect(resolveCookProviderOrder('premium')).toEqual(['anthropic']);
  });

  it('COACH_LLM_PROVIDER hard-overrides tier routing (E2E/local)', () => {
    process.env.COACH_LLM_PROVIDER = 'anthropic';
    expect(resolveCookProviderOrder('free')).toEqual(['anthropic']);
  });
});

describe('navigateStep (deterministic)', () => {
  const steps = ['Prep', 'Sear', 'Rest', 'Plate'];

  it('advances and clamps at the end', () => {
    expect(navigateStep(steps, 0, 'next')).toEqual({
      index: 1,
      step: 'Sear',
      isLast: false,
      isFirst: false,
    });
    expect(navigateStep(steps, 3, 'next')).toEqual({
      index: 3,
      step: 'Plate',
      isLast: true,
      isFirst: false,
    });
  });

  it('goes back and clamps at the start', () => {
    expect(navigateStep(steps, 0, 'prev')).toEqual({
      index: 0,
      step: 'Prep',
      isLast: false,
      isFirst: true,
    });
  });

  it('goto clamps into range', () => {
    expect(navigateStep(steps, 0, 'goto', 99).index).toBe(3);
    expect(navigateStep(steps, 2, 'goto', -5).index).toBe(0);
  });

  it('throws on an empty step list', () => {
    expect(() => navigateStep([], 0, 'next')).toThrow();
  });
});

describe('serveCookOperation — ZERO provider calls', () => {
  const spy = { invoke: jest.fn() };
  beforeEach(() => spy.invoke.mockClear());

  it('scale-target succeeds without touching the provider', () => {
    const ingredients = [
      { name: 'salmon', amount: 1, unit: 'lb' },
      { name: 'soy sauce', amount: 2, unit: 'tbsp' },
    ];
    const out = serveCookOperation(
      {
        kind: 'scale-target',
        ingredients,
        referenceName: 'salmon',
        target: { amount: 2, unit: 'lb' },
      },
      { llm: spy },
    );
    expect(out.kind).toBe('scale');
    expect(out.result).toEqual([
      { name: 'salmon', amount: 2, unit: 'lb' },
      { name: 'soy sauce', amount: 4, unit: 'tbsp' },
    ]);
    expect(spy.invoke).not.toHaveBeenCalled();
  });

  it('scale-factor + step-nav also make zero provider calls', () => {
    serveCookOperation(
      {
        kind: 'scale-factor',
        ingredients: [{ name: 'rice', amount: 1, unit: 'cup' }],
        factor: 3,
      },
      { llm: spy },
    );
    serveCookOperation(
      {
        kind: 'step-nav',
        steps: ['a', 'b'],
        currentIndex: 0,
        direction: 'next',
      },
      { llm: spy },
    );
    expect(spy.invoke).not.toHaveBeenCalled();
  });
});

describe('planCookTurn — cost-ceiling degrade', () => {
  it('a deterministic op never uses the provider, ceiling or not', () => {
    const op = {
      kind: 'scale-factor' as const,
      ingredients: [{ name: 'rice', amount: 1, unit: 'cup' }],
      factor: 2,
    };
    expect(planCookTurn({ tier: 'free', ceilingTripped: false, op })).toEqual({
      mode: 'deterministic',
      reason: 'cook-op',
    });
    expect(planCookTurn({ tier: 'free', ceilingTripped: true, op })).toEqual({
      mode: 'deterministic',
      reason: 'cook-op',
    });
  });

  it('ceiling tripped → freeform degrades to deterministic (no provider call)', () => {
    expect(
      planCookTurn({
        tier: 'free',
        ceilingTripped: true,
        op: { kind: 'freeform', text: 'is the salmon done?' },
      }),
    ).toEqual({ mode: 'deterministic', reason: 'ceiling-degrade' });
  });

  it('freeform under budget → provider, ordered by tier', () => {
    delete process.env.COACH_LLM_PROVIDER;
    expect(
      planCookTurn({
        tier: 'free',
        ceilingTripped: false,
        op: { kind: 'freeform', text: 'swap idea?' },
      }),
    ).toEqual({ mode: 'provider', order: ['deepseek', 'anthropic'] });
  });
});
