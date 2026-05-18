// frontend/constants/featureFlags.ts
//
// W-D kill-flags. Each W-D surface is gated by a flag so it can be disabled
// WITHOUT code removal — reversible per the engineering rails (urgency
// changes sequence, not safety). Default on; env-killable.
export const FEATURE_FLAGS = {
  // W-D P1 — Cook Log Kitchen view + the "log a Claude cook" entry.
  //   EXPO_PUBLIC_COOK_LOG=0  → instant kill.
  cookLog: process.env.EXPO_PUBLIC_COOK_LOG !== '0',
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;
