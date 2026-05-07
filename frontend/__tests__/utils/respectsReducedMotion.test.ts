// frontend/__tests__/utils/respectsReducedMotion.test.ts
// ROADMAP 4.0 DS1.3 — reduced-motion helper.

import { AccessibilityInfo } from 'react-native';
import {
  respectsReducedMotion,
  springConfig,
  pressScale,
  _resetReducedMotionCache,
} from '../../utils/respectsReducedMotion';
import { Motion } from '../../constants/tokens';

describe('DS1.3 — respectsReducedMotion', () => {
  beforeEach(() => {
    _resetReducedMotionCache();
    // The project's react-native preset auto-mocks AccessibilityInfo, so spyOn
    // layers on top of an existing jest.fn — call history accumulates. Clear
    // before each test so spy.toHaveBeenCalledTimes assertions are accurate.
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('returns true when AccessibilityInfo reports reduce-motion enabled', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    expect(await respectsReducedMotion()).toBe(true);
  });

  it('returns false when AccessibilityInfo reports reduce-motion disabled', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    expect(await respectsReducedMotion()).toBe(false);
  });

  it('caches the result — once resolved, subsequent calls do not re-query the OS', async () => {
    const spy = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    // Prime the cache.
    const first = await respectsReducedMotion();
    expect(first).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
    // Subsequent calls hit the cache.
    const second = await respectsReducedMotion();
    const third = await respectsReducedMotion();
    expect(second).toBe(true);
    expect(third).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('falls back to false when the OS query rejects', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockRejectedValue(new Error('nope'));
    expect(await respectsReducedMotion()).toBe(false);
  });

  it('springConfig returns instant 1ms timing when reduced motion is enabled', () => {
    expect(springConfig(true)).toEqual({ duration: 1 });
  });

  it('springConfig returns the default spring when reduced motion is disabled', () => {
    expect(springConfig(false)).toBe(Motion.spring.default);
  });

  it('pressScale is 1.0 when reduced motion is enabled', () => {
    expect(pressScale(true)).toBe(1.0);
  });

  it('pressScale matches Motion.press.scale when reduced motion is disabled', () => {
    expect(pressScale(false)).toBe(Motion.press.scale);
  });
});
