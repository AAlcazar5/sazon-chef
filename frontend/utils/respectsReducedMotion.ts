// frontend/utils/respectsReducedMotion.ts
//
// ROADMAP 4.0 DS1.3 — Motion.respectsReducedMotion(): pure helper that reads
// AccessibilityInfo.isReduceMotionEnabled() once and caches the result.
// Spring helpers swap to instant timing + scale=1.0 when enabled.
//
// Usage:
//   const enabled = await respectsReducedMotion();
//   const cfg = enabled ? Motion.springInstant : Motion.spring.default;

import { AccessibilityInfo } from 'react-native';
import { Motion } from '../constants/tokens';

interface CacheCell {
  cached: boolean | undefined;
  pending: Promise<boolean> | undefined;
}

const _state: CacheCell = { cached: undefined, pending: undefined };

export async function respectsReducedMotion(): Promise<boolean> {
  if (_state.cached !== undefined) return _state.cached;
  if (_state.pending) return _state.pending;
  _state.pending = AccessibilityInfo.isReduceMotionEnabled()
    .then((v) => {
      _state.cached = v;
      _state.pending = undefined;
      return v;
    })
    .catch(() => {
      _state.cached = false;
      _state.pending = undefined;
      return false;
    });
  return _state.pending;
}

export function _resetReducedMotionCache(): void {
  _state.cached = undefined;
  _state.pending = undefined;
}

export function springConfig(reduced: boolean) {
  if (reduced) {
    // 1ms timing — effectively instant. Consumers using withTiming pick this up.
    return { duration: 1 };
  }
  return Motion.spring.default;
}

export function pressScale(reduced: boolean): number {
  return reduced ? 1.0 : Motion.press.scale;
}
