# DS2.4 — Plus Jakarta everywhere

> **Decision:** Sazon ships Plus Jakarta Sans for all body / UI text and
> Fraunces for display / headings ≥ 22px. No `Platform.select` font
> fallback to iOS System / Android Roboto.

## Why brand voice wins over native feel

Sazon is a **lifestyle** app, not a productivity tool. The user is
browsing food, planning their week, learning about ingredients — the
experience is closer to Bon Appétit / Apple News editorial than to
Settings or Mail. Native-platform typography signals "system utility"
when we want "magazine you flip through."

The trade-off:

- **Plus Jakarta everywhere** = brand-consistent voice; iOS and Android
  users see the same product; type rhythm is predictable.
- **Platform.select** = each user gets their OS's preferred sans-serif;
  product feels "native"; brand voice fragments per platform.

For Sazon, brand voice wins. A user who sees Sazon on their friend's
phone (Android) and their own (iOS) should recognize it as the same
product without reading a single word.

## Implementation

`frontend/constants/Typography.ts` — `FontFamily.*` keys all map to the
matching `PlusJakartaSans_<weight>` name. `Platform.select` removed.

`frontend/constants/tokens.ts` — `Type.*` already uses Plus Jakarta
names directly.

When Plus Jakarta isn't yet loaded (cold start, font load failure), RN
falls back to the platform default — that's a transient render glitch,
not a brand decision.

## Threshold for Fraunces

≥22 px → Fraunces (display + headings).
< 22 px → Plus Jakarta (body + UI).
Eyebrow exception: 11 px Plus Jakarta extrabold uppercase.

See DS5.2 (`docs/design-decisions/DS5.2-font-threshold.md` — TBD).

## Test

`frontend/__tests__/foundations/typography.test.ts` — `FontFamily.*`
maps to Plus Jakarta family names; no `Platform.select` shape leaks
through; `system` alias also resolves to Plus Jakarta (deprecated but
preserved).
