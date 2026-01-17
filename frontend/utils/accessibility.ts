// Accessibility helper utilities for Sazon Chef app
// Functions to generate consistent accessibility props for UI elements

import { AccessibilityProps, AccessibilityRole, AccessibilityState } from 'react-native';

/**
 * Common accessibility roles used in the app
 */
export const A11yRoles = {
  button: 'button' as AccessibilityRole,
  link: 'link' as AccessibilityRole,
  image: 'image' as AccessibilityRole,
  imageButton: 'imagebutton' as AccessibilityRole,
  header: 'header' as AccessibilityRole,
  text: 'text' as AccessibilityRole,
  adjustable: 'adjustable' as AccessibilityRole,
  checkbox: 'checkbox' as AccessibilityRole,
  radio: 'radio' as AccessibilityRole,
  switch: 'switch' as AccessibilityRole,
  tab: 'tab' as AccessibilityRole,
  tabList: 'tablist' as AccessibilityRole,
  menu: 'menu' as AccessibilityRole,
  menuItem: 'menuitem' as AccessibilityRole,
  progressBar: 'progressbar' as AccessibilityRole,
  search: 'search' as AccessibilityRole,
  alert: 'alert' as AccessibilityRole,
  list: 'list' as AccessibilityRole,
  none: 'none' as AccessibilityRole,
} as const;

/**
 * Generate accessibility props for a button
 */
export function buttonAccessibility(
  label: string,
  options?: {
    hint?: string;
    disabled?: boolean;
    selected?: boolean;
    busy?: boolean;
  }
): AccessibilityProps {
  const state: AccessibilityState = {};

  if (options?.disabled) state.disabled = true;
  if (options?.selected) state.selected = true;
  if (options?.busy) state.busy = true;

  return {
    accessible: true,
    accessibilityRole: A11yRoles.button,
    accessibilityLabel: label,
    accessibilityHint: options?.hint,
    accessibilityState: Object.keys(state).length > 0 ? state : undefined,
  };
}

/**
 * Generate accessibility props for an icon button
 */
export function iconButtonAccessibility(
  action: string,
  options?: {
    hint?: string;
    disabled?: boolean;
  }
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: A11yRoles.imageButton,
    accessibilityLabel: action,
    accessibilityHint: options?.hint,
    accessibilityState: options?.disabled ? { disabled: true } : undefined,
  };
}

/**
 * Generate accessibility props for a link
 */
export function linkAccessibility(
  label: string,
  hint?: string
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: A11yRoles.link,
    accessibilityLabel: label,
    accessibilityHint: hint ?? `Opens ${label}`,
  };
}

/**
 * Generate accessibility props for an image
 */
export function imageAccessibility(
  description: string,
  isDecorative: boolean = false
): AccessibilityProps {
  if (isDecorative) {
    return {
      accessible: false,
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no-hide-descendants',
    };
  }

  return {
    accessible: true,
    accessibilityRole: A11yRoles.image,
    accessibilityLabel: description,
  };
}

/**
 * Generate accessibility props for a header/title
 */
export function headerAccessibility(
  level: 1 | 2 | 3 | 4 | 5 | 6 = 1
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: A11yRoles.header,
    // Note: React Native doesn't support aria-level, but we document intent
  };
}

/**
 * Generate accessibility props for a text input
 */
export function inputAccessibility(
  label: string,
  options?: {
    hint?: string;
    error?: string;
    required?: boolean;
    value?: string;
  }
): AccessibilityProps {
  let combinedLabel = label;
  if (options?.required) combinedLabel += ', required';
  if (options?.error) combinedLabel += `, error: ${options.error}`;

  return {
    accessible: true,
    accessibilityLabel: combinedLabel,
    accessibilityHint: options?.hint,
    accessibilityValue: options?.value ? { text: options.value } : undefined,
  };
}

/**
 * Generate accessibility props for a checkbox
 */
export function checkboxAccessibility(
  label: string,
  checked: boolean,
  options?: {
    hint?: string;
    disabled?: boolean;
  }
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: A11yRoles.checkbox,
    accessibilityLabel: label,
    accessibilityHint: options?.hint ?? `Double tap to ${checked ? 'uncheck' : 'check'}`,
    accessibilityState: {
      checked,
      disabled: options?.disabled,
    },
  };
}

/**
 * Generate accessibility props for a switch/toggle
 */
export function switchAccessibility(
  label: string,
  enabled: boolean,
  options?: {
    hint?: string;
    disabled?: boolean;
  }
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: A11yRoles.switch,
    accessibilityLabel: `${label}, ${enabled ? 'on' : 'off'}`,
    accessibilityHint: options?.hint ?? `Double tap to turn ${enabled ? 'off' : 'on'}`,
    accessibilityState: {
      checked: enabled,
      disabled: options?.disabled,
    },
  };
}

/**
 * Generate accessibility props for a tab
 */
export function tabAccessibility(
  label: string,
  selected: boolean,
  index: number,
  total: number
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: A11yRoles.tab,
    accessibilityLabel: `${label}, tab ${index + 1} of ${total}`,
    accessibilityState: { selected },
  };
}

/**
 * Generate accessibility props for a progress indicator
 */
export function progressAccessibility(
  label: string,
  current: number,
  max: number,
  options?: {
    unit?: string;
  }
): AccessibilityProps {
  const percentage = Math.round((current / max) * 100);
  const unit = options?.unit ?? '';

  return {
    accessible: true,
    accessibilityRole: A11yRoles.progressBar,
    accessibilityLabel: `${label}: ${current}${unit} of ${max}${unit}, ${percentage}% complete`,
    accessibilityValue: {
      min: 0,
      max,
      now: current,
    },
  };
}

/**
 * Generate accessibility props for a list item
 */
export function listItemAccessibility(
  label: string,
  position: number,
  total: number,
  options?: {
    hint?: string;
    selected?: boolean;
  }
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityLabel: `${label}, item ${position} of ${total}`,
    accessibilityHint: options?.hint,
    accessibilityState: options?.selected ? { selected: true } : undefined,
  };
}

/**
 * Generate accessibility props for a recipe card
 */
export function recipeCardAccessibility(
  title: string,
  options?: {
    calories?: number;
    cookTime?: number;
    cuisine?: string;
    isSaved?: boolean;
    isLiked?: boolean;
  }
): AccessibilityProps {
  let label = title;
  const details: string[] = [];

  if (options?.cuisine) details.push(options.cuisine);
  if (options?.calories) details.push(`${options.calories} calories`);
  if (options?.cookTime) details.push(`${options.cookTime} minutes`);
  if (options?.isSaved) details.push('saved');
  if (options?.isLiked) details.push('liked');

  if (details.length > 0) {
    label += `, ${details.join(', ')}`;
  }

  return {
    accessible: true,
    accessibilityRole: A11yRoles.button,
    accessibilityLabel: label,
    accessibilityHint: 'Double tap to view recipe details',
  };
}

/**
 * Generate accessibility props for a macro display
 */
export function macroAccessibility(
  type: 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber',
  value: number,
  unit?: string
): AccessibilityProps {
  const labels: Record<string, string> = {
    calories: 'Calories',
    protein: 'Protein',
    carbs: 'Carbohydrates',
    fat: 'Fat',
    fiber: 'Fiber',
  };

  const units: Record<string, string> = {
    calories: '',
    protein: 'grams',
    carbs: 'grams',
    fat: 'grams',
    fiber: 'grams',
  };

  return {
    accessible: true,
    accessibilityLabel: `${labels[type]}: ${value} ${unit ?? units[type]}`,
  };
}

/**
 * Generate accessibility props for an alert/notification
 */
export function alertAccessibility(
  message: string,
  type: 'success' | 'error' | 'warning' | 'info' = 'info'
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityRole: A11yRoles.alert,
    accessibilityLabel: `${type}: ${message}`,
    accessibilityLiveRegion: 'polite',
  };
}

/**
 * Hide element from accessibility tree (for decorative elements)
 */
export function decorativeAccessibility(): AccessibilityProps {
  return {
    accessible: false,
    accessibilityElementsHidden: true,
    importantForAccessibility: 'no-hide-descendants',
  };
}

/**
 * Group children as a single accessible element
 */
export function groupAccessibility(label: string): AccessibilityProps {
  return {
    accessible: true,
    accessibilityLabel: label,
  };
}
