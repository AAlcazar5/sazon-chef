# DS4.1 — Toast / banner spec

> **Decision:** Toasts and banners share one visual contract sourced
> from `SurfaceSemantic` (DS3.2) + `Radius.card` (20 px) + a 3-second
> auto-dismiss + swipe-to-dismiss.

## Visual contract

| Token / value | Source |
|---------------|--------|
| Background | `SurfaceSemantic.{light,dark}.<variant>.bg` |
| Border | `SurfaceSemantic.{light,dark}.<variant>.border` (1 px) |
| Ink | `SurfaceSemantic.{light,dark}.<variant>.ink` |
| Corner radius | `Radius.card` (20 px) |
| Padding | 12 px (vertical) × 16 px (horizontal) |
| Icon size | `IconSizes.SM` (16 px) |
| Spacing icon → text | 8 px |
| Max width | screen width − 32 px |
| Elevation | `Elevation.md` (Airbnb layered subtle) |

## Variants

| Variant   | Use case                                | Example copy                                    |
|-----------|-----------------------------------------|-------------------------------------------------|
| `success` | Save / publish / completed milestones   | "Saved to your kitchen."                        |
| `info`    | Neutral confirmation, non-actionable    | "Generated 4 alternatives."                     |
| `warning` | Recoverable user state                  | "You're offline — caching this for later."      |
| `error`   | Failure that does not require action    | "Hmm — that didn't go through. Try once more."  |

## Motion

| Phase  | Spec |
|--------|------|
| Enter  | Slide up from below + fade in, 250 ms `Motion.duration.quick` ease-out. |
| Idle   | 3 s auto-dismiss timer. Tap-to-dismiss cancels the timer. |
| Exit   | Slide down + fade out, 200 ms ease-in. |
| Swipe-to-dismiss | Drag down ≥ 30 % of own height OR flick > 1500 px/s (per `Motion.bottomSheet.drag`) → dismiss. |

## Accessibility

- `accessibilityLiveRegion="polite"` for `success` / `info`.
- `accessibilityLiveRegion="assertive"` for `warning` / `error`.
- `accessibilityRole="alert"` on warning + error so screen readers
  announce immediately.
- Touch target ≥ 44 px regardless of visible padding.
- Reduced-motion (DS1.3): replace slide with instant fade in/out.

## Voice

- ✅ "Saved to your kitchen." / "Hmm — that didn't go through."
- ❌ "Failed:" / "Error:" / "Invalid input" — banned (CLAUDE.md).
- One sentence, no trailing period for short toasts.
- Sazon-as-friend, never punitive.

## Banner vs. Toast

| Decision | Use Toast | Use Banner |
|----------|-----------|------------|
| Lifecycle | Auto-dismisses | Persists until dismissed |
| Position | Bottom of screen | Top of content area |
| Action button | None / one ghost action | Up to two CTAs |
| Severity | Non-blocking | Recoverable issue or onboarding nudge |

## Source of truth

Tokens: `frontend/constants/colorTokens.cjs` → `SurfaceSemantic`.
Component wire-up (a `<Toast>` / `<Banner>` primitive consuming these
tokens) lands with the DS7 component-migration pass.
