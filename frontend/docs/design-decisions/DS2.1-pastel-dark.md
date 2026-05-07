# DS2.1 — Pastel-dark variant: solid muted-jewel

> **Decision:** Solid muted-jewel hex values for `PastelTokens.dark` —
> 12% rgba is retired.

## Context

Light-mode pastels (`E8F5E9` sage, `FFF8E1` golden, etc.) are warm, food-friendly
tints that frame photos without competing. The previous dark-mode version used
`rgba(<accent>, 0.12)` — semi-transparent jewel tones over the cocoa scaffold.

## Rationale

1. **Stacking goes muddy.** A pastel-dark card placed on `surface-raised` (a
   slightly lighter scaffold tone) composes a different visible color than the
   same card on `surface.base`. Designers and engineers can't predict the
   rendered hue without knowing the parent surface — every nested-card surface
   becomes a visual discovery.

2. **Solid jewel keeps perceived saturation.** Transparent over a near-black
   surface always desaturates toward black, no matter the source. Solid muted-
   jewel hex values keep the chromatic warmth that gives the cookbook-by-
   candlelight palette its character.

3. **Tooling parity.** Color-checker tools (contrast ratio, color-blindness
   simulators) operate on hex, not rgba composites. Authoring solid values
   makes a11y verification a one-step lookup.

## Conversion (visual continuity)

Each new solid value is the byte-identical composite of the previous rgba
version over `Surface.dark.base = #141414`. On the default dark surface,
*nothing changes visually*. The change only matters when pastels are nested
on `surface-raised` (`#1F1F1F`) or `surface-overlay` (`#2A2A2A`) — there, the
solid value renders as a true muted-jewel rather than the scaffold-bleached
tint it was before.

| Pastel    | Old rgba                   | New solid | Composite over `#141414` |
|-----------|----------------------------|-----------|--------------------------|
| sage      | `rgba(129,199,132,0.12)`   | `#212921` | exact                    |
| golden    | `rgba(255,213,79,0.12)`    | `#302B1B` | exact                    |
| lavender  | `rgba(206,147,216,0.12)`   | `#2A232C` | exact                    |
| peach     | `rgba(255,183,77,0.12)`    | `#30281B` | exact                    |
| sky       | `rgba(100,181,246,0.12)`   | `#1E272F` | exact                    |
| blush     | `rgba(240,98,146,0.12)`    | `#2E1D23` | exact                    |
| orange    | `rgba(255,139,65,0.12)`    | `#302219` | exact                    |
| red       | `rgba(239,68,68,0.12)`     | `#2E1A1A` | exact                    |

## Source of truth

`frontend/constants/colorTokens.cjs` → `PastelTokens.dark`.
