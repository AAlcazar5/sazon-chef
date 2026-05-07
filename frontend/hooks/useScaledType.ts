// frontend/hooks/useScaledType.ts
//
// ROADMAP 4.0 DS1.4 — Dynamic Type support for the Type token scale.
// Multiplies fontSize + lineHeight by PixelRatio.getFontScale(), capped at
// 1.5x to prevent overflow on hero displays. Letter-spacing scales linearly.

import { useMemo } from 'react';
import { PixelRatio, TextStyle } from 'react-native';
import { Type } from '../constants/tokens';

const MAX_SCALE = 1.5;

export function clampedFontScale(rawScale: number, max: number = MAX_SCALE): number {
  if (Number.isNaN(rawScale) || rawScale <= 0) return 1;
  if (rawScale === Infinity) return max;
  return Math.min(rawScale, max);
}

export function applyFontScale(style: TextStyle, scale: number): TextStyle {
  const out: TextStyle = { ...style };
  if (typeof out.fontSize === 'number') {
    out.fontSize = out.fontSize * scale;
  }
  if (typeof out.lineHeight === 'number') {
    out.lineHeight = out.lineHeight * scale;
  }
  if (typeof out.letterSpacing === 'number') {
    out.letterSpacing = out.letterSpacing * scale;
  }
  return out;
}

export type TypeKey = keyof typeof Type;

export function useScaledType(kind: TypeKey, opts?: { rawScaleOverride?: number }): TextStyle {
  return useMemo(() => {
    const raw = opts?.rawScaleOverride ?? PixelRatio.getFontScale();
    const scale = clampedFontScale(raw);
    return applyFontScale(Type[kind] as TextStyle, scale);
  }, [kind, opts?.rawScaleOverride]);
}
