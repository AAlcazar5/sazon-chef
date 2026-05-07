# DS3.6 — Brand gradient canonical mapping

> **Decision:** `frontend/constants/Gradients.ts` is preserved as-is. Each
> exported gradient has one canonical use case. Audit confirmed no
> production consumers of `rainbow*` so they don't appear in the file
> today.

## Canonical mapping (1 gradient → 1 use case)

| Gradient        | Use case                                                  | Canonical consumer(s)                          |
|-----------------|-----------------------------------------------------------|------------------------------------------------|
| `primaryCTA`    | Primary action buttons (Save, Apply, Start Cooking)       | `BrandButton variant="brand"` *(future DS7)*   |
| `secondaryCTA`  | Softer warm prompts, secondary actions                    | secondary-tier prompts                         |
| `successCTA`    | Success / completion CTAs (Add to Plan, Mark Cooked)      | journey/success surfaces                       |
| `premiumCTA`    | Paywall + upgrade flows                                   | `PaywallScreen`, upgrade chips                 |
| `screenBgLight` | All tabs in light mode (legacy — being narrowed by DS2.2) | `ScreenGradient` consumers                     |
| `screenBgDark`  | All tabs in dark mode                                     | `ScreenGradient` consumers                     |
| `onboarding1`   | Onboarding step 1 (warm welcome)                          | `app/onboarding/*` step 1                      |
| `onboarding2`   | Onboarding step 2 (sage / discovery)                      | `app/onboarding/*` step 2                      |
| `onboarding3`   | Onboarding step 3 (lavender / aspiration)                 | `app/onboarding/*` step 3                      |
| `authBg`        | Login + signup gradient backdrop                          | `AnimatedAuthGradient` (A7.5)                  |
| `paywallBg`     | Paywall hero gradient                                     | `PaywallScreen`                                |
| `cardOverlay`   | Bottom-shadow scrim on photo cards (text legibility)      | recipe cards, hero cards                       |
| `heroWarm`      | Warm wash overlay on hero food photography                | hero recipe surfaces                           |

## Why we kept the full set

- 13 gradients, all in active or imminent (Tier J / DS7) use.
- No dead exports — `rainbow` / `rainbowBright` were proposed in design.md
  audit findings but never shipped, so there's nothing to delete.
- One gradient per use case → no surface ambiguity. Engineers reach for
  the named import, not a hand-rolled `LinearGradient` palette.

## Anti-pattern (banned)

- Hand-rolled CTA gradients in JSX (`<LinearGradient colors={['#fa7e12',
  '#E84D3D']} />`). Always import from `Gradients`.
- Cross-pollination (using `paywallBg` outside the paywall, etc.).
- Adding a new gradient when an existing canonical fits.

## Audit method

```bash
grep -rn "from.*['\"].*Gradients['\"]" app/ components/
```

The handful of consumers (Tab layout, ScreenGradient, ShoppingListHeader,
PaywallScreen) all reach in via named imports — no string-literal
gradient values were found in production JSX outside this file.
