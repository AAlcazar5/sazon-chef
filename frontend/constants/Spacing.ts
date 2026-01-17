// Spacing constants for Sazon Chef app
// Consistent spacing scale based on 4px base unit

/**
 * Base spacing unit (4px)
 * All spacing values are multiples of this base unit
 */
export const SPACING_UNIT = 4;

/**
 * Spacing scale
 * xs: 4px  - Tight spacing (icon gaps, pill padding)
 * sm: 8px  - Small spacing (between related elements)
 * md: 12px - Medium spacing (section padding, card gaps)
 * lg: 16px - Large spacing (screen padding, major sections)
 * xl: 24px - Extra large (between major sections)
 * 2xl: 32px - Double extra large (hero sections, modals)
 * 3xl: 48px - Triple extra large (page headers)
 * 4xl: 64px - Quadruple extra large (splash screens)
 */
export const Spacing = {
  /** 4px - Tight spacing for icon gaps, pill padding */
  xs: 4,
  /** 8px - Small spacing between related elements */
  sm: 8,
  /** 12px - Medium spacing for section padding, card gaps */
  md: 12,
  /** 16px - Large spacing for screen padding, major sections */
  lg: 16,
  /** 24px - Extra large spacing between major sections */
  xl: 24,
  /** 32px - Double extra large for hero sections, modals */
  '2xl': 32,
  /** 48px - Triple extra large for page headers */
  '3xl': 48,
  /** 64px - Quadruple extra large for splash screens */
  '4xl': 64,
} as const;

/**
 * Component-specific spacing presets
 * Use these for consistent spacing in common UI patterns
 */
export const ComponentSpacing = {
  /** Screen/page level spacing */
  screen: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['2xl'],
  },

  /** Card component spacing */
  card: {
    padding: Spacing.lg,
    gap: Spacing.md,
    borderRadius: 16,
    marginBottom: Spacing.md,
  },

  /** Modal spacing */
  modal: {
    padding: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    borderRadius: 24,
    headerGap: Spacing.lg,
    contentGap: Spacing.md,
  },

  /** Action sheet spacing */
  actionSheet: {
    padding: Spacing.lg,
    itemGap: Spacing.sm,
    borderRadius: 20,
  },

  /** Form elements spacing */
  form: {
    inputPadding: Spacing.md,
    inputPaddingHorizontal: Spacing.lg,
    labelGap: Spacing.sm,
    fieldGap: Spacing.lg,
    sectionGap: Spacing.xl,
    errorGap: Spacing.xs,
  },

  /** Button spacing */
  button: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    iconGap: Spacing.sm,
  },

  /** List/feed spacing */
  list: {
    itemGap: Spacing.md,
    sectionGap: Spacing.xl,
    headerGap: Spacing.sm,
  },

  /** Badge/pill spacing */
  badge: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
  },

  /** Tab bar spacing */
  tabBar: {
    height: 60,
    paddingBottom: Spacing.sm,
    paddingTop: Spacing.sm,
    iconLabelGap: Spacing.xs,
  },

  /** Header spacing */
  header: {
    height: 56,
    paddingHorizontal: Spacing.lg,
    titleGap: Spacing.sm,
  },

  /** Toast/snackbar spacing */
  toast: {
    padding: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    borderRadius: 12,
    marginBottom: Spacing.lg,
  },

  /** Empty state spacing */
  emptyState: {
    padding: Spacing['2xl'],
    iconSize: 64,
    titleGap: Spacing.lg,
    descriptionGap: Spacing.sm,
    actionGap: Spacing.xl,
  },
} as const;

/**
 * Border radius presets
 */
export const BorderRadius = {
  /** 4px - Subtle rounding */
  xs: 4,
  /** 8px - Small rounding */
  sm: 8,
  /** 12px - Medium rounding */
  md: 12,
  /** 16px - Large rounding */
  lg: 16,
  /** 20px - Extra large rounding */
  xl: 20,
  /** 24px - Double extra large rounding */
  '2xl': 24,
  /** 9999px - Full/pill rounding */
  full: 9999,
} as const;

/**
 * Common gap values for flex containers
 */
export const Gap = {
  /** 4px */
  xs: Spacing.xs,
  /** 8px */
  sm: Spacing.sm,
  /** 12px */
  md: Spacing.md,
  /** 16px */
  lg: Spacing.lg,
  /** 24px */
  xl: Spacing.xl,
} as const;

// Type exports
export type SpacingKey = keyof typeof Spacing;
export type ComponentSpacingKey = keyof typeof ComponentSpacing;
export type BorderRadiusKey = keyof typeof BorderRadius;
export type GapKey = keyof typeof Gap;
