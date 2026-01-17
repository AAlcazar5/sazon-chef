// Haptic feedback constants for Sazon Chef app
// Standardized haptic patterns for consistent tactile feedback

import * as Haptics from 'expo-haptics';

/**
 * Impact feedback styles
 * Use these for button presses, taps, and UI interactions
 */
export const ImpactStyle = {
  /** Light impact - subtle feedback for minor interactions */
  light: Haptics.ImpactFeedbackStyle.Light,
  /** Medium impact - standard button press feedback */
  medium: Haptics.ImpactFeedbackStyle.Medium,
  /** Heavy impact - strong feedback for significant actions */
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
} as const;

/**
 * Notification feedback types
 * Use these for system notifications and state changes
 */
export const NotificationType = {
  /** Success - positive outcome (save, complete, like) */
  success: Haptics.NotificationFeedbackType.Success,
  /** Warning - caution needed (delete confirmation, warnings) */
  warning: Haptics.NotificationFeedbackType.Warning,
  /** Error - negative outcome (failed action, validation error) */
  error: Haptics.NotificationFeedbackType.Error,
} as const;

/**
 * Haptic feedback patterns for common UI interactions
 * These are semantic mappings to help developers choose the right feedback
 */
export const HapticPatterns = {
  // Button interactions
  /** Standard button press */
  buttonPress: () => Haptics.impactAsync(ImpactStyle.light),
  /** Primary/CTA button press */
  buttonPressPrimary: () => Haptics.impactAsync(ImpactStyle.medium),
  /** Destructive button press */
  buttonPressDestructive: () => Haptics.impactAsync(ImpactStyle.heavy),

  // Selection interactions
  /** Single item selection (checkbox, radio) */
  selection: () => Haptics.selectionAsync(),
  /** Toggle switch */
  toggle: () => Haptics.impactAsync(ImpactStyle.light),
  /** Tab switch */
  tabSwitch: () => Haptics.impactAsync(ImpactStyle.light),

  // Gesture interactions
  /** Swipe action started */
  swipeStart: () => Haptics.impactAsync(ImpactStyle.light),
  /** Swipe threshold reached */
  swipeThreshold: () => Haptics.impactAsync(ImpactStyle.medium),
  /** Swipe action completed */
  swipeComplete: () => Haptics.impactAsync(ImpactStyle.medium),
  /** Long press detected */
  longPress: () => Haptics.impactAsync(ImpactStyle.heavy),
  /** Pull to refresh triggered */
  pullToRefresh: () => Haptics.impactAsync(ImpactStyle.medium),

  // Feedback interactions
  /** Like/favorite action */
  like: () => Haptics.impactAsync(ImpactStyle.medium),
  /** Dislike action */
  dislike: () => Haptics.impactAsync(ImpactStyle.medium),
  /** Save/bookmark action */
  save: () => Haptics.impactAsync(ImpactStyle.medium),

  // State change notifications
  /** Success state (save complete, action succeeded) */
  success: () => Haptics.notificationAsync(NotificationType.success),
  /** Warning state (confirmation needed) */
  warning: () => Haptics.notificationAsync(NotificationType.warning),
  /** Error state (action failed, validation error) */
  error: () => Haptics.notificationAsync(NotificationType.error),

  // Modal/sheet interactions
  /** Modal opened */
  modalOpen: () => Haptics.impactAsync(ImpactStyle.light),
  /** Modal closed */
  modalClose: () => Haptics.impactAsync(ImpactStyle.light),
  /** Action sheet opened */
  actionSheetOpen: () => Haptics.impactAsync(ImpactStyle.medium),

  // List interactions
  /** Item deleted from list */
  itemDelete: () => Haptics.impactAsync(ImpactStyle.medium),
  /** Item added to list */
  itemAdd: () => Haptics.impactAsync(ImpactStyle.light),
  /** Item reordered */
  itemReorder: () => Haptics.impactAsync(ImpactStyle.light),

  // Navigation
  /** Navigate forward */
  navigateForward: () => Haptics.impactAsync(ImpactStyle.light),
  /** Navigate back */
  navigateBack: () => Haptics.impactAsync(ImpactStyle.light),

  // Form interactions
  /** Form submitted */
  formSubmit: () => Haptics.impactAsync(ImpactStyle.medium),
  /** Form validation error */
  formError: () => Haptics.notificationAsync(NotificationType.error),

  // Special interactions
  /** Recipe card flip/expand */
  cardFlip: () => Haptics.impactAsync(ImpactStyle.medium),
  /** Roulette spin */
  rouletteSpin: () => Haptics.impactAsync(ImpactStyle.medium),
  /** Random recipe generated */
  randomGenerate: () => Haptics.impactAsync(ImpactStyle.heavy),
} as const;

/**
 * Helper function to trigger haptic feedback with error handling
 * Useful when you need custom haptic patterns
 */
export const triggerHaptic = async (
  type: 'impact' | 'notification' | 'selection',
  style?: Haptics.ImpactFeedbackStyle | Haptics.NotificationFeedbackType
) => {
  try {
    switch (type) {
      case 'impact':
        await Haptics.impactAsync(style as Haptics.ImpactFeedbackStyle ?? ImpactStyle.medium);
        break;
      case 'notification':
        await Haptics.notificationAsync(style as Haptics.NotificationFeedbackType ?? NotificationType.success);
        break;
      case 'selection':
        await Haptics.selectionAsync();
        break;
    }
  } catch (error) {
    // Silently fail - haptics may not be available on all devices
    console.debug('Haptic feedback not available:', error);
  }
};

// Type exports
export type ImpactStyleKey = keyof typeof ImpactStyle;
export type NotificationTypeKey = keyof typeof NotificationType;
export type HapticPatternKey = keyof typeof HapticPatterns;
