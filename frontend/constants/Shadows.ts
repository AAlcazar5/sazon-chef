// Shadow tokens for Sazon Chef app
// Use Platform.select to get correct shadows on iOS vs Android

import { Platform } from 'react-native';

const shadow = (
  elevation: number,
  radius: number,
  offsetY: number,
  opacity: number
) =>
  Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: {
      elevation,
    },
    default: {},
  });

export const Shadows = {
  /** Barely lifted — input fields, chips */
  SM: shadow(2, 4, 2, 0.08),
  /** Standard card depth — recipe cards, profile cards */
  MD: shadow(4, 8, 4, 0.10),
  /** Floating panels — bottom sheets, FABs */
  LG: shadow(8, 16, 6, 0.12),
  /** Modals and overlays */
  XL: shadow(12, 24, 8, 0.15),
} as const;
