// Tier Y-6 — voice hands-free navigation. Pure transcript → cook command.
// Deterministic commands (nav/scale/repeat) resolve locally with ZERO
// network — the kitchen-wifi principle; only freeform falls through to a
// grounded turn. Mirrors backend detectCookIntents/planCookTurn on the
// client. RED-first.

import { resolveVoiceCookCommand } from '../../../lib/cooking/resolveVoiceCookCommand';

describe('resolveVoiceCookCommand — deterministic nav', () => {
  it.each(['next', 'next step', 'continue', 'go on'])(
    '"%s" → step-nav next',
    (t) => {
      expect(resolveVoiceCookCommand(t)).toEqual({ kind: 'step-nav', dir: 'next' });
    },
  );

  it.each(['back', 'go back', 'previous', 'previous step'])(
    '"%s" → step-nav prev',
    (t) => {
      expect(resolveVoiceCookCommand(t)).toEqual({ kind: 'step-nav', dir: 'prev' });
    },
  );

  it.each(['repeat', 'say that again', 'repeat that'])(
    '"%s" → repeat',
    (t) => {
      expect(resolveVoiceCookCommand(t)).toEqual({ kind: 'repeat' });
    },
  );
});

describe('resolveVoiceCookCommand — deterministic scale', () => {
  it('"double it" → scale factor 2', () => {
    expect(resolveVoiceCookCommand('double it')).toEqual({
      kind: 'scale',
      factor: 2,
    });
  });
  it('"halve the recipe" → scale factor 0.5', () => {
    expect(resolveVoiceCookCommand('halve the recipe')).toEqual({
      kind: 'scale',
      factor: 0.5,
    });
  });
  it('"triple it" → scale factor 3', () => {
    expect(resolveVoiceCookCommand('triple it')).toEqual({
      kind: 'scale',
      factor: 3,
    });
  });
  it('"scale to 6 servings" → scale servings 6', () => {
    expect(resolveVoiceCookCommand('scale to 6 servings')).toEqual({
      kind: 'scale',
      servings: 6,
    });
  });
  it('"make it 4 servings" → scale servings 4', () => {
    expect(resolveVoiceCookCommand('make it 4 servings')).toEqual({
      kind: 'scale',
      servings: 4,
    });
  });
});

describe('resolveVoiceCookCommand — freeform / none', () => {
  it('a real question → freeform (caller routes to a grounded turn)', () => {
    expect(resolveVoiceCookCommand('is the salmon done yet?')).toEqual({
      kind: 'freeform',
      text: 'is the salmon done yet?',
    });
  });
  it('empty / non-string → none (nothing to do, no network)', () => {
    expect(resolveVoiceCookCommand('')).toEqual({ kind: 'none' });
    expect(resolveVoiceCookCommand('   ')).toEqual({ kind: 'none' });
    expect(resolveVoiceCookCommand(null as unknown as string)).toEqual({
      kind: 'none',
    });
  });
});
