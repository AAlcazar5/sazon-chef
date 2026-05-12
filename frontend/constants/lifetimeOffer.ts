// frontend/constants/lifetimeOffer.ts
// 90-day launch-window lifetime offering (paywall tier 3 — see plans/strategy.md#monetization).
//
// Two gates: window-open + offering-present.
//   - `LIFETIME_OFFER_END_DATE` is the absolute cutoff. Set this to launch date + 90d
//     once a real launch lands; keeping it a permissive future date pre-launch is fine
//     because the UI is double-gated by `offerings.lifetime != null` (RevenueCat product).
//   - When RC ships the `$rc_lifetime` package, the UI auto-reveals the third tile.

export const LIFETIME_OFFER_END_DATE = new Date('2026-08-15T00:00:00Z');

export function isLifetimeWindowOpen(now: Date = new Date()): boolean {
  return now.getTime() < LIFETIME_OFFER_END_DATE.getTime();
}
