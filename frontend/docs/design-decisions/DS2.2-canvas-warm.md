# DS2.2 — `canvas-warm` is the Today-screen-only default

> **Decision:** Today renders on `Canvas.warmLight` (`#FAF7F4`) /
> `Canvas.warmDark` (`#1A1410`). Cookbook, Week, and Sazon (Coach) tabs
> render on `Canvas.light` (`#FFFFFF`) / `Canvas.dark` (`#0A0A0A`).

## Why Today gets the warm canvas

Today is the **editorial / hero / "personal magazine cover" tab** — the
first surface the user sees when they open the app. Warm cream
(`#FAF7F4`) frames pastel cards and food photography better than sharp
white:

- Pastel performers (`PastelTokens.light.sage`, `golden`, `lavender` …)
  read as gentle accents on warm cream, but as competing tints on sharp
  white.
- Full-bleed photography sits inside warm cream like a print magazine
  spread — no harsh edge between the photo crop and the page.
- The hero font (Fraunces) was tuned against warm-paper backgrounds in
  its source typography research.

## Why other tabs stay on sharp white

- **Cookbook**: high-density library; warm cream + many cards reads
  fatiguing. Sharp white maintains canvas discipline.
- **Week**: information-dense planner; the user is scanning grids, not
  browsing.
- **Sazon (Coach)**: chat-style conversational surface; sharp white
  matches messaging conventions.

## Implementation

`frontend/app/(tabs)/index.tsx` (Today) → `Canvas.warmLight` /
`Canvas.warmDark` on the root container.

Other tab roots → `Canvas.light` / `Canvas.dark`.

Token: `frontend/constants/tokens.ts` → `Canvas`.

## Test

`frontend/__tests__/screens/TodayCanvas.test.tsx` asserts the Today
container renders `Canvas.warmLight` in light mode and `Canvas.warmDark`
in dark mode. Verifies the rule isn't accidentally reverted by a future
edit to the canvas.
