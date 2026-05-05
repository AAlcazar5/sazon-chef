// backend/__tests__/services/healthierSwapService.test.ts
// ROADMAP 4.0 Tier C2 — healthierSwap inline-field surfacing logic (TDD).

import {
  parseHealthierSwap,
  shouldSurfaceSwap,
  buildSurfacingDecision,
} from '../../src/services/healthierSwapService';

describe('parseHealthierSwap', () => {
  it('parses a valid JSON swap blob', () => {
    const json = JSON.stringify({
      type: 'fiber',
      text: 'Use corn tortillas instead of flour for +4g fiber',
      deltaMacro: { fiber: 4 },
    });
    const swap = parseHealthierSwap(json);
    expect(swap).not.toBeNull();
    expect(swap?.type).toBe('fiber');
    expect(swap?.deltaMacro.fiber).toBe(4);
  });

  it('returns null for null input', () => {
    expect(parseHealthierSwap(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseHealthierSwap('')).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(parseHealthierSwap('not-json')).toBeNull();
  });

  it('returns null when type is missing or unknown', () => {
    expect(parseHealthierSwap(JSON.stringify({ text: 'x', deltaMacro: {} }))).toBeNull();
    expect(parseHealthierSwap(JSON.stringify({ type: 'unknown', text: 'x', deltaMacro: {} }))).toBeNull();
  });

  it('returns null when text is missing', () => {
    expect(parseHealthierSwap(JSON.stringify({ type: 'fiber', deltaMacro: { fiber: 4 } }))).toBeNull();
  });
});

describe('shouldSurfaceSwap', () => {
  const fiberSwap = { type: 'fiber' as const, text: '+4g fiber', deltaMacro: { fiber: 4 } };
  const proteinSwap = { type: 'protein' as const, text: '+8g protein', deltaMacro: { protein: 8 } };
  const calorieSwap = { type: 'calorie' as const, text: '−120 cal', deltaMacro: { calories: -120 } };

  it('surfaces fiber swap when user is under daily fiber goal', () => {
    expect(
      shouldSurfaceSwap(fiberSwap, {
        remaining: { fiber: -3, protein: 50, calories: 1200 },
        targetDelta: { fiber: 0 },
        nutritionUIDensity: 'macros',
      })
    ).toBe(true);
  });

  it('hides fiber swap when user already met fiber goal', () => {
    expect(
      shouldSurfaceSwap(fiberSwap, {
        remaining: { fiber: 5, protein: 50, calories: 1200 },
        targetDelta: { fiber: 0 },
        nutritionUIDensity: 'macros',
      })
    ).toBe(false);
  });

  it('surfaces protein swap when user has a protein gap', () => {
    expect(
      shouldSurfaceSwap(proteinSwap, {
        remaining: { fiber: 5, protein: -10, calories: 1000 },
        targetDelta: { protein: 0 },
        nutritionUIDensity: 'macros',
      })
    ).toBe(true);
  });

  it('hides protein swap when protein already met', () => {
    expect(
      shouldSurfaceSwap(proteinSwap, {
        remaining: { fiber: 5, protein: 10, calories: 1000 },
        targetDelta: { protein: 0 },
        nutritionUIDensity: 'macros',
      })
    ).toBe(false);
  });

  it('surfaces calorie swap when user is over calorie budget', () => {
    expect(
      shouldSurfaceSwap(calorieSwap, {
        remaining: { fiber: 5, protein: 50, calories: -150 },
        targetDelta: { calories: 0 },
        nutritionUIDensity: 'macros',
      })
    ).toBe(true);
  });

  it('hides calorie swap when calorie budget remaining', () => {
    expect(
      shouldSurfaceSwap(calorieSwap, {
        remaining: { fiber: 5, protein: 50, calories: 200 },
        targetDelta: { calories: 0 },
        nutritionUIDensity: 'macros',
      })
    ).toBe(false);
  });

  it('hides every swap when nutritionUIDensity = "minimal"', () => {
    const userState = {
      remaining: { fiber: -10, protein: -10, calories: -500 },
      targetDelta: {},
      nutritionUIDensity: 'minimal' as const,
    };
    expect(shouldSurfaceSwap(fiberSwap, userState)).toBe(false);
    expect(shouldSurfaceSwap(proteinSwap, userState)).toBe(false);
    expect(shouldSurfaceSwap(calorieSwap, userState)).toBe(false);
  });
});

describe('buildSurfacingDecision', () => {
  it('returns swap=null + reason when input swap is null', () => {
    const decision = buildSurfacingDecision(null, {
      remaining: { fiber: -10, protein: 0, calories: 0 },
      targetDelta: {},
      nutritionUIDensity: 'macros',
    });
    expect(decision.surface).toBe(false);
    expect(decision.swap).toBeNull();
  });

  it('returns surface=true + the swap when the swap solves a gap', () => {
    const swap = { type: 'fiber' as const, text: 'try corn tortillas', deltaMacro: { fiber: 5 } };
    const decision = buildSurfacingDecision(swap, {
      remaining: { fiber: -5, protein: 0, calories: 0 },
      targetDelta: {},
      nutritionUIDensity: 'macros + micros',
    });
    expect(decision.surface).toBe(true);
    expect(decision.swap).toEqual(swap);
  });

  it('returns surface=false when the swap does not solve a gap (no preachy nudges)', () => {
    const swap = { type: 'fiber' as const, text: 'try corn tortillas', deltaMacro: { fiber: 5 } };
    const decision = buildSurfacingDecision(swap, {
      remaining: { fiber: 10, protein: 50, calories: 1000 },
      targetDelta: {},
      nutritionUIDensity: 'macros',
    });
    expect(decision.surface).toBe(false);
  });
});
