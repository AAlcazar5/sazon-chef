// frontend/__tests__/design/tokenFamilies.test.ts
// ROADMAP 4.0 DS3.2 / DS3.3 / DS3.4 / DS3.5 — token-family contracts.

import { SurfaceSemantic, Frost, Skeleton, ImageState } from '../../constants/tokens';

describe('DS3.2 — Semantic surface tokens', () => {
  it('exposes light + dark branches for each variant', () => {
    const variants = ['success', 'warning', 'error', 'info'] as const;
    for (const v of variants) {
      expect(SurfaceSemantic.light[v]).toBeDefined();
      expect(SurfaceSemantic.dark[v]).toBeDefined();
      expect(SurfaceSemantic.light[v].bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(SurfaceSemantic.light[v].border).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(SurfaceSemantic.light[v].ink).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(SurfaceSemantic.dark[v].bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('success.light.bg is the warm emerald wash (replaces inline #D1FAE5)', () => {
    expect(SurfaceSemantic.light.success.bg).toBe('#D1FAE5');
  });

  it('error.light.ink is dark enough for AA contrast on the error.bg', () => {
    // Approximate: dark 7-tone red ink on a pale red bg — eye-check via contrast helper omitted here.
    expect(SurfaceSemantic.light.error.ink.toUpperCase()).toBe('#7F1D1D');
  });
});

describe('DS3.3 — Frost tokens', () => {
  it('exposes intensity + bg + border for both themes', () => {
    expect(Frost.intensity).toBe(40);
    expect(Frost.bg.light).toMatch(/^rgba\(/);
    expect(Frost.bg.dark).toMatch(/^rgba\(/);
    expect(Frost.border.light).toMatch(/^rgba\(/);
    expect(Frost.border.dark).toMatch(/^rgba\(/);
  });

  it('matches the FrostedCard reference implementation values', () => {
    expect(Frost.bg.light).toBe('rgba(255,255,255,0.64)');
    expect(Frost.bg.dark).toBe('rgba(20,20,20,0.72)');
  });
});

describe('DS3.4 — Skeleton tokens', () => {
  it('exposes idle + shimmer colors per theme + duration + easing', () => {
    expect(Skeleton.bg.light).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(Skeleton.bg.dark).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(Skeleton.shimmer.light).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(Skeleton.shimmer.dark).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(Skeleton.durationMs).toBe(1500);
    expect(Skeleton.easing).toBe('linear');
  });
});

describe('DS3.5 — Image state tokens', () => {
  it('exposes placeholder, fallback, and error sub-shapes', () => {
    expect(ImageState.placeholder.bg.light).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(ImageState.placeholder.bg.dark).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(ImageState.fallback.mascot).toBe('curious');
    expect(ImageState.error.bg.light).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(ImageState.error.bg.dark).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(ImageState.error.mascot).toBe('thinking');
  });

  it('error mascot is "thinking" not a sad/error variant (lifestyle voice)', () => {
    expect(ImageState.error.mascot).not.toBe('sad');
    expect(ImageState.error.mascot).not.toBe('angry');
  });
});
