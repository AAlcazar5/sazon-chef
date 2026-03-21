// frontend/utils/hapticChoreography.ts
// Choreographed haptic sequences timed to animation beats.
//
// Design principle: haptics should reinforce animation peaks, not just press events.
// These sequences fire at the *moment* the animation reaches its apex, giving a
// physical sensation of weight, completion, or delight at the right instant.

import * as Haptics from 'expo-haptics';

/** Fire a single light selection tap */
const light = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
/** Fire a single medium impact */
const medium = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
/** Fire a single heavy impact */
const heavy = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
/** Fire a success notification haptic */
const success = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

/** Schedule a callback after `ms` milliseconds */
const after = (ms: number, fn: () => void) => setTimeout(fn, ms);

export const HapticChoreography = {
  /**
   * Star rating burst — counts up to the selected star index.
   * Fires N light taps staggered 55ms apart, then a medium burst at the end.
   * Timing matches the spring burst animation in AnimatedStar.
   *
   * @param selectedStar — the star tapped (1–5)
   * @example onRate(3) → tap, tap, tap-BURST
   */
  starBurst(selectedStar: number) {
    for (let i = 0; i < selectedStar - 1; i++) {
      after(i * 55, light);
    }
    // Final star — medium impact timed to the 1.6x scale peak (~60ms after last light)
    after((selectedStar - 1) * 55 + 60, medium);
  },

  /**
   * Star rating clear — soft double tap to confirm removal.
   */
  starClear() {
    light();
    after(80, light);
  },

  /**
   * Shopping item check-off — fires at the animation peak of the spring bounce.
   * The checkbox spring reaches its apex at ~80ms (toValue: 1.3, friction: 3).
   */
  itemCheckOff() {
    after(80, medium);
  },

  /**
   * Shopping item uncheck — lighter, instant feedback.
   */
  itemUncheck() {
    light();
  },

  /**
   * Aisle section complete — success notification + confirming impact.
   * Timed to the green flash animation (~200ms).
   */
  sectionComplete() {
    success();
    after(180, medium);
  },

  /**
   * All shopping done — celebration sequence synced with confetti burst.
   * Beat pattern: BOOM — tap — tap — tap (matches confetti particle burst timings).
   */
  shoppingCelebration() {
    heavy();
    after(120, medium);
    after(280, light);
    after(440, light);
    after(600, () => success());
  },

  /**
   * Cooking step advance — solid medium tap confirming progress.
   */
  cookingStepAdvance() {
    medium();
  },

  /**
   * Cooking step complete (final step) — success notification + heavy finish.
   * Synced with the completion screen spring entrance (~150ms delay).
   */
  cookingComplete() {
    success();
    after(150, heavy);
    after(400, medium);
    after(650, light);
  },

  /**
   * Timer completion — urgent double-tap to break through ambient sound.
   */
  timerComplete() {
    heavy();
    after(100, heavy);
    after(300, medium);
  },

  /**
   * Generic celebration — usable for any "all done" state.
   */
  celebrate() {
    success();
    after(200, medium);
    after(450, light);
  },

  /**
   * Heart burst — recipe save.
   * Synced with the squeeze-at-80ms → spring-pop-at-200ms heart animation.
   */
  heartBurst() {
    after(80, light);    // Squeeze
    after(200, medium);  // Pop peak
  },

  /**
   * Heart unsave — lighter reverse feedback.
   */
  heartUnsave() {
    light();
  },

  /**
   * Meal plan generated — synced with staggered card entrance.
   * Medium impact on landing, then light taps as cards appear.
   */
  planGenerated() {
    medium();
    after(200, light);
    after(400, light);
    after(600, () => success());
  },

  /**
   * Premium conversion — big celebratory build.
   * BOOM → stagger taps for each benefit row → final success.
   */
  premiumConversion() {
    heavy();
    after(150, medium);
    after(600, light);
    after(720, light);
    after(840, light);
    after(960, light);
    after(1100, () => success());
  },
};

export default HapticChoreography;
