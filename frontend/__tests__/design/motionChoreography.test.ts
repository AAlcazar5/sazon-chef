// frontend/__tests__/design/motionChoreography.test.ts
// ROADMAP 4.0 DS6.1 / 6.2 / 6.3 / 6.4 — motion-choreography tokens.

import { Motion } from '../../constants/tokens';

describe('DS6.1 — Modal enter/exit choreography', () => {
  it('enter: opacity 200ms ease-out + scale spring 0.96 → 1.0', () => {
    expect(Motion.modal.enter.opacity.duration).toBe(200);
    expect(Motion.modal.enter.opacity.easing).toBe('ease-out');
    expect(Motion.modal.enter.scale.from).toBeCloseTo(0.96, 5);
    expect(Motion.modal.enter.scale.to).toBe(1.0);
    expect(Motion.modal.enter.scale.spring.damping).toBe(18);
    expect(Motion.modal.enter.scale.spring.stiffness).toBe(220);
  });

  it('exit: opacity-only 150ms reverse, no scale', () => {
    expect(Motion.modal.exit.opacity.duration).toBe(150);
    expect(Motion.modal.exit.opacity.easing).toBe('ease-in');
    expect((Motion.modal.exit as Record<string, unknown>).scale).toBeUndefined();
  });
});

describe('DS6.2 — Bottom sheet drag spring + dismiss threshold', () => {
  it('rubber-bands beyond fully-open', () => {
    expect(Motion.bottomSheet.drag.rubberBandBeyondOpen).toBe(true);
  });

  it('dismiss threshold is 30% of travel', () => {
    expect(Motion.bottomSheet.drag.dismissThresholdPct).toBeCloseTo(0.3, 5);
  });

  it('flick velocity > 1500 px/s always dismisses regardless of position', () => {
    expect(Motion.bottomSheet.drag.flickVelocityPxPerS).toBe(1500);
  });

  it('dismiss animation runs at 250ms', () => {
    expect(Motion.bottomSheet.drag.dismissDurationMs).toBe(250);
  });
});

describe('DS6.3 — List-item shuffle / reorder spring', () => {
  it('uses the bouncy peak-moment spring config', () => {
    expect(Motion.listReorder.spring.damping).toBe(14);
    expect(Motion.listReorder.spring.stiffness).toBe(200);
  });
});

describe('DS6.4 — Page transition override (Expo Router)', () => {
  it('unifies iOS + Android with slide_from_right', () => {
    expect(Motion.pageTransition.animation).toBe('slide_from_right');
  });

  it('runs at 300ms', () => {
    expect(Motion.pageTransition.durationMs).toBe(300);
  });
});
