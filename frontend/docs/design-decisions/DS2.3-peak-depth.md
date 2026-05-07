# DS2.3 — Peak shadow depth: 6px

> **Decision:** `PeakShadow.depth = 6`. Locked 2026-05-07. Override by
> editing `frontend/constants/colorTokens.cjs` and bumping the depth
> back to 4 if the chunky press reads as too much on real devices.

## The two options

| Depth | Reads as | Belongs in |
|------:|----------|------------|
| 4 px  | iOS-native button press | Apple-coded utility apps |
| 6 px  | Duolingo-spirited joy peak | Lifestyle / personality-forward apps |

## Why 6px wins for Sazon

1. **Brand voice over native feel.** DS2.4 already chose Plus Jakarta
   everywhere over `Platform.select` system fonts, on the rationale
   that brand voice beats native feel for a lifestyle app. The peak
   shadow is the same tradeoff — 4px is the iOS-native press depth,
   6px is the brand-coded "stamp of joy." Same direction, same call.

2. **Peak ≠ chrome.** This token is reserved for *designed peak
   moments* (cooking complete, save to kitchen, milestone unlocks),
   never for routine chrome buttons. A peak that feels routine is a
   wasted peak. 6px earns the moment.

3. **Anti-positioning.** "Past the spreadsheet" / "lifestyle, not
   utility" — Sazon's persona explicitly rejects the productivity-app
   aesthetic. iOS-native press depth (4px) is a productivity-app
   tell. Drifting toward Duolingo-coded chunkiness (6px) reinforces
   the editorial / joyful vibe.

4. **Anti-pattern guard.** 6px keeps the peak shadow visibly distinct
   from the soft Apple-style elevation (`Elevation.md`) that ships on
   normal cards. If the two feel similar, neither earns its visual
   weight. 6px draws the line.

## What this changes

`PeakShadow.depth: 4 → 6`. `PeakShadow.pressTranslate: 4 → 6`.

The light and dark shadow colors (`#d67a0c` / `#E07A40`) are unchanged.

The Tailwind boxShadow `peak` (`0 ${depth}px 0 0 ${color}`) automatically
picks up the new depth via the `t.PeakShadow.depth` reference in
`tailwind.config.js`.

## What it doesn't change (yet)

`BrandButton`'s shadow is still the soft Apple-elevation style
(`shadowOffset.height: 4`, `shadowRadius: 10`) — that's not a peak
shadow, it's a normal button elevation. The peak shadow specifically
applies to a `<PeakButton>` wrapper component (or any future component
that renders an absolute-positioned colored block beneath the press
target). When that wrapper ships, it consumes `PeakShadow.depth = 6`.

## Override path

If 6px reads as too much on real devices:

1. Open `playground/peak-shadow.tsx` on iOS + Android sims.
2. Tap each button; compare the press feel.
3. Edit `frontend/constants/colorTokens.cjs` → `PeakShadow.depth` to 4.
4. Update this doc's "Decision" line and add a "Reverted on YYYY-MM-DD"
   note explaining what failed.

The playground exists precisely so this decision is reversible without
re-litigating the design rationale.

## Test enforcement

`frontend/__tests__/design/peakShadow.test.ts` asserts the locked
value. If you change `PeakShadow.depth`, the test fails until this doc
+ the rationale are updated.
