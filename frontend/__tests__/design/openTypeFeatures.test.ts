// frontend/__tests__/design/openTypeFeatures.test.ts
// ROADMAP 4.0 DS2.5 — Fraunces ss01 stylistic set on display sizes only.

import { Type } from '../../constants/tokens';

describe('DS2.5 — Fraunces ss01 stylistic set', () => {
  it('Type.display includes fontVariant ss01 (Clay-inspired alternate g)', () => {
    expect(Type.display.fontVariant).toEqual(expect.arrayContaining(['ss01']));
  });

  it('Type.displayLg includes fontVariant ss01', () => {
    expect(Type.displayLg.fontVariant).toEqual(expect.arrayContaining(['ss01']));
  });

  it('Type.displayMd includes fontVariant ss01', () => {
    expect(Type.displayMd.fontVariant).toEqual(expect.arrayContaining(['ss01']));
  });

  it('Type.body does NOT include fontVariant ss01 (readability priority)', () => {
    expect(Type.body.fontVariant).toBeUndefined();
  });

  it('Type.heading does NOT include fontVariant ss01', () => {
    expect(Type.heading.fontVariant).toBeUndefined();
  });

  it('Type.label does NOT include fontVariant ss01', () => {
    expect(Type.label.fontVariant).toBeUndefined();
  });

  it('Type.caption does NOT include fontVariant ss01', () => {
    expect(Type.caption.fontVariant).toBeUndefined();
  });
});
