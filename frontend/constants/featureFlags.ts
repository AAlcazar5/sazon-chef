// frontend/constants/featureFlags.ts
//
// W-D kill-flags. Each W-D surface is gated by a flag so it can be disabled
// WITHOUT code removal — reversible per the engineering rails (urgency
// changes sequence, not safety). Default on; env-killable.
export const FEATURE_FLAGS = {
  // W-D P1 — Cook Log Kitchen view + the "log a Claude cook" entry.
  //   EXPO_PUBLIC_COOK_LOG=0  → instant kill.
  cookLog: process.env.EXPO_PUBLIC_COOK_LOG !== '0',

  // W-D P2 — Today "memory mirror" lead above the hero + catalog-browse
  // de-emphasis. A visible reframe → the kill-flag is the A/B-safe
  // rollback per the rails.
  //   EXPO_PUBLIC_TODAY_MEMORY=0  → instant rollback to the old Today.
  todayMemoryMirror: process.env.EXPO_PUBLIC_TODAY_MEMORY !== '0',

  // X-D1 (founder roadmap Tier X — Moat Hardening): local-first Cook
  // Log cache in useCookLog. Read-through cache → offline OR network
  // hiccup returns last-known entries; online reconciles seamlessly.
  // Kill-flag preserves the old fail-empty behavior in one env-var.
  //   EXPO_PUBLIC_COOK_LOG_CACHE=0  → instant rollback to pre-X-D1.
  cookLogLocalCache: process.env.EXPO_PUBLIC_COOK_LOG_CACHE !== '0',
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;
