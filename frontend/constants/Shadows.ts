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

// ─── Editorial Shadows (10V-B) ───────────────────────────────────────────────
// v2 design system — tinted shadows with custom colors

interface EditorialShadowSet {
  ios: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
  };
  android: { elevation: number };
}

function editorialShadow(
  color: string,
  offsetY: number,
  radius: number,
  opacity: number,
  elevation: number,
): EditorialShadowSet {
  return {
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: { elevation },
  };
}

export const EditorialShadows = {
  /** Deep tinted shadow for circular plate photos */
  platePhoto: editorialShadow('rgba(30,60,110,1)', 14, 32, 0.28, 16),
  /** Raised card shadow for stat strips and elevated cards */
  cardRaised: editorialShadow('rgba(0,0,0,1)', 10, 28, 0.08, 8),
  /** FAB shadow with brand-orange tint */
  fab: editorialShadow('rgba(232,77,61,1)', 10, 24, 0.45, 12),
  /** Black pill CTA shadow */
  blackCTA: editorialShadow('rgba(17,24,39,1)', 8, 20, 0.3, 10),
} as const;
