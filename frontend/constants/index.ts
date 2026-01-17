// Centralized exports for all design system constants
// Import from '@/constants' or '../../constants' for easy access

// Colors
export { Colors, DarkColors, BackgroundColors, TextColors, Gradients, getScoreColor, getMacroColor, getFeedbackColor } from './Colors';

// Icons
export { Icons, IconSizes, IconColors, IconVariants, getIconName } from './Icons';

// Spacing
export { Spacing, ComponentSpacing, BorderRadius, Gap, SPACING_UNIT } from './Spacing';
export type { SpacingKey, ComponentSpacingKey, BorderRadiusKey, GapKey } from './Spacing';

// Typography
export { FontFamily, FontWeight, FontSize, LineHeight, LetterSpacing, Typography } from './Typography';
export type { FontSizeKey, FontWeightKey, TypographyKey } from './Typography';

// Haptics
export { ImpactStyle, NotificationType, HapticPatterns, triggerHaptic } from './Haptics';
export type { ImpactStyleKey, NotificationTypeKey, HapticPatternKey } from './Haptics';

// Animations
export { Duration, Spring, Easing_, Timing, Transform, Stagger, AnimationPresets } from './Animations';
export type { DurationKey, SpringKey, TimingKey, StaggerKey } from './Animations';

// Empty States
export {
  EmptyStates,
  HomeEmptyStates,
  CookbookEmptyStates,
  MealPlanEmptyStates,
  ShoppingListEmptyStates,
  ProfileEmptyStates,
  SearchEmptyStates,
  GenericEmptyStates
} from './EmptyStates';
export type {
  EmptyStateConfig,
  HomeEmptyStateKey,
  CookbookEmptyStateKey,
  MealPlanEmptyStateKey,
  ShoppingListEmptyStateKey,
  ProfileEmptyStateKey,
  SearchEmptyStateKey,
  GenericEmptyStateKey
} from './EmptyStates';

// Loading States
export {
  LoadingStates,
  HomeLoadingStates,
  CookbookLoadingStates,
  MealPlanLoadingStates,
  ShoppingListLoadingStates,
  ProfileLoadingStates,
  GenericLoadingStates,
  getLoadingMessage
} from './LoadingStates';
export type {
  LoadingStateConfig,
  HomeLoadingStateKey,
  CookbookLoadingStateKey,
  MealPlanLoadingStateKey,
  ShoppingListLoadingStateKey,
  ProfileLoadingStateKey,
  GenericLoadingStateKey
} from './LoadingStates';
