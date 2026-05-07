# DS2.5 — Fraunces stylistic-set `ss01` on display sizes only

> **Decision:** Display tokens (`displayMd` / `displayLg` / `display`) opt
> in to Fraunces' `ss01` stylistic set (alternate `g`). Body / heading
> tokens use the default glyphs.

## Why ss01 only on display

Fraunces' alternate-`g` is a single-storey character with a graceful tail —
it's the typographic flourish that gives Clay-inspired editorial
typography its memorable personality. At 44 px+ it reads as "this app
chose its hero typography on purpose." At 17 px body text it reads as
unfamiliar; English readers expect the default two-storey `g` for
sustained reading.

The trade-off:

- **Display sizes** (44 / 56 / 80 px): `ss01` reinforces personality at
  the moment the user is most aware of typography.
- **Body / heading sizes** (15–32 px): default `g` keeps reading speed
  high; readability wins at small sizes.

## Implementation

`frontend/constants/tokens.ts` — `Type.displayMd` / `Type.displayLg` /
`Type.display` carry `fontVariant: ['ss01']`. All other Type tokens omit
the property (default glyphs).

## Test

`frontend/__tests__/design/openTypeFeatures.test.ts` asserts the
contract — display tokens carry `ss01`, body tokens do not.

## Future stylistic sets

Fraunces ships SOFT / WONK / opsz axes plus several stylistic sets. We
deliberately ship only `ss01` today; additional sets (e.g. `ss02`
swash-`Q`) are a future flourish that can land once the typography is
battle-tested in production. Adding more without a use case is voice
clutter.
