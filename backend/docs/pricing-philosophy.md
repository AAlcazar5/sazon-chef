# Pricing Philosophy — Sazon

> **Status:** Active. Decision authority: Alex. Last reviewed 2026-05-08 (I3.1 audit).
>
> **Companion code:** `backend/src/services/subscriptionTierService.ts` is the single source of truth for the gate matrix. Tests in `backend/__tests__/services/subscriptionTierService.test.ts` enforce these invariants forever — change them only by updating this doc first.

## The thesis (one paragraph)

Sazon's free tier is generous on purpose. The paid tier exists to subsidize the free tier, not to extract from users who can't pay. The features behind the paywall are the ones whose **variable cost scales with usage** (vision-token-heavy photo attach, voice cooking, the deep ~33-nutrient view that pings additional services). Everything that's part of the **brand identity** — Sazon the friend, the conversational coach, the cuisine adjacency engine, the cultural specificity, the discovery surfaces — stays free. Cost-control on the conversational layer happens at the **LLM rate-limit layer** (I3.3 telemetry), not at a feature wall in the user's face.

## The rule

> **If a feature is part of "Sazon the brand," it is never feature-gated.**
>
> If a feature has a hard variable cost per use, it is gated.
>
> When in doubt, keep it free.

## The MFP antipattern (what we are NOT)

MyFitnessPal's #1 user complaint in App Store reviews (verified 2026 audit): **the barcode scanner is locked behind premium**. The feature most associated with the brand's identity — "scan a barcode and log it" — is the feature behind the paywall. The result: 1-star reviews, churn, and a brand that tastes like extraction.

Sazon's analog would be: locking Sazon (the friend who knows your kitchen) behind a paywall. We do not do this. Sazon is the brand. Sazon is free.

## The current matrix (I3.1, 2026-05-08)

### Always free
| Feature | Why free |
|---|---|
| **`coachChat`** — full Sazon conversational layer | The brand. Gating it kills the differentiator. Cost control via LLM rate-limit (I3.3). |
| **`coachMemory`** — long-term per-user memory carried turn-to-turn | Coach without memory is a stranger. Memory is what makes Sazon feel personal — the N=1 promise. |
| Build-a-Plate (capped at **5/week**, raised from 3) | A typical 3-cook-nights-per-week user explores Build-a-Plate without hitting the cap before forming a habit. Above-cap users still route through LLM cost telemetry. |
| Recipe browsing, search, saves, collections | Discovery is the floor. Locking it gates the value before the user has tasted it. |
| Today screen, Week tab, Kitchen library, Sazon tab | The four-tab IA is the product. |
| Reverse-discovery surface (I2.4 — "your market has X") | The cultural moat. Free for international users — that's the wedge. |
| Local-ingredient resolver (I2.1 / I2.2 — "kale → couve manteiga") | Same — translation IS the international acquisition story. |

### Premium ($60/yr default)
| Feature | Why gated |
|---|---|
| **`coachPhotoAttach`** — photo upload in coach (snap-to-log) | Real per-message vision-token cost. ~10-30¢/image at retail rates. |
| **`adaptiveNutritionCoverage`** — per-user nutrient gap targeting | Compute-heavy, needs ≥2 weeks of cook history; retains research value. |
| **`culturalPrimers`** — first-cook cuisine primers | Curated long-form content; production cost per primer. |
| **`voiceCooking`** — hands-free Kitchen mode | Real-time speech-to-text + voice-out costs. |
| **`adaptiveNotifications`** — personalized push timing + content | Per-send LLM cost; quality requires ML cost we eat. |
| **`fullNutritionView`** — ~33-nutrient power-user view | Hits additional nutrient-data services per recipe view. |
| **`buildAPlateUnlimited`** — past the 5/wk free cap | Each composition is an LLM call; unlimited = covering its cost. |

## Decisions log

### 2026-05-08 — I3.1 audit (this revision)

**Changed:**
- `coachChat` moved from premium-only → always free.
  - Rationale: Sazon is the brand. Gating it is the MFP barcode-scan mistake.
  - Cost control: I3.3 telemetry (`coachTokensIn/Out` per user per day) catches outlier free users. If median free-user variable cost spikes >$0.50/mo, soft-cap with rate limits, not a feature wall.
- `coachMemory` moved from premium-only → always free.
  - Rationale: coach without memory is a stranger. Locking memory undermines the "friend who knows your kitchen" tagline.
- `FREE_BUILD_A_PLATE_WEEKLY_LIMIT` raised from 3 → 5.
  - Rationale: 3/wk caps before a habit forms. 5/wk lets a typical 3-cook-nights-per-week user explore without hitting the cap in their first two weeks.

**Kept:**
- `coachPhotoAttach` premium. Vision tokens have real per-call cost; this is the cleanest "premium covers the variable cost" example.
- `adaptiveNutritionCoverage`, `culturalPrimers`, `voiceCooking`, `adaptiveNotifications`, `fullNutritionView` — all variable-cost or production-cost premium features.

**Deferred:**
- I3.2 (Founding Eater $19 one-time tier) — separate work; design + RevenueCat IAP wiring.
- I3.3 (variable-cost telemetry) — the alarm that prevents the subsidy turning into a death spiral. Should land before any large paid acquisition push.
- I3.4 (PPP-aware pricing per territory) — App Store Connect work; ships when international launch goes live.
- I3.5 ("Why we're free" disclosure surface) — settings UI; ships once Founding Eater lands.

## Invariants (test-enforced)

The audit's commitments are encoded in `subscriptionTierService.test.ts` under `describe('I3.1 free-tier audit — invariants that must hold forever')`:

1. `hasFeatureAccess(freeUser, 'coachChat')` → `true` — Sazon is never feature-gated.
2. `hasFeatureAccess(freeUser, 'coachMemory')` → `true` — Coach memory is never feature-gated.
3. `hasFeatureAccess(freeUser, 'coachPhotoAttach')` → `false` — Photo-attach (vision-token cost) stays premium.
4. `FREE_BUILD_A_PLATE_WEEKLY_LIMIT === 5`.

These tests are the contract. Loosening them requires updating *this doc* first, then the test, then the implementation — in that order.

## What this doc is not

- Not a paywall copy spec (that lives in frontend).
- Not a Stripe / RevenueCat configuration (that lives in `subscriptionTierService` ↔ webhooks).
- Not a marketing positioning doc (that lives in `plans/persona.md`).

## Anti-goals

- "Just-under-cost pricing forever." Free is an acquisition subsidy with a sunset; once a market has critical mass, premium price is the right lever, not free-tier shrinkage.
- "Aggressive trials." A 7-day free trial that auto-converts is a dark pattern. Trials, when they exist, are explicit and easy to cancel.
- "FOMO-coded paywalls." If the user feels worse after seeing the upgrade prompt than before, the prompt is wrong.
- "Locking discovery surfaces." Reverse-discovery, Today, the Kitchen library — these are the *product*. Gating them gates the value before the user has tasted it.
