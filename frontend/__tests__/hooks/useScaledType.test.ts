// frontend/__tests__/hooks/useScaledType.test.ts
// ROADMAP 4.0 DS1.4 — Dynamic Type scaling.

import { renderHook } from '@testing-library/react-native';
import { useScaledType, clampedFontScale, applyFontScale } from '../../hooks/useScaledType';
import { Type } from '../../constants/tokens';

describe('DS1.4 — useScaledType', () => {
  describe('clampedFontScale', () => {
    it('returns the raw scale when below the cap', () => {
      expect(clampedFontScale(1.0)).toBe(1.0);
      expect(clampedFontScale(1.3)).toBe(1.3);
    });

    it('caps the scale at 1.5x even when system reports 2.0', () => {
      expect(clampedFontScale(2.0)).toBe(1.5);
    });

    it('falls back to 1.0 when given an invalid scale', () => {
      expect(clampedFontScale(0)).toBe(1);
      expect(clampedFontScale(-1)).toBe(1);
      expect(clampedFontScale(NaN)).toBe(1);
      expect(clampedFontScale(Infinity)).toBe(1.5);
    });
  });

  describe('applyFontScale', () => {
    it('scales fontSize, lineHeight, and letterSpacing proportionally', () => {
      const style = { fontSize: 16, lineHeight: 24, letterSpacing: 0.5 };
      const scaled = applyFontScale(style, 1.5);
      expect(scaled.fontSize).toBe(24);
      expect(scaled.lineHeight).toBe(36);
      expect(scaled.letterSpacing).toBe(0.75);
    });

    it('preserves non-numeric style fields', () => {
      const style = { fontSize: 16, fontFamily: 'Plus Jakarta Sans', textTransform: 'uppercase' as const };
      const scaled = applyFontScale(style, 1.2);
      expect(scaled.fontSize).toBe(16 * 1.2);
      expect(scaled.fontFamily).toBe('Plus Jakarta Sans');
      expect(scaled.textTransform).toBe('uppercase');
    });

    it('does not mutate the input style', () => {
      const style = { fontSize: 16, lineHeight: 24 };
      const scaled = applyFontScale(style, 1.3);
      expect(style.fontSize).toBe(16);
      expect(style.lineHeight).toBe(24);
      expect(scaled).not.toBe(style);
    });
  });

  describe('useScaledType (hook)', () => {
    it('returns base values at scale 1.0', () => {
      const { result } = renderHook(() => useScaledType('body', { rawScaleOverride: 1.0 }));
      expect(result.current.fontSize).toBe(Type.body.fontSize);
      expect(result.current.lineHeight).toBe(Type.body.lineHeight);
    });

    it('multiplies fontSize when scale is 1.3', () => {
      const { result } = renderHook(() => useScaledType('body', { rawScaleOverride: 1.3 }));
      expect(result.current.fontSize).toBeCloseTo((Type.body.fontSize as number) * 1.3, 5);
    });

    it('caps at 1.5x even when system requests 2.0', () => {
      const { result } = renderHook(() => useScaledType('heading', { rawScaleOverride: 2.0 }));
      expect(result.current.fontSize).toBeCloseTo((Type.heading.fontSize as number) * 1.5, 5);
    });

    it('letter-spacing scales linearly with the font scale', () => {
      const { result } = renderHook(() => useScaledType('eyebrow', { rawScaleOverride: 1.4 }));
      const baseLs = Type.eyebrow.letterSpacing as number;
      expect(result.current.letterSpacing).toBeCloseTo(baseLs * 1.4, 5);
    });

    it('preserves fontFamily across scaled output', () => {
      const { result } = renderHook(() => useScaledType('display', { rawScaleOverride: 1.5 }));
      expect(result.current.fontFamily).toBe(Type.display.fontFamily);
    });
  });
});
