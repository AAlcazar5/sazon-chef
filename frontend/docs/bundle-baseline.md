# Bundle Baseline — Q1 (2026-05-10)

Recorded by `__tests__/quality/bundleAudit.test.ts`. When a legitimate change pushes a bound, update the test constants AND this doc in the same PR.

## Boot path budget — `app/_layout.tsx`

| Metric | Baseline | Budget (test fails over) |
|---|---|---|
| Synchronous imports | 30 | 40 |
| Module-scope side effects | 2 (`ExpoSplashScreen.preventAutoHideAsync` + `initSentry()`) | 6 |

Every line in the root layout runs before first paint. New synchronous imports there directly extend cold-start time. Push to `useEffect` or behind a route load whenever possible.

## Top-20 heaviest `node_modules` deps (informational, 2026-05-10)

Sizes are on-disk including dev dependencies' bundled tooling. Final shipped JS is much smaller (Hermes bytecode + tree-shaking). Used as a drift signal, not a final-bundle measurement.

| # | Package | Size (MB) | Notes |
|---|---|---|---|
| 1 | react-native | 86 | Unavoidable runtime |
| 2 | @expo | 52 | Expo SDK surface |
| 3 | @sentry | 44 | Crash + perf monitoring; ships with native bindings |
| 4 | typescript | 23 | **devDep** — strips from production |
| 5 | @react-native | 21 | RN platform glue |
| 6 | react-devtools-core | 16 | ⚠️ flagged — verify dev-only |
| 7 | @babel | 15 | devDep |
| 8 | react-native-css-interop | 10 | NativeWind runtime |
| 9 | react-native-reanimated | 9 | Required for Tier P5 animations |
| 10 | lightningcss-darwin-arm64 | 8 | devDep — Tailwind native |
| 11 | react-native-svg | 7.6 | Required for ProgressRing + ConcentricRings |
| 12 | @expo-google-fonts | 7 | **Candidate for lazy-load** — fonts can hydrate after first paint |
| 13 | react-native-gesture-handler | 6.6 | Required |
| 14 | react-dom | 6.4 | RN web target |
| 15 | @sentry-internal | 6.4 | Sentry's perf sub-modules |
| 16 | @revenuecat | 6 | Required for paywall + Pro flow |
| 17 | tailwindcss | 6 | devDep |
| 18 | react-native-screens | 5.6 | RN navigation primitives |
| 19 | expo-router | 5.4 | Required |
| 20 | @tanstack | 5.3 | React Query (Tier P5) |

## Banned production dependencies

The audit fails if any of these appear in `dependencies`:

- `moment` → use `dayjs` or `date-fns`
- `lodash` → use `lodash-es` or per-method imports
- `underscore` → native ES + per-method imports
- `jquery` → never (this is React Native)
- `request` → deprecated; use `fetch` / `axios`
- `rxjs` → not needed; native promises + AsyncStorage suffice

## Devtools that must stay devOnly

- `react-devtools-core`
- `@testing-library/react-native`
- `jest`
- `@types/jest`

## Cold-start optimization candidates (queued, not done)

1. **Font lazy-load** — `useFonts(EDITORIAL_FONTS)` currently gates first paint. Splash screen could show with system font + swap to Fraunces/Plus Jakarta when ready. Saves ~200–400ms of cold start.

2. **Sentry deferred init** — `initSentry()` at module load fires before any component renders. Could move to first `useEffect` of `RootLayoutNav` once we confirm we don't miss crashes that happen during the JS startup window itself (unlikely, but verify).

3. **RevenueCat lazy** — `initRevenueCat()` already lives in `useEffect`, good. No action.

4. **Push notifications hook** — `usePushNotifications()` registers permissions on every render of `RootLayoutNav`. Confirm it idempotent-guards inside.

5. **Splash → Auth → Home critical path** — 3 sequential render boundaries before the user sees real content. Each blocker shaves perceived load. Profile with Hermes traces post-Q4 SLO instrumentation.

## How to re-baseline

```bash
cd frontend
npm test -- __tests__/quality/bundleAudit.test.ts
# If the test reports a higher legitimate count, update the constants in the
# test AND the "Boot path budget" table here, and explain why in the PR.
```
