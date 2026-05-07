// frontend/__tests__/constants/MascotForState.test.ts
// ROADMAP 4.0 DS4.7 — every state maps to a valid expression; banned
// expressions absent.

import {
  MascotForState,
  BANNED_EXPRESSIONS,
  expressionFor,
  SazonState,
} from '../../constants/MascotForState';

describe('DS4.7 — Mascot pairing rules', () => {
  it('every state in the enum maps to a valid expression', () => {
    const states: SazonState[] = [
      'loading',
      'success',
      'cooking-complete',
      'search-empty',
      'no-notifications',
      'no-results',
      'idle',
      'error',
      'streak',
      'milestone',
      'first-launch',
    ];
    for (const s of states) {
      const expr = MascotForState[s];
      expect({ state: s, expression: expr, hasMapping: typeof expr === 'string' && expr.length > 0 }).toMatchObject({
        hasMapping: true,
      });
    }
  });

  it('error state maps to thinking, never sad/angry (lifestyle voice)', () => {
    expect(MascotForState.error).toBe('thinking');
    expect(['sad', 'angry']).not.toContain(MascotForState.error);
  });

  it('cooking-complete maps to chef-kiss (the joy peak)', () => {
    expect(MascotForState['cooking-complete']).toBe('chef-kiss');
  });

  it('banned expressions absent from every mapping', () => {
    for (const expr of Object.values(MascotForState)) {
      expect(BANNED_EXPRESSIONS as readonly string[]).not.toContain(expr);
    }
  });

  it('expressionFor() helper returns the same value as the map lookup', () => {
    expect(expressionFor('loading')).toBe(MascotForState.loading);
    expect(expressionFor('error')).toBe(MascotForState.error);
  });
});
