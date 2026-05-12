# DS4.2 — Tab bar spec

> **Decision:** Bottom tab bar — fixed 4 tabs (Today / Week / Kitchen /
> Sazon) with a centered pill active indicator. Profile is a sheet, not
> a tab (per `ROADMAP_4.0.md#ia-spec` and Tier A).

## Visual contract

| Token / value | Source |
|---------------|--------|
| Height | 60 px (above the home-indicator on iOS) |
| Background | `Surface.{light,dark}.base` |
| Top hairline | `Hairline.{light,dark}.hairline` (0.5 px) |
| Active indicator shape | Pill, 28 px tall × content-width + 32 px |
| Active indicator background | `Brand.{light,dark}.soft` |
| Active icon color | `Brand.{light,dark}.base` |
| Inactive icon color | `Ink.{light,dark}.tertiary` |
| Icon size | 24 px (`Icon.md`) |
| Active label | `Type.caption` + `Brand.{light,dark}.base` color |
| Inactive label | `Type.caption` + `Ink.{light,dark}.tertiary` color |
| Spacing icon → label | 4 px |

## Tabs

| Order | Tab | Icon | Route |
|------:|-----|------|-------|
| 1 | Today | sparkles | `(tabs)/index` |
| 2 | Week | calendar | `(tabs)/meal-plan` |
| 3 | Kitchen | book-open | `(tabs)/cookbook` |
| 4 | Sazon | sparkle / mascot-mini | `(tabs)/coach` |

Profile is reachable via the avatar in the Today header → `app/profile`
sheet. Not a tab.

## A11y

- Each tab carries `accessibilityRole="button"` and an
  `accessibilityLabel` of the form `"Tab: <name>"`.
- Active tab has `accessibilityState={{ selected: true }}`.
- Long-press (DS-future) opens Sazon seeded with the active tab's
  context — must announce "Sazon hint" to screen readers.

## Voice

- ✅ Tab labels are nouns, single word: "Today", "Week", "Kitchen", "Sazon".
- ❌ Verbs ("Plan", "Cook"). Tabs are places, not actions.

## Source of truth

Tokens: `Surface`, `Hairline`, `Brand`, `Ink`, `Type.caption`.
Component: `app/(tabs)/_layout.tsx`. Migration to consume the spec
above lands with DS7 (the tab bar is touch-everywhere).
