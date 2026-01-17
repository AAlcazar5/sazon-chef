// Common style helpers for Sazon Chef
// Use these helpers for consistent styling across components

import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Spacing, ComponentSpacing, BorderRadius } from '../constants/Spacing';
import { Typography, FontSize, FontWeight } from '../constants/Typography';
import { Colors, DarkColors } from '../constants/Colors';

/**
 * Get themed colors based on dark mode
 */
export const getThemedColors = (isDark: boolean) => ({
  background: isDark ? DarkColors.background : Colors.background,
  surface: isDark ? DarkColors.surface : Colors.surface,
  primary: isDark ? DarkColors.primary : Colors.primary,
  primaryLight: isDark ? DarkColors.primaryLight : Colors.primaryLight,
  primaryDark: isDark ? DarkColors.primaryDark : Colors.primaryDark,
  text: {
    primary: isDark ? DarkColors.text.primary : Colors.text.primary,
    secondary: isDark ? DarkColors.text.secondary : Colors.text.secondary,
    tertiary: isDark ? DarkColors.text.tertiary : Colors.text.tertiary,
    inverse: isDark ? DarkColors.text.inverse : Colors.text.inverse,
  },
  border: {
    light: isDark ? DarkColors.border.light : Colors.border.light,
    medium: isDark ? DarkColors.border.medium : Colors.border.medium,
    dark: isDark ? DarkColors.border.dark : Colors.border.dark,
  },
  success: Colors.success,
  warning: Colors.warning,
  error: Colors.error,
  info: Colors.info,
});

/**
 * Common layout styles using spacing constants
 */
export const LayoutStyles = StyleSheet.create({
  // Screen containers
  screenContainer: {
    flex: 1,
    paddingHorizontal: ComponentSpacing.screen.paddingHorizontal,
  },
  screenContainerWithPadding: {
    flex: 1,
    paddingHorizontal: ComponentSpacing.screen.paddingHorizontal,
    paddingVertical: ComponentSpacing.screen.paddingVertical,
  },

  // Section spacing
  sectionContainer: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },

  // Row layouts
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowSpaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Card styles
  card: {
    padding: ComponentSpacing.card.padding,
    borderRadius: ComponentSpacing.card.borderRadius,
    marginBottom: ComponentSpacing.card.marginBottom,
  },

  // Modal styles
  modalContainer: {
    padding: ComponentSpacing.modal.padding,
    borderRadius: ComponentSpacing.modal.borderRadius,
  },
  modalHeader: {
    marginBottom: ComponentSpacing.modal.headerGap,
  },
  modalContent: {
    gap: ComponentSpacing.modal.contentGap,
  },

  // List styles
  listContainer: {
    gap: ComponentSpacing.list.itemGap,
  },
  listSection: {
    marginBottom: ComponentSpacing.list.sectionGap,
  },

  // Form styles
  formField: {
    marginBottom: ComponentSpacing.form.fieldGap,
  },
  formSection: {
    marginBottom: ComponentSpacing.form.sectionGap,
  },

  // Header styles
  header: {
    height: ComponentSpacing.header.height,
    paddingHorizontal: ComponentSpacing.header.paddingHorizontal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

/**
 * Common text styles using typography constants
 */
export const TextStyles = StyleSheet.create({
  // Headings
  h1: Typography.h1 as TextStyle,
  h2: Typography.h2 as TextStyle,
  h3: Typography.h3 as TextStyle,
  h4: Typography.h4 as TextStyle,
  h5: Typography.h5 as TextStyle,

  // Body text
  body: Typography.body as TextStyle,
  bodyLarge: Typography.bodyLarge as TextStyle,
  bodySmall: Typography.bodySmall as TextStyle,

  // Labels and hints
  label: Typography.label as TextStyle,
  hint: Typography.hint as TextStyle,
  caption: Typography.caption as TextStyle,

  // Button text
  button: Typography.button as TextStyle,
  buttonSmall: Typography.buttonSmall as TextStyle,

  // Special text
  stat: Typography.stat as TextStyle,
  statLarge: Typography.statLarge as TextStyle,
  error: Typography.error as TextStyle,
  badge: Typography.badge as TextStyle,
  navTitle: Typography.navTitle as TextStyle,
});

/**
 * Common button styles
 */
export const ButtonStyles = StyleSheet.create({
  primary: {
    paddingVertical: ComponentSpacing.button.paddingVertical,
    paddingHorizontal: ComponentSpacing.button.paddingHorizontal,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    paddingVertical: ComponentSpacing.button.paddingVertical,
    paddingHorizontal: ComponentSpacing.button.paddingHorizontal,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  text: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  icon: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  chip: {
    paddingVertical: ComponentSpacing.badge.paddingVertical,
    paddingHorizontal: ComponentSpacing.badge.paddingHorizontal,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ComponentSpacing.badge.gap,
  },
});

/**
 * Common input styles
 */
export const InputStyles = StyleSheet.create({
  container: {
    marginBottom: ComponentSpacing.form.fieldGap,
  },
  input: {
    paddingVertical: ComponentSpacing.form.inputPadding,
    paddingHorizontal: ComponentSpacing.form.inputPaddingHorizontal,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: FontSize.md,
  },
  label: {
    marginBottom: ComponentSpacing.form.labelGap,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  error: {
    marginTop: ComponentSpacing.form.errorGap,
    fontSize: FontSize.sm,
  },
});

/**
 * Create a gap style for flexbox containers
 */
export const createGap = (size: keyof typeof Spacing): ViewStyle => ({
  gap: Spacing[size],
});

/**
 * Create padding style
 */
export const createPadding = (
  all?: keyof typeof Spacing,
  options?: {
    horizontal?: keyof typeof Spacing;
    vertical?: keyof typeof Spacing;
    top?: keyof typeof Spacing;
    bottom?: keyof typeof Spacing;
    left?: keyof typeof Spacing;
    right?: keyof typeof Spacing;
  }
): ViewStyle => {
  const style: ViewStyle = {};

  if (all) {
    style.padding = Spacing[all];
  }
  if (options?.horizontal) {
    style.paddingHorizontal = Spacing[options.horizontal];
  }
  if (options?.vertical) {
    style.paddingVertical = Spacing[options.vertical];
  }
  if (options?.top) {
    style.paddingTop = Spacing[options.top];
  }
  if (options?.bottom) {
    style.paddingBottom = Spacing[options.bottom];
  }
  if (options?.left) {
    style.paddingLeft = Spacing[options.left];
  }
  if (options?.right) {
    style.paddingRight = Spacing[options.right];
  }

  return style;
};

/**
 * Create margin style
 */
export const createMargin = (
  all?: keyof typeof Spacing,
  options?: {
    horizontal?: keyof typeof Spacing;
    vertical?: keyof typeof Spacing;
    top?: keyof typeof Spacing;
    bottom?: keyof typeof Spacing;
    left?: keyof typeof Spacing;
    right?: keyof typeof Spacing;
  }
): ViewStyle => {
  const style: ViewStyle = {};

  if (all) {
    style.margin = Spacing[all];
  }
  if (options?.horizontal) {
    style.marginHorizontal = Spacing[options.horizontal];
  }
  if (options?.vertical) {
    style.marginVertical = Spacing[options.vertical];
  }
  if (options?.top) {
    style.marginTop = Spacing[options.top];
  }
  if (options?.bottom) {
    style.marginBottom = Spacing[options.bottom];
  }
  if (options?.left) {
    style.marginLeft = Spacing[options.left];
  }
  if (options?.right) {
    style.marginRight = Spacing[options.right];
  }

  return style;
};

/**
 * Create border radius style
 */
export const createBorderRadius = (size: keyof typeof BorderRadius): ViewStyle => ({
  borderRadius: BorderRadius[size],
});
