// Tier Y-Live-5 — voice nav in the step player. Pure dispatcher: given
// a voice transcript + step-player handlers, classifies via
// resolveVoiceCookCommand and fires the right callback. Same pattern as
// W-C1's planCookTurn (deterministic, no hook coupling, fully unit
// testable). RED-first.

import { handleVoiceCookCommand } from '../../../lib/coach/handleVoiceCookCommand';

function deps(overrides: Partial<Parameters<typeof handleVoiceCookCommand>[1]> = {}) {
  return {
    onNext: jest.fn(),
    onPrev: jest.fn(),
    speak: jest.fn(),
    currentStepText: 'Sample step text.',
    ...overrides,
  };
}

describe('handleVoiceCookCommand — step nav', () => {
  it.each(['next', 'next step', 'continue', 'go on'])(
    '"%s" → onNext',
    (t) => {
      const d = deps();
      const cmd = handleVoiceCookCommand(t, d);
      expect(cmd.kind).toBe('step-nav');
      expect(d.onNext).toHaveBeenCalledTimes(1);
      expect(d.onPrev).not.toHaveBeenCalled();
      expect(d.speak).not.toHaveBeenCalled();
    },
  );

  it.each(['back', 'previous', 'go back'])('"%s" → onPrev', (t) => {
    const d = deps();
    handleVoiceCookCommand(t, d);
    expect(d.onPrev).toHaveBeenCalledTimes(1);
    expect(d.onNext).not.toHaveBeenCalled();
  });

  it('"back" with no onPrev (first step) is a no-op', () => {
    const d = deps({ onPrev: undefined });
    expect(() => handleVoiceCookCommand('back', d)).not.toThrow();
    expect(d.onNext).not.toHaveBeenCalled();
    expect(d.speak).not.toHaveBeenCalled();
  });
});

describe('handleVoiceCookCommand — repeat', () => {
  it('"repeat" → speak(currentStepText)', () => {
    const d = deps({ currentStepText: 'Roast for 30 minutes.' });
    const cmd = handleVoiceCookCommand('repeat', d);
    expect(cmd.kind).toBe('repeat');
    expect(d.speak).toHaveBeenCalledWith('Roast for 30 minutes.');
  });
  it('"say that again" → speak', () => {
    const d = deps();
    handleVoiceCookCommand('say that again', d);
    expect(d.speak).toHaveBeenCalled();
  });
  it('"repeat" with empty step text is a no-op (no useless speak)', () => {
    const d = deps({ currentStepText: '' });
    handleVoiceCookCommand('repeat', d);
    expect(d.speak).not.toHaveBeenCalled();
  });
});

describe('handleVoiceCookCommand — non-actionable commands', () => {
  it('scale (factor) doesn’t affect the player (no ingredient context here)', () => {
    const d = deps();
    const cmd = handleVoiceCookCommand('double it', d);
    expect(cmd.kind).toBe('scale');
    expect(d.onNext).not.toHaveBeenCalled();
    expect(d.onPrev).not.toHaveBeenCalled();
    expect(d.speak).not.toHaveBeenCalled();
  });

  it('freeform doesn’t fire anything (no LLM in the player)', () => {
    const d = deps();
    handleVoiceCookCommand('is the salmon done yet?', d);
    expect(d.onNext).not.toHaveBeenCalled();
    expect(d.speak).not.toHaveBeenCalled();
  });

  it('empty / none → no-op', () => {
    const d = deps();
    handleVoiceCookCommand('', d);
    expect(d.onNext).not.toHaveBeenCalled();
    expect(d.onPrev).not.toHaveBeenCalled();
    expect(d.speak).not.toHaveBeenCalled();
  });
});
