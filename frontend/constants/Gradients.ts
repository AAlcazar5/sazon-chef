// frontend/constants/Gradients.ts
// Centralized gradient presets — every screen and component pulls from here.
// Named presets for CTAs, screen backgrounds, onboarding, overlays, and more.

/** Two-stop gradient tuple */
export type GradientPair = readonly [string, string];

// ─── CTA Gradients ──────────────────────────────────────────────────────────────

/** Primary action buttons (Save, Apply, Start Cooking) */
export const primaryCTA: GradientPair = ['#FF8B41', '#E84D3D'];

/** Softer CTA (secondary actions, warm prompts) */
export const secondaryCTA: GradientPair = ['#FF8B41', '#FFB74D'];

/** Success actions (Start Cooking, Complete, Add to Meal Plan) */
export const successCTA: GradientPair = ['#66BB6A', '#43A047'];

/** Premium/paywall CTA (Upgrade, Unlock) */
export const premiumCTA: GradientPair = ['#FF8B41', '#F06292'];

// ─── Screen Background Gradients ────────────────────────────────────────────────

/** Warm cream gradient — all tab screens (light mode) */
export const screenBgLight: GradientPair = ['#FAF7F4', '#FFF5EE'];

/** Deep navy → black — dark mode screens */
export const screenBgDark: GradientPair = ['#1A1A2E', '#0F0F0F'];

// ─── Onboarding & Auth ──────────────────────────────────────────────────────────

/** Welcome screen (peach → cream) */
export const onboarding1: GradientPair = ['#FFF0E5', '#FAF7F4'];

/** Restrictions screen (sage → cream) */
export const onboarding2: GradientPair = ['#E8F5E9', '#FAF7F4'];

/** Goal screen (lavender → cream) */
export const onboarding3: GradientPair = ['#F3E5F5', '#FAF7F4'];

/** Auth screen background (warm orange tint → cream) */
export const authBg: GradientPair = ['rgba(255,139,65,0.12)', '#FAF7F4'];

// ─── Special Surfaces ───────────────────────────────────────────────────────────

/** Paywall background (dark + orange glow) */
export const paywallBg: GradientPair = ['#1A1A2E', 'rgba(255,139,65,0.15)'];

/** Image card text legibility overlay */
export const cardOverlay: GradientPair = ['transparent', 'rgba(0,0,0,0.65)'];

/** Warm orange hero tint */
export const heroWarm: GradientPair = ['transparent', 'rgba(255,139,65,0.15)'];

// ─── Convenience object ─────────────────────────────────────────────────────────

export const GradientPresets = {
  primaryCTA,
  secondaryCTA,
  successCTA,
  premiumCTA,
  screenBgLight,
  screenBgDark,
  onboarding1,
  onboarding2,
  onboarding3,
  authBg,
  paywallBg,
  cardOverlay,
  heroWarm,
} as const;

export default GradientPresets;
