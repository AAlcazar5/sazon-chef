// frontend/__tests__/utils/hapticChoreography.test.ts
// Phase 6: Haptic choreography — verifies sequences fire correct haptic calls
// at the right timing beats relative to animation peaks.

import * as Haptics from 'expo-haptics';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// Use fake timers so we can control setTimeout scheduling
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

import { HapticChoreography } from '../../utils/hapticChoreography';

const impact = Haptics.impactAsync as jest.Mock;
const notify = Haptics.notificationAsync as jest.Mock;

describe('HapticChoreography', () => {
  describe('starBurst', () => {
    it('fires exactly N impacts for a 1-star rating (0 lights + 1 medium)', () => {
      HapticChoreography.starBurst(1);
      jest.runAllTimers();
      // 0 light taps (star - 1 = 0), 1 medium at peak
      expect(impact).toHaveBeenCalledTimes(1);
      expect(impact).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('fires 3 light taps + 1 medium for a 4-star rating', () => {
      HapticChoreography.starBurst(4);
      jest.runAllTimers();
      // 3 light taps + 1 medium at peak
      expect(impact).toHaveBeenCalledTimes(4);
      const calls = impact.mock.calls.map(([style]) => style);
      expect(calls.slice(0, 3)).toEqual([
        Haptics.ImpactFeedbackStyle.Light,
        Haptics.ImpactFeedbackStyle.Light,
        Haptics.ImpactFeedbackStyle.Light,
      ]);
      expect(calls[3]).toBe(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('fires 4 light taps + 1 medium for a 5-star rating', () => {
      HapticChoreography.starBurst(5);
      jest.runAllTimers();
      expect(impact).toHaveBeenCalledTimes(5);
      const lastCall = impact.mock.calls[4][0];
      expect(lastCall).toBe(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('light taps are staggered 55ms apart', () => {
      HapticChoreography.starBurst(3);
      // All taps go through setTimeout — none fire synchronously
      expect(impact).not.toHaveBeenCalled();
      // First light at setTimeout(0) — fires after minimal tick
      jest.advanceTimersByTime(1);
      expect(impact).toHaveBeenCalledTimes(1);
      // Second light at setTimeout(55)
      jest.advanceTimersByTime(54);
      expect(impact).toHaveBeenCalledTimes(2);
      // Medium burst at setTimeout((3-1)*55 + 60) = setTimeout(170); advance remaining 115ms
      jest.advanceTimersByTime(115);
      expect(impact).toHaveBeenCalledTimes(3);
    });
  });

  describe('starClear', () => {
    it('fires two light taps 80ms apart', () => {
      HapticChoreography.starClear();
      // Immediate first tap
      expect(impact).toHaveBeenCalledTimes(1);
      expect(impact).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
      jest.advanceTimersByTime(80);
      expect(impact).toHaveBeenCalledTimes(2);
    });
  });

  describe('itemCheckOff', () => {
    it('fires medium impact at the 80ms animation peak', () => {
      HapticChoreography.itemCheckOff();
      // No immediate haptic — waits for animation peak
      expect(impact).not.toHaveBeenCalled();
      jest.advanceTimersByTime(80);
      expect(impact).toHaveBeenCalledTimes(1);
      expect(impact).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });
  });

  describe('itemUncheck', () => {
    it('fires a single immediate light impact', () => {
      HapticChoreography.itemUncheck();
      expect(impact).toHaveBeenCalledTimes(1);
      expect(impact).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });
  });

  describe('sectionComplete', () => {
    it('fires success notification immediately then medium impact at 180ms', () => {
      HapticChoreography.sectionComplete();
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
      expect(impact).not.toHaveBeenCalled();
      jest.advanceTimersByTime(180);
      expect(impact).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });
  });

  describe('shoppingCelebration', () => {
    it('fires heavy, medium, then two lights, ending with success', () => {
      HapticChoreography.shoppingCelebration();
      jest.runAllTimers();
      // heavy + medium + light + light = 4 impact calls, 1 notification
      expect(impact).toHaveBeenCalledTimes(4);
      expect(notify).toHaveBeenCalledTimes(1);
      expect(impact.mock.calls[0][0]).toBe(Haptics.ImpactFeedbackStyle.Heavy);
      expect(impact.mock.calls[1][0]).toBe(Haptics.ImpactFeedbackStyle.Medium);
      expect(impact.mock.calls[2][0]).toBe(Haptics.ImpactFeedbackStyle.Light);
      expect(impact.mock.calls[3][0]).toBe(Haptics.ImpactFeedbackStyle.Light);
    });

    it('heavy fires immediately (t=0)', () => {
      HapticChoreography.shoppingCelebration();
      expect(impact).toHaveBeenCalledTimes(1);
      expect(impact).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
    });
  });

  describe('cookingComplete', () => {
    it('fires success, heavy, medium, light in sequence', () => {
      HapticChoreography.cookingComplete();
      jest.runAllTimers();
      expect(notify).toHaveBeenCalledTimes(1);
      expect(impact).toHaveBeenCalledTimes(3);
      expect(impact.mock.calls[0][0]).toBe(Haptics.ImpactFeedbackStyle.Heavy);
      expect(impact.mock.calls[1][0]).toBe(Haptics.ImpactFeedbackStyle.Medium);
      expect(impact.mock.calls[2][0]).toBe(Haptics.ImpactFeedbackStyle.Light);
    });

    it('success notification fires immediately at t=0', () => {
      HapticChoreography.cookingComplete();
      expect(notify).toHaveBeenCalledTimes(1);
      expect(impact).not.toHaveBeenCalled();
    });
  });

  describe('timerComplete', () => {
    it('fires two heavy impacts then medium', () => {
      HapticChoreography.timerComplete();
      jest.runAllTimers();
      expect(impact).toHaveBeenCalledTimes(3);
      expect(impact.mock.calls[0][0]).toBe(Haptics.ImpactFeedbackStyle.Heavy);
      expect(impact.mock.calls[1][0]).toBe(Haptics.ImpactFeedbackStyle.Heavy);
      expect(impact.mock.calls[2][0]).toBe(Haptics.ImpactFeedbackStyle.Medium);
    });
  });

  describe('celebrate', () => {
    it('fires success then medium then light', () => {
      HapticChoreography.celebrate();
      jest.runAllTimers();
      expect(notify).toHaveBeenCalledTimes(1);
      expect(impact).toHaveBeenCalledTimes(2);
      expect(impact.mock.calls[0][0]).toBe(Haptics.ImpactFeedbackStyle.Medium);
      expect(impact.mock.calls[1][0]).toBe(Haptics.ImpactFeedbackStyle.Light);
    });
  });

  describe('cookingStepAdvance', () => {
    it('fires a single immediate medium impact', () => {
      HapticChoreography.cookingStepAdvance();
      expect(impact).toHaveBeenCalledTimes(1);
      expect(impact).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });
  });
});
